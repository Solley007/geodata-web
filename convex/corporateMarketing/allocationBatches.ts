import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import type { MutationCtx } from "../_generated/server";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";
import { eligibleQuantityForAllocation } from "./bulkAcquisitions.ts";
import { nextAllocationBatchRef } from "./refs.ts";
import { recordException, syncExceptionFromApproval } from "./exceptions.ts";

// ══════════════════════════════════════════════════════════════════════════
// Allocation Batches — a controlled unit of work for allocating plots to an
// institutional/bulk acquisition (Institutional / Bulk Acquisition
// Management enhancement, spec section 14). Individual allocations still
// happen through the EXISTING Plot Allocation system (allocations.ts,
// wired via commitments.recordBulkAllocation) — this module only manages
// the batch envelope: how many units are eligible right now, whether an
// exception is needed, and rolling the batch's own status up from the
// allocations recorded under it. Never a second allocation engine.
// ══════════════════════════════════════════════════════════════════════════

export const EXCEPTION_APPROVAL_TYPE = "corporate_allocation_batch_exception";

async function assertAcquisitionVisible(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  id: Id<"corporateBulkAcquisitions">,
): Promise<Doc<"corporateBulkAcquisitions">> {
  const acq = await ctx.db.get(id);
  if (!acq) throw new ConvexError({ code: "NOT_FOUND", message: "Bulk acquisition not found" });
  const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
  const [visible] = await filterByScope(ctx, [acq], scope, (a) => a.assignedOfficer ?? a.relationshipOwner);
  if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this bulk acquisition" });
  return acq;
}

async function nextApprovalRef(ctx: Parameters<typeof requirePermission>[0]): Promise<string> {
  const last = await ctx.db.query("approvals").order("desc").first();
  const n = last ? parseInt(last.approvalRef.replace("GWS-APR-", "") || "0", 10) + 1 : 1;
  return `GWS-APR-${String(n).padStart(4, "0")}`;
}

async function linkedLineItems(ctx: MutationCtx | Parameters<typeof requirePermission>[0], acquisitionId: Id<"corporateBulkAcquisitions">, opportunityId: Id<"corporateOpportunities">): Promise<Doc<"corporateOpportunityLineItems">[]> {
  const rows = await ctx.db.query("corporateOpportunityLineItems").withIndex("by_opportunity", (q) => q.eq("opportunityId", opportunityId)).collect();
  return rows.filter((r) => r.bulkAcquisitionId === acquisitionId);
}

// ── Real-time eligibility & availability check (spec section 14) ─────────
// Given an acquisition (and optionally a single line item), returns how many
// units are currently eligible to be allocated under the acquisition's
// configured eligibility rule, how many have already been allocated, and how
// many remain available right now — computed live, never cached.
export const checkAllocationEligibility = query({
  args: { bulkAcquisitionId: v.id("corporateBulkAcquisitions"), lineItemId: v.optional(v.id("corporateOpportunityLineItems")) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");
    const acq = await assertAcquisitionVisible(ctx, user, args.bulkAcquisitionId);

    const allLineItems = await linkedLineItems(ctx, args.bulkAcquisitionId, acq.opportunityId);
    const lineItems = args.lineItemId ? allLineItems.filter((li) => li._id === args.lineItemId) : allLineItems;

    const perLineItem = lineItems.map((li) => {
      const eligible = eligibleQuantityForAllocation(li, acq);
      const remaining = Math.max(0, eligible - li.quantityAllocated);
      return {
        lineItemId: li._id,
        propertyType: li.propertyType,
        quantityCommitted: li.quantityCommitted,
        quantityPaid: li.quantityPaid,
        quantityAllocated: li.quantityAllocated,
        eligibleQuantity: eligible,
        remainingEligible: remaining,
      };
    });

    const totals = perLineItem.reduce(
      (acc, li) => ({
        committed: acc.committed + li.quantityCommitted,
        paid: acc.paid + li.quantityPaid,
        allocated: acc.allocated + li.quantityAllocated,
        eligible: acc.eligible + li.eligibleQuantity,
        remainingEligible: acc.remainingEligible + li.remainingEligible,
      }),
      { committed: 0, paid: 0, allocated: 0, eligible: 0, remainingEligible: 0 },
    );

    return {
      rule: acq.allocationEligibilityRule ?? "full_payment",
      percent: acq.allocationEligibilityPercent,
      perLineItem,
      totals,
    };
  },
});

