import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// E-signature requests — tracks binding signatures on a corporate document
// (e.g. a partnership letter, term sheet, or agreement) already stored in
// the EXISTING vaultDocuments table. This is EXPLICITLY separate from
// acknowledgement (corporateAcknowledgements / acknowledgements.ts), which
// only confirms a letter was received. An e-signature request is signed
// off manually here (status transitions + a per-signatory reference such
// as a witnessed signature or an uploaded signed copy), not through a
// third-party e-signature provider — never conflate the two concepts.
// ══════════════════════════════════════════════════════════════════════════

const SIGNATORY = v.object({
  name: v.string(),
  email: v.string(),
  role: v.optional(v.string()),
  signingOrder: v.optional(v.number()),
});

type EsigDoc = Doc<"corporateEsignatureRequests">;

function deriveStatus(signatories: EsigDoc["signatories"]): EsigDoc["status"] {
  const signedCount = signatories.filter((s) => !!s.signedAt).length;
  if (signedCount === 0) return "sent";
  if (signedCount === signatories.length) return "fully_signed";
  return "partially_signed";
}

async function assertRequestVisible(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  id: Id<"corporateEsignatureRequests">,
): Promise<EsigDoc> {
  const request = await ctx.db.get(id);
  if (!request) throw new ConvexError({ code: "NOT_FOUND", message: "E-signature request not found" });
  const org = await ctx.db.get(request.organisationId);
  const ownerId = org?.assignedOfficer ?? org?.relationshipOwner;
  const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
  const [visible] = await filterByScope(ctx, [request], scope, () => ownerId);
  if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this e-signature request" });
  return request;
}

export const listEsignatureRequests = query({
  args: {
    organisationId: v.optional(v.id("corporateOrganisations")),
    opportunityId: v.optional(v.id("corporateOpportunities")),
    letterId: v.optional(v.id("corporatePartnershipLetters")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");

    let rows: EsigDoc[];
    if (args.letterId) {
      rows = await ctx.db.query("corporateEsignatureRequests").withIndex("by_letter", (q) => q.eq("letterId", args.letterId!)).order("desc").collect();
    } else if (args.opportunityId) {
      rows = await ctx.db.query("corporateEsignatureRequests").withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId!)).order("desc").collect();
    } else if (args.organisationId) {
      rows = await ctx.db.query("corporateEsignatureRequests").withIndex("by_organisation", (q) => q.eq("organisationId", args.organisationId!)).order("desc").collect();
    } else {
      rows = await ctx.db.query("corporateEsignatureRequests").order("desc").collect();
    }

    const orgIds = new Set(rows.map((r) => r.organisationId));
    const orgDocs = await Promise.all(Array.from(orgIds).map((id) => ctx.db.get(id)));
    const ownerByOrg = new Map<Id<"corporateOrganisations">, Id<"users"> | null | undefined>();
    for (const org of orgDocs) if (org) ownerByOrg.set(org._id, org.assignedOfficer ?? org.relationshipOwner);

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const scoped = await filterByScope(ctx, rows, scope, (r) => ownerByOrg.get(r.organisationId));

    const vaultDocs = await Promise.all(scoped.map((r) => ctx.db.get(r.vaultDocumentId)));
    return scoped.map((r, i) => ({
      ...r,
      vaultDocumentName: vaultDocs[i]?.fileName ?? vaultDocs[i]?.title,
      signedCount: r.signatories.filter((s) => !!s.signedAt).length,
      totalSignatories: r.signatories.length,
    }));
  },
});

