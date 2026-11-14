import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import type { MutationCtx } from "../_generated/server";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";
import { api } from "../_generated/api.js";
import { recomputeAcquisitionRollups, eligibleQuantityForAllocation } from "./bulkAcquisitions.ts";
import { applyPaymentToSchedule } from "./paymentSchedules.ts";
import { recomputeBatchStatus } from "./allocationBatches.ts";
import { ensureLinkedClient, nextTransactionRef } from "./sharedHelpers.ts";

// ══════════════════════════════════════════════════════════════════════════
// Commitment → Payment → Allocation → Transaction conversion. This is the
// bridge from the corporate bulk-acquisition pipeline into the EXISTING
// Payments (geoPayments), Plot Allocation (allocations) and Transactions
// systems — never a second ledger, allocation engine, or transaction table.
//
// Corporate organisations have no individual `clients` row (by design — see
// corporateOrganisations' governing comment in schema.ts). Those three
// existing systems all require a non-optional `clientId: v.id("clients")`.
// Rather than weakening that requirement everywhere (risking every existing
// call site and report that assumes a client is always present), we create
// ONE lightweight billing/legal proxy `clients` row per organisation, lazily,
// the first time it's needed — reusing the exact same table/schema, never a
// duplicate customer record. Real decision-makers stay tracked separately in
// `corporateContacts`. The proxy is linked back via
// `corporateOrganisations.linkedClientId`.
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

// Lazily creates (once) a billing/legal proxy `clients` row for a corporate
// organisation — implementation lives in sharedHelpers.ts, imported above,
// to avoid a circular import with bulkAcquisitions.ts.

async function requireOrgAndOpportunity(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  opportunityId: Id<"corporateOpportunities">,
): Promise<{ opp: Doc<"corporateOpportunities">; org: Doc<"corporateOrganisations"> }> {
  const opp = await assertOpportunityVisible(ctx, user, opportunityId);
  const org = await ctx.db.get(opp.organisationId);
  if (!org) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });
  return { opp, org };
}

// ── Conversion summary — surfaces commitment/payment/allocation/transaction
//    progress for the opportunity's conversion tab. ────────────────────────
export const getConversionSummary = query({
  args: { opportunityId: v.id("corporateOpportunities") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    const { opp, org } = await requireOrgAndOpportunity(ctx, user, args.opportunityId);

    const [lineItems, bulkPayments, bulkAllocations, transaction] = await Promise.all([
      ctx.db.query("corporateOpportunityLineItems").withIndex("by_opportunity", (q) => q.eq("opportunityId", opp._id)).collect(),
      ctx.db.query("corporateBulkPayments").withIndex("by_opportunity", (q) => q.eq("opportunityId", opp._id)).order("desc").collect(),
      ctx.db.query("corporateBulkAllocations").withIndex("by_opportunity", (q) => q.eq("opportunityId", opp._id)).order("desc").collect(),
      opp.transactionId ? ctx.db.get(opp.transactionId) : null,
    ]);

    const payments = await Promise.all(bulkPayments.map((bp) => ctx.db.get(bp.paymentId)));
    const allocations = await Promise.all(bulkAllocations.map((ba) => ctx.db.get(ba.allocationId)));

    const totals = lineItems.reduce(
      (acc, li) => ({
        required: acc.required + li.quantityRequired,
        committed: acc.committed + li.quantityCommitted,
        paid: acc.paid + li.quantityPaid,
        allocated: acc.allocated + li.quantityAllocated,
        totalValue: acc.totalValue + (li.quantityCommitted || li.quantityNegotiated || li.quantityProposed) * (li.negotiatedPrice ?? li.proposedPrice ?? li.unitPrice ?? 0),
      }),
      { required: 0, committed: 0, paid: 0, allocated: 0, totalValue: 0 },
    );

    const totalPaidAmount = payments.reduce((s, p) => s + (p?.status === "successful" ? p.amountDisplay : 0), 0);

    return {
      linkedClientId: org.linkedClientId,
      transactionId: opp.transactionId,
      transactionRef: transaction?.transactionRef,
      transactionStatus: transaction?.status,
      totals,
      totalPaidAmount,
      payments: bulkPayments.map((bp, i) => ({ ...bp, payment: payments[i] })),
      allocations: bulkAllocations.map((ba, i) => ({ ...ba, allocation: allocations[i] })),
      canConvert: !opp.transactionId && totals.committed > 0,
    };
  },
});

