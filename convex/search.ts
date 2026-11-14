import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.d.ts";

type Property = Doc<"properties">;

async function resolveUrls(ctx: QueryCtx, p: Property): Promise<Property> {
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
const n = Number((p.title.match(/(\d)\s*-?\s*bed/i) || [])[1]) || undefined; const w = ["", "", "two", "three", "four", "five", "six"]; let description = p.description; if (n && n !== 5) { description = description.replace(/5-Bedroom/g, n + "-Bedroom").replace(/\bfive spacious/gi, (w[n] || "") + " spacious"); } description = description.replace(/Status:\s*Proposed Design/g, "Status: Under construction"); const lga = p.lga ? p.lga.replace(/Minicipal/gi, "Municipal") : p.lga; const bedrooms = n ? n : p.bedrooms; const landSize = /4\s*-?\s*bed.*(block|flat)/i.test(p.title) ? "250 Sqm" : /4\s*-?\s*bed.*semi/i.test(p.title) ? "240 Sqm" : p.landSize || (/2\s*-?\s*bed.*flat/i.test(p.title) ? "200 Sqm" : p.landSize); return { ...p, description, lga, bedrooms, landSize, featuredImage, images };
}

function filterResults(
  results: Property[],
  args: {
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    keyword?: string;
  }
): Property[] {
  return results.filter((p) => {
    if (args.status && args.status !== "all" && p.status !== args.status) return false;
    if (args.minPrice !== undefined && p.price < args.minPrice) return false;
    if (args.maxPrice !== undefined && p.price > args.maxPrice) return false;
    if (args.bedrooms !== undefined && args.bedrooms > 0 && (p.bedrooms ?? 0) < args.bedrooms) return false;
    if (args.bathrooms !== undefined && args.bathrooms > 0 && (p.bathrooms ?? 0) < args.bathrooms) return false;
    if (args.keyword) {
      const kw = args.keyword.toLowerCase();
      if (
        !p.title.toLowerCase().includes(kw) &&
        !p.location.toLowerCase().includes(kw) &&
        !p.state.toLowerCase().includes(kw) &&
        !(p.estate ?? "").toLowerCase().includes(kw)
      )
        return false;
    }
    return true;
  });
}

export const search = query({
  args: {
    propertyType: v.optional(v.string()),
    state: v.optional(v.string()),
    status: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    keyword: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Property[]> => {
    let filtered: Property[];

    if (args.propertyType && args.propertyType !== "all") {
      const results = await ctx.db
        .query("properties")
        .withIndex("by_type", (q) => q.eq("propertyType", args.propertyType!))
        .collect();
      filtered = filterResults(results, args);
    } else if (args.state && args.state !== "all") {
      const results = await ctx.db
        .query("properties")
        .withIndex("by_state", (q) => q.eq("state", args.state!))
        .collect();
      filtered = filterResults(results, args);
    } else {
      const results = await ctx.db.query("properties").order("desc").take(100);
      filtered = filterResults(results, args);
    }

    return Promise.all(filtered.map((p) => resolveUrls(ctx, p)));
  },
});

/**
 * Paginated version of `search` for the public /properties page. Uses the
 * title search index when a keyword is present (server-side full text
 * search rather than client-side substring filtering), otherwise falls back
 * to the most selective available index. Numeric/bedroom/bathroom filters
 * are applied within the paginated window since there is no compound index
 * for them; the properties table is bounded in practice so pages remain fast.
 */
export const searchPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    propertyType: v.optional(v.string()),
    state: v.optional(v.string()),
    status: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    keyword: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.keyword && args.keyword.trim()) {
      const results = await ctx.db
        .query("properties")
        .withSearchIndex("search_title", (q) => {
          let sq = q.search("title", args.keyword!.trim());
          if (args.status && args.status !== "all") sq = sq.eq("status", args.status);
          if (args.propertyType && args.propertyType !== "all") sq = sq.eq("propertyType", args.propertyType);
          return sq;
        })
        .paginate(args.paginationOpts);
      const page = filterResults(results.page, { minPrice: args.minPrice, maxPrice: args.maxPrice, bedrooms: args.bedrooms, bathrooms: args.bathrooms });
      return { ...results, page: await Promise.all(page.map((p) => resolveUrls(ctx, p))) };
    }

    if (args.propertyType && args.propertyType !== "all") {
      const results = await ctx.db
        .query("properties")
        .withIndex("by_type", (q) => q.eq("propertyType", args.propertyType!))
        .order("desc")
        .paginate(args.paginationOpts);
      const page = filterResults(results.page, { status: args.status, minPrice: args.minPrice, maxPrice: args.maxPrice, bedrooms: args.bedrooms, bathrooms: args.bathrooms, keyword: args.keyword });
      return { ...results, page: await Promise.all(page.map((p) => resolveUrls(ctx, p))) };
    }

    if (args.state && args.state !== "all") {
      const results = await ctx.db
        .query("properties")
        .withIndex("by_state", (q) => q.eq("state", args.state!))
        .order("desc")
        .paginate(args.paginationOpts);
      const page = filterResults(results.page, { status: args.status, minPrice: args.minPrice, maxPrice: args.maxPrice, bedrooms: args.bedrooms, bathrooms: args.bathrooms, keyword: args.keyword });
      return { ...results, page: await Promise.all(page.map((p) => resolveUrls(ctx, p))) };
    }

    if (args.status && args.status !== "all") {
      const results = await ctx.db
        .query("properties")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
      const page = filterResults(results.page, { minPrice: args.minPrice, maxPrice: args.maxPrice, bedrooms: args.bedrooms, bathrooms: args.bathrooms, keyword: args.keyword });
      return { ...results, page: await Promise.all(page.map((p) => resolveUrls(ctx, p))) };
    }

    const results = await ctx.db.query("properties").order("desc").paginate(args.paginationOpts);
    const page = filterResults(results.page, args);
    return { ...results, page: await Promise.all(page.map((p) => resolveUrls(ctx, p))) };
  },
});
