import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import type { MutationCtx } from "../_generated/server";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Unified Exceptions Register (Institutional / Bulk Acquisition Management
// enhancement, spec section 25). Every exception path elsewhere in the
// initiative (commercial-terms discount overage in commercialTerms.ts,
// allocation-eligibility overrides in allocationBatches.ts) already creates
// its OWN approvals row and gates the underlying record on it — this module
// does NOT introduce a second approval or exception-decision flow. It simply
// records a cross-cutting row here, pointing at that same approval, so every
// exception raised anywhere on an acquisition can be viewed, filtered, and
// reported on together. `recordException` is called from the module that
// raises the exception; nothing here decides an exception on its own.
// ══════════════════════════════════════════════════════════════════════════

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

// Called by whichever module raises an exception (never by end-user input
// directly) — records the cross-cutting register row pointing at the
// approval that module already created.
export async function recordException(
  ctx: MutationCtx,
  args: {
    bulkAcquisitionId: Id<"corporateBulkAcquisitions">;
    exceptionType: Doc<"corporateExceptions">["exceptionType"];
    reason: string;
    requestedBy: Id<"users">;
    approvalId?: Id<"approvals">;
    relatedRef?: string;
    notes?: string;
  },
): Promise<Id<"corporateExceptions">> {
  return await ctx.db.insert("corporateExceptions", {
    bulkAcquisitionId: args.bulkAcquisitionId,
    exceptionType: args.exceptionType,
    reason: args.reason,
    requestedBy: args.requestedBy,
    requestedAt: new Date().toISOString(),
    approvalId: args.approvalId,
    status: "pending",
    relatedRef: args.relatedRef,
    notes: args.notes,
  });
}

// Syncs this register row's status from the approval it points at — called
// after that approval is decided by whichever module owns the decision flow
// (decideCommercialTermsApproval / decideAllocationBatchException / etc), so
// the register never drifts from the real decision.
export async function syncExceptionFromApproval(
  ctx: MutationCtx,
  approvalId: Id<"approvals">,
  decision: "approved" | "rejected",
  decidedBy: Id<"users">,
): Promise<void> {
  const rows = await ctx.db.query("corporateExceptions").collect();
  const match = rows.find((r) => r.approvalId === approvalId);
  if (!match) return;
  await ctx.db.patch(match._id, {
    status: decision,
    approvedBy: decision === "approved" ? decidedBy : undefined,
    approvedAt: decision === "approved" ? new Date().toISOString() : undefined,
  });
}

export const listExceptions = query({
  args: { bulkAcquisitionId: v.id("corporateBulkAcquisitions") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");
    await assertAcquisitionVisible(ctx, user, args.bulkAcquisitionId);

    const rows = await ctx.db.query("corporateExceptions").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", args.bulkAcquisitionId)).order("desc").collect();

    const userIds = new Set(rows.map((r) => r.requestedBy).filter((v): v is Id<"users"> => !!v));
    const userDocs = await Promise.all(Array.from(userIds).map((id) => ctx.db.get(id)));
    const nameById = new Map<Id<"users">, string>();
    for (const u of userDocs) if (u) nameById.set(u._id, u.name ?? u.email ?? "Unknown");

    return rows.map((r) => ({ ...r, requestedByName: r.requestedBy ? nameById.get(r.requestedBy) : undefined }));
  },
});

// Register spanning every acquisition the viewer can see, for a global
// exception register view. Bounded to a reasonable page since this is an
// oversight/reporting screen, not a hot reactive list.
export const listAllExceptions = query({
  args: { status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");

    const rows = args.status
      ? await ctx.db.query("corporateExceptions").withIndex("by_status", (q) => q.eq("status", args.status!)).order("desc").take(200)
      : await ctx.db.query("corporateExceptions").order("desc").take(200);

    const acqIds = new Set(rows.map((r) => r.bulkAcquisitionId));
    const acqDocs = await Promise.all(Array.from(acqIds).map((id) => ctx.db.get(id)));
    const acqById = new Map(acqDocs.filter((d): d is Doc<"corporateBulkAcquisitions"> => !!d).map((d) => [d._id, d]));

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const visibleAcqIds = new Set((await filterByScope(ctx, Array.from(acqById.values()), scope, (a) => a.assignedOfficer ?? a.relationshipOwner)).map((a) => a._id));
    const scoped = rows.filter((r) => visibleAcqIds.has(r.bulkAcquisitionId));

    const userIds = new Set(scoped.map((r) => r.requestedBy).filter((v): v is Id<"users"> => !!v));
    const userDocs = await Promise.all(Array.from(userIds).map((id) => ctx.db.get(id)));
    const nameById = new Map<Id<"users">, string>();
    for (const u of userDocs) if (u) nameById.set(u._id, u.name ?? u.email ?? "Unknown");

    return scoped.map((r) => ({
      ...r,
      requestedByName: r.requestedBy ? nameById.get(r.requestedBy) : undefined,
      acquisitionName: acqById.get(r.bulkAcquisitionId)?.name ?? "Unknown",
      acquisitionRef: acqById.get(r.bulkAcquisitionId)?.acquisitionRef,
    }));
  },
});

// ══════════════════════════════════════════════════════════════════════════
// On Hold / Disputed (spec section 26) — placing an acquisition on hold or
// in dispute never deletes it. While an unresolved hold exists, the
// acquisition's statusKey flips to the acquisition-status config's
// "on_hold"/"disputed" flagged key; resolving it reverts to the status
// recorded on the hold at the moment it was raised.
// ══════════════════════════════════════════════════════════════════════════

async function findFlaggedStatusKey(ctx: MutationCtx, flag: "isOnHold" | "isDisputed"): Promise<string> {
  const statuses = await ctx.db.query("corporateAcquisitionStatuses").withIndex("by_status", (q) => q.eq("status", "active")).collect();
  const match = statuses.find((s) => s[flag]);
  if (!match) throw new ConvexError({ code: "BAD_REQUEST", message: `No active acquisition status is configured with the ${flag === "isOnHold" ? "On Hold" : "Disputed"} flag` });
  return match.key;
}

export const listHolds = query({
  args: { bulkAcquisitionId: v.id("corporateBulkAcquisitions") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");
    await assertAcquisitionVisible(ctx, user, args.bulkAcquisitionId);
    return await ctx.db.query("corporateAcquisitionHolds").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", args.bulkAcquisitionId)).order("desc").collect();
  },
});

export const raiseHold = mutation({
  args: {
    bulkAcquisitionId: v.id("corporateBulkAcquisitions"),
    holdType: v.union(v.literal("on_hold"), v.literal("disputed")),
    reason: v.string(),
    responsiblePerson: v.optional(v.id("users")),
    supportingVaultDocumentId: v.optional(v.id("vaultDocuments")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"corporateAcquisitionHolds">> => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_edit");
    const acq = await assertAcquisitionVisible(ctx, user, args.bulkAcquisitionId);
    if (!args.reason.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "A reason is required" });

    const existingUnresolved = (await ctx.db.query("corporateAcquisitionHolds").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", args.bulkAcquisitionId)).collect())
      .find((h) => !h.resolved);
    if (existingUnresolved) {
      throw new ConvexError({ code: "CONFLICT", message: "This acquisition already has an unresolved hold or dispute — resolve it before raising another" });
    }

    const flaggedKey = await findFlaggedStatusKey(ctx, args.holdType === "on_hold" ? "isOnHold" : "isDisputed");

    const id = await ctx.db.insert("corporateAcquisitionHolds", {
      bulkAcquisitionId: args.bulkAcquisitionId,
      holdType: args.holdType,
      reason: args.reason.trim(),
      raisedBy: user._id,
      raisedAt: new Date().toISOString(),
      responsiblePerson: args.responsiblePerson,
      statusBeforeHold: acq.statusKey,
      supportingVaultDocumentId: args.supportingVaultDocumentId,
      resolved: false,
      notes: args.notes,
    });

    await ctx.db.patch(args.bulkAcquisitionId, { statusKey: flaggedKey, updatedBy: user._id });

    await logAudit(ctx, {
      action: "hold", entity: "corporate_bulk_acquisitions", entityId: args.bulkAcquisitionId, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `${args.holdType === "on_hold" ? "Placed on hold" : "Marked as disputed"}: "${acq.name}" — ${args.reason.trim()}`,
      before: JSON.stringify({ statusKey: acq.statusKey }),
      after: JSON.stringify({ statusKey: flaggedKey }),
    });

    return id;
  },
});

export const resolveHold = mutation({
  args: {
    id: v.id("corporateAcquisitionHolds"),
    resolutionAction: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_edit");
    const hold = await ctx.db.get(args.id);
    if (!hold) throw new ConvexError({ code: "NOT_FOUND", message: "Hold not found" });
    const acq = await assertAcquisitionVisible(ctx, user, hold.bulkAcquisitionId);

    if (hold.resolved) throw new ConvexError({ code: "CONFLICT", message: "This hold has already been resolved" });
    if (!args.resolutionAction.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "A resolution action is required" });

    await ctx.db.patch(args.id, {
      resolved: true,
      resolutionAction: args.resolutionAction.trim(),
      resolutionDate: new Date().toISOString(),
      resolvedBy: user._id,
    });

    // Reverts to whatever status the acquisition was in before this hold —
    // never guessed, always the value recorded at the moment the hold was
    // raised, so overlapping edits during the hold don't get clobbered.
    await ctx.db.patch(hold.bulkAcquisitionId, { statusKey: hold.statusBeforeHold, updatedBy: user._id });

    await logAudit(ctx, {
      action: "resolve_hold", entity: "corporate_bulk_acquisitions", entityId: hold.bulkAcquisitionId, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Resolved ${hold.holdType === "on_hold" ? "hold" : "dispute"} on "${acq.name}" — ${args.resolutionAction.trim()}`,
      before: JSON.stringify({ statusKey: acq.statusKey }),
      after: JSON.stringify({ statusKey: hold.statusBeforeHold }),
    });
  },
});

// ══════════════════════════════════════════════════════════════════════════
// Controlled cancellation (spec section 27) — never physically deletes the
// acquisition. Records the cancellation fields on the row itself and flips
// its status to the configured "isCancelled" status. Cancelling an
// acquisition with an unresolved hold is blocked — resolve the hold first so
// the reason for cancellation is never conflated with an open dispute.
// ══════════════════════════════════════════════════════════════════════════
export const cancelBulkAcquisition = mutation({
  args: {
    id: v.id("corporateBulkAcquisitions"),
    reason: v.string(),
    financialImpactNotes: v.optional(v.string()),
    allocationImpactNotes: v.optional(v.string()),
    refundStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_close");
    const acq = await assertAcquisitionVisible(ctx, user, args.id);
    if (!args.reason.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "A cancellation reason is required" });

    const statuses = await ctx.db.query("corporateAcquisitionStatuses").withIndex("by_status", (q) => q.eq("status", "active")).collect();
    const cancelledStatus = statuses.find((s) => s.isCancelled);
    if (!cancelledStatus) throw new ConvexError({ code: "BAD_REQUEST", message: "No active acquisition status is configured with the Cancelled flag" });

    if (acq.statusKey === cancelledStatus.key) {
      throw new ConvexError({ code: "CONFLICT", message: "This acquisition is already cancelled" });
    }

    const unresolvedHold = (await ctx.db.query("corporateAcquisitionHolds").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", args.id)).collect())
      .find((h) => !h.resolved);
    if (unresolvedHold) {
      throw new ConvexError({ code: "CONFLICT", message: "Resolve the open hold/dispute on this acquisition before cancelling it" });
    }

    // Soft state only — never ctx.db.delete. Full history (line items,
    // terms, schedules, batches, payments, allocations) stays exactly as-is.
    await ctx.db.patch(args.id, {
      statusKey: cancelledStatus.key,
      cancellationReason: args.reason.trim(),
      cancellationRequestedBy: user._id,
      cancelledBy: user._id,
      cancelledAt: new Date().toISOString(),
      financialImpactNotes: args.financialImpactNotes,
      allocationImpactNotes: args.allocationImpactNotes,
      refundStatus: args.refundStatus,
      updatedBy: user._id,
    });

    await logAudit(ctx, {
      action: "cancel", entity: "corporate_bulk_acquisitions", entityId: args.id, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Cancelled bulk acquisition "${acq.name}" — ${args.reason.trim()}`,
      before: JSON.stringify({ statusKey: acq.statusKey }),
      after: JSON.stringify({ statusKey: cancelledStatus.key, reason: args.reason.trim() }),
    });
  },
});
