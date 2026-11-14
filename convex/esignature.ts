import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { logAudit } from "./taskboard.ts";
import { hasPermission } from "./iam/access.ts";
import { requireFeatureEnabled, isFeatureEnabled } from "./featureToggles.ts";
import { supersedeStampsForVersion } from "./estamp.ts";
import { tokenOf } from "./authIdentity";

// ══════════════════════════════════════════════════════════════════════════
// E-SIGNATURE
//
// Optional, workflow-controlled signing on top of the EXISTING Documents &
// Vault (vaultDocuments). Never a second document repository: a signature
// request always points at a specific vaultDocuments row (a specific
// VERSION), and the fully-executed copy is stored back into vaultDocuments
// as a new version — never an in-place overwrite.
//
// Distinct, by design, from:
//   - convex/docvault.ts `agreements` — the existing lightweight sale
//     contract signing flow. Left completely untouched.
//   - convex/corporateMarketing/esignature.ts — the corporate/institutional
//     variant, which signs corporate letters/term sheets. Also untouched.
// This module is the general-purpose signing flow surfaced on
// /admin/documents for any vault document.
//
// Security: only a user holding the explicit "documents.sign" granular
// permission (never inferred from role/title) may ever record a signature.
// Every mutation is gated server-side by requireFeatureEnabled(..., 
// "feature_esignature") — the frontend toggle is presentation only.
// ══════════════════════════════════════════════════════════════════════════

const STAFF_ROLES = ["super_admin", "admin", "manager", "agent"];
const SIGN_PERMISSION = "documents.sign";

async function requireStaff(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in required" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
  if (!user || !STAFF_ROLES.includes(user.role ?? "")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return user;
}

// Explicit SIGN authority check — never inferred from role/title. super_admin
// keeps break-glass access, consistent with every other module in this app,
// but no other role is granted signing rights implicitly.
async function requireSignPermission(ctx: QueryCtx | MutationCtx, user: Doc<"users">): Promise<void> {
  const allowed = await hasPermission(ctx, user._id, SIGN_PERMISSION);
  if (!allowed && user.role !== "super_admin") {
    throw new ConvexError({ code: "FORBIDDEN", message: "You do not have explicit signing authority for documents" });
  }
}

async function nextSignatureRef(ctx: MutationCtx): Promise<string> {
  const last = await ctx.db.query("signatureRequests").order("desc").first();
  const n = last ? parseInt(last.requestRef.split("-")[2] ?? "0") + 1 : 1;
  return `GWS-SIG-${String(n).padStart(4, "0")}`;
}

function generateSignatureToken(): string {
  // Random verifiable per-signing-event token. crypto.randomUUID() is
  // available in the Convex V8 runtime (Web Crypto API), no Node import.
  return crypto.randomUUID();
}

// ── Queries ──────────────────────────────────────────────────────────────

export const getMyESignatureAccess = query({
  args: {},
  handler: async (ctx): Promise<{ featureEnabled: boolean; isStaff: boolean; canSign: boolean }> => {
    const featureEnabled = await isFeatureEnabled(ctx, "feature_esignature");
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { featureEnabled, isStaff: false, canSign: false };
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
    if (!user || !STAFF_ROLES.includes(user.role ?? "")) return { featureEnabled, isStaff: false, canSign: false };
    const canSign = (await hasPermission(ctx, user._id, SIGN_PERMISSION)) || user.role === "super_admin";
    return { featureEnabled, isStaff: true, canSign };
  },
});

export const listSignatureRequestsForDocument = query({
  args: { docRef: v.string() },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const requests = await ctx.db.query("signatureRequests").withIndex("by_docRef", (q) => q.eq("docRef", args.docRef)).order("desc").collect();
    return Promise.all(
      requests.map(async (r) => {
        const signers = await ctx.db.query("signatureSigners").withIndex("by_request_and_order", (q) => q.eq("requestId", r._id)).collect();
        return { ...r, signers: signers.sort((a, b) => a.signingOrder - b.signingOrder) };
      })
    );
  },
});

