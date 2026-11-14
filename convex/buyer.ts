/**
 * convex/buyer.ts
 * Buyer-scoped queries — each function resolves the caller's identity,
 * looks up the linked `clients` row, and returns ONLY that client's data.
 * No admin helper is used; all access is mediated by tokenIdentifier.
 */

import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";
import { tokenOf } from "./authIdentity";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireBuyer(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity)))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User record not found" });

  // Look up linked client row (matched by email or userId)
  const allClients = await ctx.db.query("clients").collect();
  const client = allClients.find(
    (c) => c.userId === user._id || c.email === user.email
  );

  return { user, client: client ?? null };
}

// ── Profile + dashboard summary ───────────────────────────────────────────────

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const { user, client } = await requireBuyer(ctx);
    return { user, client };
  },
});

export const getDashboardSummary = query({
  args: {},
  handler: async (ctx): Promise<{
    client: null | {
      _id: Id<"clients">;
      fullName: string;
      email: string;
      phone: string;
      kycStatus: string;
      avatar?: string;
    };
    transactionCount: number;
    activeTransactions: number;
    kycStatus: string;
    hasFinanceApplication: boolean;
    financeStatus: string;
    totalPaid: number;
    outstandingBalance: number;
    receiptCount: number;
    inquiryCount: number;
  }> => {
    const { client } = await requireBuyer(ctx);

    if (!client) {
      return {
        client: null,
        transactionCount: 0,
        activeTransactions: 0,
        kycStatus: "not_started",
        hasFinanceApplication: false,
        financeStatus: "not_started",
        totalPaid: 0,
        outstandingBalance: 0,
        receiptCount: 0,
        inquiryCount: 0,
      };
    }

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .collect();

    const activeStatuses = ["reserved", "under_offer", "exchange", "completion"];
    const activeTransactions = transactions.filter((t) => activeStatuses.includes(t.status)).length;

    const kyc = await ctx.db
      .query("kycSubmissions")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .order("desc")
      .first();

    const finance = await ctx.db
      .query("financeApplications")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .order("desc")
      .first();

    const payments = await ctx.db
      .query("geoPayments")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .collect();

    const successfulPayments = payments.filter((p) => p.status === "successful");
    const totalPaid = successfulPayments.reduce((s, p) => s + p.amountDisplay, 0);

    // Rough outstanding: sum of transaction amounts minus paid
    const totalTransactionValue = transactions.reduce((s, t) => s + (t.purchasePrice ?? 0), 0);
    const outstandingBalance = Math.max(0, totalTransactionValue - totalPaid);

    const receipts = await ctx.db
      .query("paymentReceipts")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .collect();

    const inquiries = await ctx.db.query("inquiries").collect();
    const myInquiries = inquiries.filter((i) => i.email === client.email);

    return {
      client: {
        _id: client._id,
        fullName: client.fullName,
        email: client.email,
        phone: client.phone,
        kycStatus: client.kycStatus,
        avatar: client.avatar,
      },
      transactionCount: transactions.length,
      activeTransactions,
      kycStatus: kyc?.status ?? client.kycStatus ?? "not_started",
      hasFinanceApplication: !!finance,
      financeStatus: finance?.status ?? "not_started",
      totalPaid,
      outstandingBalance,
      receiptCount: receipts.length,
      inquiryCount: myInquiries.length,
    };
  },
});

// ── Transactions ──────────────────────────────────────────────────────────────

export const getMyTransactions = query({
  args: {},
  handler: async (ctx) => {
    const { client } = await requireBuyer(ctx);
    if (!client) return [];

    const txns = await ctx.db
      .query("transactions")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .order("desc")
      .take(50);

    return Promise.all(txns.map(async (t) => {
      const property = t.propertyId ? await ctx.db.get(t.propertyId) : null;
      const estate = t.estateId ? await ctx.db.get(t.estateId) : null;
      return {
        ...t,
        propertyTitle: property?.title ?? estate?.name ?? "—",
        propertyImage: property?.featuredImage ?? estate?.image,
        propertyLocation: property?.location ?? estate?.location,
      };
    }));
  },
});

export const getMyTransactionDetail = query({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    const { client } = await requireBuyer(ctx);
    if (!client) throw new ConvexError({ code: "FORBIDDEN", message: "No client profile" });

    const txn = await ctx.db.get(args.transactionId);
    if (!txn || txn.clientId !== client._id)
      throw new ConvexError({ code: "FORBIDDEN", message: "Access denied" });

    const property = txn.propertyId ? await ctx.db.get(txn.propertyId) : null;
    const estate = txn.estateId ? await ctx.db.get(txn.estateId) : null;

    const events = await ctx.db
      .query("transactionEvents")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
      .order("desc")
      .take(30);

    const payments = await ctx.db
      .query("geoPayments")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
      .order("desc")
      .collect();

    const receipts = await ctx.db
      .query("paymentReceipts")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
      .order("desc")
      .collect();

    return {
      transaction: txn,
      property,
      estate,
      events,
      payments,
      receipts,
    };
  },
});

