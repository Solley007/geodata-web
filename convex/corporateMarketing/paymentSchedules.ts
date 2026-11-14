import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import type { MutationCtx } from "../_generated/server";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Payment Schedule — one row per due date (deposit/instalment N/final) for a
// bulk acquisition (Institutional / Bulk Acquisition Management enhancement,
// spec sections 12-13). Actual money movement always goes through the
// EXISTING geoPayments table via commitments.recordBulkPayment (this
// milestone extends it with an optional scheduleId) — this module only
// manages the due-date plan and the amountPaid/balance/status rollups on
// each schedule row. Never a second payment ledger.
// ══════════════════════════════════════════════════════════════════════════

const FREQUENCY_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, biannually: 6, annually: 12, custom: 1 };

function deriveScheduleStatus(amountDue: number, amountPaid: number): "upcoming" | "partially_paid" | "paid" {
  if (amountPaid <= 0) return "upcoming";
  if (amountPaid >= amountDue) return "paid";
  return "partially_paid";
}

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

export const listPaymentSchedules = query({
  args: { bulkAcquisitionId: v.id("corporateBulkAcquisitions") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");
    await assertAcquisitionVisible(ctx, user, args.bulkAcquisitionId);
    const rows = await ctx.db.query("corporatePaymentSchedules").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", args.bulkAcquisitionId)).collect();
    const today = new Date().toISOString().slice(0, 10);
    return rows
      .sort((a, b) => a.sequence - b.sequence)
      .map((r) => ({ ...r, isOverdue: r.status !== "paid" && r.dueDate < today }));
  },
});

export const createPaymentSchedule = mutation({
  args: {
    bulkAcquisitionId: v.id("corporateBulkAcquisitions"),
    label: v.string(),
    scheduleType: v.union(v.literal("deposit"), v.literal("instalment"), v.literal("final")),
    dueDate: v.string(),
    amountDue: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"corporatePaymentSchedules">> => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_edit");
    const acq = await assertAcquisitionVisible(ctx, user, args.bulkAcquisitionId);

    if (args.amountDue <= 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Amount due must be greater than zero" });
    if (!args.label.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "A label is required" });

    const existing = await ctx.db.query("corporatePaymentSchedules").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", args.bulkAcquisitionId)).collect();
    const nextSequence = existing.length > 0 ? Math.max(...existing.map((r) => r.sequence)) + 1 : 1;

    const id = await ctx.db.insert("corporatePaymentSchedules", {
      bulkAcquisitionId: args.bulkAcquisitionId,
      sequence: nextSequence,
      label: args.label.trim(),
      scheduleType: args.scheduleType,
      dueDate: args.dueDate,
      amountDue: args.amountDue,
      amountPaid: 0,
      balance: args.amountDue,
      status: "upcoming",
      notes: args.notes,
      createdBy: user._id,
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_payment_schedules", entityId: id, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Added payment schedule line "${args.label.trim()}" (₦${args.amountDue.toLocaleString()} due ${args.dueDate}) to bulk acquisition "${acq.name}"`,
    });

    return id;
  },
});