export const getSignatureRequest = query({
  args: { id: v.id("signatureRequests") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const request = await ctx.db.get(args.id);
    if (!request) return null;
    const signers = await ctx.db.query("signatureSigners").withIndex("by_request_and_order", (q) => q.eq("requestId", args.id)).collect();
    const vaultDoc = await ctx.db.get(request.vaultDocumentId);
    return { ...request, vaultDoc, signers: signers.sort((a, b) => a.signingOrder - b.signingOrder) };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────

export const createSignatureRequest = mutation({
  args: {
    vaultDocumentId: v.id("vaultDocuments"),
    signers: v.array(v.object({
      signerType: v.union(v.literal("internal"), v.literal("external")),
      userId: v.optional(v.id("users")),
      name: v.string(),
      email: v.string(),
      role: v.optional(v.string()),
    })),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"signatureRequests">> => {
    const user = await requireStaff(ctx);
    await requireFeatureEnabled(ctx, "feature_esignature");

    if (args.signers.length === 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "At least one signer is required" });
    }
    for (const s of args.signers) {
      if (!s.name.trim() || !s.email.trim()) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Each signer needs a name and email" });
      }
    }

    const doc = await ctx.db.get(args.vaultDocumentId);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Document not found in the vault" });
    if (doc.isLatestVersion === false) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Only the latest version of a document can be sent for signature" });
    }

    const existingOpen = await ctx.db.query("signatureRequests").withIndex("by_document", (q) => q.eq("vaultDocumentId", args.vaultDocumentId)).collect();
    if (existingOpen.some((r) => !["completed", "declined", "cancelled", "expired"].includes(r.status))) {
      throw new ConvexError({ code: "CONFLICT", message: "This document already has an open signature request" });
    }

    const requestRef = await nextSignatureRef(ctx);
    const requestId = await ctx.db.insert("signatureRequests", {
      requestRef,
      vaultDocumentId: args.vaultDocumentId,
      docRef: doc.docRef,
      title: doc.title,
      status: "pending",
      clientId: doc.clientId,
      transactionId: doc.transactionId,
      requestedBy: user._id,
      requestedAt: new Date().toISOString(),
      expiresAt: args.expiresAt,
    });

    for (let i = 0; i < args.signers.length; i++) {
      const s = args.signers[i];
      await ctx.db.insert("signatureSigners", {
        requestId,
        signingOrder: i + 1,
        signerType: s.signerType,
        userId: s.userId,
        name: s.name.trim(),
        email: s.email.trim(),
        role: s.role,
        status: "pending",
        signatureRef: generateSignatureToken(),
      });
    }

    await ctx.db.patch(args.vaultDocumentId, { signatureStatus: "pending" });

    await logAudit(ctx, {
      action: "create",
      entity: "signatureRequests",
      entityId: requestId,
      entityRef: doc.docRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Requested signature on "${doc.title}" (${args.signers.length} signer${args.signers.length > 1 ? "s" : ""})`,
    });

    return requestId;
  },
});

// Marks the request (and all pending signers) as sent — a status transition
// only, no external delivery mechanism implied here.
export const sendSignatureRequest = mutation({
  args: { id: v.id("signatureRequests") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireStaff(ctx);
    await requireFeatureEnabled(ctx, "feature_esignature");

    const request = await ctx.db.get(args.id);
    if (!request) throw new ConvexError({ code: "NOT_FOUND", message: "Signature request not found" });
    if (request.status !== "pending") {
      throw new ConvexError({ code: "CONFLICT", message: "Only a pending request can be sent" });
    }

    const signers = await ctx.db.query("signatureSigners").withIndex("by_request", (q) => q.eq("requestId", args.id)).collect();
    const now = new Date().toISOString();
    for (const s of signers) {
      await ctx.db.patch(s._id, { status: "sent", sentAt: now });
    }
    await ctx.db.patch(args.id, { status: "sent" });
    await ctx.db.patch(request.vaultDocumentId, { signatureStatus: "sent" });

    await logAudit(ctx, {
      action: "send", entity: "signatureRequests", entityId: args.id, entityRef: request.docRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Sent signature request for "${request.title}" to ${signers.length} signer${signers.length > 1 ? "s" : ""}`,
    });
  },
});

