import { ConvexError, v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.js";
import { resolveViewerScope, filterByScope } from "./iam/scope.ts";
import { tokenOf } from "./authIdentity";

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
  if (!user || (user.role !== "super_admin" && user.role !== "admin" && user.role !== "manager" && user.role !== "agent")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Admin, Manager or Agent role required" });
  }
  return user;
}

// Used by email actions to notify admin/manager staff of new activity requiring review
export const getStaffAlertEmails = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const users = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "super_admin")).collect();
    const admins = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect();
    const managers = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "manager")).collect();
    return [...users, ...admins, ...managers]
      .filter((u) => u.isActive !== false && !!u.email)
      .map((u) => u.email!);
  },
});

// Companion to getStaffAlertEmails — same admin/manager staff, but their WhatsApp
// numbers (from users.phone) for the optional WhatsApp copy of the alert.
export const getStaffAlertPhones = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const users = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "super_admin")).collect();
    const admins = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect();
    const managers = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "manager")).collect();
    return [...users, ...admins, ...managers]
      .filter((u) => u.isActive !== false && !!u.phone)
      .map((u) => u.phone!);
  },
});

// Companion to getStaffAlertEmails — same admin/manager staff, but as `users`
// row ids, for creating in-app notifications (bell icon) alongside the email.
export const getStaffAlertUserIds = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"users">["_id"][]> => {
    const users = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "super_admin")).collect();
    const admins = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect();
    const managers = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "manager")).collect();
    return [...users, ...admins, ...managers].filter((u) => u.isActive !== false).map((u) => u._id);
  },
});

export async function getCurrentUserHelper(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  return user;
}

// Dashboard stats
export const getDashboardStats = query({
  args: {},
  handler: async (ctx): Promise<{
    totalProperties: number;
    availableProperties: number;
    soldProperties: number;
    reservedProperties: number;
    totalInquiries: number;
    newInquiries: number;
    totalUsers: number;
    totalEstates: number;
    recentInquiries: Array<{ _id: string; name: string; type: string; status: string; _creationTime: number }>;
    propertiesByType: Array<{ type: string; count: number }>;
    propertiesByStatus: Array<{ status: string; count: number }>;
  }> => {
    await requireAdmin(ctx);

    const properties = await ctx.db.query("properties").collect();
    const inquiries = await ctx.db.query("inquiries").collect();
    const users = await ctx.db.query("users").collect();
    const estates = await ctx.db.query("estates").collect();

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const p of properties) {
      byType[p.propertyType] = (byType[p.propertyType] ?? 0) + 1;
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    }

    const recent = inquiries
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 8)
      .map((i) => ({ _id: i._id, name: i.name, type: i.type, status: i.status, _creationTime: i._creationTime }));

    return {
      totalProperties: properties.length,
      availableProperties: properties.filter((p) => p.status === "available").length,
      soldProperties: properties.filter((p) => p.status === "sold").length,
      reservedProperties: properties.filter((p) => p.status === "reserved").length,
      totalInquiries: inquiries.length,
      newInquiries: inquiries.filter((i) => i.status === "new").length,
      totalUsers: users.length,
      totalEstates: estates.length,
      recentInquiries: recent,
      propertiesByType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      propertiesByStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    };
  },
});

