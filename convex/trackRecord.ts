import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { requireAdmin } from "./admin.ts";

// ══════════════════════════════════════════════════════════════════════════
// TRACK RECORD — completed real estate and road / infrastructure projects.
// Public reads respect the "track_record_visible" siteSettings switch
// (default ON when unset) so turning the section off in Admin hides it
// everywhere without deleting any project data.
// ══════════════════════════════════════════════════════════════════════════

const TOGGLE_KEY = "track_record_visible";

const categoryValidator = v.union(v.literal("real_estate"), v.literal("road_infrastructure"));

// Each video is either a YouTube/Vimeo link or an uploaded file
const videoValidator = v.object({ link: v.optional(v.string()), storageId: v.optional(v.id("_storage")) });

const projectFields = {
  name: v.string(),
  category: categoryValidator,
  projectType: v.optional(v.string()),
  location: v.string(),
  state: v.optional(v.string()),
  yearCompleted: v.number(),
  status: v.string(),
  shortDescription: v.string(),
  fullDescription: v.optional(v.string()),
  coverImageStorageId: v.optional(v.id("_storage")),
  coverImageUrl: v.optional(v.string()),
  galleryStorageIds: v.optional(v.array(v.id("_storage"))),
  videos: v.optional(v.array(videoValidator)),
  unitsBuilt: v.optional(v.number()),
  landSize: v.optional(v.string()),
  familiesHoused: v.optional(v.number()),
  roadLengthKm: v.optional(v.number()),
  roadType: v.optional(v.string()),
  client: v.optional(v.string()),
  visible: v.boolean(),
};

async function isSectionOn(ctx: QueryCtx): Promise<boolean> {
  const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", TOGGLE_KEY)).first();
  return row?.value !== "false";
}

async function withImages(ctx: QueryCtx, p: Doc<"trackRecordProjects">) {
  // Legacy single video (link / file) is folded in as the first item
  const rawVideos = [
    ...(p.videoLink || p.videoStorageId ? [{ link: p.videoLink, storageId: p.videoStorageId }] : []),
    ...(p.videos ?? []),
  ];
  const [coverStorageUrl, gallery, videoItems] = await Promise.all([
    p.coverImageStorageId ? ctx.storage.getUrl(p.coverImageStorageId) : Promise.resolve(null),
    Promise.all((p.galleryStorageIds ?? []).map((id) => ctx.storage.getUrl(id))),
    Promise.all(rawVideos.map(async (vd) => ({
      link: vd.link ?? null,
      storageId: vd.storageId ?? null,
      fileUrl: vd.storageId ? await ctx.storage.getUrl(vd.storageId) : null,
    }))),
  ]);
  return {
    ...p,
    videoItems,
    coverResolvedUrl: coverStorageUrl ?? p.coverImageUrl ?? null,
    galleryUrls: gallery.filter((u): u is string => !!u),
  };
}

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ── Public queries ───────────────────────────────────────────────────────

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isSectionOn(ctx))) return [];
    const rows = await ctx.db.query("trackRecordProjects").withIndex("by_displayOrder").order("asc").take(200);
    return await Promise.all(rows.filter((r) => r.visible).map((r) => withImages(ctx, r)));
  },
});

export const getPublicBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    if (!(await isSectionOn(ctx))) return null;
    const row = await ctx.db.query("trackRecordProjects").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (!row || !row.visible) return null;
    return await withImages(ctx, row);
  },
});

// ── Admin ────────────────────────────────────────────────────────────────

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("trackRecordProjects").withIndex("by_displayOrder").order("asc").take(500);
    return await Promise.all(rows.map((r) => withImages(ctx, r)));
  },
});

export const createProject = mutation({
  args: projectFields,
  handler: async (ctx, args): Promise<Id<"trackRecordProjects">> => {
    await requireAdmin(ctx);
    const base = slugify(args.name) || "project";
    let slug = base;
    let n = 2;
    while (await ctx.db.query("trackRecordProjects").withIndex("by_slug", (q) => q.eq("slug", slug)).first()) {
      slug = `${base}-${n++}`;
    }
    const last = await ctx.db.query("trackRecordProjects").withIndex("by_displayOrder").order("desc").first();
    return await ctx.db.insert("trackRecordProjects", { ...args, slug, displayOrder: (last?.displayOrder ?? -1) + 1 });
  },
});

export const updateProject = mutation({
  args: { id: v.id("trackRecordProjects"), ...projectFields },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Project not found" });
    // Delete uploads that were removed from the gallery so storage doesn't leak
    const kept = new Set(fields.galleryStorageIds ?? []);
    for (const sid of existing.galleryStorageIds ?? []) if (!kept.has(sid)) await ctx.storage.delete(sid);
    if (existing.coverImageStorageId && existing.coverImageStorageId !== fields.coverImageStorageId) {
      await ctx.storage.delete(existing.coverImageStorageId);
    }
    const keptVideos = new Set((fields.videos ?? []).map((x) => x.storageId).filter((x) => !!x));
    const oldVideos = [existing.videoStorageId, ...(existing.videos ?? []).map((x) => x.storageId)];
    for (const sid of oldVideos) if (sid && !keptVideos.has(sid)) await ctx.storage.delete(sid);
    // patch with undefined clears optional fields that were emptied in the form
    // Clear the legacy single-video fields; videos now live in the array
    await ctx.db.patch(id, { ...fields, videoLink: undefined, videoStorageId: undefined });
  },
});

export const deleteProject = mutation({
  args: { id: v.id("trackRecordProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (existing.coverImageStorageId) await ctx.storage.delete(existing.coverImageStorageId);
    for (const sid of existing.galleryStorageIds ?? []) await ctx.storage.delete(sid);
    if (existing.videoStorageId) await ctx.storage.delete(existing.videoStorageId);
    for (const vd of existing.videos ?? []) if (vd.storageId) await ctx.storage.delete(vd.storageId);
    await ctx.db.delete(args.id);
  },
});

export const reorderProjects = mutation({
  args: { orderedIds: v.array(v.id("trackRecordProjects")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { displayOrder: i });
    }
  },
});
