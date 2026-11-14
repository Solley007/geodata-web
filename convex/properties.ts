import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.js";

// Resolve featuredImageStorageId and imageStorageIds to CDN URLs for public queries
export async function resolveUrls(ctx: QueryCtx, p: Doc<"properties">) {
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
  const price = p.price === 250000000 && /(5\s*-?\s*bed.*semi|6\s*-?\s*bed.*terrace)/i.test(p.title) ? 220000000 : p.price; const n = Number((p.title.match(/(\d)\s*-?\s*bed/i) || [])[1]) || undefined; const w = ["", "", "two", "three", "four", "five", "six"]; let description = p.description; if (n && n !== 5) { description = description.replace(/5-Bedroom/g, n + "-Bedroom").replace(/\bfive spacious/gi, (w[n] || "") + " spacious"); } description = description.replace(/Status:\s*Proposed Design/g, "Status: Under construction"); const lga = p.lga ? p.lga.replace(/Minicipal/gi, "Municipal") : p.lga; const bedrooms = n ? n : p.bedrooms; const landSize = /4\s*-?\s*bed.*(block|flat)/i.test(p.title) ? "250 Sqm" : /4\s*-?\s*bed.*semi/i.test(p.title) ? "240 Sqm" : p.landSize || (/2\s*-?\s*bed.*flat/i.test(p.title) ? "200 Sqm" : p.landSize); return { ...p, price, description, lga, bedrooms, landSize, featuredImage, images };
}

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("properties").order("desc").take(100);
    return Promise.all(rows.map((p) => resolveUrls(ctx, p)));
  },
});

export const listFeatured = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("properties")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .take(6);
    return Promise.all(rows.map((p) => resolveUrls(ctx, p)));
  },
});

export const listLatest = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("properties")
      .order("desc")
      .take(args.limit ?? 8);
    return Promise.all(rows.map((p) => resolveUrls(ctx, p)));
  },
});

export const getById = query({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    const p = await ctx.db.get(args.id);
    if (!p) return undefined;
    return resolveUrls(ctx, p);
  },
});

// Used by the saved-properties page to resolve a locally-stored list of
// wishlisted property ids. Bounded by the client-side wishlist size, which
// is inherently small (a person only saves so many properties).
export const getManyByIds = query({
  args: { ids: v.array(v.id("properties")) },
  handler: async (ctx, args) => {
    const rows = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    const found = rows.filter((p): p is Doc<"properties"> => p !== null);
    return Promise.all(found.map((p) => resolveUrls(ctx, p)));
  },
});

// ── Internal query for OG endpoint ──────────────────────────────────────────
// Returns raw fields needed to build the /og/property HTML page
export const getPropertyForOg = internalQuery({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // id comes from URL query param as a string; validate it's a real ID
    try {
      const p = await ctx.db.get(args.id as Doc<"properties">["_id"]);
      if (!p) return null;
      return {
        title: p.title,
        location: p.location,
        state: p.state,
        price: p.price,
        featuredImage: p.featuredImage,
        featuredImageStorageId: p.featuredImageStorageId ?? null,
      };
    } catch {
      return null;
    }
  },
});

export const create = mutation({
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
    amenities: v.array(v.string()),
    featured: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("properties", {
      ...args,
      views: 0,
    });
  },
});
