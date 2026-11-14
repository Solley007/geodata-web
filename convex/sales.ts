import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin.ts";
import { paginationOptsValidator } from "convex/server";
import { resolveViewerScope, filterByScope } from "./iam/scope.ts";
import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.d.ts";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { notifyUser } from "./notifications.ts";
import { tokenOf } from "./authIdentity";

// ── Purchase intent (Buy Outright / Buy With Mortgage) ─────────────────────
// Lets a property-page visitor or signed-in client declare their financing
// preference up front, so sales sees it immediately instead of having to ask
// "outright or mortgage?" from scratch. Creates a real, trackable lead in the
// existing pipeline — no separate purchase-request system.
async function findOrCreatePublicClientForPurchase(
  ctx: MutationCtx,
  args: { name: string; email: string; phone: string }
): Promise<Id<"clients">> {
  const existing = await ctx.db.query("clients").filter((q) => q.eq(q.field("email"), args.email)).first();
  if (existing) return existing._id;
  return ctx.db.insert("clients", {
    fullName: args.name,
    email: args.email,
    phone: args.phone,
    kycStatus: "pending",
    source: "website",
  });
}

async function requireBuyerClientForSales(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  const allClients = await ctx.db.query("clients").collect();
  const client = allClients.find((c) => c.userId === user._id || c.email === user.email);
  if (!client) throw new ConvexError({ code: "NOT_FOUND", message: "No linked client record found" });
  return client;
}

// Best-effort lookup of the signed-in client's record. Returns null instead of
// throwing so queries can degrade gracefully for visitors who aren't signed in
// or don't yet have a linked client record.
async function tryGetBuyerClientForSales(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
  if (!user) return null;
  const allClients = await ctx.db.query("clients").collect();
  return allClients.find((c) => c.userId === user._id || c.email === user.email) ?? null;
}

// Lets the property page know whether the signed-in client already has an
// active purchase engagement (an open lead or an in-progress transaction) for
// this specific property, so it can relabel the Buy Outright/Buy With
// Mortgage buttons instead of prompting them to start over.
export const getActivePurchaseEngagement = query({
  args: { propertyId: v.id("properties") },
  handler: async (
    ctx,
    args
  ): Promise<
    | { type: "lead"; financePreference?: "outright" | "mortgage" }
    | { type: "transaction"; transactionId: Id<"transactions">; financeMethod?: string }
    | null
  > => {
    const client = await tryGetBuyerClientForSales(ctx);
    if (!client) return null;

    // An in-progress transaction is the strongest signal — a deal is already
    // moving forward with staff, so surface that first.
    const transactions = await ctx.db.query("transactions").withIndex("by_client", (q) => q.eq("clientId", client._id)).collect();
    const activeTransaction = transactions.find(
      (t) => t.propertyId === args.propertyId && t.status !== "completed" && t.status !== "cancelled"
    );
    if (activeTransaction) {
      return { type: "transaction", transactionId: activeTransaction._id, financeMethod: activeTransaction.financeMethod };
    }

    const leads = await ctx.db.query("leads").withIndex("by_client", (q) => q.eq("clientId", client._id)).collect();
    const activeLead = leads.find(
      (l) => l.propertyId === args.propertyId && l.stage !== "won" && l.stage !== "lost"
    );
    if (activeLead) {
      return { type: "lead", financePreference: activeLead.financePreference };
    }

    return null;
  },
});

// Notifies every active admin/manager/super_admin with an in-app bell
// notification (alongside their existing email alert) about a new lead.
export async function notifyStaffOfNewLead(ctx: MutationCtx, args: { title: string; message: string }) {
  const staffIds = await ctx.runQuery(internal.admin.getStaffAlertUserIds, {});
  for (const userId of staffIds) {
    await notifyUser(ctx, { userId, type: "lead_update", title: args.title, message: args.message, link: "/admin/sales" });
  }
}