// ERP-wide dashboard stats (extends the original getDashboardStats)
export const getERPStats = query({
  args: {},
  handler: async (ctx): Promise<{
    // Properties
    totalProperties: number;
    availableProperties: number;
    soldProperties: number;
    reservedProperties: number;
    totalEstates: number;
    propertiesByType: Array<{ type: string; count: number }>;
    propertiesByStatus: Array<{ status: string; count: number }>;
    // CRM
    totalClients: number;
    totalInquiries: number;
    newInquiries: number;
    // Sales & Transactions
    totalTransactions: number;
    activeTransactions: number;
    completedTransactions: number;
    totalTransactionValue: number;
    recentTransactions: Array<{ _id: string; transactionRef: string; clientName: string; status: string; purchasePrice: number; _creationTime: number }>;
    // KYC
    pendingKyc: number;
    approvedKyc: number;
    // Finance
    pendingFinance: number;
    approvedFinance: number;
    // Payments
    totalPaymentsReceived: number;
    paymentsThisMonth: number;
    pendingPayments: number;
    // Tasks & Approvals
    openTasks: number;
    overdueTasks: number;
    pendingApprovals: number;
    urgentApprovals: number;
    // Users
    totalUsers: number;
    totalStaff: number;
  }> => {
    await requireAdmin(ctx);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayStr = now.toISOString().slice(0, 10);

    const [
      properties, estates, inquiries, users,
      transactions, kycSubs, financeApps,
      payments, tasks, approvals, clients,
    ] = await Promise.all([
      ctx.db.query("properties").collect(),
      ctx.db.query("estates").collect(),
      ctx.db.query("inquiries").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("transactions").order("desc").take(200),
      ctx.db.query("kycSubmissions").order("desc").take(200),
      ctx.db.query("financeApplications").order("desc").take(200),
      ctx.db.query("geoPayments").order("desc").take(500),
      ctx.db.query("tasks").order("desc").take(500),
      ctx.db.query("approvals").order("desc").take(200),
      ctx.db.query("clients").collect(),
    ]);

    // Properties
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const p of properties) {
      byType[p.propertyType] = (byType[p.propertyType] ?? 0) + 1;
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    }

    // Transactions
    const activeTxStatuses = ["reserved", "kyc_pending", "finance_pending", "payment_pending", "agreement_pending", "in_progress"];
    const activeTx = transactions.filter((t) => activeTxStatuses.includes(t.status));
    const completedTx = transactions.filter((t) => t.status === "completed");
    const totalTxValue = transactions.reduce((s, t) => s + (t.purchasePrice ?? 0), 0);

    const recentTransactions = await Promise.all(
      transactions.slice(0, 5).map(async (t) => {
        const client = t.clientId ? await ctx.db.get(t.clientId) : null;
        return {
          _id: t._id,
          transactionRef: t.transactionRef,
          clientName: client?.fullName ?? "Unknown",
          status: t.status,
          purchasePrice: t.purchasePrice ?? 0,
          _creationTime: t._creationTime,
        };
      })
    );

    // Payments
    const receivedPayments = payments.filter((p) => p.status === "completed" || p.status === "verified" || p.status === "successful");
    const totalReceived = receivedPayments.reduce((s, p) => s + (p.amountDisplay ?? 0), 0);
    const paymentsThisMonth = receivedPayments
      .filter((p) => p.paidAt && p.paidAt >= thisMonthStart)
      .reduce((s, p) => s + (p.amountDisplay ?? 0), 0);
    const pendingPayments = payments.filter((p) => p.status === "pending" || p.status === "processing" || p.status === "initiated").length;

    // Tasks
    const openTasks = tasks.filter((t) => !["done", "cancelled"].includes(t.status)).length;
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate < todayStr && !["done", "cancelled"].includes(t.status)
    ).length;

    // Approvals
    const pendingApprovals = approvals.filter((a) => a.status === "pending" || a.status === "escalated").length;
    const urgentApprovals = approvals.filter((a) => a.priority === "urgent" && (a.status === "pending" || a.status === "escalated")).length;

    // Staff
    const staffRoles = ["super_admin", "admin", "manager", "agent"];
    const staffCount = users.filter((u) => u.role && staffRoles.includes(u.role)).length;

    return {
      totalProperties: properties.length,
      availableProperties: properties.filter((p) => p.status === "available").length,
      soldProperties: properties.filter((p) => p.status === "sold").length,
      reservedProperties: properties.filter((p) => p.status === "reserved").length,
      totalEstates: estates.length,
      propertiesByType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      propertiesByStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      totalClients: clients.length,
      totalInquiries: inquiries.length,
      newInquiries: inquiries.filter((i) => i.status === "new").length,
      totalTransactions: transactions.length,
      activeTransactions: activeTx.length,
      completedTransactions: completedTx.length,
      totalTransactionValue: totalTxValue,
      recentTransactions,
      pendingKyc: kycSubs.filter((k) => k.status === "pending" || k.status === "submitted").length,
      approvedKyc: kycSubs.filter((k) => k.status === "approved").length,
      pendingFinance: financeApps.filter((f) => f.status === "submitted" || f.status === "under_review").length,
      approvedFinance: financeApps.filter((f) => f.status === "approved").length,
      totalPaymentsReceived: totalReceived,
      paymentsThisMonth,
      pendingPayments,
      openTasks,
      overdueTasks,
      pendingApprovals,
      urgentApprovals,
      totalUsers: users.length,
      totalStaff: staffCount,
    };
  },
});


