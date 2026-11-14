import { query, mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";
import { resolveViewerScope, filterByScope } from "./iam/scope.ts";

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireStaff(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  const allowed = ["super_admin", "admin", "manager", "agent"];
  if (!user.role || !allowed.includes(user.role))
    throw new ConvexError({ code: "FORBIDDEN", message: "Insufficient permissions" });
  return user;
}

// ── Sequence helpers ──────────────────────────────────────────────────────────

async function nextReceiptRef(ctx: MutationCtx): Promise<string> {
  const last = await ctx.db.query("paymentReceipts").order("desc").first();
  if (!last) return "GWS-RCP-0001";
  const n = parseInt(last.receiptRef.replace("GWS-RCP-", ""), 10);
  return `GWS-RCP-${String(n + 1).padStart(4, "0")}`;
}

async function nextBatchRef(ctx: MutationCtx): Promise<string> {
  const last = await ctx.db.query("reconciliationBatches").order("desc").first();
  if (!last) return "GWS-REC-0001";
  const n = parseInt(last.batchRef.replace("GWS-REC-", ""), 10);
  return `GWS-REC-${String(n + 1).padStart(4, "0")}`;
}

// ── Receipts ─────────────────────────────────────────────────────────────────

export const listReceipts = query({
  args: {
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"paymentReceipts">;
    _creationTime: number;
    receiptRef: string;
    paymentId: Id<"geoPayments">;
    clientId: Id<"clients">;
    transactionId?: Id<"transactions">;
    amountDisplay: number;
    currency: string;
    paidAt: string;
    gatewayKey: string;
    gatewayRef?: string;
    txnType: string;
    description?: string;
    generatedAt: string;
    generatedBy?: Id<"users">;
    generatedByName?: string;
    pdfUrl?: string;
    emailedAt?: string;
    emailedTo?: string;
    notes?: string;
    clientName: string;
    clientEmail?: string;
  }>> => {
    const user = await requireStaff(ctx);
    let rows;
    if (args.clientId) {
      rows = await ctx.db
        .query("paymentReceipts")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
        .order("desc")
        .take(200);
    } else if (args.transactionId) {
      rows = await ctx.db
        .query("paymentReceipts")
        .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId!))
        .order("desc")
        .take(200);
    } else {
      rows = await ctx.db.query("paymentReceipts").order("desc").take(200);
    }

    const scope = await resolveViewerScope(ctx, user, "payments");
    rows = await filterByScope(ctx, rows, scope, (r) => r.generatedBy);

    return Promise.all(rows.map(async (r) => {
      const client = await ctx.db.get(r.clientId);
      return {
        ...r,
        clientName: client?.fullName ?? "Unknown",
        clientEmail: client?.email,
      };
    }));
  },
});

export const listReceiptsPaginated = query({
  args: { paginationOpts: paginationOptsValidator, search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const scope = await resolveViewerScope(ctx, user, "payments");
    if (args.search && args.search.trim()) {
      const results = await ctx.db
        .query("paymentReceipts")
        .withSearchIndex("search_ref", (q) => q.search("receiptRef", args.search!.trim()))
        .paginate(args.paginationOpts);
      const scopedPage = await filterByScope(ctx, results.page, scope, (r) => r.generatedBy);
      return {
        ...results,
        page: await Promise.all(scopedPage.map(async (r) => {
          const client = await ctx.db.get(r.clientId);
          return { ...r, clientName: client?.fullName ?? "Unknown", clientEmail: client?.email };
        })),
      };
    }
    const results = await ctx.db.query("paymentReceipts").order("desc").paginate(args.paginationOpts);
    const scopedPage = await filterByScope(ctx, results.page, scope, (r) => r.generatedBy);
    return {
      ...results,
      page: await Promise.all(scopedPage.map(async (r) => {
        const client = await ctx.db.get(r.clientId);
        return { ...r, clientName: client?.fullName ?? "Unknown", clientEmail: client?.email };
      })),
    };
  },
});

export const getReceiptStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("paymentReceipts").order("desc").take(2000);
    const total = all.length;
    const totalAmount = all.reduce((s, r) => s + r.amountDisplay, 0);
    const withPdf = all.filter((r) => !!r.pdfUrl).length;
    const emailed = all.filter((r) => !!r.emailedAt).length;
    return { total, totalAmount, withPdf, emailed };
  },
});

