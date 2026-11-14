import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";
import { nextLetterRef } from "./refs.ts";

// ══════════════════════════════════════════════════════════════════════════
// Partnership letters — draft, review, approval and sending workflow for the
// letters sent to prospective corporate organisations. The actual letter
// document lives in the EXISTING vaultDocuments table (never a second
// document store); approval routes through the EXISTING approvals table
// (never a second approval engine). Delivery and acknowledgement tracking
// live in deliveries.ts / acknowledgements.ts, both explicitly separate
// from e-signature (esignature.ts, later milestone) per the governing spec.
// ══════════════════════════════════════════════════════════════════════════

async function getOrgOwnerId(ctx: Parameters<typeof requirePermission>[0], organisationId: Id<"corporateOrganisations">): Promise<Id<"users"> | null | undefined> {
  const org = await ctx.db.get(organisationId);
  return org?.assignedOfficer ?? org?.relationshipOwner;
}

function getLetterOwnerIdFactory(ownerByOrg: Map<Id<"corporateOrganisations">, Id<"users"> | null | undefined>) {
  return (letter: Doc<"corporatePartnershipLetters">): Id<"users"> | null | undefined => ownerByOrg.get(letter.organisationId);
}

async function assertLetterVisible(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  letterId: Id<"corporatePartnershipLetters">,
): Promise<Doc<"corporatePartnershipLetters">> {
  const letter = await ctx.db.get(letterId);
  if (!letter) throw new ConvexError({ code: "NOT_FOUND", message: "Partnership letter not found" });
  const ownerId = await getOrgOwnerId(ctx, letter.organisationId);
  const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
  const [visible] = await filterByScope(ctx, [letter], scope, () => ownerId);
  if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this partnership letter" });
  return letter;
}

export const listLetters = query({
  args: {
    organisationId: v.optional(v.id("corporateOrganisations")),
    opportunityId: v.optional(v.id("corporateOpportunities")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");

    let rows: Doc<"corporatePartnershipLetters">[];
    if (args.opportunityId) {
      rows = await ctx.db.query("corporatePartnershipLetters").withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId!)).order("desc").collect();
    } else if (args.organisationId) {
      rows = await ctx.db.query("corporatePartnershipLetters").withIndex("by_organisation", (q) => q.eq("organisationId", args.organisationId!)).order("desc").collect();
    } else {
      rows = await ctx.db.query("corporatePartnershipLetters").order("desc").collect();
    }

    const orgIds = new Set(rows.map((r) => r.organisationId));
    const orgDocs = await Promise.all(Array.from(orgIds).map((id) => ctx.db.get(id)));
    const ownerByOrg = new Map<Id<"corporateOrganisations">, Id<"users"> | null | undefined>();
    for (const org of orgDocs) if (org) ownerByOrg.set(org._id, org.assignedOfficer ?? org.relationshipOwner);

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const scoped = await filterByScope(ctx, rows, scope, getLetterOwnerIdFactory(ownerByOrg));

    const orgNameById = new Map<Id<"corporateOrganisations">, string>();
    for (const org of orgDocs) if (org) orgNameById.set(org._id, org.name);

    return scoped.map((letter) => ({
      ...letter,
      organisationName: orgNameById.get(letter.organisationId) ?? "Unknown Organisation",
    }));
  },
});

