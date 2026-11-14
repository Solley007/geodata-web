import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import type { MutationCtx } from "../_generated/server";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";
import { nextBulkAcquisitionRef } from "./refs.ts";
import { ensureLinkedClient, nextTransactionRef } from "./sharedHelpers.ts";

// ══════════════════════════════════════════════════════════════════════════
// INSTITUTIONAL / BULK ACQUISITION — operational fulfilment layer sitting
// below an EXISTING corporateOpportunity once it reaches Commitment. Reuses
// the same organisation/opportunity/permission/scope architecture as the
// rest of Corporate Marketing & Bulk Sales — never a second CRM or
// opportunity system. Line items continue to live in
// corporateOpportunityLineItems (see lineItems.ts), simply linked here via
// the optional `bulkAcquisitionId` field added to that existing table.
// ══════════════════════════════════════════════════════════════════════════

const PRIORITY_TYPE = v.optional(v.string());

function getOwnerId(acq: Doc<"corporateBulkAcquisitions">): Id<"users"> | null | undefined {
  return acq.assignedOfficer ?? acq.relationshipOwner;
}

async function assertOpportunityUsable(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  opportunityId: Id<"corporateOpportunities">,
): Promise<Doc<"corporateOpportunities">> {
  const opp = await ctx.db.get(opportunityId);
  if (!opp) throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found" });
  const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
  const [visible] = await filterByScope(ctx, [opp], scope, (o) => o.assignedOfficer ?? o.relationshipOwner);
  if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this opportunity" });
  return opp;
}

async function assertAcquisitionVisible(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  id: Id<"corporateBulkAcquisitions">,
): Promise<Doc<"corporateBulkAcquisitions">> {
  const acq = await ctx.db.get(id);
  if (!acq) throw new ConvexError({ code: "NOT_FOUND", message: "Bulk acquisition not found" });
  const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
  const [visible] = await filterByScope(ctx, [acq], scope, getOwnerId);
  if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this bulk acquisition" });
  return acq;
}

export const listBulkAcquisitions = query({
  args: {
    opportunityId: v.optional(v.id("corporateOpportunities")),
    organisationId: v.optional(v.id("corporateOrganisations")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");

    let rows: Doc<"corporateBulkAcquisitions">[];
    if (args.opportunityId) {
      rows = await ctx.db.query("corporateBulkAcquisitions").withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId!)).order("desc").collect();
    } else if (args.organisationId) {
      rows = await ctx.db.query("corporateBulkAcquisitions").withIndex("by_organisation", (q) => q.eq("organisationId", args.organisationId!)).order("desc").collect();
    } else {
      rows = await ctx.db.query("corporateBulkAcquisitions").order("desc").collect();
    }

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const scoped = await filterByScope(ctx, rows, scope, getOwnerId);

    const statuses = await ctx.db.query("corporateAcquisitionStatuses").collect();
    const statusByKey = new Map(statuses.map((s) => [s.key, s]));

    const userIds = new Set<Id<"users">>();
    for (const a of scoped) {
      if (a.relationshipOwner) userIds.add(a.relationshipOwner);
      if (a.assignedOfficer) userIds.add(a.assignedOfficer);
    }
    const userDocs = await Promise.all(Array.from(userIds).map((id) => ctx.db.get(id)));
    const nameById = new Map<Id<"users">, string>();
    for (const u of userDocs) if (u) nameById.set(u._id, u.name ?? u.email ?? "Unknown");

    return scoped.map((a) => ({
      ...a,
      statusLabel: statusByKey.get(a.statusKey)?.label ?? a.statusKey,
      relationshipOwnerName: a.relationshipOwner ? nameById.get(a.relationshipOwner) : undefined,
      assignedOfficerName: a.assignedOfficer ? nameById.get(a.assignedOfficer) : undefined,
    }));
  },
});

