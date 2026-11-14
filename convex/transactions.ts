import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin.ts";
import { internal } from "./_generated/api.js";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.js";
import { resolveViewerScope, filterByScope } from "./iam/scope.ts";
import { notifyClient } from "./notifications.ts";

// ── Status definitions ─────────────────────────────────────────────────────
export const LIFECYCLE_STATUSES = [
  "inquiry",
  "qualified",
  "property_selected",
  "application_started",
  "kyc_pending",
  "kyc_review",
  "kyc_approved",
  "finance_pending",
  "finance_approved",
  "payment_plan",
  "payment_pending",
  "partially_paid",
  "fully_paid",
  "agreement",
  "e_signature",
  "allocation",
  "completion_review",
  "completed",
] as const;

export const EXCEPTION_STATUSES = [
  "more_info_required",
  "kyc_rejected",
  "finance_rejected",
  "payment_failed",
  "payment_pending_verification",
  "reservation_pending",
  "on_hold",
  "cancelled",
  "signature_expired",
  "transaction_exception",
] as const;

export const TRANSACTION_STATUSES = [...LIFECYCLE_STATUSES, ...EXCEPTION_STATUSES] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

// Human-readable labels
export const STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  qualified: "Qualified",
  property_selected: "Property Selected",
  application_started: "Application Started",
  kyc_pending: "KYC Pending",
  kyc_review: "KYC Under Review",
  kyc_approved: "KYC Approved",
  finance_pending: "Finance Pending",
  finance_approved: "Finance Approved",
  payment_plan: "Payment Plan Active",
  payment_pending: "Payment Pending",
  partially_paid: "Partially Paid",
  fully_paid: "Fully Paid",
  agreement: "Agreement Stage",
  e_signature: "E-Signature Pending",
  allocation: "Allocation",
  completion_review: "Completion Review",
  completed: "Completed",
  more_info_required: "More Info Required",
  kyc_rejected: "KYC Rejected",
  finance_rejected: "Finance Rejected",
  payment_failed: "Payment Failed",
  payment_pending_verification: "Payment Verification",
  reservation_pending: "Reservation Pending",
  on_hold: "On Hold",
  cancelled: "Cancelled",
  signature_expired: "Signature Expired",
  transaction_exception: "Exception",
};

// Helper to generate a transaction ref
async function generateTransactionRef(ctx: QueryCtx): Promise<string> {
  const count = await ctx.db.query("transactions").collect();
  const num = String(count.length + 1).padStart(4, "0");
  return `GWS-TXN-${num}`;
}

// ── QUERIES ────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    status: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    assignedStaff: v.optional(v.id("users")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);

    let txns = await ctx.db.query("transactions").collect();

    if (args.status && args.status !== "all") {
      txns = txns.filter((t) => t.status === args.status);
    }
    if (args.clientId) {
      txns = txns.filter((t) => t.clientId === args.clientId);
    }
    if (args.assignedStaff) {
      txns = txns.filter((t) => t.assignedStaff === args.assignedStaff);
    }

    const scope = await resolveViewerScope(ctx, user, "transactions");
    txns = await filterByScope(ctx, txns, scope, (t) => t.assignedStaff ?? t.salesOfficer ?? t.createdBy);

    // Enrich with client name and property title
    const enriched = await Promise.all(
      txns.map(async (t) => {
        const client = await ctx.db.get(t.clientId);
        const property = t.propertyId ? await ctx.db.get(t.propertyId) : null;
        const estate = t.estateId ? await ctx.db.get(t.estateId) : null;
        const staff = t.assignedStaff ? await ctx.db.get(t.assignedStaff) : null;
        return {
          ...t,
          clientName: client?.fullName ?? "Unknown Client",
          clientEmail: client?.email,
          propertyTitle: property?.title ?? estate?.name,
          staffName: staff?.name,
        };
      })
    );

    if (args.search) {
      const s = args.search.toLowerCase();
      return enriched
        .filter(
          (t) =>
            t.transactionRef.toLowerCase().includes(s) ||
            t.clientName.toLowerCase().includes(s) ||
            (t.propertyTitle ?? "").toLowerCase().includes(s)
        )
        .sort((a, b) => b._creationTime - a._creationTime);
    }

    return enriched.sort((a, b) => b._creationTime - a._creationTime);
  },
});

