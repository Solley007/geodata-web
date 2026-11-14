import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";
import { nextNegotiationRef } from "./refs.ts";

// ══════════════════════════════════════════════════════════════════════════
// Structured negotiation — records the back-and-forth on quantity, price,
// payment terms and allocation terms for a specific bulk line item (or, if
// no line item is given, at the whole-opportunity level for commercial
// terms that span every property type). Approval for a negotiated discount
// routes through the EXISTING approvals table — never a second approval
// engine. Once approved (or when no approval is required), the negotiated
// figures are written back onto the EXISTING corporateOpportunityLineItems
// row — never a parallel quantity/price ledger.
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

async function assertNegotiationVisible(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  id: Id<"corporateNegotiations">,
): Promise<{ negotiation: Doc<"corporateNegotiations">; opp: Doc<"corporateOpportunities"> }> {
  const negotiation = await ctx.db.get(id);
  if (!negotiation) throw new ConvexError({ code: "NOT_FOUND", message: "Negotiation not found" });
  const opp = await assertOpportunityVisible(ctx, user, negotiation.opportunityId);
  return { negotiation, opp };
}

async function nextApprovalRef(ctx: Parameters<typeof requirePermission>[0]): Promise<string> {
  const last = await ctx.db.query("approvals").order("desc").first();
  const n = last ? parseInt(last.approvalRef.replace("GWS-APR-", "") || "0", 10) + 1 : 1;
  return `GWS-APR-${String(n).padStart(4, "0")}`;
}

export const listNegotiations = query({
  args: {
    opportunityId: v.id("corporateOpportunities"),
    lineItemId: v.optional(v.id("corporateOpportunityLineItems")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    await assertOpportunityVisible(ctx, user, args.opportunityId);

    let rows: Doc<"corporateNegotiations">[];
    if (args.lineItemId) {
      rows = await ctx.db.query("corporateNegotiations").withIndex("by_lineitem", (q) => q.eq("lineItemId", args.lineItemId!)).order("desc").collect();
    } else {
      rows = await ctx.db.query("corporateNegotiations").withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId)).order("desc").collect();
    }

    const lineItemIds = new Set(rows.map((r) => r.lineItemId).filter((v): v is Id<"corporateOpportunityLineItems"> => !!v));
    const lineItems = await Promise.all(Array.from(lineItemIds).map((id) => ctx.db.get(id)));
    const lineItemLabelById = new Map<Id<"corporateOpportunityLineItems">, string>();
    for (const li of lineItems) if (li) lineItemLabelById.set(li._id, li.propertyType ?? "Line item");

    const approvalIds = new Set(rows.map((r) => r.approvalId).filter((v): v is Id<"approvals"> => !!v));
    const approvals = await Promise.all(Array.from(approvalIds).map((id) => ctx.db.get(id)));
    const approvalStatusById = new Map<Id<"approvals">, string>();
    for (const a of approvals) if (a) approvalStatusById.set(a._id, a.status);

    return rows.map((r) => ({
      ...r,
      lineItemLabel: r.lineItemId ? lineItemLabelById.get(r.lineItemId) : "Whole opportunity",
      linkedApprovalStatus: r.approvalId ? approvalStatusById.get(r.approvalId) : undefined,
    }));
  },
});

export const getNegotiation = query({
  args: { id: v.id("corporateNegotiations") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    const { negotiation } = await assertNegotiationVisible(ctx, user, args.id);

    const [lineItem, approval] = await Promise.all([
      negotiation.lineItemId ? ctx.db.get(negotiation.lineItemId) : null,
      negotiation.approvalId ? ctx.db.get(negotiation.approvalId) : null,
    ]);

    return {
      ...negotiation,
      lineItemLabel: lineItem?.propertyType ?? (negotiation.lineItemId ? "Line item" : "Whole opportunity"),
      approvalDecisionNote: approval?.decisionNote,
    };
  },
});