// ── Step 1: Commitment ─────────────────────────────────────────────────────
// Records the quantity a corporate organisation has formally committed to
// for a bulk line item. Writes back onto the EXISTING line item row (never a
// parallel quantity ledger) and, on first commitment, progresses the
// opportunity into the "Commitment Received" pipeline stage.
export const recordCommitment = mutation({
  args: {
    lineItemId: v.id("corporateOpportunityLineItems"),
    quantityCommitted: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.commitment_manage");
    const lineItem = await ctx.db.get(args.lineItemId);
    if (!lineItem) throw new ConvexError({ code: "NOT_FOUND", message: "Line item not found" });
    const { opp } = await requireOrgAndOpportunity(ctx, user, lineItem.opportunityId);

    if (args.quantityCommitted < 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Committed quantity cannot be negative" });
    if (args.quantityCommitted > lineItem.quantityRequired) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Committed quantity cannot exceed the required quantity" });
    }
    if (args.quantityCommitted < lineItem.quantityPaid || args.quantityCommitted < lineItem.quantityAllocated) {
      throw new ConvexError({ code: "CONFLICT", message: "Committed quantity cannot be lower than quantity already paid or allocated" });
    }

    await ctx.db.patch(args.lineItemId, {
      quantityCommitted: args.quantityCommitted,
      committedAt: new Date().toISOString(),
      committedBy: user._id,
      notes: args.notes ?? lineItem.notes,
    });

    if (lineItem.bulkAcquisitionId) await recomputeAcquisitionRollups(ctx, lineItem.bulkAcquisitionId);

    // Progress the pipeline stage to "Commitment Received" once any real
    // commitment exists — but never move it backwards past a later stage.
    const commitmentStage = await ctx.db.query("corporatePipelineStages").withIndex("by_key", (q) => q.eq("key", "commitment_received")).unique();
    const currentStage = await ctx.db.query("corporatePipelineStages").withIndex("by_key", (q) => q.eq("key", opp.stageKey)).unique();
    if (args.quantityCommitted > 0 && commitmentStage?.status === "active" && currentStage && currentStage.order < commitmentStage.order) {
      await ctx.db.patch(opp._id, { stageKey: commitmentStage.key, updatedBy: user._id });
    }

    await ctx.db.insert("corporateActivities", {
      organisationId: opp.organisationId,
      opportunityId: opp._id,
      activityType: "commitment",
      subject: `Commitment recorded (${args.quantityCommitted} unit${args.quantityCommitted === 1 ? "" : "s"})`,
      notes: args.notes,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "commitment", entity: "corporate_opportunity_line_items", entityId: args.lineItemId, entityRef: opp.opportunityRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Recorded commitment of ${args.quantityCommitted} unit(s) for opportunity "${opp.name}"`,
      before: JSON.stringify({ quantityCommitted: lineItem.quantityCommitted }),
      after: JSON.stringify({ quantityCommitted: args.quantityCommitted }),
    });
  },
});

// ── Step 2: Payment ────────────────────────────────────────────────────────
// Records a bulk payment against the EXISTING geoPayments table (never a
// second payment ledger). Creates the organisation's proxy client on first
// use. Inserted directly (following the same convention as followups.ts —
// gateway.createPaymentRecord's own admin gate doesn't match the corporate
// marketing permission catalogue) but visible everywhere geoPayments is,
// including reconciliation and receipts.
async function nextPayRef(ctx: MutationCtx): Promise<string> {
  const all = await ctx.db.query("geoPayments").collect();
  return `GWS-PAY-${String(all.length + 1).padStart(4, "0")}`;
}

export const recordBulkPayment = mutation({
  args: {
    opportunityId: v.id("corporateOpportunities"),
    lineItemId: v.optional(v.id("corporateOpportunityLineItems")),
    scheduleId: v.optional(v.id("corporatePaymentSchedules")),
    amountDisplay: v.number(),
    currency: v.string(),
    txnType: v.union(v.literal("deposit"), v.literal("instalment"), v.literal("full_payment")),
    channel: v.optional(v.string()),
    gatewayRef: v.optional(v.string()),
    quantityCovered: v.optional(v.number()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ paymentRef: string; paymentId: Id<"geoPayments"> }> => {
    const user = await requirePermission(ctx, "corporate_marketing.commitment_manage");
    const { opp, org } = await requireOrgAndOpportunity(ctx, user, args.opportunityId);

    if (args.amountDisplay <= 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Amount must be greater than zero" });

    let lineItem: Doc<"corporateOpportunityLineItems"> | null = null;
    if (args.lineItemId) {
      lineItem = await ctx.db.get(args.lineItemId);
      if (!lineItem || lineItem.opportunityId !== args.opportunityId) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Line item does not belong to this opportunity" });
      }
    }

    let schedule: Doc<"corporatePaymentSchedules"> | null = null;
    if (args.scheduleId) {
      schedule = await ctx.db.get(args.scheduleId);
      if (!schedule) throw new ConvexError({ code: "NOT_FOUND", message: "Payment schedule line not found" });
      if (args.amountDisplay > schedule.balance) {
        throw new ConvexError({ code: "BAD_REQUEST", message: `Amount exceeds the outstanding balance of ₦${schedule.balance.toLocaleString()} for this schedule line` });
      }
    }

    const clientId = await ensureLinkedClient(ctx, org, user._id);

    const paymentRef = await nextPayRef(ctx);
    const amountKobo = Math.round(args.amountDisplay * 100);
    const paymentId = await ctx.db.insert("geoPayments", {
      paymentRef,
      clientId,
      transactionId: opp.transactionId,
      gatewayKey: "manual_bank_transfer",
      gatewayRef: args.gatewayRef,
      currency: args.currency,
      amountKobo,
      amountDisplay: args.amountDisplay,
      txnType: args.txnType,
      status: "successful",
      mode: "live",
      webhookReceived: false,
      description: args.description ?? `Corporate bulk payment for "${opp.name}" (${org.orgRef})`,
      channel: args.channel ?? "bank_transfer",
      customerEmail: org.officialEmail,
      customerPhone: org.phone,
      notes: args.notes,
      paidAt: new Date().toISOString(),
      initiatedBy: user._id,
    });

    await ctx.db.insert("corporateBulkPayments", {
      opportunityId: opp._id,
      lineItemId: args.lineItemId,
      scheduleId: args.scheduleId,
      paymentId,
      quantityCovered: args.quantityCovered,
      recordedBy: user._id,
      recordedAt: new Date().toISOString(),
    });

    if (lineItem && args.quantityCovered) {
      const nextPaid = Math.min(lineItem.quantityRequired, lineItem.quantityPaid + args.quantityCovered);
      await ctx.db.patch(lineItem._id, { quantityPaid: nextPaid });
      if (lineItem.bulkAcquisitionId) await recomputeAcquisitionRollups(ctx, lineItem.bulkAcquisitionId);
    }

    if (args.scheduleId) await applyPaymentToSchedule(ctx, args.scheduleId, args.amountDisplay);

    await ctx.db.insert("corporateActivities", {
      organisationId: opp.organisationId,
      opportunityId: opp._id,
      activityType: "payment",
      subject: `Payment recorded — ${args.currency} ${args.amountDisplay.toLocaleString()} (${paymentRef})`,
      notes: args.notes,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_bulk_payments", entityId: paymentId, entityRef: paymentRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Recorded bulk payment of ${args.currency} ${args.amountDisplay.toLocaleString()} for opportunity "${opp.name}"`,
    });

    return { paymentRef, paymentId };
  },
});

