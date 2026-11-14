import { v } from "convex/values";
import { query } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { requirePermission } from "./feature.ts";
import { computeFulfilmentPercent } from "./bulkAcquisitions.ts";

// ══════════════════════════════════════════════════════════════════════════
// Corporate Marketing & Bulk Sales analytics — reads directly from the
// EXISTING corporate marketing tables (organisations, opportunities, line
// items, campaigns) plus the linked geoPayments/allocations/transactions.
// Never a separate analytics system: this is one more query surfaced inside
// the existing module, following the same pattern as convex/admin.ts's
// getDashboardStats and convex/iam/dashboard.ts's widget builder.
// ══════════════════════════════════════════════════════════════════════════

function lineItemValue(li: Doc<"corporateOpportunityLineItems">): number {
  const qty = li.quantityCommitted || li.quantityNegotiated || li.quantityProposed || li.quantityRequired;
  const unit = li.negotiatedPrice ?? li.proposedPrice ?? li.unitPrice ?? 0;
  return qty * unit;
}

export const getPipelineAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    // Analytics are an enterprise-wide rollup by design (matches the pattern
    // used by iam/dashboard.ts's enterprise-level widgets) — every corporate
    // marketing officer needs visibility into overall funnel health to do
    // their job, and every figure here is already an aggregate, never a
    // single organisation's sensitive detail.
    void user;

    const [organisations, opportunities, lineItems, stages, campaigns] = await Promise.all([
      ctx.db.query("corporateOrganisations").collect(),
      ctx.db.query("corporateOpportunities").collect(),
      ctx.db.query("corporateOpportunityLineItems").collect(),
      ctx.db.query("corporatePipelineStages").collect(),
      ctx.db.query("corporateCampaigns").collect(),
    ]);

    const stageByKey = new Map(stages.map((s) => [s.key, s]));
    const lineItemsByOpp = new Map<Id<"corporateOpportunities">, Doc<"corporateOpportunityLineItems">[]>();
    for (const li of lineItems) {
      const list = lineItemsByOpp.get(li.opportunityId) ?? [];
      list.push(li);
      lineItemsByOpp.set(li.opportunityId, list);
    }

    const closedWon = opportunities.filter((o) => stageByKey.get(o.stageKey)?.isClosedWon);
    const closedLost = opportunities.filter((o) => stageByKey.get(o.stageKey)?.isClosedLost);
    const nurture = opportunities.filter((o) => o.isNurture);
    const openOpportunities = opportunities.filter((o) => {
      const stage = stageByKey.get(o.stageKey);
      return !stage?.isClosedWon && !stage?.isClosedLost;
    });

    const opportunityValue = (opp: Doc<"corporateOpportunities">): number =>
      (lineItemsByOpp.get(opp._id) ?? []).reduce((sum, li) => sum + lineItemValue(li), 0);

    const openPipelineValue = openOpportunities.reduce((sum, o) => sum + opportunityValue(o), 0);
    const closedWonValue = closedWon.reduce((sum, o) => sum + opportunityValue(o), 0);
    const totalDecided = closedWon.length + closedLost.length;
    const winRate = totalDecided > 0 ? (closedWon.length / totalDecided) * 100 : 0;

    // ── Funnel by stage (respects configured order) ──────────────────────
    const activeStages = stages.filter((s) => s.status === "active").sort((a, b) => a.order - b.order);
    const funnel = activeStages.map((s) => ({
      key: s.key,
      label: s.label,
      count: opportunities.filter((o) => o.stageKey === s.key).length,
      isClosedWon: s.isClosedWon ?? false,
      isClosedLost: s.isClosedLost ?? false,
    }));

    // ── Performance by relationship owner / assigned officer ─────────────
    const officerIds = new Set<Id<"users">>();
    for (const o of opportunities) {
      if (o.relationshipOwner) officerIds.add(o.relationshipOwner);
      if (o.assignedOfficer) officerIds.add(o.assignedOfficer);
    }
    const officerDocs = await Promise.all(Array.from(officerIds).map((id) => ctx.db.get(id)));
    const officerNameById = new Map<Id<"users">, string>();
    for (const u of officerDocs) if (u) officerNameById.set(u._id, u.name ?? u.email ?? "Unknown");

    const officerStats = new Map<Id<"users">, { officerId: Id<"users">; officerName: string; opportunities: number; closedWon: number; closedLost: number; pipelineValue: number }>();
    for (const opp of opportunities) {
      const officerId = opp.assignedOfficer ?? opp.relationshipOwner;
      if (!officerId) continue;
      const stage = stageByKey.get(opp.stageKey);
      const existing = officerStats.get(officerId) ?? {
        officerId,
        officerName: officerNameById.get(officerId) ?? "Unknown",
        opportunities: 0,
        closedWon: 0,
        closedLost: 0,
        pipelineValue: 0,
      };
      existing.opportunities += 1;
      if (stage?.isClosedWon) existing.closedWon += 1;
      if (stage?.isClosedLost) existing.closedLost += 1;
      if (!stage?.isClosedWon && !stage?.isClosedLost) existing.pipelineValue += opportunityValue(opp);
      officerStats.set(officerId, existing);
    }

    // ── Performance by campaign ───────────────────────────────────────────
    const campaignStats = campaigns.map((c) => {
      const orgsTargeted = organisations.filter((o) => o.campaignId === c._id).length;
      const campaignOpps = opportunities.filter((o) => o.campaignId === c._id);
      const won = campaignOpps.filter((o) => stageByKey.get(o.stageKey)?.isClosedWon).length;
      const value = campaignOpps.reduce((sum, o) => sum + opportunityValue(o), 0);
      return {
        campaignId: c._id,
        campaignName: c.name,
        status: c.status,
        organisationsTargeted: orgsTargeted,
        opportunities: campaignOpps.length,
        closedWon: won,
        pipelineValue: value,
      };
    });

    // ── Organisation status breakdown ─────────────────────────────────────
    const orgsByStatus = {
      prospect: organisations.filter((o) => o.status === "prospect").length,
      active: organisations.filter((o) => o.status === "active").length,
      dormant: organisations.filter((o) => o.status === "dormant").length,
      disengaged: organisations.filter((o) => o.status === "disengaged").length,
    };

    return {
      totals: {
        organisations: organisations.length,
        openOpportunities: openOpportunities.length,
        closedWon: closedWon.length,
        closedLost: closedLost.length,
        nurture: nurture.length,
        openPipelineValue,
        closedWonValue,
        winRatePercent: Math.round(winRate * 10) / 10,
      },
      orgsByStatus,
      funnel,
      officerPerformance: Array.from(officerStats.values()).sort((a, b) => b.pipelineValue - a.pipelineValue),
      campaignPerformance: campaignStats.sort((a, b) => b.pipelineValue - a.pipelineValue),
    };
  },
});

