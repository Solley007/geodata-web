import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import type { MutationCtx } from "../_generated/server";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";
import { recomputeAcquisitionRollups } from "./bulkAcquisitions.ts";

// ══════════════════════════════════════════════════════════════════════════
// Bulk line items — one row per property type within a corporate
// opportunity, tracking quantity through the full bulk-acquisition funnel:
// required → EOI → proposed → negotiated → committed → paid → allocated.
// Allocation itself still happens in the EXISTING Plot Allocation system;
// `quantityAllocated`/`allocationStatus` here are a rollup for visibility,
// never a second allocation engine.
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

function deriveAllocationStatus(quantityRequired: number, quantityAllocated: number): "not_started" | "partial" | "completed" {
  if (quantityAllocated <= 0) return "not_started";
  if (quantityAllocated >= quantityRequired) return "completed";
  return "partial";
}

// Enforces the quantity chain from spec section 7: each stage cannot exceed
// the stage before it, and outstanding (required - paid) never goes
// negative. Applied on every create/update so quantities can never drift
// into an invalid state, regardless of which field was edited.
function validateQuantityChain(next: {
  quantityRequired: number;
  quantityEoi: number;
  quantityProposed: number;
  quantityNegotiated: number;
  quantityCommitted: number;
  quantityPaid: number;
  quantityAllocated: number;
}): void {
  const { quantityRequired, quantityEoi, quantityProposed, quantityNegotiated, quantityCommitted, quantityPaid, quantityAllocated } = next;
  for (const [label, value] of Object.entries(next)) {
    if (value < 0) throw new ConvexError({ code: "BAD_REQUEST", message: `${label} cannot be negative` });
  }
  if (quantityEoi > quantityRequired) throw new ConvexError({ code: "BAD_REQUEST", message: "EOI quantity cannot exceed the required quantity" });
  if (quantityProposed > quantityRequired) throw new ConvexError({ code: "BAD_REQUEST", message: "Proposed quantity cannot exceed the required quantity" });
  if (quantityNegotiated > quantityRequired) throw new ConvexError({ code: "BAD_REQUEST", message: "Negotiated quantity cannot exceed the required quantity" });
  // Committed is bounded by negotiated once negotiation has started, otherwise by required directly.
  const committedCeiling = quantityNegotiated > 0 ? quantityNegotiated : quantityRequired;
  if (quantityCommitted > committedCeiling) {
    throw new ConvexError({ code: "BAD_REQUEST", message: "Committed quantity cannot exceed the negotiated (or required) quantity" });
  }
  if (quantityPaid > quantityCommitted) throw new ConvexError({ code: "BAD_REQUEST", message: "Paid quantity cannot exceed the committed quantity" });
  if (quantityAllocated > quantityPaid) throw new ConvexError({ code: "BAD_REQUEST", message: "Allocated quantity cannot exceed the quantity already paid for" });
  if (quantityRequired - quantityPaid < 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Outstanding quantity cannot be negative" });
}

async function recomputeIfLinked(ctx: MutationCtx, lineItem: Pick<Doc<"corporateOpportunityLineItems">, "bulkAcquisitionId">): Promise<void> {
  if (!lineItem.bulkAcquisitionId) return;
  await recomputeAcquisitionRollups(ctx, lineItem.bulkAcquisitionId);
}


export const listLineItems = query({
  args: { opportunityId: v.id("corporateOpportunities") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    await assertOpportunityVisible(ctx, user, args.opportunityId);

    const rows = await ctx.db.query("corporateOpportunityLineItems").withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId)).collect();

    const propertyIds = new Set<Id<"properties">>();
    const estateIds = new Set<Id<"estates">>();
    for (const r of rows) {
      if (r.propertyId) propertyIds.add(r.propertyId);
      if (r.estateId) estateIds.add(r.estateId);
    }
    const [properties, estates] = await Promise.all([
      Promise.all(Array.from(propertyIds).map((id) => ctx.db.get(id))),
      Promise.all(Array.from(estateIds).map((id) => ctx.db.get(id))),
    ]);
    const propertyById = new Map(properties.filter((p): p is Doc<"properties"> => p !== null).map((p) => [p._id, p]));
    const estateById = new Map(estates.filter((e): e is Doc<"estates"> => e !== null).map((e) => [e._id, e]));

    return rows.map((r) => ({
      ...r,
      propertyTitle: r.propertyId ? propertyById.get(r.propertyId)?.title : undefined,
      estateName: r.estateId ? estateById.get(r.estateId)?.name : undefined,
    }));
  },
});