export const createNegotiation = mutation({
  args: {
    opportunityId: v.id("corporateOpportunities"),
    lineItemId: v.optional(v.id("corporateOpportunityLineItems")),
    startingQuantity: v.optional(v.number()),
    proposedQuantity: v.optional(v.number()),
    startingPrice: v.optional(v.number()),
    proposedPrice: v.optional(v.number()),
    discountRequested: v.optional(v.number()),
    paymentTerms: v.optional(v.string()),
    allocationTerms: v.optional(v.string()),
    otherTerms: v.optional(v.string()),
    negotiationNotes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"corporateNegotiations">> => {
    const user = await requirePermission(ctx, "corporate_marketing.negotiation_manage");
    const opp = await assertOpportunityVisible(ctx, user, args.opportunityId);

    if (args.lineItemId) {
      const lineItem = await ctx.db.get(args.lineItemId);
      if (!lineItem || lineItem.opportunityId !== args.opportunityId) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Line item does not belong to this opportunity" });
      }
    }

    const negotiationRef = await nextNegotiationRef(ctx);
    const id = await ctx.db.insert("corporateNegotiations", {
      negotiationRef,
      opportunityId: args.opportunityId,
      lineItemId: args.lineItemId,
      startingQuantity: args.startingQuantity,
      proposedQuantity: args.proposedQuantity,
      startingPrice: args.startingPrice,
      proposedPrice: args.proposedPrice,
      discountRequested: args.discountRequested,
      paymentTerms: args.paymentTerms,
      allocationTerms: args.allocationTerms,
      otherTerms: args.otherTerms,
      negotiationNotes: args.negotiationNotes,
      negotiatedBy: user._id,
      approvalStatus: "not_required",
      negotiatedAt: new Date().toISOString(),
    });

    await ctx.db.insert("corporateActivities", {
      organisationId: opp.organisationId,
      opportunityId: opp._id,
      activityType: "negotiation",
      subject: `Negotiation opened (${negotiationRef})`,
      notes: args.negotiationNotes,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_negotiations", entityId: id, entityRef: negotiationRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Opened negotiation for opportunity "${opp.name}"`,
    });

    return id;
  },
});

export const updateNegotiationTerms = mutation({
  args: {
    id: v.id("corporateNegotiations"),
    proposedQuantity: v.optional(v.number()),
    proposedPrice: v.optional(v.number()),
    discountRequested: v.optional(v.number()),
    paymentTerms: v.optional(v.string()),
    allocationTerms: v.optional(v.string()),
    otherTerms: v.optional(v.string()),
    negotiationNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.negotiation_manage");
    const { id, ...patch } = args;
    const { negotiation, opp } = await assertNegotiationVisible(ctx, user, id);

    if (negotiation.approvalStatus === "approved") {
      throw new ConvexError({ code: "CONFLICT", message: "This negotiation has already been approved and finalised" });
    }

    await ctx.db.patch(id, { ...patch, negotiatedAt: new Date().toISOString() });

    await logAudit(ctx, {
      action: "update", entity: "corporate_negotiations", entityId: id, entityRef: negotiation.negotiationRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated negotiation terms for opportunity "${opp.name}"`,
      before: JSON.stringify(negotiation),
      after: JSON.stringify(patch),
    });
  },
});

// Submits a negotiated discount/terms package for internal commercial
// approval via the EXISTING approvals table — never a second approval
// engine. Only required when the negotiator wants a formal sign-off (e.g.
// a discount beyond their own authority); simple terms can be finalised
// directly with finalizeNegotiation.
export const requestNegotiationApproval = mutation({
  args: { id: v.id("corporateNegotiations") },
  handler: async (ctx, args): Promise<Id<"approvals">> => {
    const user = await requirePermission(ctx, "corporate_marketing.negotiation_manage");
    const { negotiation, opp } = await assertNegotiationVisible(ctx, user, args.id);

    if (negotiation.approvalStatus === "approved") {
      throw new ConvexError({ code: "CONFLICT", message: "This negotiation has already been approved" });
    }
    if (negotiation.approvalStatus === "pending") {
      throw new ConvexError({ code: "CONFLICT", message: "An approval request is already pending for this negotiation" });
    }

    const approvalRef = await nextApprovalRef(ctx);
    const approvalId = await ctx.db.insert("approvals", {
      approvalRef,
      approvalType: "corporate_negotiation",
      status: "pending",
      priority: "medium",
      summary: `Approve negotiated terms for "${opp.name}"${negotiation.discountRequested ? ` (discount requested: ${negotiation.discountRequested}%)` : ""}`,
      relatedRef: negotiation.negotiationRef,
      requestedBy: user._id,
      requestedAt: new Date().toISOString(),
    });

    await ctx.db.patch(args.id, { approvalStatus: "pending", approvalId });

    await logAudit(ctx, {
      action: "submit_for_approval", entity: "corporate_negotiations", entityId: args.id, entityRef: negotiation.negotiationRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Submitted negotiated terms for opportunity "${opp.name}" for approval`,
    });

    return approvalId;
  },
});