async function enrichTransaction(ctx: QueryCtx, t: Doc<"transactions">): Promise<Doc<"transactions"> & {
  clientName: string;
  clientEmail: string | undefined;
  propertyTitle: string | undefined;
  staffName: string | undefined;
}> {
  const client = await ctx.db.get(t.clientId);
  const property = t.propertyId ? await ctx.db.get(t.propertyId) : null;
  const estate = t.estateId ? await ctx.db.get(t.estateId) : null;
  const staff = t.assignedStaff ? await ctx.db.get(t.assignedStaff) : null;
  return {
    ...t,
    clientName: client?.fullName ?? "Unknown Client",
    clientEmail: client?.email,
    propertyTitle: property?.title ?? estate?.name,
    staffName: staff?.name,
  };
}

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const scope = await resolveViewerScope(ctx, user, "transactions");
    const getOwnerId = (t: Doc<"transactions">) => t.assignedStaff ?? t.salesOfficer ?? t.createdBy;

    if (args.search && args.search.trim()) {
      const results = await ctx.db
        .query("transactions")
        .withSearchIndex("search_ref", (q) => {
          let sq = q.search("transactionRef", args.search!.trim());
          if (args.status && args.status !== "all") sq = sq.eq("status", args.status);
          return sq;
        })
        .paginate(args.paginationOpts);
      const scopedPage = await filterByScope(ctx, results.page, scope, getOwnerId);
      return { ...results, page: await Promise.all(scopedPage.map((t) => enrichTransaction(ctx, t))) };
    }

    if (args.status && args.status !== "all") {
      const results = await ctx.db
        .query("transactions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
      const scopedPage = await filterByScope(ctx, results.page, scope, getOwnerId);
      return { ...results, page: await Promise.all(scopedPage.map((t) => enrichTransaction(ctx, t))) };
    }

    const results = await ctx.db.query("transactions").order("desc").paginate(args.paginationOpts);
    const scopedPage = await filterByScope(ctx, results.page, scope, getOwnerId);
    return { ...results, page: await Promise.all(scopedPage.map((t) => enrichTransaction(ctx, t))) };
  },
});

export const getById = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const txn = await ctx.db.get(args.id);
    if (!txn) throw new ConvexError({ code: "NOT_FOUND", message: "Transaction not found" });

    const [client, property, estate, plot, staff, salesOfficer, paymentPlan, events] =
      await Promise.all([
        ctx.db.get(txn.clientId),
        txn.propertyId ? ctx.db.get(txn.propertyId) : null,
        txn.estateId ? ctx.db.get(txn.estateId) : null,
        txn.plotId ? ctx.db.get(txn.plotId) : null,
        txn.assignedStaff ? ctx.db.get(txn.assignedStaff) : null,
        txn.salesOfficer ? ctx.db.get(txn.salesOfficer) : null,
        txn.paymentPlanId ? ctx.db.get(txn.paymentPlanId) : null,
        ctx.db
          .query("transactionEvents")
          .withIndex("by_transaction", (q) => q.eq("transactionId", args.id))
          .order("asc")
          .collect(),
      ]);

    return {
      ...txn,
      client,
      property,
      estate,
      plot,
      assignedStaffUser: staff,
      salesOfficerUser: salesOfficer,
      paymentPlan,
      events,
    };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx): Promise<{
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    onHold: number;
    totalValue: number;
    byStatus: Array<{ status: string; count: number }>;
  }> => {
    await requireAdmin(ctx);
    const txns = await ctx.db.query("transactions").collect();
    const byStatus: Record<string, number> = {};
    for (const t of txns) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    const activeStatuses = new Set<string>(LIFECYCLE_STATUSES.filter((s) => s !== "completed"));
    return {
      total: txns.length,
      active: txns.filter((t) => activeStatuses.has(t.status as (typeof LIFECYCLE_STATUSES)[number])).length,
      completed: txns.filter((t) => t.status === "completed").length,
      cancelled: txns.filter((t) => t.status === "cancelled").length,
      onHold: txns.filter((t) => t.status === "on_hold").length,
      totalValue: txns.reduce((s, t) => s + (t.purchasePrice ?? 0), 0),
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    };
  },
});