export const generateReceipt = mutation({
  args: {
    paymentId: v.id("geoPayments"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new ConvexError({ code: "NOT_FOUND", message: "Payment not found" });
    if (payment.status !== "successful")
      throw new ConvexError({ code: "BAD_REQUEST", message: "Can only issue receipt for successful payments" });

    // Check for duplicate
    const existing = await ctx.db
      .query("paymentReceipts")
      .withIndex("by_payment", (q) => q.eq("paymentId", args.paymentId))
      .first();
    if (existing) return existing.receiptRef;

    const receiptRef = await nextReceiptRef(ctx);
    const now = new Date().toISOString();

    await ctx.db.insert("paymentReceipts", {
      receiptRef,
      paymentId: args.paymentId,
      clientId: payment.clientId,
      transactionId: payment.transactionId,
      amountDisplay: payment.amountDisplay,
      currency: payment.currency,
      paidAt: payment.paidAt ?? now,
      gatewayKey: payment.gatewayKey,
      gatewayRef: payment.gatewayRef,
      txnType: payment.txnType,
      description: payment.description,
      generatedAt: now,
      generatedBy: user._id,
      generatedByName: user.name,
      notes: args.notes,
    });

    return receiptRef;
  },
});

export const updateReceiptPdfUrl = mutation({
  args: {
    receiptRef: v.string(),
    pdfUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const receipt = await ctx.db
      .query("paymentReceipts")
      .withIndex("by_ref", (q) => q.eq("receiptRef", args.receiptRef))
      .unique();
    if (!receipt) throw new ConvexError({ code: "NOT_FOUND", message: "Receipt not found" });
    await ctx.db.patch(receipt._id, { pdfUrl: args.pdfUrl });
  },
});

export const markReceiptEmailed = mutation({
  args: {
    receiptRef: v.string(),
    emailedTo: v.string(),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const receipt = await ctx.db
      .query("paymentReceipts")
      .withIndex("by_ref", (q) => q.eq("receiptRef", args.receiptRef))
      .unique();
    if (!receipt) throw new ConvexError({ code: "NOT_FOUND", message: "Receipt not found" });
    await ctx.db.patch(receipt._id, {
      emailedAt: new Date().toISOString(),
      emailedTo: args.emailedTo,
    });
  },
});

// ── Reconciliation batches ────────────────────────────────────────────────────

export const listBatches = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return ctx.db
        .query("reconciliationBatches")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(100);
    }
    return ctx.db.query("reconciliationBatches").order("desc").take(100);
  },
});

export const listBatchesPaginated = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status && args.status !== "all") {
      return ctx.db
        .query("reconciliationBatches")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return ctx.db.query("reconciliationBatches").order("desc").paginate(args.paginationOpts);
  },
});

export const getBatch = query({
  args: { batchId: v.id("reconciliationBatches") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.batchId);
  },
});

export const getBatchStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("reconciliationBatches").order("desc").take(500);
    const total = all.length;
    const draft = all.filter((b) => b.status === "draft").length;
    const inProgress = all.filter((b) => b.status === "in_progress").length;
    const completed = all.filter((b) => b.status === "completed").length;
    const disputed = all.filter((b) => b.status === "disputed").length;
    const totalMatched = all.reduce((s, b) => s + b.matchedCount, 0);
    const totalUnmatched = all.reduce((s, b) => s + b.unmatchedCount, 0);
    return { total, draft, inProgress, completed, disputed, totalMatched, totalUnmatched };
  },
});

export const createBatch = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    periodStart: v.string(),
    periodEnd: v.string(),
    gatewayKey: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);

    // Collect eligible payments in the period
    let payments = await ctx.db
      .query("geoPayments")
      .withIndex("by_status", (q) => q.eq("status", "successful"))
      .order("desc")
      .take(2000);

    if (args.gatewayKey) {
      payments = payments.filter((p) => p.gatewayKey === args.gatewayKey);
    }

    // Filter by period (paidAt)
    payments = payments.filter((p) => {
      const d = p.paidAt ?? p._creationTime.toString();
      return d >= args.periodStart && d <= args.periodEnd + "T23:59:59Z";
    });

    const batchRef = await nextBatchRef(ctx);
    const now = new Date().toISOString();

    const totalAmount = payments.reduce((s, p) => s + p.amountDisplay, 0);

    const batchId = await ctx.db.insert("reconciliationBatches", {
      batchRef,
      title: args.title,
      description: args.description,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      gatewayKey: args.gatewayKey,
      status: "in_progress",
      totalItems: payments.length,
      matchedCount: 0,
      unmatchedCount: 0,
      disputedCount: 0,
      totalAmount,
      createdBy: user._id,
      createdByName: user.name,
      notes: args.notes,
    });

    // Create a reconciliation item for each payment (all start as "pending")
    for (const p of payments) {
      await ctx.db.insert("reconciliationItems", {
        batchId,
        paymentId: p._id,
        clientId: p.clientId,
        transactionId: p.transactionId,
        actualAmount: p.amountDisplay,
        currency: p.currency,
        matchStatus: "pending",
      });
    }

    return batchRef;
  },
});