// Reflects a decision already made on the linked `approvals` record — call
// `taskboard.decideApproval` first, then this to sync the negotiation.
export const decideNegotiationApproval = mutation({
  args: {
    id: v.id("corporateNegotiations"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    decisionNote: v.optional(v.string()),
    discountApproved: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.approve");
    const { negotiation, opp } = await assertNegotiationVisible(ctx, user, args.id);

    if (negotiation.approvalStatus !== "pending") {
      throw new ConvexError({ code: "CONFLICT", message: "Only a negotiation pending approval can be decided" });
    }

    if (negotiation.approvalId) {
      const approval = await ctx.db.get(negotiation.approvalId);
      if (approval && approval.status === "pending") {
        await ctx.db.patch(negotiation.approvalId, {
          status: args.decision,
          decision: args.decision,
          decisionNote: args.decisionNote,
          decisionBy: user._id,
          decisionAt: new Date().toISOString(),
        });
      }
    }

    await ctx.db.patch(args.id, {
      approvalStatus: args.decision === "approved" ? "approved" : "rejected",
      discountApproved: args.decision === "approved" ? (args.discountApproved ?? negotiation.discountRequested) : negotiation.discountApproved,
    });

    await logAudit(ctx, {
      action: args.decision === "approved" ? "approve" : "reject",
      entity: "corporate_negotiations", entityId: args.id, entityRef: negotiation.negotiationRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `${args.decision === "approved" ? "Approved" : "Rejected"} negotiated terms for opportunity "${opp.name}"${args.decisionNote ? ` — ${args.decisionNote}` : ""}`,
    });
  },
});

// Finalises negotiated quantity/price back onto the line item's EXISTING
// quantityNegotiated/negotiatedPrice fields (never a second quantity/price
// ledger). Requires either no approval to be needed, or an approved one.
export const finalizeNegotiation = mutation({
  args: {
    id: v.id("corporateNegotiations"),
    negotiatedQuantity: v.optional(v.number()),
    negotiatedPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.negotiation_manage");
    const { negotiation, opp } = await assertNegotiationVisible(ctx, user, args.id);

    if (negotiation.approvalStatus === "pending") {
      throw new ConvexError({ code: "CONFLICT", message: "This negotiation is awaiting commercial approval before it can be finalised" });
    }
    if (negotiation.approvalStatus === "rejected") {
      throw new ConvexError({ code: "CONFLICT", message: "This negotiation was rejected and cannot be finalised" });
    }

    const negotiatedQuantity = args.negotiatedQuantity ?? negotiation.proposedQuantity;
    const negotiatedPrice = args.negotiatedPrice ?? negotiation.proposedPrice;

    await ctx.db.patch(args.id, { negotiatedQuantity, negotiatedPrice, negotiatedAt: new Date().toISOString() });

    if (negotiation.lineItemId) {
      const lineItem = await ctx.db.get(negotiation.lineItemId);
      if (lineItem) {
        await ctx.db.patch(negotiation.lineItemId, {
          quantityNegotiated: negotiatedQuantity ?? lineItem.quantityNegotiated,
          negotiatedPrice: negotiatedPrice ?? lineItem.negotiatedPrice,
          discountPercent: negotiation.discountApproved ?? negotiation.discountRequested ?? lineItem.discountPercent,
        });
      }
    }

    await ctx.db.insert("corporateActivities", {
      organisationId: opp.organisationId,
      opportunityId: opp._id,
      activityType: "negotiation",
      subject: `Negotiation finalised (${negotiation.negotiationRef})`,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "finalize", entity: "corporate_negotiations", entityId: args.id, entityRef: negotiation.negotiationRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Finalised negotiated terms for opportunity "${opp.name}"`,
    });
  },
});
