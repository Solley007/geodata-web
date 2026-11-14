import { ConvexError, v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

// ─── Auth helpers ──────────────────────────────────────────────────────────

const ADMIN_ROLES = ["super_admin", "admin", "manager"] as const;

async function resolveUser(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  // Try by token first
  const byToken = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .first();
  if (byToken) return byToken;
  // Fallback: match by email (handles issuer URL changes)
  if (!identity.email) return null;
  return await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("email"), identity.email))
    .first();
}

async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
  const user = await resolveUser(ctx);
  if (!user || !(ADMIN_ROLES as readonly string[]).includes(user.role ?? "")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });
  }
  return user;
}

// ─── File upload ───────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.storage.delete(args.storageId);
  },
});

// ─── Hero Slides ───────────────────────────────────────────────────────────

export const listHeroSlides = query({
  args: {},
  handler: async (ctx) => {
    const slides = await ctx.db.query("heroSlides").withIndex("by_order").order("asc").collect();
    return await Promise.all(
      slides.map(async (s) => ({
        ...s,
        mediaUrl: s.mediaStorageId
          ? await ctx.storage.getUrl(s.mediaStorageId)
          : (s.mediaUrl ?? null),
      }))
    );
  },
});

export const listActiveHeroSlides = query({
  args: {},
  handler: async (ctx) => {
    const slides = await ctx.db
      .query("heroSlides")
      .withIndex("by_order")
      .order("asc")
      .collect();
    const active = slides.filter((s) => s.active);
    return await Promise.all(
      active.map(async (s) => ({
        ...s,
        mediaUrl: s.mediaStorageId
          ? await ctx.storage.getUrl(s.mediaStorageId)
          : (s.mediaUrl ?? null),
      }))
    );
  },
});

export const createHeroSlide = mutation({
  args: {
    mediaType: v.union(v.literal("image"), v.literal("video")),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaUrl: v.optional(v.string()),
    tag: v.string(),
    headline: v.string(),
    subheadline: v.string(),
    body: v.string(),
    order: v.number(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("heroSlides", args);
  },
});

export const updateHeroSlide = mutation({
  args: {
    id: v.id("heroSlides"),
    mediaType: v.optional(v.union(v.literal("image"), v.literal("video"))),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaUrl: v.optional(v.string()),
    tag: v.optional(v.string()),
    headline: v.optional(v.string()),
    subheadline: v.optional(v.string()),
    body: v.optional(v.string()),
    order: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, fields);
  },
});

export const deleteHeroSlide = mutation({
  args: { id: v.id("heroSlides") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slide = await ctx.db.get(args.id);
    if (!slide) return;
    if (slide.mediaStorageId) await ctx.storage.delete(slide.mediaStorageId);
    await ctx.db.delete(args.id);
  },
});

// ─── News Articles ─────────────────────────────────────────────────────────

export const listNewsArticles = query({
  args: { publishedOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let articles = await ctx.db.query("newsArticles").order("desc").collect();
    if (args.publishedOnly) articles = articles.filter((a) => a.published);
    return await Promise.all(
      articles.map(async (a) => ({
        ...a,
        imageUrl: a.imageStorageId
          ? await ctx.storage.getUrl(a.imageStorageId)
          : a.image ?? null,
      }))
    );
  },
});

// Paginated version for public blog listing
export const listNewsArticlesPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("newsArticles")
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      results.page
        .filter((a) => a.published)
        .filter((a) => !args.category || args.category === "All" || a.category === args.category)
        .map(async (a) => ({
          ...a,
          imageUrl: a.imageStorageId
            ? await ctx.storage.getUrl(a.imageStorageId)
            : a.image ?? null,
        }))
    );

    return { ...results, page };
  },
});