// ── Step 3: Allocation ─────────────────────────────────────────────────────
// Delegates the actual allocation to the EXISTING Plot Allocation system
// (allocations.createAllocation) — never a second allocation engine. Only
// links the resulting allocation back to the corporate line item and rolls
// up quantityAllocated/allocationStatus for visibility.
export const recordBulkAllocation = mutation({
  args: {
    lineItemId: v.id("corporateOpportunityLineItems"),
    plotId: v.id("plots"),
    estateId: v.id("estates"),
    allocatedDate: v.string(),
    purchasePrice: v.number(),
    paymentType: v.union(v.literal("outright"), v.literal("installment")),
    batchId: v.optional(v.id("corporateAllocationBatches")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ allocationId: Id<"allocations"> }> => {
    const user = await requirePermission(ctx, "corporate_marketing.commitment_manage");
    const lineItem = await ctx.db.get(args.lineItemId);
    if (!lineItem) throw new ConvexError({ code: "NOT_FOUND", message: "Line item not found" });
    const { opp, org } = await requireOrgAndOpportunity(ctx, user, lineItem.opportunityId);

    if (lineItem.quantityAllocated >= lineItem.quantityCommitted) {
      throw new ConvexError({ code: "CONFLICT", message: "Every committed unit on this line item has already been allocated" });
    }
    if (lineItem.quantityAllocated >= lineItem.quantityPaid) {
      throw new ConvexError({ code: "CONFLICT", message: "Cannot allocate more units than have been paid for on this line item" });
    }

    let batch: Doc<"corporateAllocationBatches"> | null = null;
    if (args.batchId) {
      batch = await ctx.db.get(args.batchId);
      if (!batch) throw new ConvexError({ code: "NOT_FOUND", message: "Allocation batch not found" });
      if (batch.status !== "approved" && batch.status !== "in_progress") {
        throw new ConvexError({ code: "CONFLICT", message: "This allocation batch is not approved for allocation yet" });
      }
      if (batch.lineItemId && batch.lineItemId !== args.lineItemId) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "This batch is scoped to a different line item" });
      }
    } else if (lineItem.bulkAcquisitionId) {
      // No batch specified — still enforce the acquisition's configured
      // eligibility rule directly against real committed/paid figures, so a
      // single ad-hoc allocation can never bypass the rule either.
      const acq = await ctx.db.get(lineItem.bulkAcquisitionId);
      if (acq) {
        const eligible = eligibleQuantityForAllocation(lineItem, acq);
        if (lineItem.quantityAllocated >= eligible) {
          throw new ConvexError({
            code: "CONFLICT",
            message: `No units on this line item are currently eligible for allocation under the "${acq.allocationEligibilityRule ?? "full_payment"}" rule. Create an allocation batch to request an exception if needed.`,
          });
        }
      }
    }

    // Real inventory availability check against the EXISTING plots table —
    // never silently allocates a plot that is not actually available.
    const plot = await ctx.db.get(args.plotId);
    if (!plot) throw new ConvexError({ code: "NOT_FOUND", message: "Plot not found" });
    if (plot.estateId !== args.estateId) throw new ConvexError({ code: "BAD_REQUEST", message: "Plot does not belong to the selected estate" });
    if (plot.status !== "available") {
      throw new ConvexError({ code: "CONFLICT", message: `Plot ${plot.plotNumber} is currently "${plot.status}" and not available for allocation` });
    }

    const clientId = await ensureLinkedClient(ctx, org, user._id);

    const allocationId: Id<"allocations"> = await ctx.runMutation(api.allocations.createAllocation, {
      plotId: args.plotId,
      estateId: args.estateId,
      clientId,
      allocatedDate: args.allocatedDate,
      purchasePrice: args.purchasePrice,
      paymentType: args.paymentType,
      notes: args.notes ?? `Bulk allocation for corporate opportunity ${opp.opportunityRef} (${org.name})`,
      createdBy: user._id,
    });

    await ctx.db.insert("corporateBulkAllocations", {
      opportunityId: opp._id,
      lineItemId: lineItem._id,
      allocationId,
      batchId: args.batchId,
      recordedBy: user._id,
      recordedAt: new Date().toISOString(),
    });

    const nextAllocated = lineItem.quantityAllocated + 1;
    await ctx.db.patch(lineItem._id, {
      quantityAllocated: nextAllocated,
      allocationStatus: deriveAllocationStatus(lineItem.quantityRequired, nextAllocated),
    });
    if (lineItem.bulkAcquisitionId) await recomputeAcquisitionRollups(ctx, lineItem.bulkAcquisitionId);
    if (args.batchId) await recomputeBatchStatus(ctx, args.batchId);

    await ctx.db.insert("corporateActivities", {
      organisationId: opp.organisationId,
      opportunityId: opp._id,
      activityType: "allocation",
      subject: `Plot allocated to ${org.name}`,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "allocate", entity: "corporate_bulk_allocations", entityId: allocationId, entityRef: opp.opportunityRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Allocated a plot to "${opp.name}" (${org.name})`,
    });

    return { allocationId };
  },
});

// ── Step 4: Transaction conversion ─────────────────────────────────────────
// Converts a committed corporate opportunity into a single EXISTING
// transactions row (never a parallel transaction concept) so it flows
// through the same KYC/finance/agreement/completion lifecycle as any other
// sale. Aggregates all line items' committed value into one transaction;
// individual payments/allocations recorded above remain linked to their own
// geoPayments/allocations rows and, from here on, to this transaction too.
// `nextTransactionRef` lives in sharedHelpers.ts, imported above.

export const convertToTransaction = mutation({
  args: { opportunityId: v.id("corporateOpportunities") },
  handler: async (ctx, args): Promise<{ transactionId: Id<"transactions">; transactionRef: string }> => {
    const user = await requirePermission(ctx, "corporate_marketing.commitment_manage");
    const { opp, org } = await requireOrgAndOpportunity(ctx, user, args.opportunityId);

    if (opp.transactionId) {
      throw new ConvexError({ code: "CONFLICT", message: "This opportunity has already been converted to a transaction" });
    }

    const lineItems = await ctx.db.query("corporateOpportunityLineItems").withIndex("by_opportunity", (q) => q.eq("opportunityId", opp._id)).collect();
    if (lineItems.length === 0 || !lineItems.some((li) => li.quantityCommitted > 0)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "At least one line item must have a recorded commitment before converting to a transaction" });
    }

    const clientId = await ensureLinkedClient(ctx, org, user._id);

    const totalPurchasePrice = lineItems.reduce((sum, li) => {
      const qty = li.quantityCommitted || li.quantityNegotiated || li.quantityProposed || li.quantityRequired;
      const unit = li.negotiatedPrice ?? li.proposedPrice ?? li.unitPrice ?? 0;
      return sum + qty * unit;
    }, 0);
    const bulkPayments = await ctx.db.query("corporateBulkPayments").withIndex("by_opportunity", (q) => q.eq("opportunityId", opp._id)).collect();
    const payments = await Promise.all(bulkPayments.map((bp) => ctx.db.get(bp.paymentId)));
    const amountPaid = payments.reduce((s, p) => s + (p?.status === "successful" ? p.amountDisplay : 0), 0);

    const transactionRef = await nextTransactionRef(ctx);
    const outstanding = totalPurchasePrice - amountPaid;
    const transactionId = await ctx.db.insert("transactions", {
      transactionRef,
      clientId,
      assignedStaff: opp.assignedOfficer,
      salesOfficer: opp.relationshipOwner,
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
      priority: opp.priority,
      notes: `Converted from corporate opportunity ${opp.opportunityRef} (${org.name}, ${org.orgRef}).`,
      createdBy: user._id,
      lastUpdatedBy: user._id,
    });

    await ctx.db.insert("transactionEvents", {
      transactionId,
      toStatus: "agreement",
      changedBy: user._id,
      changedByName: user.name,
      note: `Created from corporate bulk-acquisition opportunity ${opp.opportunityRef}`,
      timestamp: new Date().toISOString(),
    });

    await ctx.db.patch(opp._id, { transactionId, updatedBy: user._id });

    // Link every already-recorded bulk payment to the new transaction for
    // full traceability (receipts/reconciliation already work off geoPayments).
    for (const bp of bulkPayments) {
      const payment = await ctx.db.get(bp.paymentId);
      if (payment && !payment.transactionId) {
        await ctx.db.patch(bp.paymentId, { transactionId });
      }
    }

    await ctx.db.insert("corporateActivities", {
      organisationId: opp.organisationId,
      opportunityId: opp._id,
      activityType: "transaction_conversion",
      subject: `Converted to transaction ${transactionRef}`,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "convert", entity: "corporate_opportunities", entityId: opp._id, entityRef: opp.opportunityRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Converted corporate opportunity "${opp.name}" into transaction ${transactionRef}`,
      after: JSON.stringify({ transactionId, transactionRef, totalPurchasePrice }),
    });

    return { transactionId, transactionRef };
  },
});