// Line items scoped to a single bulk acquisition (Institutional / Bulk
// Acquisition Management enhancement) — same underlying table and index as
// listLineItems, just filtered to the ones linked via bulkAcquisitionId.
export const listLineItemsForAcquisition = query({
  args: { acquisitionId: v.id("corporateBulkAcquisitions") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");
    const acq = await ctx.db.get(args.acquisitionId);
    if (!acq) throw new ConvexError({ code: "NOT_FOUND", message: "Bulk acquisition not found" });
    await assertOpportunityVisible(ctx, user, acq.opportunityId);

    const rows = (await ctx.db.query("corporateOpportunityLineItems").withIndex("by_opportunity", (q) => q.eq("opportunityId", acq.opportunityId)).collect())
      .filter((r) => r.bulkAcquisitionId === args.acquisitionId);

    const propertyIds = new Set<Id<"properties">>();
    const estateIds = new Set<Id<"estates">>();
    for (const r of rows) {
      if (r.propertyId) propertyIds.add(r.propertyId);
      if (r.estateId) estateIds.add(r.estateId);
    }
    const [properties, estates] = await Promise.all([
      Promise.all(Array.from(propertyIds).map((id) => ctx.db.get(id))),
      Promise.all(Array.from(estateIds).map((id) => ctx.db.get(id))),
    ]);
    const propertyById = new Map(properties.filter((p): p is Doc<"properties"> => p !== null).map((p) => [p._id, p]));
    const estateById = new Map(estates.filter((e): e is Doc<"estates"> => e !== null).map((e) => [e._id, e]));

    return rows.map((r) => ({
      ...r,
      propertyTitle: r.propertyId ? propertyById.get(r.propertyId)?.title : undefined,
      estateName: r.estateId ? estateById.get(r.estateId)?.name : undefined,
    }));
  },
});

// Line items on the parent opportunity that are NOT yet linked to any bulk
// acquisition — used by the "link existing line items" picker so officers
// never have to re-enter data that already exists.
export const listUnlinkedLineItems = query({
  args: { opportunityId: v.id("corporateOpportunities") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");
    await assertOpportunityVisible(ctx, user, args.opportunityId);
    const rows = await ctx.db.query("corporateOpportunityLineItems").withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId)).collect();
    return rows.filter((r) => !r.bulkAcquisitionId);
  },
});

export const createLineItem = mutation({
  args: {
    opportunityId: v.id("corporateOpportunities"),
    bulkAcquisitionId: v.optional(v.id("corporateBulkAcquisitions")),
    propertyId: v.optional(v.id("properties")),
    estateId: v.optional(v.id("estates")),
    propertyType: v.optional(v.string()),
    description: v.optional(v.string()),
    quantityRequired: v.number(),
    standardPrice: v.optional(v.number()),
    bulkPrice: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.create");
    const opp = await assertOpportunityVisible(ctx, user, args.opportunityId);

    if (args.quantityRequired <= 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Quantity required must be greater than zero" });
    if (!args.propertyId && !args.estateId && !args.propertyType?.trim()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Select a property, an estate, or enter a property type" });
    }

    let bulkAcquisitionId = args.bulkAcquisitionId;
    if (bulkAcquisitionId) {
      const acq = await ctx.db.get(bulkAcquisitionId);
      if (!acq || acq.opportunityId !== args.opportunityId) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Bulk acquisition does not belong to this opportunity" });
      }
    }

    const id = await ctx.db.insert("corporateOpportunityLineItems", {
      opportunityId: args.opportunityId,
      bulkAcquisitionId,
      propertyId: args.propertyId,
      estateId: args.estateId,
      propertyType: args.propertyType,
      description: args.description,
      quantityRequired: args.quantityRequired,
      quantityEoi: 0,
      quantityProposed: 0,
      quantityNegotiated: 0,
      quantityCommitted: 0,
      quantityPaid: 0,
      quantityAllocated: 0,
      standardPrice: args.standardPrice,
      bulkPrice: args.bulkPrice,
      unitPrice: args.unitPrice,
      allocationStatus: "not_started",
      notes: args.notes,
    });

    if (bulkAcquisitionId) await recomputeAcquisitionRollups(ctx, bulkAcquisitionId);

    await logAudit(ctx, {
      action: "create", entity: "corporate_opportunity_line_items", entityId: id, entityRef: opp.opportunityRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Added bulk line item to opportunity "${opp.name}" (qty required: ${args.quantityRequired})`,
    });

    return id;
  },
});

export const updateLineItem = mutation({
  args: {
    id: v.id("corporateOpportunityLineItems"),
    propertyType: v.optional(v.string()),
    description: v.optional(v.string()),
    quantityRequired: v.optional(v.number()),
    quantityEoi: v.optional(v.number()),
    quantityProposed: v.optional(v.number()),
    quantityNegotiated: v.optional(v.number()),
    quantityCommitted: v.optional(v.number()),
    quantityPaid: v.optional(v.number()),
    quantityAllocated: v.optional(v.number()),
    standardPrice: v.optional(v.number()),
    bulkPrice: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    proposedPrice: v.optional(v.number()),
    negotiatedPrice: v.optional(v.number()),
    approvedPrice: v.optional(v.number()),
    discountPercent: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const { id, ...patch } = args;
    const item = await ctx.db.get(id);
    if (!item) throw new ConvexError({ code: "NOT_FOUND", message: "Line item not found" });
    const opp = await assertOpportunityVisible(ctx, user, item.opportunityId);

    const nextQuantities = {
      quantityRequired: patch.quantityRequired ?? item.quantityRequired,
      quantityEoi: patch.quantityEoi ?? item.quantityEoi,
      quantityProposed: patch.quantityProposed ?? item.quantityProposed,
      quantityNegotiated: patch.quantityNegotiated ?? item.quantityNegotiated,
      quantityCommitted: patch.quantityCommitted ?? item.quantityCommitted,
      quantityPaid: patch.quantityPaid ?? item.quantityPaid,
      quantityAllocated: patch.quantityAllocated ?? item.quantityAllocated,
    };
    validateQuantityChain(nextQuantities);

    const allocationStatus = deriveAllocationStatus(nextQuantities.quantityRequired, nextQuantities.quantityAllocated);

    await ctx.db.patch(id, { ...patch, allocationStatus });
    await recomputeIfLinked(ctx, item);

    await logAudit(ctx, {
      action: "update", entity: "corporate_opportunity_line_items", entityId: id, entityRef: opp.opportunityRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated bulk line item on opportunity "${opp.name}"`,
      before: JSON.stringify(item),
      after: JSON.stringify(patch),
    });
  },
});

