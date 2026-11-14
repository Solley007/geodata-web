import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.d.ts";
import { requireAdmin } from "./admin.ts";

// ══════════════════════════════════════════════════════════════════════════
// PUBLIC DOCUMENTS — company documents visitors can view, share and download.
// The whole page is switched by siteSettings "public_documents_visible"
// (default ON). Documents marked "signin" only reveal their file link to
// signed-in users; the link is withheld server-side, not just hidden in the UI.
// ══════════════════════════════════════════════════════════════════════════

const TOGGLE_KEY = "public_documents_visible";
const MAX_DOCS = 300;

const accessValidator = v.union(v.literal("public"), v.literal("signin"));

const docFields = {
  title: v.string(),
  description: v.optional(v.string()),
  category: v.string(),
  storageId: v.id("_storage"),
  fileName: v.string(),
  coverStorageId: v.optional(v.id("_storage")),
  access: accessValidator,
  featured: v.boolean(),
  visible: v.boolean(),
  publishAt: v.optional(v.string()),
  diasporaVisible: v.optional(v.boolean()),
};

async function isSectionOn(ctx: QueryCtx): Promise<boolean> {
  const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", TOGGLE_KEY)).first();
  return row?.value !== "false";
}

async function toPublic(ctx: QueryCtx, d: Doc<"publicDocuments">, signedIn: boolean) {
  const canOpen = d.access === "public" || signedIn;
  const [fileUrl, coverUrl] = await Promise.all([
    canOpen ? ctx.storage.getUrl(d.storageId) : Promise.resolve(null),
    d.coverStorageId ? ctx.storage.getUrl(d.coverStorageId) : Promise.resolve(null),
  ]);
  return {
    _id: d._id,
    title: d.title,
    description: d.description ?? null,
    category: d.category,
    fileName: d.fileName,
    access: d.access,
    featured: d.featured,
    fileUrl,
    coverUrl,
    locked: !canOpen,
  };
}

// ── Public ───────────────────────────────────────────────────────────────

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isSectionOn(ctx))) return [];
    const signedIn = (await ctx.auth.getUserIdentity()) !== null;
    const nowIso = new Date().toISOString();
    const rows = await ctx.db.query("publicDocuments").withIndex("by_displayOrder").order("asc").take(MAX_DOCS);
    const live = rows.filter((r) => r.visible && (!r.publishAt || r.publishAt <= nowIso));
    live.sort((a, b) => Number(b.featured) - Number(a.featured)); // stable: keeps admin order inside each group
    return await Promise.all(live.map((r) => toPublic(ctx, r, signedIn)));
  },
});

// Diaspora page "Downloads" section — documents an admin has ticked
// "Show on Diaspora page". Independent of the /downloads page switch, since
// the Diaspora platform has its own master toggle.
export const listDiaspora = query({
  args: {},
  handler: async (ctx) => {
    const signedIn = (await ctx.auth.getUserIdentity()) !== null;
    const nowIso = new Date().toISOString();
    const rows = await ctx.db.query("publicDocuments").withIndex("by_displayOrder").order("asc").take(MAX_DOCS);
    const live = rows.filter((r) => r.visible && r.diasporaVisible === true && (!r.publishAt || r.publishAt <= nowIso));
    live.sort((a, b) => Number(b.featured) - Number(a.featured));
    return await Promise.all(live.map((r) => toPublic(ctx, r, signedIn)));
  },
});

export const recordEvent = mutation({
  args: { documentId: v.id("publicDocuments"), event: v.union(v.literal("view"), v.literal("download")) },
  handler: async (ctx, args): Promise<null> => {
    const d = await ctx.db.get(args.documentId);
    if (!d || !d.visible) return null;
    if (d.access === "signin" && !(await ctx.auth.getUserIdentity())) return null;
    if (args.event === "view") await ctx.db.patch(d._id, { viewCount: d.viewCount + 1 });
    else await ctx.db.patch(d._id, { downloadCount: d.downloadCount + 1 });
    return null;
  },
});

// ── Admin ────────────────────────────────────────────────────────────────

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("publicDocuments").withIndex("by_displayOrder").order("asc").take(MAX_DOCS);
    return await Promise.all(
      rows.map(async (d) => ({
        ...d,
        fileUrl: await ctx.storage.getUrl(d.storageId),
        coverUrl: d.coverStorageId ? await ctx.storage.getUrl(d.coverStorageId) : null,
      })),
    );
  },
});

export const createDocument = mutation({
  args: docFields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.title.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Title is required" });
    const last = await ctx.db.query("publicDocuments").withIndex("by_displayOrder").order("desc").first();
    return await ctx.db.insert("publicDocuments", {
      ...args,
      title: args.title.trim(),
      displayOrder: (last?.displayOrder ?? 0) + 1,
      viewCount: 0,
      downloadCount: 0,
    });
  },
});

export const updateDocument = mutation({
  args: { documentId: v.id("publicDocuments"), ...docFields },
  handler: async (ctx, args): Promise<null> => {
    await requireAdmin(ctx);
    const { documentId, ...patch } = args;
    const existing = await ctx.db.get(documentId);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Document not found" });
    if (!patch.title.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Title is required" });
    // Remove files that were replaced so storage does not fill with orphans
    if (existing.storageId !== patch.storageId) await ctx.storage.delete(existing.storageId);
    if (existing.coverStorageId && existing.coverStorageId !== patch.coverStorageId) {
      await ctx.storage.delete(existing.coverStorageId);
    }
    await ctx.db.patch(documentId, { ...patch, title: patch.title.trim() });
    return null;
  },
});

export const deleteDocument = mutation({
  args: { documentId: v.id("publicDocuments") },
  handler: async (ctx, args): Promise<null> => {
    await requireAdmin(ctx);
    const d = await ctx.db.get(args.documentId);
    if (!d) return null;
    await ctx.storage.delete(d.storageId);
    if (d.coverStorageId) await ctx.storage.delete(d.coverStorageId);
    await ctx.db.delete(d._id);
    return null;
  },
});

// Quick on/off for the Diaspora downloads page (Admin → Diaspora → Downloads)
export const setDiasporaVisible = mutation({
  args: { documentId: v.id("publicDocuments"), diasporaVisible: v.boolean() },
  handler: async (ctx, args): Promise<null> => {
    await requireAdmin(ctx);
    const d = await ctx.db.get(args.documentId);
    if (!d) throw new ConvexError({ code: "NOT_FOUND", message: "Document not found" });
    await ctx.db.patch(d._id, { diasporaVisible: args.diasporaVisible });
    return null;
  },
});

export const reorderDocuments = mutation({
  args: { orderedIds: v.array(v.id("publicDocuments")) },
  handler: async (ctx, args): Promise<null> => {
    await requireAdmin(ctx);
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { displayOrder: i + 1 });
    }
    return null;
  },
});
