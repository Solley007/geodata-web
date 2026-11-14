import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { requireAdmin } from "./admin.ts";

// ══════════════════════════════════════════════════════════════════════════
// ESTATES — development status per estate (e.g. Southern Bridge City), split
// into building types. Public reads respect the "estates_visible" switch
// (default ON) and only return published, non-archived building types.
// ══════════════════════════════════════════════════════════════════════════

const TOGGLE_KEY = "estates_visible";

async function isSectionOn(ctx: QueryCtx): Promise<boolean> {
  const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", TOGGLE_KEY)).first();
  return row?.value !== "false";
}

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function coverUrl(ctx: QueryCtx, id: Id<"_storage"> | undefined): Promise<string | null> {
  return id ? await ctx.storage.getUrl(id) : null;
}

async function typeView(ctx: QueryCtx, t: Doc<"developmentBuildingTypes">) {
  return { ...t, coverUrl: await coverUrl(ctx, t.coverImageStorageId) };
}

// ── Public ───────────────────────────────────────────────────────────────

export const getPublicEstate = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    if (!(await isSectionOn(ctx))) return null;
    const estate = await ctx.db.query("developmentEstates").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (!estate || !estate.visible) return null;
    const rows = await ctx.db
      .query("developmentBuildingTypes")
      .withIndex("by_estate_and_displayOrder", (q) => q.eq("estateId", estate._id))
      .take(300);
    const live = rows.filter((t) => t.published && !t.archived);
    const buildingTypes = await Promise.all(live.map((t) => typeView(ctx, t)));
    const overall = live.length ? Math.round(live.reduce((s, t) => s + t.completionPercent, 0) / live.length) : 0;
    return {
      estate: { _id: estate._id, slug: estate.slug, name: estate.name, location: estate.location ?? null, intro: estate.intro ?? null, coverUrl: await coverUrl(ctx, estate.coverImageStorageId) },
      buildingTypes,
      overallPercent: overall,
      deliveredCount: live.filter((t) => t.stage === "Delivered").length,
    };
  },
});

// ── Admin: estates ───────────────────────────────────────────────────────

export const listEstates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("developmentEstates").withIndex("by_displayOrder").order("asc").take(100);
    return await Promise.all(rows.map(async (e) => ({ ...e, coverUrl: await coverUrl(ctx, e.coverImageStorageId) })));
  },
});

const estateFields = {
  name: v.string(),
  location: v.optional(v.string()),
  intro: v.optional(v.string()),
  coverImageStorageId: v.optional(v.id("_storage")),
  visible: v.boolean(),
};

export const createEstate = mutation({
  args: estateFields,
  handler: async (ctx, args): Promise<Id<"developmentEstates">> => {
    await requireAdmin(ctx);
    const base = slugify(args.name) || "estate";
    let slug = base;
    let n = 2;
    while (await ctx.db.query("developmentEstates").withIndex("by_slug", (q) => q.eq("slug", slug)).first()) slug = `${base}-${n++}`;
    const last = await ctx.db.query("developmentEstates").withIndex("by_displayOrder").order("desc").first();
    return await ctx.db.insert("developmentEstates", { ...args, slug, displayOrder: (last?.displayOrder ?? -1) + 1 });
  },
});

export const updateEstate = mutation({
  args: { id: v.id("developmentEstates"), ...estateFields },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Estate not found" });
    if (existing.coverImageStorageId && existing.coverImageStorageId !== fields.coverImageStorageId) {
      await ctx.storage.delete(existing.coverImageStorageId);
    }
    await ctx.db.patch(id, fields);
  },
});