// Called when a signer opens the document to sign — advances that signer's
// (and the request's) status to "viewed".
export const markSignatureRequestViewed = mutation({
  args: { id: v.id("signatureRequests"), signerId: v.id("signatureSigners") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireStaff(ctx);
    await requireFeatureEnabled(ctx, "feature_esignature");

    const request = await ctx.db.get(args.id);
    const signer = await ctx.db.get(args.signerId);
    if (!request || !signer || signer.requestId !== args.id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Signature request or signer not found" });
    }
    if (signer.status === "sent") {
      await ctx.db.patch(signer._id, { status: "viewed", viewedAt: new Date().toISOString() });
    }
    if (request.status === "sent") {
      await ctx.db.patch(args.id, { status: "viewed" });
    }

    await logAudit(ctx, {
      action: "view", entity: "signatureRequests", entityId: args.id, entityRef: request.docRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `${signer.name} viewed the document for signing`,
    });
  },
});

// Signing order is enforced: a signer at order N cannot sign until every
// signer at an earlier order has signed. Only a user holding the explicit
// SIGN permission may call this — never inferred from role/title.
export const recordSignature = mutation({
  args: {
    id: v.id("signatureRequests"),
    signerId: v.id("signatureSigners"),
  },
  handler: async (ctx, args): Promise<{ status: Doc<"signatureRequests">["status"] }> => {
    const user = await requireStaff(ctx);
    await requireSignPermission(ctx, user);
    await requireFeatureEnabled(ctx, "feature_esignature");

    const request = await ctx.db.get(args.id);
    if (!request) throw new ConvexError({ code: "NOT_FOUND", message: "Signature request not found" });
    if (!["sent", "viewed"].includes(request.status)) {
      throw new ConvexError({ code: "CONFLICT", message: "This request is not currently open for signing" });
    }

    const signers = await ctx.db.query("signatureSigners").withIndex("by_request_and_order", (q) => q.eq("requestId", args.id)).collect();
    const sorted = signers.sort((a, b) => a.signingOrder - b.signingOrder);
    const target = sorted.find((s) => s._id === args.signerId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "Signer not found on this request" });
    if (target.status === "signed") throw new ConvexError({ code: "CONFLICT", message: "This signer has already signed" });
    if (target.status === "declined") throw new ConvexError({ code: "CONFLICT", message: "This signer has declined — cannot sign" });

    const earlierUnsigned = sorted.filter((s) => s.signingOrder < target.signingOrder && s.status !== "signed");
    if (earlierUnsigned.length > 0) {
      throw new ConvexError({ code: "CONFLICT", message: "An earlier signer in the signing order has not yet signed" });
    }

    const now = new Date().toISOString();
    await ctx.db.patch(target._id, { status: "signed", signedAt: now, signedByUserId: user._id });

    const refreshed = sorted.map((s) => (s._id === target._id ? { ...s, status: "signed" as const } : s));
    const allSigned = refreshed.every((s) => s.status === "signed");
    const nextStatus: Doc<"signatureRequests">["status"] = allSigned ? "signed" : "viewed";

    await ctx.db.patch(args.id, { status: nextStatus, ...(allSigned ? { completedAt: now } : {}) });
    await ctx.db.patch(request.vaultDocumentId, { signatureStatus: allSigned ? "signed" : "viewed" });

    await logAudit(ctx, {
      action: "sign", entity: "signatureRequests", entityId: args.id, entityRef: request.docRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Recorded signature from ${target.name} on "${request.title}"${allSigned ? " — all signers have now signed" : ""}`,
    });

    return { status: nextStatus };
  },
});

// Finalizes a fully-signed request by attaching a new vaultDocuments VERSION
// (never an overwrite) as the fully-executed copy, and advances the request
// to "completed".
export const finalizeSignedDocument = mutation({
  args: {
    id: v.id("signatureRequests"),
    fileUrl: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"vaultDocuments">> => {
    const user = await requireStaff(ctx);
    await requireFeatureEnabled(ctx, "feature_esignature");

    const request = await ctx.db.get(args.id);
    if (!request) throw new ConvexError({ code: "NOT_FOUND", message: "Signature request not found" });
    if (request.status !== "signed") {
      throw new ConvexError({ code: "CONFLICT", message: "Only a fully-signed request can be finalized" });
    }

    const current = await ctx.db.get(request.vaultDocumentId);
    if (!current) throw new ConvexError({ code: "NOT_FOUND", message: "Source document not found" });

    const newVersionId: Id<"vaultDocuments"> = await ctx.db.insert("vaultDocuments", {
      docRef: current.docRef,
      title: current.title,
      description: current.description,
      docType: current.docType,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      version: current.version + 1,
      parentDocId: current._id,
      isLatestVersion: true,
      clientId: current.clientId,
      transactionId: current.transactionId,
      kycSubmissionId: current.kycSubmissionId,
      financeApplicationId: current.financeApplicationId,
      agreementId: current.agreementId,
      paymentId: current.paymentId,
      isConfidential: current.isConfidential,
      tags: current.tags,
      uploadedBy: user._id,
      uploadedAt: new Date().toISOString(),
      reviewStatus: "not_required",
      signatureStatus: "completed",
    });
    await ctx.db.patch(current._id, { isLatestVersion: false, supersededBy: newVersionId });
    await supersedeStampsForVersion(ctx, current._id);

    await ctx.db.patch(args.id, { status: "completed", completedAt: new Date().toISOString(), finalSignedVaultDocumentId: newVersionId });

    await logAudit(ctx, {
      action: "update", entity: "signatureRequests", entityId: args.id, entityRef: request.docRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Finalized fully-signed document "${request.title}" as a new version (v${current.version + 1})`,
    });

    return newVersionId;
  },
});