export const updateBatchStatus = mutation({
  args: {
    batchId: v.id("reconciliationBatches"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const batch = await ctx.db.get(args.batchId);
    if (!batch) throw new ConvexError({ code: "NOT_FOUND", message: "Batch not found" });
    const updates: Partial<typeof batch> = {
      status: args.status,
      notes: args.notes ?? batch.notes,
    };
    if (args.status === "completed") {
      updates.completedAt = new Date().toISOString();
      updates.completedBy = user._id;
    }
    await ctx.db.patch(args.batchId, updates);
  },
});

// ── Reconciliation items ──────────────────────────────────────────────────────

export const listBatchItems = query({
  args: {
    batchId: v.id("reconciliationBatches"),
    matchStatus: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"reconciliationItems">;
    _creationTime: number;
    batchId: Id<"reconciliationBatches">;
    paymentId: Id<"geoPayments">;
    clientId: Id<"clients">;
    transactionId?: Id<"transactions">;
    expectedAmount?: number;
    actualAmount: number;
    currency: string;
    matchStatus: string;
    discrepancy?: number;
    notes?: string;
    reviewedBy?: Id<"users">;
    reviewedByName?: string;
    reviewedAt?: string;
    actionTaken?: string;
    paymentRef: string;
    gatewayKey: string;
    clientName: string;
    txnType: string;
    paidAt?: string;
  }>> => {
    let items = await ctx.db
      .query("reconciliationItems")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();

    if (args.matchStatus) {
      items = items.filter((i) => i.matchStatus === args.matchStatus);
    }

    return Promise.all(items.map(async (item) => {
      const payment = await ctx.db.get(item.paymentId);
      const client = await ctx.db.get(item.clientId);
      return {
        ...item,
        paymentRef: payment?.paymentRef ?? "—",
        gatewayKey: payment?.gatewayKey ?? "—",
        clientName: client?.fullName ?? "Unknown",
        txnType: payment?.txnType ?? "—",
        paidAt: payment?.paidAt,
      };
    }));
  },
});

export const reviewItem = mutation({
  args: {
    itemId: v.id("reconciliationItems"),
    matchStatus: v.string(),
    expectedAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    actionTaken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new ConvexError({ code: "NOT_FOUND", message: "Item not found" });

    const discrepancy = args.expectedAmount != null
      ? item.actualAmount - args.expectedAmount
      : undefined;

    await ctx.db.patch(args.itemId, {
      matchStatus: args.matchStatus,
      expectedAmount: args.expectedAmount ?? item.expectedAmount,
      discrepancy,
      notes: args.notes ?? item.notes,
      reviewedBy: user._id,
      reviewedByName: user.name,
      reviewedAt: new Date().toISOString(),
      actionTaken: args.actionTaken ?? item.actionTaken,
    });

    // Re-tally batch counts
    const batch = await ctx.db.get(item.batchId);
    if (!batch) return;

    const allItems = await ctx.db
      .query("reconciliationItems")
      .withIndex("by_batch", (q) => q.eq("batchId", item.batchId))
      .collect();

    // Re-compute after the patch takes effect
    const updatedItem = { ...item, matchStatus: args.matchStatus };
    const updatedAll = allItems.map((i) => i._id === args.itemId ? updatedItem : i);

    const matchedCount = updatedAll.filter((i) => i.matchStatus === "matched").length;
    const unmatchedCount = updatedAll.filter((i) => i.matchStatus === "unmatched").length;
    const disputedCount = updatedAll.filter((i) => i.matchStatus === "disputed").length;

    await ctx.db.patch(item.batchId, { matchedCount, unmatchedCount, disputedCount });
  },
});

export const bulkMarkItems = mutation({
  args: {
    batchId: v.id("reconciliationBatches"),
    matchStatus: v.string(),
    fromStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    let items = await ctx.db
      .query("reconciliationItems")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();

    if (args.fromStatus) {
      items = items.filter((i) => i.matchStatus === args.fromStatus);
    }

    const now = new Date().toISOString();
    for (const item of items) {
      await ctx.db.patch(item._id, {
        matchStatus: args.matchStatus,
        reviewedBy: user._id,
        reviewedByName: user.name,
        reviewedAt: now,
      });
    }

    // Re-tally
    const allItems = await ctx.db
      .query("reconciliationItems")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();

    const matchedCount = allItems.filter((i) => i.matchStatus === "matched").length;
    const unmatchedCount = allItems.filter((i) => i.matchStatus === "unmatched").length;
    const disputedCount = allItems.filter((i) => i.matchStatus === "disputed").length;

    await ctx.db.patch(args.batchId, { matchedCount, unmatchedCount, disputedCount });

    return items.length;
  },
});
