import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { api } from "./_generated/api.js";
import { logAudit } from "./taskboard.ts";
import { isFeatureEnabled, requireFeatureEnabled } from "./featureToggles.ts";
import { supersedeStampsForVersion } from "./estamp.ts";

// ══════════════════════════════════════════════════════════════════════════
// ENHANCED DOCUMENT MANAGEMENT
//
// Extends the existing Document Vault (convex/docvault.ts, vaultDocuments
// table) with configurable document types, real version control (never a
// silent overwrite), and a review/approval step that reuses the existing
// Tasks/Approvals engine (convex/taskboard.ts, `approvals` table) — no
// second workflow engine. Everything here is additive: when the
// "feature_enhanced_documents" toggle is OFF, the vault keeps behaving
// exactly as before (see docvault.ts, unchanged).
// ══════════════════════════════════════════════════════════════════════════

const STAFF_ROLES = ["super_admin", "admin", "manager", "agent"];

async function requireStaff(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in required" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  if (!user || !STAFF_ROLES.includes(user.role ?? "")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return user;
}

// ── Document Types (configurable, additive to the DOC_TYPES fallback) ─────

export const listDocumentTypes = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    return await ctx.db.query("documentTypes").collect();
  },
});

// Seeds the configurable document type catalogue from the existing hardcoded
// list already used by the vault UI, so nothing changes for existing
// documents — it just becomes editable going forward. Idempotent.
export const seedDefaultDocumentTypes = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requireStaff(ctx);
    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const DEFAULTS: { key: string; label: string; requiresReview: boolean }[] = [
      { key: "kyc_doc", label: "KYC Document", requiresReview: true },
      { key: "id_doc", label: "Identification Document", requiresReview: true },
      { key: "offer_letter", label: "Offer Letter", requiresReview: true },
      { key: "allocation_letter", label: "Allocation Letter", requiresReview: true },
      { key: "contract", label: "Contract", requiresReview: true },
      { key: "deed", label: "Deed", requiresReview: true },
      { key: "receipt", label: "Receipt", requiresReview: false },
      { key: "invoice", label: "Invoice", requiresReview: false },
      { key: "agreement", label: "Agreement", requiresReview: true },
      { key: "finance_doc", label: "Finance Document", requiresReview: true },
      { key: "payment_proof", label: "Payment Proof", requiresReview: false },
      { key: "legal_notice", label: "Legal Notice", requiresReview: true },
      { key: "other", label: "Other", requiresReview: false },
    ];
    const existing = await ctx.db.query("documentTypes").collect();
    const existingKeys = new Set(existing.map((d) => d.key));
    let inserted = 0;
    for (const d of DEFAULTS) {
      if (existingKeys.has(d.key)) continue;
      await ctx.db.insert("documentTypes", { ...d, isActive: true, createdBy: user._id, createdAt: new Date().toISOString() });
      inserted++;
    }
    return { inserted };
  },
});