export const getLetter = query({
  args: { id: v.id("corporatePartnershipLetters") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    const letter = await assertLetterVisible(ctx, user, args.id);

    const [organisation, contact, preparedBy, reviewedBy, approvedBy, vaultDoc, approval, deliveries, acknowledgements] = await Promise.all([
      ctx.db.get(letter.organisationId),
      letter.contactId ? ctx.db.get(letter.contactId) : null,
      letter.preparedBy ? ctx.db.get(letter.preparedBy) : null,
      letter.reviewedBy ? ctx.db.get(letter.reviewedBy) : null,
      letter.approvedBy ? ctx.db.get(letter.approvedBy) : null,
      letter.vaultDocumentId ? ctx.db.get(letter.vaultDocumentId) : null,
      letter.approvalId ? ctx.db.get(letter.approvalId) : null,
      ctx.db.query("corporateDeliveries").withIndex("by_letter", (q) => q.eq("letterId", letter._id)).collect(),
      ctx.db.query("corporateAcknowledgements").withIndex("by_letter", (q) => q.eq("letterId", letter._id)).collect(),
    ]);

    return {
      ...letter,
      organisationName: organisation?.name ?? "Unknown Organisation",
      contactName: contact?.name,
      preparedByName: preparedBy?.name ?? preparedBy?.email,
      reviewedByName: reviewedBy?.name ?? reviewedBy?.email,
      approvedByName: approvedBy?.name ?? approvedBy?.email,
      vaultDocument: vaultDoc,
      approvalStatus: approval?.status,
      deliveryCount: deliveries.length,
      acknowledgementCount: acknowledgements.length,
    };
  },
});

export const createLetter = mutation({
  args: {
    organisationId: v.id("corporateOrganisations"),
    opportunityId: v.optional(v.id("corporateOpportunities")),
    contactId: v.optional(v.id("corporateContacts")),
    subject: v.string(),
    vaultDocumentId: v.optional(v.id("vaultDocuments")),
    followUpDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.create");
    if (!args.subject.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Subject is required" });

    const organisation = await ctx.db.get(args.organisationId);
    if (!organisation) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });

    const letterRef = await nextLetterRef(ctx);
    const id = await ctx.db.insert("corporatePartnershipLetters", {
      letterRef,
      organisationId: args.organisationId,
      opportunityId: args.opportunityId,
      contactId: args.contactId,
      subject: args.subject.trim(),
      status: "draft",
      vaultDocumentId: args.vaultDocumentId,
      preparedBy: user._id,
      followUpDate: args.followUpDate,
      notes: args.notes,
      createdBy: user._id,
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_partnership_letters", entityId: id, entityRef: letterRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Drafted partnership letter "${args.subject.trim()}" for "${organisation.name}"`,
    });

    return id;
  },
});

export const updateLetter = mutation({
  args: {
    id: v.id("corporatePartnershipLetters"),
    subject: v.optional(v.string()),
    contactId: v.optional(v.id("corporateContacts")),
    vaultDocumentId: v.optional(v.id("vaultDocuments")),
    followUpDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const { id, ...patch } = args;
    const letter = await assertLetterVisible(ctx, user, id);

    if (letter.status !== "draft" && letter.status !== "in_review") {
      throw new ConvexError({ code: "CONFLICT", message: "This letter has already been approved or sent and can no longer be edited" });
    }

    await ctx.db.patch(id, patch);

    await logAudit(ctx, {
      action: "update", entity: "corporate_partnership_letters", entityId: id, entityRef: letter.letterRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated partnership letter "${letter.subject}"`,
      before: JSON.stringify(letter),
      after: JSON.stringify(patch),
    });
  },
});

// Submits a draft letter for review/approval by creating a record in the
// EXISTING approvals table — never a second approval engine.
export const submitLetterForApproval = mutation({
  args: { id: v.id("corporatePartnershipLetters") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const letter = await assertLetterVisible(ctx, user, args.id);

    if (letter.status !== "draft") {
      throw new ConvexError({ code: "CONFLICT", message: "Only draft letters can be submitted for review" });
    }
    if (!letter.vaultDocumentId) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Attach the letter document before submitting for review" });
    }

    const organisation = await ctx.db.get(letter.organisationId);

    const approvalRef = await (async () => {
      const last = await ctx.db.query("approvals").order("desc").first();
      const n = last ? parseInt(last.approvalRef.replace("GWS-APR-", "") || "0", 10) + 1 : 1;
      return `GWS-APR-${String(n).padStart(4, "0")}`;
    })();

    const approvalId = await ctx.db.insert("approvals", {
      approvalRef,
      approvalType: "corporate_partnership_letter",
      status: "pending",
      priority: "medium",
      summary: `Approve partnership letter "${letter.subject}" for ${organisation?.name ?? "corporate organisation"}`,
      relatedRef: letter.letterRef,
      requestedBy: user._id,
      requestedAt: new Date().toISOString(),
    });

    await ctx.db.patch(args.id, { status: "in_review", reviewedBy: undefined, approvalId });

    await logAudit(ctx, {
      action: "submit_for_approval", entity: "corporate_partnership_letters", entityId: args.id, entityRef: letter.letterRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Submitted partnership letter "${letter.subject}" for approval`,
    });

    return approvalId;
  },
});