// ── Bulk Acquisition Dashboard widgets (spec section "dashboard widgets") ──
// Read-only rollup reused by BOTH the dynamic dashboard engine
// (iam/dashboard.ts's buildWidgetsForProfile) and, if ever needed directly,
// a dedicated screen — never a second aggregation engine. Pulls straight
// from the acquisition rollup fields already maintained by
// recomputeAcquisitionRollups (bulkAcquisitions.ts) plus the payment
// schedule / allocation batch / commercial terms tables for the counts that
// aren't cached on the acquisition row itself.
export type BulkAcquisitionDashboardStats = {
  activeAcquisitions: number;
  committedValue: number;
  paidValue: number;
  outstandingValue: number;
  committedQuantity: number;
  paidQuantity: number;
  allocatedQuantity: number;
  outstandingQuantity: number;
  partiallyFulfilled: number;
  paymentDue: number;
  paymentOverdue: number;
  allocationPending: number;
  allocationCompleted: number;
  commercialApprovalPending: number;
  topBuyers: Array<{ organisationName: string; committedValue: number }>;
  byPropertyType: Array<{ propertyType: string; count: number; committedValue: number }>;
};

export async function buildBulkAcquisitionDashboardStats(ctx: QueryCtx): Promise<BulkAcquisitionDashboardStats> {
  const [acquisitions, statuses, organisations, schedules, batches, terms, lineItems] = await Promise.all([
    ctx.db.query("corporateBulkAcquisitions").collect(),
    ctx.db.query("corporateAcquisitionStatuses").collect(),
    ctx.db.query("corporateOrganisations").collect(),
    ctx.db.query("corporatePaymentSchedules").collect(),
    ctx.db.query("corporateAllocationBatches").collect(),
    ctx.db.query("corporateCommercialTerms").withIndex("by_status", (q) => q.eq("status", "pending_approval")).collect(),
    ctx.db.query("corporateOpportunityLineItems").collect(),
  ]);

  const statusByKey = new Map(statuses.map((s) => [s.key, s]));
  const orgById = new Map(organisations.map((o) => [o._id, o]));
  const active = acquisitions.filter((a) => !statusByKey.get(a.statusKey)?.isCancelled);
  const partiallyFulfilled = acquisitions.filter((a) => a.fulfilmentStatus === "partial").length;

  const today = new Date().toISOString().slice(0, 10);
  const paymentDue = schedules.filter((s) => s.status !== "paid" && s.dueDate >= today).length;
  const paymentOverdue = schedules.filter((s) => s.status !== "paid" && s.dueDate < today).length;

  const allocationPending = batches.filter((b) => b.status === "draft" || b.status === "pending_approval" || b.status === "approved" || b.status === "in_progress").length;
  const allocationCompleted = batches.filter((b) => b.status === "completed").length;

  const totals = active.reduce(
    (acc, a) => ({
      committedValue: acc.committedValue + (a.committedValue ?? 0),
      paidValue: acc.paidValue + (a.paidValue ?? 0),
      outstandingValue: acc.outstandingValue + (a.outstandingValue ?? 0),
      committedQuantity: acc.committedQuantity + (a.committedQuantity ?? 0),
      paidQuantity: acc.paidQuantity + (a.paidQuantity ?? 0),
      allocatedQuantity: acc.allocatedQuantity + (a.allocatedQuantity ?? 0),
      outstandingQuantity: acc.outstandingQuantity + (a.outstandingQuantity ?? 0),
    }),
    { committedValue: 0, paidValue: 0, outstandingValue: 0, committedQuantity: 0, paidQuantity: 0, allocatedQuantity: 0, outstandingQuantity: 0 },
  );

  // ── Top institutional buyers by committed value ──────────────────────────
  const buyerValue = new Map<Id<"corporateOrganisations">, number>();
  for (const a of active) buyerValue.set(a.organisationId, (buyerValue.get(a.organisationId) ?? 0) + (a.committedValue ?? 0));
  const topBuyers = Array.from(buyerValue.entries())
    .map(([orgId, value]) => ({ organisationName: orgById.get(orgId)?.name ?? "Unknown", committedValue: value }))
    .filter((b) => b.committedValue > 0)
    .sort((a, b) => b.committedValue - a.committedValue)
    .slice(0, 5);

  // ── Acquisition by development/property type — derived from linked line
  // items, since acquisitions can span multiple property types.
  const acqIds = new Set(active.map((a) => a._id));
  const linkedLineItems = lineItems.filter((li) => li.bulkAcquisitionId && acqIds.has(li.bulkAcquisitionId));
  const byType = new Map<string, { count: number; value: number }>();
  for (const li of linkedLineItems) {
    const type = li.propertyType ?? "Unspecified";
    const price = li.approvedPrice ?? li.negotiatedPrice ?? li.proposedPrice ?? li.bulkPrice ?? li.unitPrice ?? li.standardPrice ?? 0;
    const value = li.quantityCommitted * price;
    const existing = byType.get(type) ?? { count: 0, value: 0 };
    existing.count += 1;
    existing.value += value;
    byType.set(type, existing);
  }
  const byPropertyType = Array.from(byType.entries())
    .map(([propertyType, v]) => ({ propertyType, count: v.count, committedValue: v.value }))
    .sort((a, b) => b.committedValue - a.committedValue);

  return {
    activeAcquisitions: active.length,
    ...totals,
    partiallyFulfilled,
    paymentDue,
    paymentOverdue,
    allocationPending,
    allocationCompleted,
    commercialApprovalPending: terms.length,
    topBuyers,
    byPropertyType,
  };
}

