import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { tokenOf } from "./authIdentity";

// ── helpers ─────────────────────────────────────────────────────────

async function requireAdmin(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity)))
    .unique();
  if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
  const allowed = ["admin", "manager", "agent"];
  if (!user.role || !allowed.includes(user.role)) {
    throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
  }
  return user;
}

// ── public queries ───────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("galleryItems")
      .withIndex("by_active", (q) => q.eq("active", true))
      .order("asc")
      .collect();
  },
});

// ── admin queries ────────────────────────────────────────────────────

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("galleryItems")
      .order("asc")
      .collect();
  },
});

// ── mutations ────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    title: v.string(),
    category: v.string(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    src: v.string(),
    storageId: v.optional(v.id("_storage")),
    videoUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    order: v.number(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("galleryItems", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("galleryItems"),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
    mediaType: v.optional(v.union(v.literal("image"), v.literal("video"))),
    src: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    videoUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    order: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("galleryItems") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: { items: v.array(v.object({ id: v.id("galleryItems"), order: v.number() })) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (const { id, order } of args.items) {
      await ctx.db.patch(id, { order });
    }
  },
});

// Seed the 12 default gallery images if gallery is empty
export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("galleryItems").take(1);
    if (existing.length > 0) return { seeded: false };

    const SEED = [
      { title: "Royal Gardens Villa", category: "Residential", src: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800", caption: "4-bedroom detached villa in Royal Gardens Estate" },
      { title: "Luxury Pool Villa", category: "Luxury", src: "https://images.unsplash.com/photo-1613977257363-707ba9348227?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800", caption: "Private pool luxury residence with premium finishes" },
      { title: "Skyline Commercial Tower", category: "Commercial", src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800", caption: "Class-A commercial tower in the heart of the city" },
      { title: "Premium Family Home", category: "Residential", src: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800", caption: "Spacious 5-bed family home with landscaped garden" },
      { title: "Waterfront Estate", category: "Luxury", src: "https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800", caption: "Exclusive waterfront estate with private jetty" },
      { title: "Modern Executive Home", category: "Residential", src: "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800", caption: "Contemporary 3-bed executive home with smart features" },
      { title: "Business Complex", category: "Commercial", src: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800", caption: "Multi-tenant business complex with ample parking" },
      { title: "Gated Estate Entrance", category: "Estates", src: "https://images.unsplash.com/photo-1543414347-1c348021f279?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800", caption: "Grand entrance to our flagship gated estate" },
      { title: "Luxury Living Room", category: "Interior", src: "https://images.unsplash.com/photo-1673563932832-a0c9e0ed26f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800", caption: "Bespoke interior design — premium living room setup" },
      { title: "Infinity Pool Residence", category: "Luxury", src: "https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800", caption: "Stunning infinity pool overlooking city skyline" },
      { title: "Poolside Terrace", category: "Luxury", src: "https://images.unsplash.com/photo-1670589953882-b94c9cb380f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800", caption: "Elegant poolside terrace ideal for entertaining" },
      { title: "Tropical Estate", category: "Estates", src: "https://images.unsplash.com/photo-1757264119016-7e6b568b810d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800", caption: "Lush tropical estate with serene natural landscape" },
    ];

    for (let i = 0; i < SEED.length; i++) {
      await ctx.db.insert("galleryItems", {
        ...SEED[i],
        mediaType: "image",
        order: i,
        active: true,
      });
    }
    return { seeded: true, count: SEED.length };
  },
});
