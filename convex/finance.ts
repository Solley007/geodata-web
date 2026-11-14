import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api.js";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { resolveViewerScope, filterByScope } from "./iam/scope.ts";
import { tokenOf } from "./authIdentity";

// ── Auth helpers ────────────────────────────────────────────────────────────

async function requireStaff(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity)))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  const allowed = ["super_admin", "admin", "manager", "agent"];
  if (!user.role || !allowed.includes(user.role)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Insufficient permissions" });
  }
  return user;
}

// ── Next ref counter ────────────────────────────────────────────────────────

async function nextFinanceRef(ctx: MutationCtx): Promise<string> {
  const all = await ctx.db.query("financeApplications").collect();
  const n = all.length + 1;
  return `GWS-FIN-${String(n).padStart(4, "0")}`;
}

// ── Status transition timestamps ─────────────────────────────────────────────

function statusTimestamps(status: string) {
  const now = new Date().toISOString();
  switch (status) {
    case "application_submitted": return { submittedAt: now };
    case "under_review":          return { reviewStartedAt: now };
    case "approved":              return { approvedAt: now };
    case "rejected":              return { rejectedAt: now };
    default:                      return {};
  }
}

// ── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    status: v.optional(v.string()),
    financeMethod: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    let rows = await ctx.db.query("financeApplications").collect();

    if (args.status) rows = rows.filter((r) => r.status === args.status);
    if (args.financeMethod) rows = rows.filter((r) => r.financeMethod === args.financeMethod);

    const scope = await resolveViewerScope(ctx, user, "finance");
    rows = await filterByScope(ctx, rows, scope, (r) => r.assignedReviewer ?? r.createdBy);

    // Enrich with client name and transaction ref
    const enriched = await Promise.all(
      rows.map(async (r) => {
        const client = await ctx.db.get(r.clientId);
        const transaction = r.transactionId ? await ctx.db.get(r.transactionId) : null;
        const reviewer = r.assignedReviewer ? await ctx.db.get(r.assignedReviewer) : null;
        return {
          ...r,
          clientName: client?.fullName ?? "Unknown",
          clientEmail: client?.email,
          transactionRef: transaction?.transactionRef,
          reviewerName: reviewer?.name ?? reviewer?.email,
        };
      })
    );

    if (args.search) {
      const q = args.search.toLowerCase();
      return enriched.filter(
        (r) =>
          r.applicationRef.toLowerCase().includes(q) ||
          r.clientName.toLowerCase().includes(q) ||
          (r.clientEmail ?? "").toLowerCase().includes(q) ||
          (r.transactionRef ?? "").toLowerCase().includes(q)
      );
    }

    return enriched.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getById = query({
  args: { id: v.id("financeApplications") },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.id);
    if (!app) return null;

    const client = await ctx.db.get(app.clientId);
    const transaction = app.transactionId ? await ctx.db.get(app.transactionId) : null;
    const reviewer = app.assignedReviewer ? await ctx.db.get(app.assignedReviewer) : null;

    const mortgage = await ctx.db
      .query("mortgageDetails")
      .withIndex("by_application", (q) => q.eq("applicationId", args.id))
      .first();

    const events = await ctx.db
      .query("financeEvents")
      .withIndex("by_application", (q) => q.eq("financeApplicationId", args.id))
      .collect();

    return {
      ...app,
      client,
      transaction,
      reviewer,
      mortgage,
      events,
    };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("financeApplications").collect();
    return {
      total:               all.length,
      notStarted:          all.filter((r) => r.status === "not_started").length,
      applicationSubmitted:all.filter((r) => r.status === "application_submitted").length,
      underReview:         all.filter((r) => r.status === "under_review").length,
      moreInfoRequired:    all.filter((r) => r.status === "more_info_required").length,
      approved:            all.filter((r) => r.status === "approved").length,
      rejected:            all.filter((r) => r.status === "rejected").length,
      // by method
      outright:            all.filter((r) => r.financeMethod === "outright").length,
      instalment:          all.filter((r) => r.financeMethod === "instalment").length,
      mortgage:            all.filter((r) => r.financeMethod === "mortgage").length,
      externalFinance:     all.filter((r) => r.financeMethod === "external_finance").length,
    };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    transactionId: v.optional(v.id("transactions")),
    financeMethod: v.string(),
    purchasePrice: v.optional(v.number()),
    amountRequested: v.optional(v.number()),
    initialDeposit: v.optional(v.number()),
    balanceOwed: v.optional(v.number()),
    instalmentCount: v.optional(v.number()),
    instalmentAmount: v.optional(v.number()),
    instalmentFrequency: v.optional(v.string()),
    externalLender: v.optional(v.string()),
    assignedReviewer: v.optional(v.id("users")),
    priority: v.optional(v.string()),
    notes: v.optional(v.string()),
    initialStatus: v.optional(v.string()),
    // Mortgage details (created in same call for mortgage method)
    mortgage: v.optional(v.object({
      lenderName: v.optional(v.string()),
      loanAmount: v.optional(v.number()),
      tenureMonths: v.optional(v.number()),
      interestRate: v.optional(v.number()),
      monthlyRepayment: v.optional(v.number()),
      ltv: v.optional(v.number()),
      valuerName: v.optional(v.string()),
      valuationAmount: v.optional(v.number()),
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args): Promise<string> => {
    const actor = await requireStaff(ctx);
    const applicationRef = await nextFinanceRef(ctx);
    const status = args.initialStatus ?? "not_started";
    const now = new Date().toISOString();

    const id = await ctx.db.insert("financeApplications", {
      applicationRef,
      clientId: args.clientId,
      transactionId: args.transactionId,
      financeMethod: args.financeMethod,
      status,
      purchasePrice: args.purchasePrice,
      amountRequested: args.amountRequested,
      initialDeposit: args.initialDeposit,
      balanceOwed: args.balanceOwed,
      instalmentCount: args.instalmentCount,
      instalmentAmount: args.instalmentAmount,
      instalmentFrequency: args.instalmentFrequency,
      externalLender: args.externalLender,
      assignedReviewer: args.assignedReviewer,
      priority: args.priority,
      notes: args.notes,
      createdBy: actor._id,
      lastUpdatedBy: actor._id,
      ...statusTimestamps(status),
    });

    // Initial event
    await ctx.db.insert("financeEvents", {
      financeApplicationId: id,
      toStatus: status,
      changedBy: actor._id,
      changedByName: actor.name ?? actor.email ?? "Staff",
      note: "Application created",
      timestamp: now,
    });

    // Mortgage details (if mortgage method)
    if (args.financeMethod === "mortgage" && args.mortgage) {
      await ctx.db.insert("mortgageDetails", {
        applicationId: id,
        clientId: args.clientId,
        mortgageStatus: "pending",
        ...args.mortgage,
      });
    }

    // Sync transaction financeStatus
    if (args.transactionId) {
      await ctx.db.patch(args.transactionId, { financeStatus: status, financeMethod: args.financeMethod });
    }

    // Alert admins/managers of new application needing review
    const client = await ctx.db.get(args.clientId);
    await ctx.scheduler.runAfter(0, internal.emails.sendAdminNewFinanceAlert, {
      to: await ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      adminPhones: await ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      clientName: client?.fullName ?? "Unknown",
      applicationRef,
      financeMethod: args.financeMethod,
    });

    return applicationRef;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("financeApplications"),
    status: v.string(),
    note: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
    moreInfoRequest: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const actor = await requireStaff(ctx);
    const app = await ctx.db.get(args.id);
    if (!app) throw new ConvexError({ code: "NOT_FOUND", message: "Finance application not found" });

    if (args.status === "rejected" && !args.rejectionReason) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Rejection reason is required" });
    }
    if (args.status === "more_info_required" && !args.moreInfoRequest) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Must specify what information is required" });
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.id, {
      status: args.status,
      reviewNotes: args.reviewNotes ?? app.reviewNotes,
      moreInfoRequest: args.moreInfoRequest ?? app.moreInfoRequest,
      rejectionReason: args.rejectionReason ?? app.rejectionReason,
      lastUpdatedBy: actor._id,
      ...statusTimestamps(args.status),
    });

    await ctx.db.insert("financeEvents", {
      financeApplicationId: args.id,
      fromStatus: app.status,
      toStatus: args.status,
      changedBy: actor._id,
      changedByName: actor.name ?? actor.email ?? "Staff",
      note: args.note,
      timestamp: now,
    });

    // Sync transaction financeStatus
    if (app.transactionId) {
      await ctx.db.patch(app.transactionId, { financeStatus: args.status });
    }

    // Notify client of status change
    const client = await ctx.db.get(app.clientId);
    if (client?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendFinanceStatusEmail, {
        to: client.email,
        phone: client.phone,
        name: client.fullName,
        status: args.status,
        applicationRef: app.applicationRef,
        reason: args.status === "rejected" ? args.rejectionReason : args.status === "more_info_required" ? args.moreInfoRequest : undefined,
      });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("financeApplications"),
    purchasePrice: v.optional(v.number()),
    amountRequested: v.optional(v.number()),
    initialDeposit: v.optional(v.number()),
    balanceOwed: v.optional(v.number()),
    instalmentCount: v.optional(v.number()),
    instalmentAmount: v.optional(v.number()),
    instalmentFrequency: v.optional(v.string()),
    externalLender: v.optional(v.string()),
    assignedReviewer: v.optional(v.id("users")),
    priority: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const actor = await requireStaff(ctx);
    const { id, ...rest } = args;
    await ctx.db.patch(id, { ...rest, lastUpdatedBy: actor._id });
  },
});