export const declineSignatureRequest = mutation({
  args: { id: v.id("signatureRequests"), signerId: v.id("signatureSigners"), reason: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireStaff(ctx);
    await requireFeatureEnabled(ctx, "feature_esignature");

    const request = await ctx.db.get(args.id);
    const signer = await ctx.db.get(args.signerId);
    if (!request || !signer || signer.requestId !== args.id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Signature request or signer not found" });
    }
    if (["completed", "cancelled", "declined", "expired"].includes(request.status)) {
      throw new ConvexError({ code: "CONFLICT", message: "This request can no longer be declined" });
    }

    const now = new Date().toISOString();
    await ctx.db.patch(signer._id, { status: "declined", declinedAt: now, declineReason: args.reason });
    await ctx.db.patch(args.id, { status: "declined" });
    await ctx.db.patch(request.vaultDocumentId, { signatureStatus: "declined" });

    await logAudit(ctx, {
      action: "decline", entity: "signatureRequests", entityId: args.id, entityRef: request.docRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `${signer.name} declined to sign "${request.title}"${args.reason ? ` — ${args.reason}` : ""}`,
    });
  },
});

export const cancelSignatureRequest = mutation({
  args: { id: v.id("signatureRequests"), reason: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireStaff(ctx);
    await requireFeatureEnabled(ctx, "feature_esignature");

    const request = await ctx.db.get(args.id);
    if (!request) throw new ConvexError({ code: "NOT_FOUND", message: "Signature request not found" });
    if (["completed", "cancelled", "declined"].includes(request.status)) {
      throw new ConvexError({ code: "CONFLICT", message: "This request can no longer be cancelled" });
    }

    await ctx.db.patch(args.id, { status: "cancelled", cancelledAt: new Date().toISOString(), cancelReason: args.reason });
    await ctx.db.patch(request.vaultDocumentId, { signatureStatus: "cancelled" });

    await logAudit(ctx, {
      action: "cancel", entity: "signatureRequests", entityId: args.id, entityRef: request.docRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Cancelled signature request for "${request.title}"${args.reason ? ` — ${args.reason}` : ""}`,
    });
  },
});