// Paginated version for admin blog management
export const listNewsArticlesAdmin = query({
  args: {
    paginationOpts: paginationOptsValidator,
    publishedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const results = await ctx.db
      .query("newsArticles")
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      results.page
        .filter((a) => !args.publishedOnly || a.published)
        .map(async (a) => ({
          ...a,
          imageUrl: a.imageStorageId
            ? await ctx.storage.getUrl(a.imageStorageId)
            : a.image ?? null,
        }))
    );

    return { ...results, page };
  },
});

export const getNewsArticle = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("newsArticles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!article) return null;
    return {
      ...article,
      imageUrl: article.imageStorageId
        ? await ctx.storage.getUrl(article.imageStorageId)
        : article.image ?? null,
    };
  },
});

// Internal query used by the HTTP OG action — returns raw fields including
// imageStorageId so the action can call ctx.storage.getUrl() for a fresh URL.
export const getNewsArticleForOg = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("newsArticles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!article) return null;
    return {
      title: article.title,
      excerpt: article.excerpt ?? null,
      image: article.image ?? null,
      imageStorageId: article.imageStorageId ?? null,
    };
  },
});

export const createNewsArticle = mutation({
  args: {
    title: v.string(),
    excerpt: v.string(),
    content: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    category: v.string(),
    author: v.string(),
    published: v.boolean(),
    featured: v.optional(v.boolean()),
    slug: v.string(),
    tags: v.optional(v.array(v.string())),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("newsArticles", args);
  },
});

export const updateNewsArticle = mutation({
  args: {
    id: v.id("newsArticles"),
    title: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    content: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    category: v.optional(v.string()),
    author: v.optional(v.string()),
    published: v.optional(v.boolean()),
    featured: v.optional(v.boolean()),
    slug: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, fields);
  },
});

export const deleteNewsArticle = mutation({
  args: { id: v.id("newsArticles") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const article = await ctx.db.get(args.id);
    if (!article) return;
    if (article.imageStorageId) await ctx.storage.delete(article.imageStorageId);
    await ctx.db.delete(args.id);
  },
});

// ─── Testimonials ──────────────────────────────────────────────────────────

export const listTestimonials = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("testimonials").collect();
    return await Promise.all(
      items.map(async (t) => ({
        ...t,
        avatarUrl: t.avatarStorageId
          ? await ctx.storage.getUrl(t.avatarStorageId)
          : t.avatar ?? null,
      }))
    );
  },
});

export const createTestimonial = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    content: v.string(),
    rating: v.number(),
    avatarStorageId: v.optional(v.id("_storage")),
    featured: v.boolean(),
    location: v.optional(v.string()),
    propertyType: v.optional(v.string()),
    date: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("testimonials", args);
  },
});

export const updateTestimonial = mutation({
  args: {
    id: v.id("testimonials"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    content: v.optional(v.string()),
    rating: v.optional(v.number()),
    avatarStorageId: v.optional(v.id("_storage")),
    featured: v.optional(v.boolean()),
    location: v.optional(v.string()),
    propertyType: v.optional(v.string()),
    date: v.optional(v.string()),
    order: v.optional(v.number()),
    diasporaVisible: v.optional(v.boolean()),
    diasporaProgrammeKey: v.optional(v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate"))),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, fields);
  },
});

export const deleteTestimonial = mutation({
  args: { id: v.id("testimonials") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const t = await ctx.db.get(args.id);
    if (!t) return;
    if (t.avatarStorageId) await ctx.storage.delete(t.avatarStorageId);
    await ctx.db.delete(args.id);
  },
});

// Public: testimonials tagged for the Diaspora platform, optionally scoped
// to one programme. Reuses the existing `testimonials` table — never a
// second table — so admins keep managing testimonials in one place.
export const listDiasporaTestimonials = query({
  args: { programmeKey: v.optional(v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate"))) },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("testimonials").collect();
    const visible = items.filter((t) => t.diasporaVisible === true && (!args.programmeKey || !t.diasporaProgrammeKey || t.diasporaProgrammeKey === args.programmeKey));
    return await Promise.all(
      visible.map(async (t) => ({
        ...t,
        avatarUrl: t.avatarStorageId ? await ctx.storage.getUrl(t.avatarStorageId) : t.avatar ?? null,
      }))
    );
  },
});

// ─── Site Settings ─────────────────────────────────────────────────────────

export const getSiteSettings = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return row ? row.value : null;
  },
});

