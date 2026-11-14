import { query, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin } from "../admin.ts";

// ══════════════════════════════════════════════════════════════════════════
// STAFF PORTAL — MY CLIENTS & MY INQUIRIES (self-service, /staff)
//
// Always scoped to the current viewer's own assignment (clients.assignedAgent
// / inquiries.assignedTo). Distinct from the admin-wide clients.ts/admin.ts
// queries and from the org-chart-based scope.ts rules — a staff member here
// only ever sees records explicitly assigned to them, no exceptions.
// ══════════════════════════════════════════════════════════════════════════

// ── My Clients ───────────────────────────────────────────────────────────

export const listMyClientsPaginated = query({
  args: {
    kycStatus: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);

    if (args.search && args.search.trim()) {
      const results = await ctx.db
        .query("clients")
        .withSearchIndex("search_fullName", (q) => {
          let sq = q.search("fullName", args.search!.trim());
          if (args.kycStatus && args.kycStatus !== "all") sq = sq.eq("kycStatus", args.kycStatus);
          return sq;
        })
        .paginate(args.paginationOpts);
      return { ...results, page: results.page.filter((c) => c.assignedAgent === user._id) };
    }

    const results = await ctx.db
      .query("clients")
      .withIndex("by_agent", (q) => q.eq("assignedAgent", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...results,
      page: args.kycStatus && args.kycStatus !== "all"
        ? results.page.filter((c) => c.kycStatus === args.kycStatus)
        : results.page,
    };
  },
});

export const getMyClientStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const mine = await ctx.db.query("clients").withIndex("by_agent", (q) => q.eq("assignedAgent", user._id)).collect();
    return {
      total: mine.length,
      verified: mine.filter((c) => c.kycStatus === "verified").length,
      pending: mine.filter((c) => c.kycStatus === "pending").length,
      rejected: mine.filter((c) => c.kycStatus === "rejected").length,
    };
  },
});

export const getMyClient = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const client = await ctx.db.get(args.id);
    if (!client || client.assignedAgent !== user._id) return null;
    return client;
  },
});

export const listMyClientNotes = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const client = await ctx.db.get(args.clientId);
    if (!client || client.assignedAgent !== user._id) return [];
    return await ctx.db.query("clientNotes").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).order("desc").take(50);
  },
});

export const addMyClientNote = mutation({
  args: { clientId: v.id("clients"), note: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const client = await ctx.db.get(args.clientId);
    if (!client || client.assignedAgent !== user._id) {
      throw new ConvexError({ message: "You can only add notes to your own clients", code: "FORBIDDEN" });
    }
    return await ctx.db.insert("clientNotes", { clientId: args.clientId, note: args.note, authorName: user.name ?? "Staff", authorId: user._id });
  },
});

export const listMyClientFollowUps = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const client = await ctx.db.get(args.clientId);
    if (!client || client.assignedAgent !== user._id) return [];
    const items = await ctx.db.query("followUps").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).collect();
    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },
});

export const createMyClientFollowUp = mutation({
  args: {
    clientId: v.id("clients"),
    dueDate: v.string(),
    type: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const client = await ctx.db.get(args.clientId);
    if (!client || client.assignedAgent !== user._id) {
      throw new ConvexError({ message: "You can only create follow-ups for your own clients", code: "FORBIDDEN" });
    }
    return await ctx.db.insert("followUps", { ...args, status: "pending", assignedTo: user._id });
  },
});

export const updateMyFollowUpStatus = mutation({
  args: { id: v.id("followUps"), status: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const followUp = await ctx.db.get(args.id);
    if (!followUp) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    const client = await ctx.db.get(followUp.clientId);
    if (!client || client.assignedAgent !== user._id) {
      throw new ConvexError({ message: "You can only update your own follow-ups", code: "FORBIDDEN" });
    }
    await ctx.db.patch(args.id, { status: args.status });
  },
});

// ── My Inquiries ─────────────────────────────────────────────────────────

export const listMyInquiriesAssigned = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    let inquiries = await ctx.db
      .query("inquiries")
      .withIndex("by_assigned", (q) => q.eq("assignedTo", user._id))
      .order("desc")
      .collect();
    if (args.status && args.status !== "all") inquiries = inquiries.filter((i) => i.status === args.status);
    return inquiries;
  },
});

export const getMyInquiryStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const mine = await ctx.db.query("inquiries").withIndex("by_assigned", (q) => q.eq("assignedTo", user._id)).collect();
    return {
      total: mine.length,
      new: mine.filter((i) => i.status === "new").length,
      contacted: mine.filter((i) => i.status === "contacted").length,
      resolved: mine.filter((i) => i.status === "resolved").length,
    };
  },
});

export const updateMyInquiryStatus = mutation({
  args: { id: v.id("inquiries"), status: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const inquiry = await ctx.db.get(args.id);
    if (!inquiry) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (inquiry.assignedTo !== user._id) {
      throw new ConvexError({ message: "You can only respond to your own inquiries", code: "FORBIDDEN" });
    }
    await ctx.db.patch(args.id, { status: args.status, notes: args.notes });
    await ctx.db.insert("activityLog", { userId: user._id, action: "update", entity: "inquiry", entityId: args.id, details: `status: ${args.status}` });
  },
});