export const deleteEstate = mutation({
  args: { id: v.id("developmentEstates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const estate = await ctx.db.get(args.id);
    if (!estate) return;
    const types = await ctx.db.query("developmentBuildingTypes").withIndex("by_estate_and_displayOrder", (q) => q.eq("estateId", args.id)).take(500);
    for (const t of types) {
      if (t.coverImageStorageId) await ctx.storage.delete(t.coverImageStorageId);
      await ctx.db.delete(t._id);
    }
    if (estate.coverImageStorageId) await ctx.storage.delete(estate.coverImageStorageId);
    await ctx.db.delete(args.id);
  },
});

// ── Admin: building types ────────────────────────────────────────────────

export const listBuildingTypes = query({
  args: { estateId: v.id("developmentEstates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("developmentBuildingTypes")
      .withIndex("by_estate_and_displayOrder", (q) => q.eq("estateId", args.estateId))
      .take(500);
    return await Promise.all(rows.map((t) => typeView(ctx, t)));
  },
});

const typeFields = {
  name: v.string(),
  groupName: v.optional(v.string()),
  description: v.optional(v.string()),
  coverImageStorageId: v.optional(v.id("_storage")),
  plotsCovered: v.optional(v.string()),
  stage: v.string(),
  completionPercent: v.number(),
  published: v.boolean(),
};

function checkPercent(n: number) {
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new ConvexError({ code: "BAD_REQUEST", message: "Completion must be between 0 and 100" });
}

export const createBuildingType = mutation({
  args: { estateId: v.id("developmentEstates"), ...typeFields },
  handler: async (ctx, args): Promise<Id<"developmentBuildingTypes">> => {
    await requireAdmin(ctx);
    checkPercent(args.completionPercent);
    const last = await ctx.db
      .query("developmentBuildingTypes")
      .withIndex("by_estate_and_displayOrder", (q) => q.eq("estateId", args.estateId))
      .order("desc")
      .first();
    return await ctx.db.insert("developmentBuildingTypes", { ...args, archived: false, displayOrder: (last?.displayOrder ?? -1) + 1 });
  },
});

export const updateBuildingType = mutation({
  args: { id: v.id("developmentBuildingTypes"), ...typeFields },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    checkPercent(fields.completionPercent);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Building type not found" });
    if (existing.coverImageStorageId && existing.coverImageStorageId !== fields.coverImageStorageId) {
      await ctx.storage.delete(existing.coverImageStorageId);
    }
    await ctx.db.patch(id, fields);
  },
});

export const setBuildingTypeFlags = mutation({
  args: { id: v.id("developmentBuildingTypes"), published: v.optional(v.boolean()), archived: v.optional(v.boolean()) },
  handler: async (ctx, { id, ...flags }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, flags);
  },
});

export const duplicateBuildingType = mutation({
  args: { id: v.id("developmentBuildingTypes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const t = await ctx.db.get(args.id);
    if (!t) throw new ConvexError({ code: "NOT_FOUND", message: "Building type not found" });
    const last = await ctx.db
      .query("developmentBuildingTypes")
      .withIndex("by_estate_and_displayOrder", (q) => q.eq("estateId", t.estateId))
      .order("desc")
      .first();
    // The copy starts as a private draft with no cover image (storage files are not shared)
    await ctx.db.insert("developmentBuildingTypes", {
      estateId: t.estateId,
      name: `${t.name} (copy)`,
      groupName: t.groupName,
      description: t.description,
      plotsCovered: t.plotsCovered,
      stage: "Not started",
      completionPercent: 0,
      displayOrder: (last?.displayOrder ?? -1) + 1,
      published: false,
      archived: false,
    });
  },
});

export const deleteBuildingType = mutation({
  args: { id: v.id("developmentBuildingTypes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const t = await ctx.db.get(args.id);
    if (!t) return;
    if (t.coverImageStorageId) await ctx.storage.delete(t.coverImageStorageId);
    await ctx.db.delete(args.id);
  },
});

export const reorderBuildingTypes = mutation({
  args: { orderedIds: v.array(v.id("developmentBuildingTypes")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (let i = 0; i < args.orderedIds.length; i++) await ctx.db.patch(args.orderedIds[i], { displayOrder: i });
  },
});