// ── MUTATIONS ──────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    propertyId: v.optional(v.id("properties")),
    estateId: v.optional(v.id("estates")),
    plotId: v.optional(v.id("plots")),
    inquiryId: v.optional(v.id("inquiries")),
    leadId: v.optional(v.id("leads")),
    assignedStaff: v.optional(v.id("users")),
    salesOfficer: v.optional(v.id("users")),
    purchasePrice: v.optional(v.number()),
    discount: v.optional(v.number()),
    financeMethod: v.optional(v.string()),
    priority: v.optional(v.string()),
    notes: v.optional(v.string()),
    initialStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const transactionRef = await generateTransactionRef(ctx);
    const status = args.initialStatus ?? "inquiry";
    const purchasePrice = args.purchasePrice ?? 0;
    const discount = args.discount ?? 0;
    const outstanding = purchasePrice - discount;

    const id = await ctx.db.insert("transactions", {
      transactionRef,
      clientId: args.clientId,
      propertyId: args.propertyId,
      estateId: args.estateId,
      plotId: args.plotId,
      inquiryId: args.inquiryId,
      leadId: args.leadId,
      assignedStaff: args.assignedStaff,
      salesOfficer: args.salesOfficer,
      purchasePrice: args.purchasePrice,
      discount: args.discount,
      amountPaid: 0,
      outstandingBalance: outstanding > 0 ? outstanding : undefined,
      financeMethod: args.financeMethod,
      kycStatus: "not_started",
      financeStatus: "not_started",
      paymentStatus: "not_started",
      agreementStatus: "not_started",
      signatureStatus: "not_started",
      status,
      priority: args.priority,
      notes: args.notes,
      createdBy: user._id,
      lastUpdatedBy: user._id,
    });

    // Log initial event
    await ctx.db.insert("transactionEvents", {
      transactionId: id,
      toStatus: status,
      changedBy: user._id,
      changedByName: user.name,
      note: "Transaction created",
      timestamp: new Date().toISOString(),
    });

    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "create",
      entity: "transaction",
      entityId: id,
      details: transactionRef,
    });

    return id;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("transactions"),
    status: v.string(),
    note: v.optional(v.string()),
    // Optional sub-status updates
    kycStatus: v.optional(v.string()),
    financeStatus: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    agreementStatus: v.optional(v.string()),
    signatureStatus: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Transaction not found" });

    const { id, note, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      lastUpdatedBy: user._id,
    });

    await ctx.db.insert("transactionEvents", {
      transactionId: id,
      fromStatus: existing.status,
      toStatus: args.status,
      changedBy: user._id,
      changedByName: user.name,
      note,
      timestamp: new Date().toISOString(),
    });

    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "update",
      entity: "transaction",
      entityId: id,
      details: `status: ${existing.status} → ${args.status}`,
    });

    // Notify client of status change
    const client = await ctx.db.get(existing.clientId);
    if (client?.email && existing.status !== args.status) {
      await ctx.scheduler.runAfter(0, internal.emails.sendTransactionStatusEmail, {
        to: client.email,
        phone: client.phone,
        name: client.fullName,
        status: args.status,
        transactionRef: existing.transactionRef,
        note,
      });
    }
    if (client && existing.status !== args.status) {
      await notifyClient(ctx, {
        clientId: client._id,
        type: "transaction_status",
        title: "Transaction Update",
        message: `${existing.transactionRef} is now ${STATUS_LABELS[args.status] ?? args.status.replace(/_/g, " ")}.`,
        link: "/client?tab=transactions",
      });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    clientId: v.optional(v.id("clients")),
    propertyId: v.optional(v.id("properties")),
    estateId: v.optional(v.id("estates")),
    plotId: v.optional(v.id("plots")),
    assignedStaff: v.optional(v.id("users")),
    salesOfficer: v.optional(v.id("users")),
    purchasePrice: v.optional(v.number()),
    discount: v.optional(v.number()),
    amountPaid: v.optional(v.number()),
    outstandingBalance: v.optional(v.number()),
    financeMethod: v.optional(v.string()),
    priority: v.optional(v.string()),
    notes: v.optional(v.string()),
    paymentPlanId: v.optional(v.id("paymentPlans")),
    allocationId: v.optional(v.id("allocations")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, lastUpdatedBy: user._id });
    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "update",
      entity: "transaction",
      entityId: id,
      details: "transaction updated",
    });
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const txn = await ctx.db.get(args.id);
    if (!txn) throw new ConvexError({ code: "NOT_FOUND", message: "Transaction not found" });
    // Delete events first
    const events = await ctx.db
      .query("transactionEvents")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.id))
      .collect();
    for (const e of events) await ctx.db.delete(e._id);
    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "delete",
      entity: "transaction",
      entityId: args.id,
      details: txn.transactionRef,
    });
  },
});