// Public — mirrors liveInspections.requestPublic: no sign-in required, used
// by anonymous visitors clicking "Buy Outright"/"Buy With Mortgage" on a
// property page.
export const requestPurchase = mutation({
  args: {
    financePreference: v.union(v.literal("outright"), v.literal("mortgage")),
    propertyId: v.id("properties"),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    budget: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ id: Id<"leads"> }> => {
    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });

    const clientId = await findOrCreatePublicClientForPurchase(ctx, args);
    const label = args.financePreference === "mortgage" ? "Buy With Mortgage" : "Buy Outright";

    const id = await ctx.db.insert("leads", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      source: "website",
      stage: "new",
      propertyInterest: property.title,
      propertyId: args.propertyId,
      budget: args.budget,
      notes: args.note ? `${label} request: ${args.note}` : `${label} request submitted from the property page.`,
      priority: "high",
      financePreference: args.financePreference,
      clientId,
    });

    await ctx.db.insert("activityLog", { action: "create", entity: "lead", entityId: id, details: `${label} — ${args.name} (${property.title})` });

    await ctx.scheduler.runAfter(0, internal.emails.sendAdminNewInquiryAlert, {
      to: await ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      adminPhones: await ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      name: args.name,
      email: args.email,
      phone: args.phone,
      message: `Wants to ${label} for "${property.title}"${args.budget ? ` — budget: ₦${args.budget.toLocaleString()}` : ""}.${args.note ? ` Note: ${args.note}` : ""}`,
      subject: `${label} Request — ${property.title}`,
    });
    await notifyStaffOfNewLead(ctx, {
      title: `New ${label} Request`,
      message: `${args.name} wants to ${label.toLowerCase()} "${property.title}".`,
    });

    return { id };
  },
});

// Authenticated — mirrors liveInspections.requestFromClient: skips re-asking
// for name/email/phone since the signed-in client's record is already known.
export const requestPurchaseFromClient = mutation({
  args: {
    financePreference: v.union(v.literal("outright"), v.literal("mortgage")),
    propertyId: v.id("properties"),
    budget: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ id: Id<"leads"> }> => {
    const client = await requireBuyerClientForSales(ctx);
    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });

    const label = args.financePreference === "mortgage" ? "Buy With Mortgage" : "Buy Outright";

    const id = await ctx.db.insert("leads", {
      name: client.fullName,
      email: client.email,
      phone: client.phone,
      source: "website",
      stage: "new",
      propertyInterest: property.title,
      propertyId: args.propertyId,
      budget: args.budget,
      notes: args.note ? `${label} request: ${args.note}` : `${label} request submitted from the client dashboard.`,
      priority: "high",
      financePreference: args.financePreference,
      clientId: client._id,
    });

    await ctx.db.insert("activityLog", { action: "create", entity: "lead", entityId: id, details: `${label} — ${client.fullName} (${property.title})` });

    await ctx.scheduler.runAfter(0, internal.emails.sendAdminNewInquiryAlert, {
      to: await ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      adminPhones: await ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      name: client.fullName,
      email: client.email,
      phone: client.phone,
      message: `Wants to ${label} for "${property.title}"${args.budget ? ` — budget: ₦${args.budget.toLocaleString()}` : ""}.${args.note ? ` Note: ${args.note}` : ""}`,
      subject: `${label} Request — ${property.title}`,
    });
    await notifyStaffOfNewLead(ctx, {
      title: `New ${label} Request`,
      message: `${client.fullName} wants to ${label.toLowerCase()} "${property.title}".`,
    });

    return { id };
  },
});

// ── LEADS ─────────────────────────────────────────────────────────
export const listLeads = query({
  args: {
    stage: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    let leads = await ctx.db.query("leads").collect();
    if (args.stage && args.stage !== "all") leads = leads.filter((l) => l.stage === args.stage);
    if (args.assignedTo) leads = leads.filter((l) => l.assignedTo === args.assignedTo);
    const scope = await resolveViewerScope(ctx, user, "sales");
    leads = await filterByScope(ctx, leads, scope, (l) => l.assignedTo);
    return leads.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const listLeadsPaginated = query({
  args: {
    stage: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const scope = await resolveViewerScope(ctx, user, "sales");
    let result;
    if (args.search) {
      result = await ctx.db
        .query("leads")
        .withSearchIndex("search_name", (q) => {
          let query = q.search("name", args.search!);
          if (args.stage && args.stage !== "all") query = query.eq("stage", args.stage);
          return query;
        })
        .paginate(args.paginationOpts);
    } else if (args.stage && args.stage !== "all") {
      result = await ctx.db
        .query("leads")
        .withIndex("by_stage", (q) => q.eq("stage", args.stage!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db.query("leads").order("desc").paginate(args.paginationOpts);
    }
    return { ...result, page: await filterByScope(ctx, result.page, scope, (l) => l.assignedTo) };
  },
});

export const createLead = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    source: v.string(),
    stage: v.string(),
    propertyInterest: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    estateInterest: v.optional(v.string()),
    budget: v.optional(v.number()),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    expectedCloseDate: v.optional(v.string()),
    priority: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("leads", args);
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "lead", entityId: id, details: args.name });
    return id;
  },
});

export const updateLead = mutation({
  args: {
    id: v.id("leads"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.optional(v.string()),
    stage: v.optional(v.string()),
    propertyInterest: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    estateInterest: v.optional(v.string()),
    budget: v.optional(v.number()),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    expectedCloseDate: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    await ctx.db.insert("activityLog", { userId: user._id, action: "update", entity: "lead", entityId: id, details: updates.name ?? "updated" });
  },
});

export const deleteLead = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", { userId: user._id, action: "delete", entity: "lead", entityId: args.id, details: "lead deleted" });
  },
});