// ── KYC ───────────────────────────────────────────────────────────────────────

export const getMyKyc = query({
  args: {},
  handler: async (ctx) => {
    const { client } = await requireBuyer(ctx);
    if (!client) return null;

    const submission = await ctx.db
      .query("kycSubmissions")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .order("desc")
      .first();

    if (!submission) return null;

    const documents = await ctx.db
      .query("kycDocuments")
      .withIndex("by_submission", (q) => q.eq("kycSubmissionId", submission._id))
      .collect();

    const events = await ctx.db
      .query("kycEvents")
      .withIndex("by_submission", (q) => q.eq("kycSubmissionId", submission._id))
      .order("desc")
      .take(20);

    return { submission, documents, events };
  },
});

// ── Finance ───────────────────────────────────────────────────────────────────

export const getMyFinance = query({
  args: {},
  handler: async (ctx) => {
    const { client } = await requireBuyer(ctx);
    if (!client) return null;

    const application = await ctx.db
      .query("financeApplications")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .order("desc")
      .first();

    if (!application) return null;

    const mortgage = await ctx.db
      .query("mortgageDetails")
      .withIndex("by_application", (q) => q.eq("applicationId", application._id))
      .first();

    const events = await ctx.db
      .query("financeEvents")
      .withIndex("by_application", (q) => q.eq("financeApplicationId", application._id))
      .order("desc")
      .take(20);

    return { application, mortgage, events };
  },
});

// ── Payments & Receipts ───────────────────────────────────────────────────────

export const getMyPayments = query({
  args: {},
  handler: async (ctx) => {
    const { client } = await requireBuyer(ctx);
    if (!client) return { payments: [], receipts: [] };

    const payments = await ctx.db
      .query("geoPayments")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .order("desc")
      .take(100);

    const receipts = await ctx.db
      .query("paymentReceipts")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .order("desc")
      .take(100);

    return { payments, receipts };
  },
});

// ── Purchase requests (leads I submitted) ─────────────────────────────────────

export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const { client } = await requireBuyer(ctx);
    if (!client) return [];

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .order("desc")
      .collect();

    // Only surface leads created via a purchase-intent request (Buy Outright /
    // Buy With Mortgage), not every lead ever linked to this client (e.g. leads
    // captured by an agent through other channels).
    const purchaseLeads = leads.filter((l) => !!l.financePreference);

    return Promise.all(purchaseLeads.map(async (l) => {
      const property = l.propertyId ? await ctx.db.get(l.propertyId) : null;
      // A request that has progressed to "won" is linked to a real transaction —
      // find it so the UI can deep-link there.
      let transactionId: Id<"transactions"> | null = null;
      if (l.stage === "won" && l.propertyId) {
        const txn = await ctx.db
          .query("transactions")
          .withIndex("by_client", (q) => q.eq("clientId", client._id))
          .filter((q) => q.eq(q.field("propertyId"), l.propertyId))
          .first();
        transactionId = txn?._id ?? null;
      }
      return {
        _id: l._id,
        _creationTime: l._creationTime,
        stage: l.stage,
        financePreference: l.financePreference ?? null,
        propertyTitle: property?.title ?? l.propertyInterest ?? "—",
        propertyImage: property?.featuredImage,
        propertyLocation: property?.location,
        budget: l.budget,
        notes: l.notes,
        transactionId,
      };
    }));
  },
});

// ── Support tickets ───────────────────────────────────────────────────────────

export const getMyTickets = query({
  args: {},
  handler: async (ctx) => {
    const { client } = await requireBuyer(ctx);
    if (!client) return [];

    return ctx.db
      .query("supportTickets")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .order("desc")
      .take(20);
  },
});

export const createTicket = mutation({
  args: {
    subject: v.string(),
    message: v.string(),
    priority: v.string(),
  },
  handler: async (ctx, args) => {
    const { client } = await requireBuyer(ctx);
    if (!client) throw new ConvexError({ code: "FORBIDDEN", message: "No client profile found" });

    await ctx.db.insert("supportTickets", {
      clientId: client._id,
      subject: args.subject,
      message: args.message,
      status: "open",
      priority: args.priority,
    });
  },
});