export const listAllocationBatches = query({
  args: { bulkAcquisitionId: v.id("corporateBulkAcquisitions") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");
    const acq = await assertAcquisitionVisible(ctx, user, args.bulkAcquisitionId);

    const rows = await ctx.db.query("corporateAllocationBatches").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", args.bulkAcquisitionId)).order("desc").collect();

    const linkedAllocations = await ctx.db.query("corporateBulkAllocations").withIndex("by_opportunity", (q) => q.eq("opportunityId", acq.opportunityId)).collect();
    const allocationCounts = new Map<Id<"corporateAllocationBatches">, number>();
    for (const l of linkedAllocations) {
      if (!l.batchId) continue;
      allocationCounts.set(l.batchId, (allocationCounts.get(l.batchId) ?? 0) + 1);
    }

    const lineItemIds = new Set(rows.map((r) => r.lineItemId).filter((v): v is Id<"corporateOpportunityLineItems"> => !!v));
    const lineItemDocs = await Promise.all(Array.from(lineItemIds).map((id) => ctx.db.get(id)));
    const lineItemById = new Map(lineItemDocs.filter((d): d is Doc<"corporateOpportunityLineItems"> => !!d).map((d) => [d._id, d]));

    return rows.map((r) => ({
      ...r,
      lineItemLabel: r.lineItemId ? lineItemById.get(r.lineItemId)?.propertyType ?? "Line item" : "Multiple line items",
      allocatedCount: allocationCounts.get(r._id) ?? 0,
    }));
  },
});

export const getAllocationBatch = query({
  args: { id: v.id("corporateAllocationBatches") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");
    const batch = await ctx.db.get(args.id);
    if (!batch) throw new ConvexError({ code: "NOT_FOUND", message: "Allocation batch not found" });
    const acq = await assertAcquisitionVisible(ctx, user, batch.bulkAcquisitionId);

    const linked = (await ctx.db.query("corporateBulkAllocations").withIndex("by_opportunity", (q) => q.eq("opportunityId", acq.opportunityId)).collect())
      .filter((l) => l.batchId === batch._id);
    const allocations = await Promise.all(linked.map((l) => ctx.db.get(l.allocationId)));
    const plots = await Promise.all(allocations.map((a) => (a ? ctx.db.get(a.plotId) : null)));

    return {
      ...batch,
      acquisitionRef: acq.acquisitionRef,
      allocations: linked.map((l, i) => ({ ...l, allocation: allocations[i], plot: plots[i] })),
    };
  },
});