export const upsertDocumentType = mutation({
  args: {
    id: v.optional(v.id("documentTypes")),
    key: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    requiresReview: v.boolean(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"documentTypes">> => {
    const user = await requireStaff(ctx);
    await requireFeatureEnabled(ctx, "feature_enhanced_documents");
    const { id, ...rest } = args;
    if (id) {
      await ctx.db.patch(id, rest);
      await logAudit(ctx, {
        action: "update", entity: "document_type", entityId: id, entityRef: args.key,
        userId: user._id, userName: user.name, userRole: user.role,
        description: `Updated document type "${args.label}"`,
      });
      return id;
    }
    const existing = await ctx.db.query("documentTypes").withIndex("by_key", (q) => q.eq("key", args.key)).first();
    if (existing) throw new ConvexError({ code: "CONFLICT", message: "A document type with this key already exists" });
    const newId = await ctx.db.insert("documentTypes", { ...rest, createdBy: user._id, createdAt: new Date().toISOString() });
    await logAudit(ctx, {
      action: "create", entity: "document_type", entityId: newId, entityRef: args.key,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created document type "${args.label}"`,
    });
    return newId;
  },
});

// ── Version control ─────────────────────────────────────────────────────
// Every version is its own row sharing the same docRef, chained via
// parentDocId — the original file/version is never overwritten in place.

export const getVersionHistory = query({
  args: { docRef: v.string() },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const versions = await ctx.db.query("vaultDocuments").withIndex("by_ref", (q) => q.eq("docRef", args.docRef)).collect();
    const enriched = await Promise.all(
      versions.map(async (v_) => {
        const uploader = v_.uploadedBy ? await ctx.db.get(v_.uploadedBy) : null;
        return { ...v_, uploaderName: uploader?.name ?? null };
      })
    );
    return enriched.sort((a, b) => a.version - b.version);
  },
});

export const createDocumentVersion = mutation({
  args: {
    vaultDocumentId: v.id("vaultDocuments"),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSizeBytes: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    changeNote: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"vaultDocuments">> => {
    const user = await requireStaff(ctx);
    await requireFeatureEnabled(ctx, "feature_enhanced_documents");

    const current = await ctx.db.get(args.vaultDocumentId);
    if (!current) throw new ConvexError({ code: "NOT_FOUND", message: "Document not found" });
    if (current.isLatestVersion === false) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Only the latest version of a document can be superseded" });
    }

    const newId = await ctx.db.insert("vaultDocuments", {
      docRef: current.docRef,
      title: current.title,
      description: current.description,
      docType: current.docType,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      fileSizeBytes: args.fileSizeBytes,
      mimeType: args.mimeType,
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
    });

    await ctx.db.patch(current._id, { isLatestVersion: false, supersededBy: newId });
    await supersedeStampsForVersion(ctx, current._id);

    await logAudit(ctx, {
      action: "update",
      entity: "vaultDocuments",
      entityId: newId,
      entityRef: current.docRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `New version (v${current.version + 1}) uploaded for "${current.title}"${args.changeNote ? ` — ${args.changeNote}` : ""}`,
      before: JSON.stringify({ version: current.version, fileName: current.fileName }),
      after: JSON.stringify({ version: current.version + 1, fileName: args.fileName }),
    });

    return newId;
  },
});

// ── Review / approval — reuses the existing Tasks & Approvals engine ───────

export const submitDocumentForReview = mutation({
  args: { vaultDocumentId: v.id("vaultDocuments"), note: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Id<"approvals">> => {
    const user = await requireStaff(ctx);
    await requireFeatureEnabled(ctx, "feature_enhanced_documents");

    const doc = await ctx.db.get(args.vaultDocumentId);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Document not found" });
    if (doc.reviewStatus === "pending_review") {
      throw new ConvexError({ code: "CONFLICT", message: "This document is already pending review" });
    }

    // Reuse the existing approvals engine — never a second workflow engine.
    const approvalId: Id<"approvals"> = await ctx.runMutation(api.taskboard.createApproval, {
      approvalType: "document_review",
      priority: "medium",
      summary: `Review requested for document "${doc.title}" (${doc.docRef})`,
      requestNote: args.note,
      clientId: doc.clientId,
      transactionId: doc.transactionId,
      relatedRef: doc.docRef,
    });

    await ctx.db.patch(args.vaultDocumentId, { reviewStatus: "pending_review", approvalId });

    await logAudit(ctx, {
      action: "update",
      entity: "vaultDocuments",
      entityId: args.vaultDocumentId,
      entityRef: doc.docRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Submitted "${doc.title}" for review${args.note ? ` — ${args.note}` : ""}`,
    });

    return approvalId;
  },
});

// Called by the frontend after an approval decision lands, or by a light
// poll, to sync the document's reviewStatus from its linked approval. Kept
// as an explicit sync step (not a trigger) since Convex has no native
// cross-table triggers — this is the simplest additive way to reflect the
// decision without touching taskboard.ts's decideApproval at all.
export const syncReviewStatusFromApproval = mutation({
  args: { vaultDocumentId: v.id("vaultDocuments") },
  handler: async (ctx, args): Promise<string | null> => {
    await requireStaff(ctx);
    const doc = await ctx.db.get(args.vaultDocumentId);
    if (!doc || !doc.approvalId) return doc?.reviewStatus ?? null;
    const approval = await ctx.db.get(doc.approvalId);
    if (!approval) return doc.reviewStatus ?? null;

    const nextStatus =
      approval.status === "approved" ? "approved" :
      approval.status === "rejected" ? "rejected" :
      "pending_review";

    if (nextStatus !== doc.reviewStatus) {
      await ctx.db.patch(args.vaultDocumentId, { reviewStatus: nextStatus });
    }
    return nextStatus;
  },
});

// Non-throwing helper for the frontend to know whether to show the
// Enhanced Document Management UI at all.
export const getEnhancedDocumentsAccess = query({
  args: {},
  handler: async (ctx): Promise<{ featureEnabled: boolean; isStaff: boolean }> => {
    const featureEnabled = await isFeatureEnabled(ctx, "feature_enhanced_documents");
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { featureEnabled, isStaff: false };
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    return { featureEnabled, isStaff: !!user && STAFF_ROLES.includes(user.role ?? "") };
  },
});