// ── COMMISSIONS ──────────────────────────────────────────────────
export const listCommissions = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let comms = await ctx.db.query("commissions").collect();
    if (args.status && args.status !== "all") comms = comms.filter((c) => c.status === args.status);
    return comms.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const listCommissionsPaginated = query({
  args: { status: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status && args.status !== "all") {
      return await ctx.db
        .query("commissions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("commissions").order("desc").paginate(args.paginationOpts);
  },
});

export const createCommission = mutation({
  args: {
    agentId: v.id("users"),
    propertyId: v.optional(v.id("properties")),
    saleAmount: v.number(),
    commissionRate: v.number(),
    commissionAmount: v.number(),
    status: v.string(),
    transactionDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("commissions", args);
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "commission", entityId: id, details: `₦${args.commissionAmount}` });
    return id;
  },
});

export const updateCommissionStatus = mutation({
  args: { id: v.id("commissions"), status: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status, notes: args.notes, approvedBy: user._id });
    await ctx.db.insert("activityLog", { userId: user._id, action: "update", entity: "commission", entityId: args.id, details: `status: ${args.status}` });
  },
});

// ── CONVERT LEAD → TRANSACTION ──────────────────────────────────────────
export const convertLeadToTransaction = mutation({
  args: {
    leadId: v.id("leads"),
    clientId: v.id("clients"),
    propertyId: v.optional(v.id("properties")),
    estateId: v.optional(v.id("estates")),
    plotId: v.optional(v.id("plots")),
    purchasePrice: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const user = await requireAdmin(ctx);

    // Mark the lead as won
    await ctx.db.patch(args.leadId, { stage: "won" });

    // Count existing transactions for the ref
    const existing = await ctx.db.query("transactions").collect();
    const num = String(existing.length + 1).padStart(4, "0");
    const transactionRef = `GWS-TXN-${num}`;

    const id = await ctx.db.insert("transactions", {
      transactionRef,
      clientId: args.clientId,
      propertyId: args.propertyId,
      estateId: args.estateId,
      plotId: args.plotId,
      leadId: args.leadId,
      assignedStaff: user._id,
      salesOfficer: user._id,
      purchasePrice: args.purchasePrice,
      discount: 0,
      amountPaid: 0,
      outstandingBalance: args.purchasePrice,
      financeMethod: "outright",
      kycStatus: "not_started",
      financeStatus: "not_started",
      paymentStatus: "not_started",
      agreementStatus: "not_started",
      signatureStatus: "not_started",
      status: "qualified",
      priority: "medium",
      notes: args.notes,
      createdBy: user._id,
      lastUpdatedBy: user._id,
    });

    await ctx.db.insert("transactionEvents", {
      transactionId: id,
      toStatus: "qualified",
      changedBy: user._id,
      changedByName: user.name,
      note: "Converted from lead",
      timestamp: new Date().toISOString(),
    });

    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "create",
      entity: "transaction",
      entityId: id,
      details: `${transactionRef} (from lead)`,
    });

    return id;
  },
});

// ── STATS ─────────────────────────────────────────────────────────
export const getSalesStats = query({
  args: {},
  handler: async (ctx): Promise<{
    totalLeads: number; wonLeads: number; lostLeads: number; pipelineLeads: number;
    totalCommissions: number; paidCommissions: number; pendingCommissions: number;
    totalCommissionValue: number; pendingCommissionValue: number;
    byStage: Array<{ stage: string; count: number }>;
  }> => {
    await requireAdmin(ctx);
    const leads = await ctx.db.query("leads").collect();
    const comms = await ctx.db.query("commissions").collect();
    const byStage: Record<string, number> = {};
    for (const l of leads) byStage[l.stage] = (byStage[l.stage] ?? 0) + 1;
    return {
      totalLeads: leads.length,
      wonLeads: leads.filter((l) => l.stage === "won").length,
      lostLeads: leads.filter((l) => l.stage === "lost").length,
      pipelineLeads: leads.filter((l) => !["won", "lost"].includes(l.stage)).length,
      totalCommissions: comms.length,
      paidCommissions: comms.filter((c) => c.status === "paid").length,
      pendingCommissions: comms.filter((c) => c.status === "pending").length,
      totalCommissionValue: comms.reduce((s, c) => s + c.commissionAmount, 0),
      pendingCommissionValue: comms
        .filter((c) => c.status === "pending")
        .reduce((s, c) => s + c.commissionAmount, 0),
      byStage: Object.entries(byStage).map(([stage, count]) => ({ stage, count })),
    };
  },
});