// Permission-gated query for a dedicated screen, if ever surfaced directly
// (the dashboard widget itself calls buildBulkAcquisitionDashboardStats via
// iam/dashboard.ts, which does its own feature + permission gating).
export const getBulkAcquisitionDashboardStats = query({
  args: {},
  handler: async (ctx): Promise<BulkAcquisitionDashboardStats> => {
    await requirePermission(ctx, "corporate_marketing.acquisition_view");
    return await buildBulkAcquisitionDashboardStats(ctx);
  },
});

// ── Bulk Acquisition Register — one row per opportunity, for CSV export ────
export const getBulkAcquisitionRegister = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "corporate_marketing.export");

    const [opportunities, organisations, stages, lineItems] = await Promise.all([
      ctx.db.query("corporateOpportunities").order("desc").collect(),
      ctx.db.query("corporateOrganisations").collect(),
      ctx.db.query("corporatePipelineStages").collect(),
      ctx.db.query("corporateOpportunityLineItems").collect(),
    ]);

    const orgById = new Map(organisations.map((o) => [o._id, o]));
    const stageByKey = new Map(stages.map((s) => [s.key, s]));
    const lineItemsByOpp = new Map<Id<"corporateOpportunities">, Doc<"corporateOpportunityLineItems">[]>();
    for (const li of lineItems) {
      const list = lineItemsByOpp.get(li.opportunityId) ?? [];
      list.push(li);
      lineItemsByOpp.set(li.opportunityId, list);
    }

    const officerIds = new Set<Id<"users">>();
    for (const o of opportunities) {
      if (o.relationshipOwner) officerIds.add(o.relationshipOwner);
      if (o.assignedOfficer) officerIds.add(o.assignedOfficer);
    }
    const officerDocs = await Promise.all(Array.from(officerIds).map((id) => ctx.db.get(id)));
    const officerNameById = new Map<Id<"users">, string>();
    for (const u of officerDocs) if (u) officerNameById.set(u._id, u.name ?? u.email ?? "Unknown");

    const transactionIds = opportunities.map((o) => o.transactionId).filter((id): id is Id<"transactions"> => !!id);
    const transactions = await Promise.all(transactionIds.map((id) => ctx.db.get(id)));
    const transactionById = new Map(transactions.filter((t): t is Doc<"transactions"> => !!t).map((t) => [t._id, t]));

    return opportunities.map((opp) => {
      const org = orgById.get(opp.organisationId);
      const stage = stageByKey.get(opp.stageKey);
      const items = lineItemsByOpp.get(opp._id) ?? [];
      const totals = items.reduce(
        (acc, li) => ({
          required: acc.required + li.quantityRequired,
          committed: acc.committed + li.quantityCommitted,
          paid: acc.paid + li.quantityPaid,
          allocated: acc.allocated + li.quantityAllocated,
          value: acc.value + lineItemValue(li),
        }),
        { required: 0, committed: 0, paid: 0, allocated: 0, value: 0 },
      );
      const transaction = opp.transactionId ? transactionById.get(opp.transactionId) : undefined;

      return {
        opportunityRef: opp.opportunityRef,
        opportunityName: opp.name,
        organisationName: org?.name ?? "Unknown",
        organisationRef: org?.orgRef ?? "",
        orgTypeKey: org?.orgTypeKey ?? "",
        opportunityType: opp.opportunityType ?? "",
        stageLabel: stage?.label ?? opp.stageKey,
        relationshipOwner: opp.relationshipOwner ? officerNameById.get(opp.relationshipOwner) ?? "" : "",
        assignedOfficer: opp.assignedOfficer ? officerNameById.get(opp.assignedOfficer) ?? "" : "",
        priority: opp.priority,
        quantityRequired: totals.required,
        quantityCommitted: totals.committed,
        quantityPaid: totals.paid,
        quantityAllocated: totals.allocated,
        estimatedValue: totals.value,
        transactionRef: transaction?.transactionRef ?? "",
        transactionStatus: transaction?.status ?? "",
        expectedCloseDate: opp.expectedCloseDate ?? "",
        actualCloseDate: opp.actualCloseDate ?? "",
        isNurture: opp.isNurture ? "Yes" : "No",
        lostReason: opp.lostReason ?? "",
        createdAt: new Date(opp._creationTime).toISOString(),
      };
    });
  },
});