// Resolves any storageId fields inside the categories JSON to real CDN URLs
export const getCategoriesResolved = query({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const row = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "categories"))
      .unique();
    if (!row) return null;
    type CatRaw = { icon: string; label: string; count: string; href: string; image: string; mediaType?: string; imageStorageId?: string };
    let cats: CatRaw[];
    try { cats = JSON.parse(row.value) as CatRaw[]; } catch { return row.value; }
    const resolved = await Promise.all(
      cats.map(async (cat) => {
        if (cat.imageStorageId) {
          const url = await ctx.storage.getUrl(cat.imageStorageId as Id<"_storage">);
          return { ...cat, image: url ?? cat.image };
        }
        return cat;
      })
    );
    return JSON.stringify(resolved);
  },
});


export const upsertSiteSettings = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("siteSettings", args);
    }
  },
});

// ─── Subscribers ───────────────────────────────────────────────────────────

export const listSubscribers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("subscribers").collect();
  },
});

export const listSubscribersPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.query("subscribers").order("desc").paginate(args.paginationOpts);
  },
});

// ─── Image storage helpers for settings sections ───────────────────────────

export const getSettingsImageUrl = query({
  args: { storageId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.storageId) return null;
    return await ctx.storage.getUrl(args.storageId as Id<"_storage">);
  },
});

// ─── Blog Comments ─────────────────────────────────────────────────────────

export const listApprovedComments = query({
  args: { articleId: v.id("newsArticles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blogComments")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .filter((q) => q.eq(q.field("approved"), true))
      .order("asc")
      .collect();
  },
});

export const listAllComments = query({
  args: {},
  handler: async (ctx, _args) => {
    await requireAdmin(ctx);
    return await ctx.db.query("blogComments").order("desc").collect();
  },
});

export const listAllCommentsPaginated = query({
  args: { approved: v.optional(v.boolean()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.approved !== undefined) {
      return await ctx.db
        .query("blogComments")
        .withIndex("by_approved", (q) => q.eq("approved", args.approved!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("blogComments").order("desc").paginate(args.paginationOpts);
  },
});

export const addComment = mutation({
  args: {
    articleId: v.id("newsArticles"),
    name: v.string(),
    email: v.optional(v.string()),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.content.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Comment cannot be empty" });
    if (!args.name.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Name is required" });
    const identity = await ctx.auth.getUserIdentity();
    await ctx.db.insert("blogComments", {
      articleId: args.articleId,
      name: args.name.trim(),
      email: args.email,
      content: args.content.trim(),
      approved: false,
      tokenIdentifier: identity?.tokenIdentifier,
    });
  },
});

export const approveComment = mutation({
  args: { id: v.id("blogComments"), approved: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { approved: args.approved });
  },
});

export const deleteComment = mutation({
  args: { id: v.id("blogComments") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// Live numbers for the landing page stats bar (used when the admin picks "Automatic").
// Reads are capped so this reactive query stays cheap as data grows.
const LIVE_STATS_CAP = 5000;
export const getLiveStats = query({
  args: {},
  handler: async (ctx): Promise<{ propertiesSold: number; estates: number; clients: number }> => {
    const soldProps = await ctx.db
      .query("properties")
      .withIndex("by_status", (q) => q.eq("status", "sold"))
      .take(LIVE_STATS_CAP);
    const estates = await ctx.db.query("estates").take(500);
    const soldPlots = estates.reduce((sum, e) => sum + e.soldPlots, 0);
    const clients = await ctx.db.query("clients").take(LIVE_STATS_CAP);
    return {
      propertiesSold: soldProps.length + soldPlots,
      estates: estates.length,
      clients: clients.length,
    };
  },
});