export const updatePaymentSchedule = mutation({
  args: {
    id: v.id("corporatePaymentSchedules"),
    label: v.optional(v.string()),
    scheduleType: v.optional(v.union(v.literal("deposit"), v.literal("instalment"), v.literal("final"))),
    dueDate: v.optional(v.string()),
    amountDue: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_edit");
    const { id, ...patch } = args;
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", message: "Payment schedule line not found" });
    const acq = await assertAcquisitionVisible(ctx, user, row.bulkAcquisitionId);

    const nextAmountDue = patch.amountDue ?? row.amountDue;
    if (nextAmountDue <= 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Amount due must be greater than zero" });
    if (nextAmountDue < row.amountPaid) {
      throw new ConvexError({ code: "CONFLICT", message: "Amount due cannot be reduced below the amount already paid against this line" });
    }

    await ctx.db.patch(id, {
      ...patch,
      amountDue: nextAmountDue,
      balance: Math.max(0, nextAmountDue - row.amountPaid),
      status: deriveScheduleStatus(nextAmountDue, row.amountPaid),
      updatedBy: user._id,
    });

    await logAudit(ctx, {
      action: "update", entity: "corporate_payment_schedules", entityId: id, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated payment schedule line "${row.label}" on bulk acquisition "${acq.name}"`,
      before: JSON.stringify(row),
      after: JSON.stringify(patch),
    });
  },
});

export const deletePaymentSchedule = mutation({
  args: { id: v.id("corporatePaymentSchedules") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_edit");
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", message: "Payment schedule line not found" });
    const acq = await assertAcquisitionVisible(ctx, user, row.bulkAcquisitionId);

    if (row.amountPaid > 0) {
      throw new ConvexError({ code: "CONFLICT", message: "Cannot remove a payment schedule line that already has payments recorded against it" });
    }

    await ctx.db.delete(args.id);

    await logAudit(ctx, {
      action: "delete", entity: "corporate_payment_schedules", entityId: args.id, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Removed payment schedule line "${row.label}" from bulk acquisition "${acq.name}"`,
      before: JSON.stringify(row),
    });
  },
});

// Generates a deposit + instalment + final schedule off the acquisition's
// currently active commercial terms — a convenience so officers never have
// to hand-type routine instalment plans. Never runs if any schedule rows
// already exist for this acquisition, so it can't silently duplicate a
// manually-built plan.
export const generateScheduleFromTerms = mutation({
  args: { bulkAcquisitionId: v.id("corporateBulkAcquisitions"), startDate: v.string() },
  handler: async (ctx, args): Promise<{ created: number }> => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_edit");
    const acq = await assertAcquisitionVisible(ctx, user, args.bulkAcquisitionId);

    const existing = await ctx.db.query("corporatePaymentSchedules").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", args.bulkAcquisitionId)).collect();
    if (existing.length > 0) {
      throw new ConvexError({ code: "CONFLICT", message: "This acquisition already has payment schedule lines. Remove them first or add lines manually." });
    }

    const terms = await ctx.db.query("corporateCommercialTerms").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", args.bulkAcquisitionId)).collect();
    const active = terms.find((t) => t.status === "active");
    if (!active || !active.totalContractValue) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Activate commercial terms with a total contract value before generating a schedule" });
    }

    const totalValue = active.totalContractValue;
    const depositAmount = active.depositAmount ?? (active.depositPercent ? (active.depositPercent / 100) * totalValue : 0);
    const remaining = Math.max(0, totalValue - depositAmount);
    const durationMonths = Math.max(1, active.instalmentDurationMonths ?? 1);
    const stepMonths = FREQUENCY_MONTHS[active.instalmentFrequency ?? "monthly"] ?? 1;
    const instalmentCount = Math.max(1, Math.floor(durationMonths / stepMonths));
    const instalmentAmount = instalmentCount > 0 ? remaining / instalmentCount : 0;

    const start = new Date(args.startDate);
    let sequence = 1;
    let created = 0;

    const insertLine = async (label: string, scheduleType: "deposit" | "instalment" | "final", dueDate: string, amountDue: number) => {
      if (amountDue <= 0) return;
      await ctx.db.insert("corporatePaymentSchedules", {
        bulkAcquisitionId: args.bulkAcquisitionId,
        sequence: sequence++,
        label,
        scheduleType,
        dueDate,
        amountDue,
        amountPaid: 0,
        balance: amountDue,
        status: "upcoming",
        createdBy: user._id,
      });
      created++;
    };

    if (depositAmount > 0) {
      await insertLine("Deposit", "deposit", start.toISOString().slice(0, 10), depositAmount);
    }

    for (let i = 1; i <= instalmentCount; i++) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i * stepMonths);
      const isLast = i === instalmentCount;
      await insertLine(isLast ? "Final Payment" : `Instalment ${i}`, isLast ? "final" : "instalment", due.toISOString().slice(0, 10), instalmentAmount);
    }

    await logAudit(ctx, {
      action: "generate", entity: "corporate_payment_schedules", entityId: args.bulkAcquisitionId, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Generated a ${created}-line payment schedule for bulk acquisition "${acq.name}" from commercial terms v${active.version}`,
    });

    return { created };
  },
});

// Recomputes a schedule row's amountPaid/balance/status by summing every
// bulk payment linked to it via corporateBulkPayments.scheduleId. Called by
// commitments.recordBulkPayment whenever a payment is recorded against a
// schedule line — never hand-patched from anywhere else.
export async function applyPaymentToSchedule(ctx: MutationCtx, scheduleId: Id<"corporatePaymentSchedules">, amountDisplay: number): Promise<void> {
  const schedule = await ctx.db.get(scheduleId);
  if (!schedule) return;
  const nextPaid = schedule.amountPaid + amountDisplay;
  await ctx.db.patch(scheduleId, {
    amountPaid: nextPaid,
    balance: Math.max(0, schedule.amountDue - nextPaid),
    status: deriveScheduleStatus(schedule.amountDue, nextPaid),
  });
}