export const getEsignatureRequest = query({
  args: { id: v.id("corporateEsignatureRequests") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    const request = await assertRequestVisible(ctx, user, args.id);

    const [organisation, vaultDoc, finalVaultDoc, requestedBy] = await Promise.all([
      ctx.db.get(request.organisationId),
      ctx.db.get(request.vaultDocumentId),
      request.finalSignedVaultDocumentId ? ctx.db.get(request.finalSignedVaultDocumentId) : null,
      request.requestedBy ? ctx.db.get(request.requestedBy) : null,
    ]);

    return {
      ...request,
      organisationName: organisation?.name ?? "Unknown Organisation",
      vaultDocument: vaultDoc,
      finalSignedVaultDocument: finalVaultDoc,
      requestedByName: requestedBy?.name ?? requestedBy?.email,
    };
  },
});

// Creates an e-signature request against a document already stored in the
// EXISTING vaultDocuments table. Signatories start unsigned; each is later
// marked signed one at a time via `recordSignature`.
export const createEsignatureRequest = mutation({
  args: {
    organisationId: v.id("corporateOrganisations"),
    vaultDocumentId: v.id("vaultDocuments"),
    opportunityId: v.optional(v.id("corporateOpportunities")),
    letterId: v.optional(v.id("corporatePartnershipLetters")),
    signatories: v.array(SIGNATORY),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"corporateEsignatureRequests">> => {
    const user = await requirePermission(ctx, "corporate_marketing.esignature_request");

    if (args.signatories.length === 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "At least one signatory is required" });
    }
    for (const s of args.signatories) {
      if (!s.name.trim() || !s.email.trim()) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Each signatory needs a name and email" });
      }
    }

    const organisation = await ctx.db.get(args.organisationId);
    if (!organisation) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });
    const vaultDoc = await ctx.db.get(args.vaultDocumentId);
    if (!vaultDoc) throw new ConvexError({ code: "NOT_FOUND", message: "Document not found in the vault" });

    const id = await ctx.db.insert("corporateEsignatureRequests", {
      vaultDocumentId: args.vaultDocumentId,
      organisationId: args.organisationId,
      opportunityId: args.opportunityId,
      letterId: args.letterId,
      status: "pending",
      signatories: args.signatories
        .slice()
        .sort((a, b) => (a.signingOrder ?? 0) - (b.signingOrder ?? 0))
        .map((s) => ({ name: s.name.trim(), email: s.email.trim(), role: s.role, signingOrder: s.signingOrder })),
      requestedAt: new Date().toISOString(),
      expiresAt: args.expiresAt,
      requestedBy: user._id,
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_esignature_requests", entityId: id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Requested e-signature on "${vaultDoc.title}" from ${organisation.name} (${args.signatories.length} signatory${args.signatories.length > 1 ? "ies" : ""})`,
    });

    return id;
  },
});

// Marks the request as sent to signatories (e.g. dispatched for wet-ink or
// witnessed signing). Purely a status transition — no external delivery
// mechanism is implied.
export const sendEsignatureRequest = mutation({
  args: { id: v.id("corporateEsignatureRequests") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.esignature_request");
    const request = await assertRequestVisible(ctx, user, args.id);

    if (request.status !== "pending") {
      throw new ConvexError({ code: "CONFLICT", message: "Only pending requests can be sent" });
    }

    await ctx.db.patch(args.id, { status: "sent" });

    await logAudit(ctx, {
      action: "send", entity: "corporate_esignature_requests", entityId: args.id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: "Sent e-signature request to signatories",
    });
  },
});

export const markEsignatureViewed = mutation({
  args: { id: v.id("corporateEsignatureRequests") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.esignature_request");
    const request = await assertRequestVisible(ctx, user, args.id);

    if (request.status !== "sent") {
      throw new ConvexError({ code: "CONFLICT", message: "Only sent requests can be marked as viewed" });
    }

    await ctx.db.patch(args.id, { status: "viewed" });

    await logAudit(ctx, {
      action: "view", entity: "corporate_esignature_requests", entityId: args.id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: "Marked e-signature request as viewed by a signatory",
    });
  },
});