export const getBulkAcquisition = query({
  args: { id: v.id("corporateBulkAcquisitions") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");
    const acq = await assertAcquisitionVisible(ctx, user, args.id);

    const [organisation, opportunity, status, lineItems] = await Promise.all([
      ctx.db.get(acq.organisationId),
      ctx.db.get(acq.opportunityId),
      ctx.db.query("corporateAcquisitionStatuses").withIndex("by_key", (q) => q.eq("key", acq.statusKey)).unique(),
      ctx.db.query("corporateOpportunityLineItems").withIndex("by_opportunity", (q) => q.eq("opportunityId", acq.opportunityId)).collect(),
    ]);

    const linkedLineItems = lineItems.filter((li) => li.bulkAcquisitionId === acq._id);

    return {
      ...acq,
      organisationName: organisation?.name ?? "Unknown Organisation",
      opportunityName: opportunity?.name ?? "Unknown Opportunity",
      opportunityRef: opportunity?.opportunityRef,
      statusLabel: status?.label ?? acq.statusKey,
      lineItemCount: linkedLineItems.length,
      fulfilmentPercent: computeFulfilmentPercent(acq),
    };
  },
});

export const createBulkAcquisition = mutation({
  args: {
    opportunityId: v.id("corporateOpportunities"),
    name: v.string(),
    acquisitionType: PRIORITY_TYPE,
    developmentEstateId: v.optional(v.id("estates")),
    relationshipOwner: v.optional(v.id("users")),
    assignedOfficer: v.optional(v.id("users")),
    originalEstimatedValue: v.optional(v.number()),
    requiredQuantity: v.optional(v.number()),
    expectedCompletionDate: v.optional(v.string()),
    allocationEligibilityRule: v.optional(v.union(v.literal("full_payment"), v.literal("min_percentage"), v.literal("management_exception_only"))),
    allocationEligibilityPercent: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_create");
    if (!args.name.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Acquisition name is required" });

    const opp = await assertOpportunityUsable(ctx, user, args.opportunityId);

    if (args.allocationEligibilityRule === "min_percentage" && (args.allocationEligibilityPercent === undefined || args.allocationEligibilityPercent <= 0 || args.allocationEligibilityPercent > 100)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Provide a minimum payment percentage between 1 and 100" });
    }

    const firstStatus = (await ctx.db.query("corporateAcquisitionStatuses").withIndex("by_status", (q) => q.eq("status", "active")).collect()).sort((a, b) => a.order - b.order)[0];
    if (!firstStatus) throw new ConvexError({ code: "BAD_REQUEST", message: "No acquisition statuses are configured yet. Seed the default statuses first." });

    const acquisitionRef = await nextBulkAcquisitionRef(ctx);
    const id = await ctx.db.insert("corporateBulkAcquisitions", {
      acquisitionRef,
      organisationId: opp.organisationId,
      opportunityId: args.opportunityId,
      campaignId: opp.campaignId,
      name: args.name.trim(),
      acquisitionType: args.acquisitionType,
      developmentEstateId: args.developmentEstateId,
      relationshipOwner: args.relationshipOwner ?? opp.relationshipOwner,
      assignedOfficer: args.assignedOfficer ?? opp.assignedOfficer,
      statusKey: firstStatus.key,
      commercialApprovalStatus: "not_required",
      agreementStatus: "not_started",
      paymentStatus: "not_started",
      allocationStatus: "not_started",
      fulfilmentStatus: "not_started",
      originalEstimatedValue: args.originalEstimatedValue,
      requiredQuantity: args.requiredQuantity,
      allocationEligibilityRule: args.allocationEligibilityRule ?? "full_payment",
      allocationEligibilityPercent: args.allocationEligibilityRule === "min_percentage" ? args.allocationEligibilityPercent : undefined,
      expectedCompletionDate: args.expectedCompletionDate,
      notes: args.notes,
      createdBy: user._id,
      updatedBy: user._id,
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_bulk_acquisitions", entityId: id, entityRef: acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created bulk acquisition "${args.name.trim()}" under opportunity "${opp.name}"`,
    });

    return id;
  },
});

export const updateBulkAcquisition = mutation({
  args: {
    id: v.id("corporateBulkAcquisitions"),
    name: v.optional(v.string()),
    acquisitionType: PRIORITY_TYPE,
    developmentEstateId: v.optional(v.id("estates")),
    statusKey: v.optional(v.string()),
    originalEstimatedValue: v.optional(v.number()),
    approvedValue: v.optional(v.number()),
    requiredQuantity: v.optional(v.number()),
    allocationEligibilityRule: v.optional(v.union(v.literal("full_payment"), v.literal("min_percentage"), v.literal("management_exception_only"))),
    allocationEligibilityPercent: v.optional(v.number()),
    expectedCompletionDate: v.optional(v.string()),
    actualCompletionDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_edit");
    const { id, ...patch } = args;
    const acq = await assertAcquisitionVisible(ctx, user, id);

    if (patch.statusKey) {
      const status = await ctx.db.query("corporateAcquisitionStatuses").withIndex("by_key", (q) => q.eq("key", patch.statusKey!)).unique();
      if (!status) throw new ConvexError({ code: "BAD_REQUEST", message: "Unknown acquisition status" });
      if (status.status !== "active") throw new ConvexError({ code: "BAD_REQUEST", message: "This acquisition status is inactive" });
    }

    await ctx.db.patch(id, { ...patch, updatedBy: user._id });

    await logAudit(ctx, {
      action: "update", entity: "corporate_bulk_acquisitions", entityId: id, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated bulk acquisition "${acq.name}"`,
      before: JSON.stringify(acq),
      after: JSON.stringify(patch),
    });
  },
});

export const assignBulkAcquisition = mutation({
  args: {
    id: v.id("corporateBulkAcquisitions"),
    relationshipOwner: v.optional(v.id("users")),
    assignedOfficer: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.assign");
    const acq = await ctx.db.get(args.id);
    if (!acq) throw new ConvexError({ code: "NOT_FOUND", message: "Bulk acquisition not found" });

    await ctx.db.patch(args.id, {
      relationshipOwner: args.relationshipOwner,
      assignedOfficer: args.assignedOfficer,
      updatedBy: user._id,
    });

    await logAudit(ctx, {
      action: "assign", entity: "corporate_bulk_acquisitions", entityId: args.id, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Reassigned bulk acquisition "${acq.name}"`,
      after: JSON.stringify({ relationshipOwner: args.relationshipOwner, assignedOfficer: args.assignedOfficer }),
    });
  },
});

// ── Transaction conversion (spec sections 20-21) ────────────────────────────
// Converts a bulk acquisition into its own EXISTING transactions row — never
// a second transaction concept. Mirrors commitments.convertToTransaction's
// aggregation exactly, but scoped to only this acquisition's linked line
// items/payments/allocations (an opportunity may have spawned more than
// one acquisition, each converting independently to preserve traceability
// without duplicate records).
export const convertAcquisitionToTransaction = mutation({
  args: { id: v.id("corporateBulkAcquisitions") },
  handler: async (ctx, args): Promise<{ transactionId: Id<"transactions">; transactionRef: string }> => {
    const user = await requirePermission(ctx, "corporate_marketing.commitment_manage");
    const acq = await assertAcquisitionVisible(ctx, user, args.id);

    if (acq.transactionId) {
      throw new ConvexError({ code: "CONFLICT", message: "This bulk acquisition has already been converted to a transaction" });
    }

    const org = await ctx.db.get(acq.organisationId);
    if (!org) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });
    const opp = await ctx.db.get(acq.opportunityId);
    if (!opp) throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found" });

    const allLineItems = await ctx.db.query("corporateOpportunityLineItems").withIndex("by_opportunity", (q) => q.eq("opportunityId", acq.opportunityId)).collect();
    const lineItems = allLineItems.filter((li) => li.bulkAcquisitionId === acq._id);
    if (lineItems.length === 0 || !lineItems.some((li) => li.quantityCommitted > 0)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "At least one line item must have a recorded commitment before converting to a transaction" });
    }

    const clientId = await ensureLinkedClient(ctx, org, user._id);

    const totalPurchasePrice = acq.committedValue ?? lineItems.reduce((sum, li) => {
      const qty = li.quantityCommitted || li.quantityNegotiated || li.quantityProposed || li.quantityRequired;
      const unit = li.approvedPrice ?? li.negotiatedPrice ?? li.proposedPrice ?? li.bulkPrice ?? li.unitPrice ?? li.standardPrice ?? 0;
      return sum + qty * unit;
    }, 0);
    const amountPaid = acq.paidValue ?? 0;

    const transactionRef = await nextTransactionRef(ctx);
    const outstanding = totalPurchasePrice - amountPaid;
    const transactionId = await ctx.db.insert("transactions", {
      transactionRef,
      clientId,
      bulkAcquisitionId: acq._id,
      assignedStaff: acq.assignedOfficer ?? opp.assignedOfficer,
      salesOfficer: acq.relationshipOwner ?? opp.relationshipOwner,
      purchasePrice: totalPurchasePrice,
      amountPaid,
      outstandingBalance: outstanding > 0 ? outstanding : undefined,
      financeMethod: "outright",
      kycStatus: "approved", // institutional counterpart already verified via the proxy client
      financeStatus: "not_started",
      paymentStatus: amountPaid >= totalPurchasePrice && totalPurchasePrice > 0 ? "fully_paid" : amountPaid > 0 ? "partial" : "not_started",
      agreementStatus: "not_started",
      signatureStatus: "not_started",
      status: "agreement",
      notes: `Converted from bulk acquisition ${acq.acquisitionRef} (${org.name}, ${org.orgRef}) under opportunity ${opp.opportunityRef}.`,
      createdBy: user._id,
      lastUpdatedBy: user._id,
    });

    await ctx.db.insert("transactionEvents", {
      transactionId,
      toStatus: "agreement",
      changedBy: user._id,
      changedByName: user.name,
      note: `Created from bulk acquisition ${acq.acquisitionRef}`,
      timestamp: new Date().toISOString(),
    });

    await ctx.db.patch(acq._id, { transactionId, updatedBy: user._id });

    // Link every already-recorded bulk payment against this acquisition's line
    // items to the new transaction, matching commitments.convertToTransaction's
    // traceability pattern exactly.
    const bulkPayments = await ctx.db.query("corporateBulkPayments").withIndex("by_opportunity", (q) => q.eq("opportunityId", acq.opportunityId)).collect();
    const lineItemIds = new Set(lineItems.map((li) => li._id));
    for (const bp of bulkPayments) {
      if (bp.lineItemId && !lineItemIds.has(bp.lineItemId)) continue;
      const payment = await ctx.db.get(bp.paymentId);
      if (payment && !payment.transactionId) {
        await ctx.db.patch(bp.paymentId, { transactionId });
      }
    }

    await ctx.db.insert("corporateActivities", {
      organisationId: acq.organisationId,
      opportunityId: acq.opportunityId,
      activityType: "transaction_conversion",
      subject: `Bulk acquisition "${acq.name}" converted to transaction ${transactionRef}`,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "convert", entity: "corporate_bulk_acquisitions", entityId: acq._id, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Converted bulk acquisition "${acq.name}" into transaction ${transactionRef}`,
      after: JSON.stringify({ transactionId, transactionRef, totalPurchasePrice }),
    });

    return { transactionId, transactionRef };
  },
});

// ── Institutional Account Summary (spec section 23) ─────────────────────────
// Aggregates across every bulk acquisition belonging to one organisation —
// value/quantity rollups, active/fulfilled/cancelled counts, payment
// schedules, allocation progress, and transaction conversions. Reads
// exclusively from the acquisition rollup fields already maintained by
// recomputeAcquisitionRollups; never a second ledger or aggregation engine.
export const getInstitutionalAccountSummary = query({
  args: { organisationId: v.id("corporateOrganisations") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");

    const org = await ctx.db.get(args.organisationId);
    if (!org) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });
    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const [visibleOrg] = await filterByScope(ctx, [org], scope, (o) => o.assignedOfficer ?? o.relationshipOwner);
    if (!visibleOrg) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this organisation" });

    const [opportunities, acquisitions, statuses] = await Promise.all([
      ctx.db.query("corporateOpportunities").withIndex("by_organisation", (q) => q.eq("organisationId", args.organisationId)).collect(),
      ctx.db.query("corporateBulkAcquisitions").withIndex("by_organisation", (q) => q.eq("organisationId", args.organisationId)).collect(),
      ctx.db.query("corporateAcquisitionStatuses").collect(),
    ]);

    const statusByKey = new Map(statuses.map((s) => [s.key, s]));
    const active = acquisitions.filter((a) => {
      const s = statusByKey.get(a.statusKey);
      return !s?.isCancelled;
    });
    const cancelled = acquisitions.filter((a) => statusByKey.get(a.statusKey)?.isCancelled);
    const fulfilled = acquisitions.filter((a) => statusByKey.get(a.statusKey)?.isFulfilled);
    const onHoldOrDisputed = acquisitions.filter((a) => {
      const s = statusByKey.get(a.statusKey);
      return s?.isOnHold || s?.isDisputed;
    });

    const totals = acquisitions.reduce(
      (acc, a) => ({
        estimatedValue: acc.estimatedValue + (a.originalEstimatedValue ?? 0),
        committedValue: acc.committedValue + (a.committedValue ?? 0),
        paidValue: acc.paidValue + (a.paidValue ?? 0),
        allocatedValue: acc.allocatedValue + (a.allocatedValue ?? 0),
        outstandingValue: acc.outstandingValue + (a.outstandingValue ?? 0),
        requiredQuantity: acc.requiredQuantity + (a.requiredQuantity ?? 0),
        committedQuantity: acc.committedQuantity + (a.committedQuantity ?? 0),
        paidQuantity: acc.paidQuantity + (a.paidQuantity ?? 0),
        allocatedQuantity: acc.allocatedQuantity + (a.allocatedQuantity ?? 0),
        outstandingQuantity: acc.outstandingQuantity + (a.outstandingQuantity ?? 0),
      }),
      { estimatedValue: 0, committedValue: 0, paidValue: 0, allocatedValue: 0, outstandingValue: 0, requiredQuantity: 0, committedQuantity: 0, paidQuantity: 0, allocatedQuantity: 0, outstandingQuantity: 0 },
    );

    const acquisitionIds = acquisitions.map((a) => a._id);
    const [schedules, transactionsLinked, documents] = await Promise.all([
      Promise.all(acquisitionIds.map((id) => ctx.db.query("corporatePaymentSchedules").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", id)).collect())),
      Promise.all(acquisitions.filter((a) => a.transactionId).map((a) => ctx.db.get(a.transactionId!))),
      org.linkedClientId ? ctx.db.query("vaultDocuments").withIndex("by_client", (q) => q.eq("clientId", org.linkedClientId!)).collect() : Promise.resolve([]),
    ]);
    const allSchedules = schedules.flat();
    const overdueSchedules = allSchedules.filter((s) => s.status !== "paid" && new Date(s.dueDate).getTime() < Date.now());

    return {
      organisationName: org.name,
      organisationRef: org.orgRef,
      totals: {
        opportunities: opportunities.length,
        acquisitions: acquisitions.length,
        activeAcquisitions: active.length,
        fulfilledAcquisitions: fulfilled.length,
        cancelledAcquisitions: cancelled.length,
        onHoldOrDisputed: onHoldOrDisputed.length,
        ...totals,
      },
      paymentSchedules: {
        total: allSchedules.length,
        paid: allSchedules.filter((s) => s.status === "paid").length,
        partiallyPaid: allSchedules.filter((s) => s.status === "partially_paid").length,
        upcoming: allSchedules.filter((s) => s.status === "upcoming").length,
        overdue: overdueSchedules.length,
      },
      transactionsConverted: transactionsLinked.filter((t): t is Doc<"transactions"> => !!t).length,
      documentCount: documents.length,
    };
  },
});

// ── Value/quantity rollups ─────────────────────────────────────────────────
// Recomputes every rollup field on a bulk acquisition from its linked line
// items (never a hand-entered ledger). Called by lineItems.ts after any
// mutation that touches a line item's quantities or prices. Exported so
// lineItems.ts (and, in later milestones, payment/allocation mutations) can
// call it directly without a second aggregation implementation.
export async function recomputeAcquisitionRollups(ctx: MutationCtx, acquisitionId: Id<"corporateBulkAcquisitions">): Promise<void> {
  const acq = await ctx.db.get(acquisitionId);
  if (!acq) return;

  const allLineItems = await ctx.db.query("corporateOpportunityLineItems").withIndex("by_opportunity", (q) => q.eq("opportunityId", acq.opportunityId)).collect();
  const lineItems = allLineItems.filter((li) => li.bulkAcquisitionId === acquisitionId);

  const priceOf = (li: Doc<"corporateOpportunityLineItems">): number => li.approvedPrice ?? li.negotiatedPrice ?? li.proposedPrice ?? li.bulkPrice ?? li.unitPrice ?? li.standardPrice ?? 0;

  const totals = lineItems.reduce(
    (acc, li) => {
      const price = priceOf(li);
      return {
        requiredQuantity: acc.requiredQuantity + li.quantityRequired,
        eoiQuantity: acc.eoiQuantity + li.quantityEoi,
        negotiatedQuantity: acc.negotiatedQuantity + li.quantityNegotiated,
        committedQuantity: acc.committedQuantity + li.quantityCommitted,
        paidQuantity: acc.paidQuantity + li.quantityPaid,
        allocatedQuantity: acc.allocatedQuantity + li.quantityAllocated,
        committedValue: acc.committedValue + li.quantityCommitted * price,
        paidValue: acc.paidValue + li.quantityPaid * price,
        allocatedValue: acc.allocatedValue + li.quantityAllocated * price,
      };
    },
    { requiredQuantity: 0, eoiQuantity: 0, negotiatedQuantity: 0, committedQuantity: 0, paidQuantity: 0, allocatedQuantity: 0, committedValue: 0, paidValue: 0, allocatedValue: 0 },
  );

  const outstandingQuantity = Math.max(0, totals.committedQuantity - totals.paidQuantity);
  const outstandingValue = Math.max(0, totals.committedValue - totals.paidValue);

  const paymentStatus: "not_started" | "partial" | "fully_paid" =
    totals.paidQuantity <= 0 ? "not_started" : totals.paidQuantity >= totals.committedQuantity && totals.committedQuantity > 0 ? "fully_paid" : "partial";
  const allocationStatus: "not_started" | "partial" | "fully_allocated" =
    totals.allocatedQuantity <= 0 ? "not_started" : totals.allocatedQuantity >= totals.committedQuantity && totals.committedQuantity > 0 ? "fully_allocated" : "partial";
  const fulfilmentStatus: "not_started" | "partial" | "fulfilled" =
    allocationStatus === "fully_allocated" && paymentStatus === "fully_paid" ? "fulfilled" : totals.allocatedQuantity > 0 || totals.paidQuantity > 0 ? "partial" : "not_started";

  await ctx.db.patch(acquisitionId, {
    requiredQuantity: totals.requiredQuantity,
    eoiQuantity: totals.eoiQuantity,
    negotiatedQuantity: totals.negotiatedQuantity,
    committedQuantity: totals.committedQuantity,
    paidQuantity: totals.paidQuantity,
    allocatedQuantity: totals.allocatedQuantity,
    outstandingQuantity,
    committedValue: totals.committedValue,
    paidValue: totals.paidValue,
    allocatedValue: totals.allocatedValue,
    outstandingValue,
    paymentStatus,
    allocationStatus,
    fulfilmentStatus,
  });
}

// ── Eligible-for-allocation check (spec section 14) ────────────────────────
// Given a line item and its parent acquisition's configured eligibility
// rule, returns how many units are currently eligible to be allocated.
// Never a single hard-coded percentage — each acquisition configures its own
// rule at creation (full_payment | min_percentage | management_exception_only).
export function eligibleQuantityForAllocation(li: Doc<"corporateOpportunityLineItems">, acq: Doc<"corporateBulkAcquisitions">): number {
  const rule = acq.allocationEligibilityRule ?? "full_payment";
  if (rule === "management_exception_only") return li.quantityCommitted; // gated by an explicit approval elsewhere, not computed here
  if (rule === "min_percentage") {
    const pct = acq.allocationEligibilityPercent ?? 100;
    if (li.quantityCommitted <= 0) return 0;
    const paidRatio = li.quantityPaid / li.quantityCommitted;
    return paidRatio * 100 >= pct ? li.quantityCommitted : 0;
  }
  // full_payment: eligible only once every committed unit is paid for
  return li.quantityPaid >= li.quantityCommitted ? li.quantityCommitted : 0;
}

// ── Fulfilment tracking (spec section 24) — a single pure function reused by
// both the acquisition detail page's progress bars and the Bulk Acquisition
// Register, so the definition of "how fulfilled" an acquisition is never
// diverges between views. Averages payment and allocation progress against
// the required quantity (falling back to committed quantity when nothing
// was ever formally "required", e.g. quantity control started later).
export function computeFulfilmentPercent(acq: Pick<Doc<"corporateBulkAcquisitions">, "requiredQuantity" | "committedQuantity" | "paidQuantity" | "allocatedQuantity">): number {
  const denominator = acq.requiredQuantity || acq.committedQuantity || 0;
  if (denominator <= 0) return 0;
  const paidPct = Math.min(100, ((acq.paidQuantity ?? 0) / denominator) * 100);
  const allocatedPct = Math.min(100, ((acq.allocatedQuantity ?? 0) / denominator) * 100);
  return Math.round((paidPct + allocatedPct) / 2);
}

