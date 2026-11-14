import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";
import { nextEoiRef } from "./refs.ts";

// ══════════════════════════════════════════════════════════════════════════
// Expressions of Interest — request/track formal EOIs from a corporate
// prospect ahead of a full proposal. The EOI document (if any) lives in the
// EXISTING vaultDocuments table. Every EOI action also lands a row in
// corporateActivities so it surfaces on the unified activity timeline.
// ══════════════════════════════════════════════════════════════════════════

function getOpportunityOwnerId(opp: Doc<"corporateOpportunities">): Id<"users"> | null | undefined {
  return opp.assignedOfficer ?? opp.relationshipOwner;
}

async function assertOpportunityVisible(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  opportunityId: Id<"corporateOpportunities">,
): Promise<Doc<"corporateOpportunities">> {
  const opp = await ctx.db.get(opportunityId);
  if (!opp) throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found" });
  const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
  const [visible] = await filterByScope(ctx, [opp], scope, getOpportunityOwnerId);
  if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this opportunity" });
  return opp;
}

async function assertEoiVisible(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  id: Id<"corporateEois">,
): Promise<{ eoi: Doc<"corporateEois">; opp: Doc<"corporateOpportunities"> }> {
  const eoi = await ctx.db.get(id);
  if (!eoi) throw new ConvexError({ code: "NOT_FOUND", message: "Expression of Interest not found" });
  const opp = await assertOpportunityVisible(ctx, user, eoi.opportunityId);
  return { eoi, opp };
}

export const listEois = query({
  args: { opportunityId: v.id("corporateOpportunities") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    await assertOpportunityVisible(ctx, user, args.opportunityId);

    const rows = await ctx.db.query("corporateEois").withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId)).order("desc").collect();

    const contactIds = new Set(rows.map((r) => r.contactId).filter((v): v is Id<"corporateContacts"> => !!v));
    const contacts = await Promise.all(Array.from(contactIds).map((id) => ctx.db.get(id)));
    const contactNameById = new Map<Id<"corporateContacts">, string>();
    for (const c of contacts) if (c) contactNameById.set(c._id, c.name);

    return rows.map((r) => ({ ...r, contactName: r.contactId ? contactNameById.get(r.contactId) : undefined }));
  },
});

export const requestEoi = mutation({
  args: {
    opportunityId: v.id("corporateOpportunities"),
    contactId: v.optional(v.id("corporateContacts")),
    requestedDate: v.optional(v.string()),
    deadline: v.optional(v.string()),
    requirements: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    responsibleOfficer: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"corporateEois">> => {
    const user = await requirePermission(ctx, "corporate_marketing.eoi_manage");
    const opp = await assertOpportunityVisible(ctx, user, args.opportunityId);

    const eoiRef = await nextEoiRef(ctx);
    const id = await ctx.db.insert("corporateEois", {
      eoiRef,
      opportunityId: args.opportunityId,
      status: "requested",
      requestedDate: args.requestedDate ?? new Date().toISOString(),
      deadline: args.deadline,
      contactId: args.contactId,
      requirements: args.requirements,
      estimatedValue: args.estimatedValue,
      responsibleOfficer: args.responsibleOfficer ?? user._id,
      notes: args.notes,
      createdBy: user._id,
    });

    await ctx.db.insert("corporateActivities", {
      organisationId: opp.organisationId,
      opportunityId: opp._id,
      contactId: args.contactId,
      activityType: "eoi",
      subject: `EOI requested (${eoiRef})`,
      notes: args.requirements,
      nextActionDate: args.deadline,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_eois", entityId: id, entityRef: eoiRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Requested Expression of Interest for opportunity "${opp.name}"`,
    });

    return id;
  },
});

export const recordEoiReceived = mutation({
  args: {
    id: v.id("corporateEois"),
    receivedDate: v.optional(v.string()),
    vaultDocumentId: v.optional(v.id("vaultDocuments")),
    estimatedValue: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.eoi_manage");
    const { eoi, opp } = await assertEoiVisible(ctx, user, args.id);

    if (eoi.status !== "requested") {
      throw new ConvexError({ code: "CONFLICT", message: "Only a requested EOI can be marked as received" });
    }

    await ctx.db.patch(args.id, {
      status: "received",
      receivedDate: args.receivedDate ?? new Date().toISOString(),
      vaultDocumentId: args.vaultDocumentId ?? eoi.vaultDocumentId,
      estimatedValue: args.estimatedValue ?? eoi.estimatedValue,
      notes: args.notes ?? eoi.notes,
    });

    // Roll the received EOI up onto the opportunity's line items so the bulk
    // acquisition funnel reflects it, without creating a second quantity
    // ledger. This is a manual rollup left to line item editing for now
    // (see lineItems.ts) — quantities are set explicitly per line item.
    await ctx.db.insert("corporateActivities", {
      organisationId: opp.organisationId,
      opportunityId: opp._id,
      contactId: eoi.contactId,
      activityType: "eoi",
      subject: `EOI received (${eoi.eoiRef})`,
      notes: args.notes,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "update", entity: "corporate_eois", entityId: args.id, entityRef: eoi.eoiRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Recorded receipt of Expression of Interest for opportunity "${opp.name}"`,
    });
  },
});

export const markEoiExpired = mutation({
  args: { id: v.id("corporateEois") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.eoi_manage");
    const { eoi, opp } = await assertEoiVisible(ctx, user, args.id);

    if (eoi.status !== "requested") {
      throw new ConvexError({ code: "CONFLICT", message: "Only a requested EOI can be marked as expired" });
    }

    await ctx.db.patch(args.id, { status: "expired" });

    await logAudit(ctx, {
      action: "update", entity: "corporate_eois", entityId: args.id, entityRef: eoi.eoiRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Marked Expression of Interest as expired for opportunity "${opp.name}"`,
    });
  },
});

export const updateEoi = mutation({
  args: {
    id: v.id("corporateEois"),
    deadline: v.optional(v.string()),
    requirements: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    responsibleOfficer: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.eoi_manage");
    const { id, ...patch } = args;
    const { eoi, opp } = await assertEoiVisible(ctx, user, id);

    await ctx.db.patch(id, patch);

    await logAudit(ctx, {
      action: "update", entity: "corporate_eois", entityId: id, entityRef: eoi.eoiRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated Expression of Interest for opportunity "${opp.name}"`,
    });
  },
});

// Shared Convex storage upload URL for EOI documents (same pattern as
// convex/cms.ts / letters.ts / meetings.ts).
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "corporate_marketing.document_upload");
    return ctx.storage.generateUploadUrl();
  },
});