// Resolve storageIds to CDN URLs for a property row
async function resolvePropertyUrls(ctx: QueryCtx, p: Doc<"properties">) {
  let featuredImage = p.featuredImage;
  if (p.featuredImageStorageId) {
    const url = await ctx.storage.getUrl(p.featuredImageStorageId);
    if (url) featuredImage = url;
  }
  let images = p.images;
  if (p.imageStorageIds && p.imageStorageIds.length > 0) {
    const resolved = await Promise.all(p.imageStorageIds.map((sid) => ctx.storage.getUrl(sid)));
    const filtered = resolved.filter((u): u is string => u !== null);
    if (filtered.length > 0) images = filtered;
  }
  return { ...p, featuredImage, images };
}

export const listProperties = query({
  args: {
    status: v.optional(v.string()),
    propertyType: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let properties = await ctx.db.query("properties").collect();
    if (args.status && args.status !== "all") properties = properties.filter((p) => p.status === args.status);
    if (args.propertyType && args.propertyType !== "all") properties = properties.filter((p) => p.propertyType === args.propertyType);
    if (args.search) {
      const s = args.search.toLowerCase();
      properties = properties.filter((p) => p.title.toLowerCase().includes(s) || p.location.toLowerCase().includes(s));
    }
    const sorted = properties.sort((a, b) => b._creationTime - a._creationTime);
    return Promise.all(sorted.map((p) => resolvePropertyUrls(ctx, p)));
  },
});

export const listPropertiesPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.string()),
    propertyType: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.search && args.search.trim()) {
      const results = await ctx.db
        .query("properties")
        .withSearchIndex("search_title", (q) => {
          let sq = q.search("title", args.search!.trim());
          if (args.status && args.status !== "all") sq = sq.eq("status", args.status);
          if (args.propertyType && args.propertyType !== "all") sq = sq.eq("propertyType", args.propertyType);
          return sq;
        })
        .paginate(args.paginationOpts);
      return {
        ...results,
        page: await Promise.all(results.page.map((p) => resolvePropertyUrls(ctx, p))),
      };
    }

    if (args.status && args.status !== "all") {
      const results = await ctx.db
        .query("properties")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
      const page = args.propertyType && args.propertyType !== "all"
        ? results.page.filter((p) => p.propertyType === args.propertyType)
        : results.page;
      return { ...results, page: await Promise.all(page.map((p) => resolvePropertyUrls(ctx, p))) };
    }

    if (args.propertyType && args.propertyType !== "all") {
      const results = await ctx.db
        .query("properties")
        .withIndex("by_type", (q) => q.eq("propertyType", args.propertyType!))
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...results, page: await Promise.all(results.page.map((p) => resolvePropertyUrls(ctx, p))) };
    }

    const results = await ctx.db.query("properties").order("desc").paginate(args.paginationOpts);
    return { ...results, page: await Promise.all(results.page.map((p) => resolvePropertyUrls(ctx, p))) };
  },
});