// ── Bulk Acquisition Register (acquisition-level) — one row per bulk
// acquisition, per Institutional / Bulk Acquisition Management enhancement
// spec section 22. Distinct from getBulkAcquisitionRegister above (which is
// one row per opportunity, pre-dating this enhancement and kept for
// backward compatibility with any existing export workflows). Reads
// directly from the acquisition rollup fields — never a second aggregation
// engine — and reuses `computeFulfilmentPercent` so the fulfilment figure
// here always matches what the acquisition detail page shows.
export const getAcquisitionRegister = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "corporate_marketing.export");

    const [acquisitions, organisations, opportunities, statuses] = await Promise.all([
      ctx.db.query("corporateBulkAcquisitions").order("desc").collect(),
      ctx.db.query("corporateOrganisations").collect(),
      ctx.db.query("corporateOpportunities").collect(),
      ctx.db.query("corporateAcquisitionStatuses").collect(),
    ]);

    const orgById = new Map(organisations.map((o) => [o._id, o]));
    const oppById = new Map(opportunities.map((o) => [o._id, o]));
    const statusByKey = new Map(statuses.map((s) => [s.key, s]));

    const officerIds = new Set<Id<"users">>();
    for (const a of acquisitions) {
      if (a.relationshipOwner) officerIds.add(a.relationshipOwner);
      if (a.assignedOfficer) officerIds.add(a.assignedOfficer);
    }
    const officerDocs = await Promise.all(Array.from(officerIds).map((id) => ctx.db.get(id)));
    const officerNameById = new Map<Id<"users">, string>();
    for (const u of officerDocs) if (u) officerNameById.set(u._id, u.name ?? u.email ?? "Unknown");

    const transactionIds = acquisitions.map((a) => a.transactionId).filter((id): id is Id<"transactions"> => !!id);
    const transactions = await Promise.all(transactionIds.map((id) => ctx.db.get(id)));
    const transactionById = new Map(transactions.filter((t): t is Doc<"transactions"> => !!t).map((t) => [t._id, t]));

    return acquisitions.map((a) => {
      const org = orgById.get(a.organisationId);
      const opp = oppById.get(a.opportunityId);
      const status = statusByKey.get(a.statusKey);
      const transaction = a.transactionId ? transactionById.get(a.transactionId) : undefined;

      return {
        acquisitionRef: a.acquisitionRef,
        acquisitionName: a.name,
        organisationName: org?.name ?? "Unknown",
        organisationRef: org?.orgRef ?? "",
        opportunityRef: opp?.opportunityRef ?? "",
        acquisitionType: a.acquisitionType ?? "",
        statusLabel: status?.label ?? a.statusKey,
        isOnHold: status?.isOnHold ? "Yes" : "No",
        isDisputed: status?.isDisputed ? "Yes" : "No",
        isCancelled: status?.isCancelled ? "Yes" : "No",
        relationshipOwner: a.relationshipOwner ? officerNameById.get(a.relationshipOwner) ?? "" : "",
        assignedOfficer: a.assignedOfficer ? officerNameById.get(a.assignedOfficer) ?? "" : "",
        requiredQuantity: a.requiredQuantity ?? 0,
        committedQuantity: a.committedQuantity ?? 0,
        paidQuantity: a.paidQuantity ?? 0,
        allocatedQuantity: a.allocatedQuantity ?? 0,
        outstandingQuantity: a.outstandingQuantity ?? 0,
        committedValue: a.committedValue ?? 0,
        paidValue: a.paidValue ?? 0,
        allocatedValue: a.allocatedValue ?? 0,
        outstandingValue: a.outstandingValue ?? 0,
        fulfilmentPercent: computeFulfilmentPercent(a),
        allocationEligibilityRule: a.allocationEligibilityRule ?? "full_payment",
        transactionRef: transaction?.transactionRef ?? "",
        transactionStatus: transaction?.status ?? "",
        expectedCompletionDate: a.expectedCompletionDate ?? "",
        actualCompletionDate: a.actualCompletionDate ?? "",
        cancellationReason: a.cancellationReason ?? "",
        createdAt: new Date(a._creationTime).toISOString(),
      };
    });
  },
});
