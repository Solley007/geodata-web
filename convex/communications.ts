import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// ─── helpers ───────────────────────────────────────────────────────────────

async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  // Try by token first, then email fallback (handles issuer URL changes)
  let user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .first();
  if (!user && identity.email) {
    user = await ctx.db.query("users").filter((q) => q.eq(q.field("email"), identity.email)).first();
  }
  if (!user || !["super_admin", "admin", "manager"].includes(user.role ?? "")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return user;
}

// ═══════════════════════════════════════════════════════════════════════════
// TICKER MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

/** Public – fetches all currently active ticker messages ordered by `order` */
export const listActiveTicker = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tickerMessages")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()
      .then((rows) => rows.sort((a, b) => a.order - b.order));
  },
});

/** Admin – fetches ALL ticker messages (active + inactive) */
export const listAllTicker = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx as QueryCtx);
    const rows = await ctx.db.query("tickerMessages").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const createTicker = mutation({
  args: {
    text: v.string(),
    link: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    bgColor: v.optional(v.string()),
    textColor: v.optional(v.string()),
    isActive: v.boolean(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    return await ctx.db.insert("tickerMessages", { ...args, createdBy: admin._id });
  },
});

export const updateTicker = mutation({
  args: {
    id: v.id("tickerMessages"),
    text: v.optional(v.string()),
    link: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    bgColor: v.optional(v.string()),
    textColor: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const deleteTicker = mutation({
  args: { id: v.id("tickerMessages") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const reorderTicker = mutation({
  args: { ids: v.array(v.id("tickerMessages")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await Promise.all(args.ids.map((id, i) => ctx.db.patch(id, { order: i })));
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// POP NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Public – fetches active pop notifications respecting schedule */
export const listActivePopNotifications = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const rows = await ctx.db
      .query("popNotifications")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    // Filter by schedule window on the client side (small set, safe to filter here)
    return rows.filter((n) => {
      if (n.startAt && n.startAt > now) return false;
      if (n.endAt && n.endAt < now) return false;
      return true;
    });
  },
});

/** Admin – fetches ALL pop notifications */
export const listAllPopNotifications = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx as QueryCtx);
    const rows = await ctx.db.query("popNotifications").collect();
    return rows.sort((a, b) => (b._creationTime - a._creationTime));
  },
});

export const createPopNotification = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    type: v.string(),
    link: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    icon: v.optional(v.string()),
    isActive: v.boolean(),
    showOnce: v.boolean(),
    delay: v.number(),
    position: v.string(),
    startAt: v.optional(v.string()),
    endAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    return await ctx.db.insert("popNotifications", { ...args, createdBy: admin._id });
  },
});

export const updatePopNotification = mutation({
  args: {
    id: v.id("popNotifications"),
    title: v.optional(v.string()),
    message: v.optional(v.string()),
    type: v.optional(v.string()),
    link: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    icon: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    showOnce: v.optional(v.boolean()),
    delay: v.optional(v.number()),
    position: v.optional(v.string()),
    startAt: v.optional(v.string()),
    endAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const deletePopNotification = mutation({
  args: { id: v.id("popNotifications") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
