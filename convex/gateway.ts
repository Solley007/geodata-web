import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api.js";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ── Shared gateway metadata (never contains live secrets) ────────────────────

export type GatewayMeta = {
  key: string;
  displayName: string;
  logo: string;             // emoji placeholder
  supportedCurrencies: string[];
  defaultTxnTypes: string[];
  homepageUrl: string;
};

export const GATEWAY_CATALOG: GatewayMeta[] = [
  {
    key: "paystack",
    displayName: "Paystack",
    logo: "🟢",
    supportedCurrencies: ["NGN", "GHS", "ZAR", "USD"],
    defaultTxnTypes: ["deposit", "instalment", "full_payment", "fee"],
    homepageUrl: "https://paystack.com",
  },
  {
    key: "flutterwave",
    displayName: "Flutterwave",
    logo: "🌊",
    supportedCurrencies: ["NGN", "USD", "GBP", "EUR", "GHS"],
    defaultTxnTypes: ["deposit", "instalment", "full_payment", "fee"],
    homepageUrl: "https://flutterwave.com",
  },
  {
    key: "interswitch",
    displayName: "Interswitch",
    logo: "🔴",
    supportedCurrencies: ["NGN"],
    defaultTxnTypes: ["deposit", "full_payment"],
    homepageUrl: "https://www.interswitchgroup.com",
  },
  {
    key: "remita",
    displayName: "Remita",
    logo: "🔵",
    supportedCurrencies: ["NGN"],
    defaultTxnTypes: ["deposit", "full_payment", "government"],
    homepageUrl: "https://remita.net",
  },
  {
    key: "stripe",
    displayName: "Stripe",
    logo: "💳",
    supportedCurrencies: ["USD", "GBP", "EUR"],
    defaultTxnTypes: ["deposit", "instalment", "full_payment", "fee", "refund"],
    homepageUrl: "https://stripe.com",
  },
  {
    key: "paypal",
    displayName: "PayPal",
    logo: "🅿️",
    supportedCurrencies: ["USD", "GBP", "EUR"],
    defaultTxnTypes: ["deposit", "full_payment"],
    homepageUrl: "https://paypal.com",
  },
];

// ── Auth helper ──────────────────────────────────────────────────────────────

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  const allowed = ["super_admin", "admin", "manager"];
  if (!user.role || !allowed.includes(user.role)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Insufficient permissions" });
  }
  return user;
}

// ── Seed default gateways (idempotent) ───────────────────────────────────────

export const seedGateways = mutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    await requireAdmin(ctx);
    for (let i = 0; i < GATEWAY_CATALOG.length; i++) {
      const meta = GATEWAY_CATALOG[i];
      const existing = await ctx.db
        .query("paymentGateways")
        .withIndex("by_key", (q) => q.eq("gatewayKey", meta.key))
        .first();
      if (!existing) {
        await ctx.db.insert("paymentGateways", {
          gatewayKey: meta.key,
          displayName: meta.displayName,
          isEnabled: false,
          mode: "sandbox",
          priority: i + 1,
          supportedCurrencies: meta.supportedCurrencies,
          supportedTxnTypes: meta.defaultTxnTypes,
        });
      }
    }
  },
});

// ── Queries ──────────────────────────────────────────────────────────────────

export const listGateways = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("paymentGateways").withIndex("by_priority").order("asc").collect();
  },
});

export const getGateway = query({
  args: { gatewayKey: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("paymentGateways")
      .withIndex("by_key", (q) => q.eq("gatewayKey", args.gatewayKey))
      .first();
  },
});

export const getGatewayStats = query({
  args: {},
  handler: async (ctx) => {
    const gateways = await ctx.db.query("paymentGateways").collect();
    const payments = await ctx.db.query("geoPayments").collect();

    const byGateway: Record<string, { total: number; successful: number; failed: number; totalAmount: number }> = {};
    for (const p of payments) {
      if (!byGateway[p.gatewayKey]) {
        byGateway[p.gatewayKey] = { total: 0, successful: 0, failed: 0, totalAmount: 0 };
      }
      byGateway[p.gatewayKey].total++;
      if (p.status === "successful") {
        byGateway[p.gatewayKey].successful++;
        byGateway[p.gatewayKey].totalAmount += p.amountDisplay;
      }
      if (p.status === "failed") byGateway[p.gatewayKey].failed++;
    }

    return {
      total: gateways.length,
      enabled: gateways.filter((g) => g.isEnabled).length,
      live: gateways.filter((g) => g.mode === "live" && g.isEnabled).length,
      sandbox: gateways.filter((g) => g.mode === "sandbox").length,
      byGateway,
      // Total payment stats
      totalPayments: payments.length,
      successfulPayments: payments.filter((p) => p.status === "successful").length,
      failedPayments: payments.filter((p) => p.status === "failed").length,
      totalRevenue: payments
        .filter((p) => p.status === "successful")
        .reduce((sum, p) => sum + p.amountDisplay, 0),
    };
  },
});