export const createProperty = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    price: v.number(),
    priceType: v.string(),
    propertyType: v.string(),
    status: v.string(),
    location: v.string(),
    state: v.string(),
    lga: v.string(),
    estate: v.optional(v.string()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    landSize: v.optional(v.string()),
    images: v.array(v.string()),
    featuredImage: v.string(),
    featuredImageStorageId: v.optional(v.id("_storage")),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    amenities: v.array(v.string()),
    featured: v.boolean(),
    mapLat: v.optional(v.number()),
    mapLng: v.optional(v.number()),
    videoUrl: v.optional(v.string()),
    yearBuilt: v.optional(v.number()),
    floors: v.optional(v.number()),
    parkingSpaces: v.optional(v.number()),
    plotNumber: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("properties", {
      ...args,
      views: 0,
      agentId: user._id,
    });
    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "create",
      entity: "property",
      entityId: id,
      details: args.title,
    });
    return id;
  },
});

export const updateProperty = mutation({
  args: {
    id: v.id("properties"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    priceType: v.optional(v.string()),
    propertyType: v.optional(v.string()),
    status: v.optional(v.string()),
    location: v.optional(v.string()),
    state: v.optional(v.string()),
    lga: v.optional(v.string()),
    estate: v.optional(v.string()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    landSize: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    featuredImage: v.optional(v.string()),
    featuredImageStorageId: v.optional(v.id("_storage")),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    amenities: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    mapLat: v.optional(v.number()),
    mapLng: v.optional(v.number()),
    videoUrl: v.optional(v.string()),
    yearBuilt: v.optional(v.number()),
    floors: v.optional(v.number()),
    parkingSpaces: v.optional(v.number()),
    plotNumber: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "update",
      entity: "property",
      entityId: id,
      details: updates.title ?? "property updated",
    });
  },
});

export const deleteProperty = mutation({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const prop = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "delete",
      entity: "property",
      entityId: args.id,
      details: prop?.title ?? "deleted",
    });
  },
});

// Estates CRUD
export const listEstates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("estates").collect();
  },
});

export const createEstate = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    state: v.string(),
    lga: v.string(),
    location: v.string(),
    totalPlots: v.number(),
    availablePlots: v.number(),
    soldPlots: v.number(),
    reservedPlots: v.number(),
    pricePerPlot: v.number(),
    image: v.string(),
    status: v.string(),
    features: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("estates", { ...args, createdBy: user._id });
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "estate", entityId: id, details: args.name });
    return id;
  },
});

export const updateEstate = mutation({
  args: {
    id: v.id("estates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    state: v.optional(v.string()),
    lga: v.optional(v.string()),
    location: v.optional(v.string()),
    totalPlots: v.optional(v.number()),
    availablePlots: v.optional(v.number()),
    soldPlots: v.optional(v.number()),
    reservedPlots: v.optional(v.number()),
    pricePerPlot: v.optional(v.number()),
    image: v.optional(v.string()),
    status: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    await ctx.db.insert("activityLog", { userId: user._id, action: "update", entity: "estate", entityId: id, details: updates.name ?? "updated" });
  },
});

export const deleteEstate = mutation({
  args: { id: v.id("estates") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", { userId: user._id, action: "delete", entity: "estate", entityId: args.id, details: "estate deleted" });
  },
});

// Inquiries management
export const listInquiries = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    let inquiries = await ctx.db.query("inquiries").collect();
    if (args.status && args.status !== "all") inquiries = inquiries.filter((i) => i.status === args.status);
    const scope = await resolveViewerScope(ctx, user, "inquiries");
    inquiries = await filterByScope(ctx, inquiries, scope, (i) => i.assignedTo);
    return inquiries.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const updateInquiryStatus = mutation({
  args: { id: v.id("inquiries"), status: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status, notes: args.notes });
    await ctx.db.insert("activityLog", { userId: user._id, action: "update", entity: "inquiry", entityId: args.id, details: `status: ${args.status}` });
  },
});

// Activity log
export const getActivityLog = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const logs = await ctx.db.query("activityLog").order("desc").take(50);
    return logs;
  },
});