export const deleteLineItem = mutation({
  args: { id: v.id("corporateOpportunityLineItems") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const item = await ctx.db.get(args.id);
    if (!item) throw new ConvexError({ code: "NOT_FOUND", message: "Line item not found" });
    const opp = await assertOpportunityVisible(ctx, user, item.opportunityId);

    if (item.quantityPaid > 0 || item.quantityAllocated > 0) {
      throw new ConvexError({ code: "CONFLICT", message: "Cannot remove a line item that already has payments or allocations recorded" });
    }

    await ctx.db.delete(args.id);
    await recomputeIfLinked(ctx, item);

    await logAudit(ctx, {
      action: "delete", entity: "corporate_opportunity_line_items", entityId: args.id, entityRef: opp.opportunityRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Removed bulk line item from opportunity "${opp.name}"`,
      before: JSON.stringify(item),
    });
  },
});

// ── Link / unlink an existing line item to a bulk acquisition ─────────────
// Never re-creates the line item — reuses the exact same row so any
// quantities/payments/allocations already recorded on it carry over intact.
export const linkLineItemToAcquisition = mutation({
  args: { lineItemId: v.id("corporateOpportunityLineItems"), acquisitionId: v.id("corporateBulkAcquisitions") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_edit");
    const item = await ctx.db.get(args.lineItemId);
    if (!item) throw new ConvexError({ code: "NOT_FOUND", message: "Line item not found" });
    const acq = await ctx.db.get(args.acquisitionId);
    if (!acq) throw new ConvexError({ code: "NOT_FOUND", message: "Bulk acquisition not found" });
    if (acq.opportunityId !== item.opportunityId) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This line item belongs to a different opportunity" });
    }
    const opp = await assertOpportunityVisible(ctx, user, item.opportunityId);

    const previousAcquisitionId = item.bulkAcquisitionId;
    await ctx.db.patch(args.lineItemId, { bulkAcquisitionId: args.acquisitionId });
    await recomputeAcquisitionRollups(ctx, args.acquisitionId);
    if (previousAcquisitionId) await recomputeAcquisitionRollups(ctx, previousAcquisitionId);

    await logAudit(ctx, {
      action: "link", entity: "corporate_opportunity_line_items", entityId: args.lineItemId, entityRef: opp.opportunityRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Linked line item to bulk acquisition "${acq.name}"`,
    });
  },
});

export const unlinkLineItemFromAcquisition = mutation({
  args: { lineItemId: v.id("corporateOpportunityLineItems") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_edit");
    const item = await ctx.db.get(args.lineItemId);
    if (!item) throw new ConvexError({ code: "NOT_FOUND", message: "Line item not found" });
    const opp = await assertOpportunityVisible(ctx, user, item.opportunityId);

    if (item.quantityPaid > 0 || item.quantityAllocated > 0) {
      throw new ConvexError({ code: "CONFLICT", message: "Cannot unlink a line item that already has payments or allocations recorded" });
    }

    const previousAcquisitionId = item.bulkAcquisitionId;
    await ctx.db.patch(args.lineItemId, { bulkAcquisitionId: undefined });
    if (previousAcquisitionId) await recomputeAcquisitionRollups(ctx, previousAcquisitionId);

    await logAudit(ctx, {
      action: "unlink", entity: "corporate_opportunity_line_items", entityId: args.lineItemId, entityRef: opp.opportunityRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Unlinked line item from its bulk acquisition`,
    });
  },
});