export const remove = mutation({
  args: { id: v.id("financeApplications") },
  handler: async (ctx, args): Promise<void> => {
    await requireStaff(ctx);
    // Delete related mortgage details
    const mortgages = await ctx.db
      .query("mortgageDetails")
      .withIndex("by_application", (q) => q.eq("applicationId", args.id))
      .collect();
    for (const m of mortgages) await ctx.db.delete(m._id);
    // Delete events
    const events = await ctx.db
      .query("financeEvents")
      .withIndex("by_application", (q) => q.eq("financeApplicationId", args.id))
      .collect();
    for (const e of events) await ctx.db.delete(e._id);
    await ctx.db.delete(args.id);
  },
});

// ── Mortgage detail mutations ────────────────────────────────────────────────

export const upsertMortgage = mutation({
  args: {
    applicationId: v.id("financeApplications"),
    lenderName: v.optional(v.string()),
    loanAmount: v.optional(v.number()),
    tenureMonths: v.optional(v.number()),
    interestRate: v.optional(v.number()),
    monthlyRepayment: v.optional(v.number()),
    ltv: v.optional(v.number()),
    offerLetterUrl: v.optional(v.string()),
    approvalLetterUrl: v.optional(v.string()),
    valuerName: v.optional(v.string()),
    valuationAmount: v.optional(v.number()),
    mortgageStatus: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await requireStaff(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ code: "NOT_FOUND", message: "Application not found" });

    const existing = await ctx.db
      .query("mortgageDetails")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .first();

    const { applicationId, ...rest } = args;
    if (existing) {
      await ctx.db.patch(existing._id, rest);
    } else {
      await ctx.db.insert("mortgageDetails", {
        applicationId,
        clientId: app.clientId,
        mortgageStatus: args.mortgageStatus ?? "pending",
        lenderName: args.lenderName,
        loanAmount: args.loanAmount,
        tenureMonths: args.tenureMonths,
        interestRate: args.interestRate,
        monthlyRepayment: args.monthlyRepayment,
        ltv: args.ltv,
        offerLetterUrl: args.offerLetterUrl,
        approvalLetterUrl: args.approvalLetterUrl,
        valuerName: args.valuerName,
        valuationAmount: args.valuationAmount,
        notes: args.notes,
      });
    }
  },
});