// Approves (or rejects) a letter previously submitted for review. Reflects
// the decision already made on the linked `approvals` record — call
// `taskboard.decideApproval` first, then this to sync the letter status.
export const decideLetterApproval = mutation({
  args: {
    id: v.id("corporatePartnershipLetters"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    decisionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.approve");
    const letter = await assertLetterVisible(ctx, user, args.id);

    if (letter.status !== "in_review") {
      throw new ConvexError({ code: "CONFLICT", message: "Only letters in review can be approved or rejected" });
    }

    if (letter.approvalId) {
      const approval = await ctx.db.get(letter.approvalId);
      if (approval && approval.status === "pending") {
        await ctx.db.patch(letter.approvalId, {
          status: args.decision,
          decision: args.decision,
          decisionNote: args.decisionNote,
          decisionBy: user._id,
          decisionAt: new Date().toISOString(),
        });
      }
    }

    await ctx.db.patch(args.id, {
      status: args.decision === "approved" ? "approved" : "draft",
      reviewedBy: user._id,
      approvedBy: args.decision === "approved" ? user._id : undefined,
      approvedAt: args.decision === "approved" ? new Date().toISOString() : undefined,
    });

    await logAudit(ctx, {
      action: args.decision === "approved" ? "approve" : "reject",
      entity: "corporate_partnership_letters", entityId: args.id, entityRef: letter.letterRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `${args.decision === "approved" ? "Approved" : "Rejected"} partnership letter "${letter.subject}"${args.decisionNote ? ` — ${args.decisionNote}` : ""}`,
    });
  },
});

// Marks an approved letter as sent. Delivery proof is recorded separately in
// deliveries.ts once the physical/electronic delivery actually happens.
export const sendLetter = mutation({
  args: { id: v.id("corporatePartnershipLetters") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.send");
    const letter = await assertLetterVisible(ctx, user, args.id);

    if (letter.status !== "approved") {
      throw new ConvexError({ code: "CONFLICT", message: "Only approved letters can be sent" });
    }

    await ctx.db.patch(args.id, { status: "sent", sentAt: new Date().toISOString() });

    await logAudit(ctx, {
      action: "send", entity: "corporate_partnership_letters", entityId: args.id, entityRef: letter.letterRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Sent partnership letter "${letter.subject}"`,
    });
  },
});

export const cancelLetter = mutation({
  args: { id: v.id("corporatePartnershipLetters"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const letter = await assertLetterVisible(ctx, user, args.id);

    if (letter.status === "delivered" || letter.status === "acknowledged") {
      throw new ConvexError({ code: "CONFLICT", message: "A delivered or acknowledged letter cannot be cancelled" });
    }

    await ctx.db.patch(args.id, { status: "cancelled" });

    await logAudit(ctx, {
      action: "cancel", entity: "corporate_partnership_letters", entityId: args.id, entityRef: letter.letterRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Cancelled partnership letter "${letter.subject}"${args.reason ? ` — ${args.reason}` : ""}`,
    });
  },
});

// ── Shared Convex storage upload URL for letter documents (same pattern as
// convex/cms.ts / convex/propertyTours.ts) — files still land in the
// EXISTING vaultDocuments table via docvault.createDocument, never a
// second document store.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "corporate_marketing.document_upload");
    return ctx.storage.generateUploadUrl();
  },
});