// Records that one signatory has signed, with an optional reference
// (witness name, physical signature log ref, or an uploaded signed copy
// reference). Recomputes the request-level status from the signatory list.
export const recordSignature = mutation({
  args: {
    id: v.id("corporateEsignatureRequests"),
    email: v.string(),
    signatureRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.esignature_request");
    const request = await assertRequestVisible(ctx, user, args.id);

    if (!["sent", "viewed", "partially_signed"].includes(request.status)) {
      throw new ConvexError({ code: "CONFLICT", message: "This request is not currently open for signing" });
    }

    const idx = request.signatories.findIndex((s) => s.email.toLowerCase() === args.email.toLowerCase());
    if (idx === -1) throw new ConvexError({ code: "NOT_FOUND", message: "That signatory is not on this request" });
    if (request.signatories[idx].signedAt) {
      throw new ConvexError({ code: "CONFLICT", message: "This signatory has already signed" });
    }

    const signatories = request.signatories.map((s, i) =>
      i === idx ? { ...s, signedAt: new Date().toISOString(), signatureRef: args.signatureRef } : s,
    );
    const status = deriveStatus(signatories);
    const allSigned = status === "fully_signed";

    await ctx.db.patch(args.id, {
      signatories,
      status,
      signedAt: allSigned ? new Date().toISOString() : request.signedAt,
    });

    await logAudit(ctx, {
      action: "sign", entity: "corporate_esignature_requests", entityId: args.id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Recorded signature from ${request.signatories[idx].name} (${args.email})${allSigned ? " — all signatories have now signed" : ""}`,
    });
  },
});

export const declineEsignatureRequest = mutation({
  args: { id: v.id("corporateEsignatureRequests"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.esignature_request");
    const request = await assertRequestVisible(ctx, user, args.id);

    if (["fully_signed", "cancelled", "expired", "declined"].includes(request.status)) {
      throw new ConvexError({ code: "CONFLICT", message: "This request can no longer be declined" });
    }

    await ctx.db.patch(args.id, { status: "declined" });

    await logAudit(ctx, {
      action: "decline", entity: "corporate_esignature_requests", entityId: args.id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Declined e-signature request${args.reason ? ` — ${args.reason}` : ""}`,
    });
  },
});

export const cancelEsignatureRequest = mutation({
  args: { id: v.id("corporateEsignatureRequests"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.esignature_request");
    const request = await assertRequestVisible(ctx, user, args.id);

    if (["fully_signed", "cancelled", "declined"].includes(request.status)) {
      throw new ConvexError({ code: "CONFLICT", message: "This request can no longer be cancelled" });
    }

    await ctx.db.patch(args.id, { status: "cancelled" });

    await logAudit(ctx, {
      action: "cancel", entity: "corporate_esignature_requests", entityId: args.id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Cancelled e-signature request${args.reason ? ` — ${args.reason}` : ""}`,
    });
  },
});

// Attaches the final fully-executed document (e.g. a scanned copy with all
// signatures) into the EXISTING vaultDocuments table reference — never a
// second document store.
export const attachFinalSignedDocument = mutation({
  args: { id: v.id("corporateEsignatureRequests"), finalSignedVaultDocumentId: v.id("vaultDocuments") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.esignature_request");
    const request = await assertRequestVisible(ctx, user, args.id);

    if (request.status !== "fully_signed") {
      throw new ConvexError({ code: "CONFLICT", message: "Only a fully signed request can have a final signed document attached" });
    }

    await ctx.db.patch(args.id, { finalSignedVaultDocumentId: args.finalSignedVaultDocumentId });

    await logAudit(ctx, {
      action: "update", entity: "corporate_esignature_requests", entityId: args.id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: "Attached final fully-signed document",
    });
  },
});

// Shared Convex storage upload URL for the final signed document (same
// pattern as convex/cms.ts / convex/propertyTours.ts / letters.ts).
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "corporate_marketing.esignature_request");
    return ctx.storage.generateUploadUrl();
  },
});