// Recent payments across all gateways (for the control centre overview)
export const listRecentPayments = query({
  args: {
    gatewayKey: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let rows = await ctx.db.query("geoPayments").order("desc").take(args.limit ?? 50);

    if (args.gatewayKey) rows = rows.filter((r) => r.gatewayKey === args.gatewayKey);
    if (args.status) rows = rows.filter((r) => r.status === args.status);

    return Promise.all(
      rows.map(async (r) => {
        const client = await ctx.db.get(r.clientId);
        const transaction = r.transactionId ? await ctx.db.get(r.transactionId) : null;
        return {
          ...r,
          clientName: client?.fullName ?? "Unknown",
          transactionRef: transaction?.transactionRef,
        };
      })
    );
  },
});

async function enrichPayment(ctx: QueryCtx, r: import("./_generated/dataModel").Doc<"geoPayments">) {
  const client = await ctx.db.get(r.clientId);
  const transaction = r.transactionId ? await ctx.db.get(r.transactionId) : null;
  return {
    ...r,
    clientName: client?.fullName ?? "Unknown",
    transactionRef: transaction?.transactionRef,
  };
}

export const listRecentPaymentsPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    gatewayKey: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.status && args.status !== "all") {
      const results = await ctx.db
        .query("geoPayments")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
      const page = args.gatewayKey ? results.page.filter((r) => r.gatewayKey === args.gatewayKey) : results.page;
      return { ...results, page: await Promise.all(page.map((r) => enrichPayment(ctx, r))) };
    }

    if (args.gatewayKey) {
      const results = await ctx.db
        .query("geoPayments")
        .withIndex("by_gateway", (q) => q.eq("gatewayKey", args.gatewayKey!))
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...results, page: await Promise.all(results.page.map((r) => enrichPayment(ctx, r))) };
    }

    const results = await ctx.db.query("geoPayments").order("desc").paginate(args.paginationOpts);
    return { ...results, page: await Promise.all(results.page.map((r) => enrichPayment(ctx, r))) };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const updateGateway = mutation({
  args: {
    gatewayKey: v.string(),
    isEnabled: v.optional(v.boolean()),
    mode: v.optional(v.string()),
    priority: v.optional(v.number()),
    supportedCurrencies: v.optional(v.array(v.string())),
    supportedTxnTypes: v.optional(v.array(v.string())),
    publicKeyEnvVar: v.optional(v.string()),
    secretKeyEnvVar: v.optional(v.string()),
    webhookSecretEnvVar: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
    callbackUrl: v.optional(v.string()),
    minAmount: v.optional(v.number()),
    maxAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const actor = await requireAdmin(ctx);
    const { gatewayKey, ...rest } = args;
    const existing = await ctx.db
      .query("paymentGateways")
      .withIndex("by_key", (q) => q.eq("gatewayKey", gatewayKey))
      .first();

    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: `Gateway '${gatewayKey}' not found` });

    await ctx.db.patch(existing._id, {
      ...rest,
      updatedBy: actor._id,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const toggleGateway = mutation({
  args: { gatewayKey: v.string(), isEnabled: v.boolean() },
  handler: async (ctx, args): Promise<void> => {
    const actor = await requireAdmin(ctx);
    const existing = await ctx.db
      .query("paymentGateways")
      .withIndex("by_key", (q) => q.eq("gatewayKey", args.gatewayKey))
      .first();
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Gateway not found" });
    await ctx.db.patch(existing._id, {
      isEnabled: args.isEnabled,
      updatedBy: actor._id,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const setGatewayMode = mutation({
  args: { gatewayKey: v.string(), mode: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const actor = await requireAdmin(ctx);
    const existing = await ctx.db
      .query("paymentGateways")
      .withIndex("by_key", (q) => q.eq("gatewayKey", args.gatewayKey))
      .first();
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Gateway not found" });
    await ctx.db.patch(existing._id, {
      mode: args.mode,
      updatedBy: actor._id,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const recordTestResult = mutation({
  args: { gatewayKey: v.string(), result: v.string() },
  handler: async (ctx, args): Promise<void> => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("paymentGateways")
      .withIndex("by_key", (q) => q.eq("gatewayKey", args.gatewayKey))
      .first();
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Gateway not found" });
    await ctx.db.patch(existing._id, {
      lastTestedAt: new Date().toISOString(),
      lastTestResult: args.result,
    });
  },
});

// ── Payment record mutations (used by webhook handlers & manual entry) ────────

async function nextPayRef(ctx: MutationCtx): Promise<string> {
  const all = await ctx.db.query("geoPayments").collect();
  return `GWS-PAY-${String(all.length + 1).padStart(4, "0")}`;
}

export const createPaymentRecord = mutation({
  args: {
    clientId: v.id("clients"),
    transactionId: v.optional(v.id("transactions")),
    financeApplicationId: v.optional(v.id("financeApplications")),
    gatewayKey: v.string(),
    gatewayRef: v.optional(v.string()),
    currency: v.string(),
    amountDisplay: v.number(),
    txnType: v.string(),
    status: v.optional(v.string()),
    mode: v.string(),
    description: v.optional(v.string()),
    channel: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const actor = await requireAdmin(ctx);

    // Idempotency: don't double-create
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("geoPayments")
        .filter((q) => q.eq(q.field("idempotencyKey"), args.idempotencyKey))
        .first();
      if (existing) return existing.paymentRef;
    }

    const paymentRef = await nextPayRef(ctx);
    const amountKobo = Math.round(args.amountDisplay * 100);

    await ctx.db.insert("geoPayments", {
      paymentRef,
      clientId: args.clientId,
      transactionId: args.transactionId,
      financeApplicationId: args.financeApplicationId,
      gatewayKey: args.gatewayKey,
      gatewayRef: args.gatewayRef,
      currency: args.currency,
      amountKobo,
      amountDisplay: args.amountDisplay,
      txnType: args.txnType,
      status: args.status ?? "initiated",
      mode: args.mode,
      webhookReceived: false,
      idempotencyKey: args.idempotencyKey,
      description: args.description,
      channel: args.channel,
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      notes: args.notes,
      initiatedBy: actor._id,
    });

    return paymentRef;
  },
});

export const updatePaymentStatus = mutation({
  args: {
    paymentRef: v.string(),
    status: v.string(),
    gatewayRef: v.optional(v.string()),
    webhookPayload: v.optional(v.string()),
    paidAt: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const payment = await ctx.db
      .query("geoPayments")
      .withIndex("by_ref", (q) => q.eq("paymentRef", args.paymentRef))
      .first();
    if (!payment) throw new ConvexError({ code: "NOT_FOUND", message: `Payment ${args.paymentRef} not found` });

    const wasAlreadySuccessful = payment.status === "successful";

    await ctx.db.patch(payment._id, {
      status: args.status,
      gatewayRef: args.gatewayRef ?? payment.gatewayRef,
      webhookReceived: args.webhookPayload ? true : payment.webhookReceived,
      webhookPayload: args.webhookPayload ?? payment.webhookPayload,
      paidAt: args.paidAt ?? payment.paidAt,
      failureReason: args.failureReason ?? payment.failureReason,
      channel: args.channel ?? payment.channel,
    });

    // Sync paymentStatus on the linked transaction
    if (payment.transactionId) {
      const convexStatus =
        args.status === "successful" ? "fully_paid" :
        args.status === "failed"     ? "failed" :
        args.status === "pending"    ? "pending" :
        undefined;
      if (convexStatus) {
        await ctx.db.patch(payment.transactionId, { paymentStatus: convexStatus });
      }
    }

    // Notify client + admins on newly-successful payments (avoid duplicate emails on repeat webhooks)
    if (args.status === "successful" && !wasAlreadySuccessful) {
      const client = await ctx.db.get(payment.clientId);
      if (client?.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendPaymentConfirmationEmail, {
          to: client.email,
          phone: client.phone,
          name: client.fullName,
          amountDisplay: payment.amountDisplay,
          currency: payment.currency,
          paymentRef: payment.paymentRef,
          description: payment.description,
        });
      }

      const LARGE_PAYMENT_THRESHOLD = 1_000_000; // ₦1,000,000
      if (payment.amountDisplay >= LARGE_PAYMENT_THRESHOLD) {
        await ctx.scheduler.runAfter(0, internal.emails.sendAdminLargePaymentAlert, {
          to: await ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
          adminPhones: await ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
          clientName: client?.fullName ?? "Unknown",
          amountDisplay: payment.amountDisplay,
          currency: payment.currency,
          paymentRef: payment.paymentRef,
        });
      }
    }
  },
});
