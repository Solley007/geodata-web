import { query, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin } from "../admin.ts";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel.d.ts";

// ══════════════════════════════════════════════════════════════════════════
// STAFF PORTAL — MY PROPERTIES & MY SALES (self-service, /staff)
//
// Always hard-scoped to the current viewer's own assignment:
//  - properties.agentId === me      (My Properties)
//  - transactions.assignedStaff === me OR salesOfficer === me   (My Sales)
//  - commissions.agentId === me     (My Commission)
// Distinct from the admin-wide properties.ts/sales.ts/transactions.ts queries
// and from the org-chart-based scope.ts rules — a staff member here only
// ever sees records explicitly assigned to them, no exceptions.
// ══════════════════════════════════════════════════════════════════════════

// Resolve storageIds to CDN URLs for a property row (mirrors admin.ts's private helper)
async function resolvePropertyUrls(ctx: QueryCtx, p: Doc<"properties">) {
  let featuredImage = p.featuredImage;
  if (p.featuredImageStorageId) {
    const url = await ctx.storage.getUrl(p.featuredImageStorageId);
    if (url) featuredImage = url;
  }
  return { ...p, featuredImage };
}

// ── My Properties ───────────────────────────────────────────────────────────

export const listMyPropertiesPaginated = query({
  args: {
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);

    if (args.search && args.search.trim()) {
      const results = await ctx.db
        .query("properties")
        .withSearchIndex("search_title", (q) => {
          let sq = q.search("title", args.search!.trim());
          if (args.status && args.status !== "all") sq = sq.eq("status", args.status);
          return sq;
        })
        .paginate(args.paginationOpts);
      const page = results.page.filter((p) => p.agentId === user._id);
      return { ...results, page: await Promise.all(page.map((p) => resolvePropertyUrls(ctx, p))) };
    }

    const results = await ctx.db
      .query("properties")
      .withIndex("by_agent", (q) => q.eq("agentId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    const page = args.status && args.status !== "all" ? results.page.filter((p) => p.status === args.status) : results.page;
    return { ...results, page: await Promise.all(page.map((p) => resolvePropertyUrls(ctx, p))) };
  },
});

export const getMyPropertyStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const mine = await ctx.db.query("properties").withIndex("by_agent", (q) => q.eq("agentId", user._id)).collect();
    return {
      total: mine.length,
      available: mine.filter((p) => p.status === "available").length,
      reserved: mine.filter((p) => p.status === "reserved").length,
      sold: mine.filter((p) => p.status === "sold").length,
      totalViews: mine.reduce((s, p) => s + p.views, 0),
    };
  },
});

export const updateMyPropertyStatus = mutation({
  args: { id: v.id("properties"), status: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const property = await ctx.db.get(args.id);
    if (!property) throw new ConvexError({ message: "Property not found", code: "NOT_FOUND" });
    if (property.agentId !== user._id) {
      throw new ConvexError({ message: "You can only update properties assigned to you", code: "FORBIDDEN" });
    }
    await ctx.db.patch(args.id, { status: args.status });
    await ctx.db.insert("activityLog", { userId: user._id, action: "update", entity: "property", entityId: args.id, details: `status: ${args.status}` });
  },
});

// ── My Sales (Transactions) ─────────────────────────────────────────────────

async function enrichMyTransaction(ctx: QueryCtx, t: Doc<"transactions">) {
  const client = await ctx.db.get(t.clientId);
  const property = t.propertyId ? await ctx.db.get(t.propertyId) : null;
  const estate = t.estateId ? await ctx.db.get(t.estateId) : null;
  return {
    ...t,
    clientName: client?.fullName ?? "Unknown Client",
    clientEmail: client?.email,
    propertyTitle: property?.title ?? estate?.name,
  };
}

export const listMySalesPaginated = query({
  args: {
    status: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const isMine = (t: Doc<"transactions">) => t.assignedStaff === user._id || t.salesOfficer === user._id;

    if (args.status && args.status !== "all") {
      const results = await ctx.db
        .query("transactions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
      const page = results.page.filter(isMine);
      return { ...results, page: await Promise.all(page.map((t) => enrichMyTransaction(ctx, t))) };
    }

    const results = await ctx.db
      .query("transactions")
      .withIndex("by_assigned", (q) => q.eq("assignedStaff", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...results, page: await Promise.all(results.page.map((t) => enrichMyTransaction(ctx, t))) };
  },
});

export const getMySalesStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const assigned = await ctx.db.query("transactions").withIndex("by_assigned", (q) => q.eq("assignedStaff", user._id)).collect();
    const active = assigned.filter((t) => t.status !== "completed" && t.status !== "cancelled");
    const completed = assigned.filter((t) => t.status === "completed");
    return {
      total: assigned.length,
      active: active.length,
      completed: completed.length,
      totalValue: assigned.reduce((s, t) => s + (t.purchasePrice ?? 0), 0),
      completedValue: completed.reduce((s, t) => s + (t.purchasePrice ?? 0), 0),
    };
  },
});

export const getMySale = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const txn = await ctx.db.get(args.id);
    if (!txn || (txn.assignedStaff !== user._id && txn.salesOfficer !== user._id)) return null;

    const [client, property, estate, events] = await Promise.all([
      ctx.db.get(txn.clientId),
      txn.propertyId ? ctx.db.get(txn.propertyId) : null,
      txn.estateId ? ctx.db.get(txn.estateId) : null,
      ctx.db.query("transactionEvents").withIndex("by_transaction", (q) => q.eq("transactionId", args.id)).order("asc").collect(),
    ]);

    return { ...txn, client, property, estate, events };
  },
});

// ── My Commission ────────────────────────────────────────────────────────

export const listMyCommissionsPaginated = query({
  args: { status: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const results = await ctx.db
      .query("commissions")
      .withIndex("by_agent", (q) => q.eq("agentId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    const page = args.status && args.status !== "all" ? results.page.filter((c) => c.status === args.status) : results.page;
    return { ...results, page };
  },
});

export const getMyCommissionStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const mine = await ctx.db.query("commissions").withIndex("by_agent", (q) => q.eq("agentId", user._id)).collect();
    return {
      total: mine.length,
      pending: mine.filter((c) => c.status === "pending").length,
      approved: mine.filter((c) => c.status === "approved").length,
      paid: mine.filter((c) => c.status === "paid").length,
      totalValue: mine.reduce((s, c) => s + c.commissionAmount, 0),
      pendingValue: mine.filter((c) => c.status !== "paid").reduce((s, c) => s + c.commissionAmount, 0),
      paidValue: mine.filter((c) => c.status === "paid").reduce((s, c) => s + c.commissionAmount, 0),
    };
  },
});