export const createAllocationBatch = mutation({
  args: {
    bulkAcquisitionId: v.id("corporateBulkAcquisitions"),
    lineItemId: v.optional(v.id("corporateOpportunityLineItems")),
    batchDate: v.string(),
    requestedQuantity: v.number(),
    isException: v.optional(v.boolean()),
    exceptionReason: v.optional(v.string()),
    responsibleOfficer: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"corporateAllocationBatches">> => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_edit");
    const acq = await assertAcquisitionVisible(ctx, user, args.bulkAcquisitionId);

    if (args.requestedQuantity <= 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Requested quantity must be greater than zero" });

    if (args.lineItemId) {
      const li = await ctx.db.get(args.lineItemId);
      if (!li || li.bulkAcquisitionId !== args.bulkAcquisitionId) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Line item does not belong to this bulk acquisition" });
      }
    }

    const isException = args.isException ?? false;
    if (isException && !args.exceptionReason?.trim()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "An exception reason is required when requesting an eligibility exception" });
    }

    // Real eligibility check against currently eligible units — never
    // silently allocates beyond what the acquisition's configured rule
    // permits, unless this batch is explicitly flagged as a management
    // exception, which is gated by approval below instead.
    if (!isException) {
      const lineItems = await linkedLineItems(ctx, args.bulkAcquisitionId, acq.opportunityId);
      const scoped = args.lineItemId ? lineItems.filter((li) => li._id === args.lineItemId) : lineItems;
      const remainingEligible = scoped.reduce((sum, li) => {
        const eligible = eligibleQuantityForAllocation(li, acq);
        return sum + Math.max(0, eligible - li.quantityAllocated);
      }, 0);
      if (args.requestedQuantity > remainingEligible) {
        throw new ConvexError({
          code: "CONFLICT",
          message: `Only ${remainingEligible} unit(s) are currently eligible for allocation under this acquisition's "${acq.allocationEligibilityRule ?? "full_payment"}" rule. Request a management exception to proceed anyway.`,
        });
      }
    }

    const batchRef = await nextAllocationBatchRef(ctx);
    const id = await ctx.db.insert("corporateAllocationBatches", {
      batchRef,
      bulkAcquisitionId: args.bulkAcquisitionId,
      lineItemId: args.lineItemId,
      batchDate: args.batchDate,
      requestedQuantity: args.requestedQuantity,
      status: isException ? "pending_approval" : "approved",
      isException,
      exceptionReason: args.exceptionReason,
      responsibleOfficer: args.responsibleOfficer ?? user._id,
      notes: args.notes,
      createdBy: user._id,
      updatedBy: user._id,
    });

    let approvalId: Id<"approvals"> | undefined;
    if (isException) {
      const approvalRef = await nextApprovalRef(ctx);
      approvalId = await ctx.db.insert("approvals", {
        approvalRef,
        approvalType: EXCEPTION_APPROVAL_TYPE,
        status: "pending",
        priority: "high",
        summary: `Approve allocation exception for ${args.requestedQuantity} unit(s) on "${acq.name}" (${acq.acquisitionRef})`,
        requestNote: args.exceptionReason,
        relatedRef: batchRef,
        requestedBy: user._id,
        requestedAt: new Date().toISOString(),
      });
      await ctx.db.patch(id, { approvalId });
      await recordException(ctx, {
        bulkAcquisitionId: args.bulkAcquisitionId,
        exceptionType: "allocation",
        reason: args.exceptionReason ?? "Allocation beyond configured eligibility rule",
        requestedBy: user._id,
        approvalId,
        relatedRef: batchRef,
      });
    }

    await logAudit(ctx, {
      action: "create", entity: "corporate_allocation_batches", entityId: id, entityRef: batchRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created allocation batch ${batchRef} for ${args.requestedQuantity} unit(s) on "${acq.name}"${isException ? " — pending exception approval" : ""}`,
    });

    return id;
  },
});

// Decides a pending allocation-batch exception — must never be decided by
// the officer who requested it, and only by someone holding
// corporate_marketing.acquisition_approve, exactly like commercial-terms
// discount decisions.
export const decideAllocationBatchException = mutation({
  args: {
    id: v.id("corporateAllocationBatches"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    decisionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_approve");
    const batch = await ctx.db.get(args.id);
    if (!batch) throw new ConvexError({ code: "NOT_FOUND", message: "Allocation batch not found" });
    const acq = await assertAcquisitionVisible(ctx, user, batch.bulkAcquisitionId);

    if (batch.status !== "pending_approval") {
      throw new ConvexError({ code: "CONFLICT", message: "Only a batch pending exception approval can be decided" });
    }
    if (batch.createdBy === user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "The requesting officer cannot decide their own allocation exception" });
    }

    if (batch.approvalId) {
      const approval = await ctx.db.get(batch.approvalId);
      if (approval && approval.status === "pending") {
        await ctx.db.patch(batch.approvalId, {
          status: args.decision, decision: args.decision, decisionNote: args.decisionNote,
          decisionBy: user._id, decisionAt: new Date().toISOString(),
        });
      }
      await syncExceptionFromApproval(ctx, batch.approvalId, args.decision, user._id);
    }

    await ctx.db.patch(args.id, {
      status: args.decision === "approved" ? "approved" : "cancelled",
      updatedBy: user._id,
    });

    await logAudit(ctx, {
      action: args.decision === "approved" ? "approve" : "reject",
      entity: "corporate_allocation_batches", entityId: args.id, entityRef: batch.batchRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `${args.decision === "approved" ? "Approved" : "Rejected"} allocation exception for batch ${batch.batchRef} on "${acq.name}"${args.decisionNote ? ` — ${args.decisionNote}` : ""}`,
    });
  },
});

export const cancelAllocationBatch = mutation({
  args: { id: v.id("corporateAllocationBatches"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_edit");
    const batch = await ctx.db.get(args.id);
    if (!batch) throw new ConvexError({ code: "NOT_FOUND", message: "Allocation batch not found" });
    const acq = await assertAcquisitionVisible(ctx, user, batch.bulkAcquisitionId);

    if (batch.status === "completed" || batch.status === "cancelled") {
      throw new ConvexError({ code: "CONFLICT", message: "This batch cannot be cancelled from its current status" });
    }

    const linked = (await ctx.db.query("corporateBulkAllocations").withIndex("by_opportunity", (q) => q.eq("opportunityId", acq.opportunityId)).collect())
      .filter((l) => l.batchId === batch._id);
    if (linked.length > 0) {
      throw new ConvexError({ code: "CONFLICT", message: "Cannot cancel a batch that already has real allocations recorded under it" });
    }

    // Never physically deleted — status flips to cancelled, full history stays.
    await ctx.db.patch(args.id, { status: "cancelled", notes: args.reason ? `${batch.notes ?? ""}\nCancelled: ${args.reason}`.trim() : batch.notes, updatedBy: user._id });

    await logAudit(ctx, {
      action: "cancel", entity: "corporate_allocation_batches", entityId: args.id, entityRef: batch.batchRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Cancelled allocation batch ${batch.batchRef} on "${acq.name}"${args.reason ? ` — ${args.reason}` : ""}`,
    });
  },
});

// Rolls a batch's status up from how many real allocations have been
// recorded under it vs its requestedQuantity. Called by
// commitments.recordBulkAllocation after linking an allocation to a batch —
// never hand-patched from anywhere else.
export async function recomputeBatchStatus(ctx: MutationCtx, batchId: Id<"corporateAllocationBatches">): Promise<void> {
  const batch = await ctx.db.get(batchId);
  if (!batch) return;
  const acq = await ctx.db.get(batch.bulkAcquisitionId);
  if (!acq) return;
  const linked = (await ctx.db.query("corporateBulkAllocations").withIndex("by_opportunity", (q) => q.eq("opportunityId", acq.opportunityId)).collect())
    .filter((l) => l.batchId === batchId);
  const status: Doc<"corporateAllocationBatches">["status"] =
    linked.length >= batch.requestedQuantity ? "completed" : linked.length > 0 ? "in_progress" : batch.status;
  if (status !== batch.status) await ctx.db.patch(batchId, { status });
}
