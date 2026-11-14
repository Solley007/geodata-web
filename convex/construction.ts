import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.d.ts";
import { requireAdmin } from "./admin.ts";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api.js";

// ── CONSTRUCTION SITES ────────────────────────────────────────────
export const listSites = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let sites = await ctx.db.query("constructionSites").collect();
    if (args.status && args.status !== "all") sites = sites.filter((s) => s.status === args.status);
    return sites.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const listSitesPaginated = query({
  args: { status: v.optional(v.string()), search: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.search) {
      return await ctx.db
        .query("constructionSites")
        .withSearchIndex("search_name", (q) => {
          let query = q.search("name", args.search!);
          if (args.status && args.status !== "all") query = query.eq("status", args.status);
          return query;
        })
        .paginate(args.paginationOpts);
    }
    if (args.status && args.status !== "all") {
      return await ctx.db
        .query("constructionSites")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("constructionSites").order("desc").paginate(args.paginationOpts);
  },
});

export const createSite = mutation({
  args: {
    name: v.string(),
    estateId: v.optional(v.id("estates")),
    location: v.string(),
    projectManager: v.optional(v.string()),
    startDate: v.string(),
    expectedEndDate: v.string(),
    status: v.string(),
    completionPercent: v.number(),
    budget: v.number(),
    spent: v.number(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("constructionSites", args);
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "site", entityId: id, details: args.name });
    return id;
  },
});

export const updateSite = mutation({
  args: {
    id: v.id("constructionSites"),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    projectManager: v.optional(v.string()),
    startDate: v.optional(v.string()),
    expectedEndDate: v.optional(v.string()),
    status: v.optional(v.string()),
    completionPercent: v.optional(v.number()),
    budget: v.optional(v.number()),
    spent: v.optional(v.number()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    await ctx.db.patch(id, updates);
    await ctx.db.insert("activityLog", { userId: user._id, action: "update", entity: "site", entityId: id, details: updates.name ?? "updated" });

    if (existing && args.status && args.status !== existing.status) {
      const [emails, phones] = await Promise.all([
        ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
        ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      ]);
      await ctx.scheduler.runAfter(0, internal.emails.sendSiteStatusChangeEmail, {
        to: emails,
        adminPhones: phones,
        siteName: existing.name,
        fromStatus: existing.status,
        toStatus: args.status,
      });
    }
  },
});

export const deleteSite = mutation({
  args: { id: v.id("constructionSites") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", { userId: user._id, action: "delete", entity: "site", entityId: args.id, details: "site deleted" });
  },
});

// ── MATERIALS ─────────────────────────────────────────────────────
export const listMaterials = query({
  args: { siteId: v.optional(v.id("constructionSites")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.siteId) {
      return await ctx.db.query("materials").withIndex("by_site", (q) => q.eq("siteId", args.siteId!)).collect();
    }
    return await ctx.db.query("materials").order("desc").take(200);
  },
});

export const createMaterial = mutation({
  args: {
    siteId: v.id("constructionSites"),
    name: v.string(),
    category: v.string(),
    unit: v.string(),
    quantityOrdered: v.number(),
    quantityDelivered: v.number(),
    quantityUsed: v.number(),
    unitCost: v.number(),
    supplier: v.optional(v.string()),
    deliveryDate: v.optional(v.string()),
    expectedDeliveryDate: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("materials", args);
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "material", entityId: id, details: args.name });
    return id;
  },
});

export const updateMaterial = mutation({
  args: {
    id: v.id("materials"),
    quantityDelivered: v.optional(v.number()),
    quantityUsed: v.optional(v.number()),
    status: v.optional(v.string()),
    deliveryDate: v.optional(v.string()),
    expectedDeliveryDate: v.optional(v.string()),
    supplier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    await ctx.db.insert("activityLog", { userId: user._id, action: "update", entity: "material", entityId: id, details: "updated" });
  },
});

export const deleteMaterial = mutation({
  args: { id: v.id("materials") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", { userId: user._id, action: "delete", entity: "material", entityId: args.id, details: "deleted" });
  },
});

// Sweeps materials still "ordered" past their expected delivery date and alerts
// admins/managers. Bounded to the "ordered" status index, safe to run repeatedly
// on-demand from the admin UI — mirrors sweepInstallmentReminders in clients.ts.
export const sweepOverdueMaterialDeliveries = mutation({
  args: {},
  handler: async (ctx): Promise<{ overdue: number }> => {
    await requireAdmin(ctx);
    const ordered = await ctx.db.query("materials").withIndex("by_status", (q) => q.eq("status", "ordered")).collect();
    const todayStr = new Date().toISOString().split("T")[0];
    const overdueMaterials = ordered.filter((m) => m.expectedDeliveryDate && m.expectedDeliveryDate < todayStr);
    if (overdueMaterials.length === 0) return { overdue: 0 };

    const [emails, phones] = await Promise.all([
      ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
    ]);
    for (const material of overdueMaterials) {
      const site = await ctx.db.get(material.siteId);
      await ctx.scheduler.runAfter(0, internal.emails.sendMaterialDeliveryOverdueEmail, {
        to: emails,
        adminPhones: phones,
        siteName: site?.name ?? "Unknown site",
        materialName: material.name,
        supplier: material.supplier,
        expectedDeliveryDate: material.expectedDeliveryDate!,
      });
    }
    return { overdue: overdueMaterials.length };
  },
});

// ── SUPPLIERS ─────────────────────────────────────────────────────
export const listSuppliers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("suppliers").collect();
  },
});

export const listSuppliersPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.query("suppliers").order("desc").paginate(args.paginationOpts);
  },
});

export const createSupplier = mutation({
  args: {
    name: v.string(),
    contactPerson: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    category: v.string(),
    rating: v.optional(v.number()),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("suppliers", args);
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "supplier", entityId: id, details: args.name });
    return id;
  },
});

export const updateSupplier = mutation({
  args: {
    id: v.id("suppliers"),
    name: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    category: v.optional(v.string()),
    rating: v.optional(v.number()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    await ctx.db.insert("activityLog", { userId: user._id, action: "update", entity: "supplier", entityId: id, details: updates.name ?? "updated" });
  },
});

export const deleteSupplier = mutation({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", { userId: user._id, action: "delete", entity: "supplier", entityId: args.id, details: "deleted" });
  },
});

// ── SITE REPORTS ──────────────────────────────────────────────────
const videoValidator = v.object({ link: v.optional(v.string()), storageId: v.optional(v.id("_storage")) });

export const listReports = query({
  args: { siteId: v.id("constructionSites") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const reports = await ctx.db.query("siteReports").withIndex("by_site", (q) => q.eq("siteId", args.siteId)).order("desc").take(50);
    return await Promise.all(reports.map(async (r) => ({
      ...r,
      photoUrls: (await Promise.all((r.photoStorageIds ?? []).map((id) => ctx.storage.getUrl(id)))).filter((u): u is string => !!u),
      videoItems: await Promise.all((r.videos ?? []).map(async (vd) => ({
        link: vd.link ?? null,
        fileUrl: vd.storageId ? await ctx.storage.getUrl(vd.storageId) : null,
      }))),
    })));
  },
});

export const createReport = mutation({
  args: {
    siteId: v.id("constructionSites"),
    reportDate: v.string(),
    reportedBy: v.string(),
    workDone: v.string(),
    challenges: v.optional(v.string()),
    nextSteps: v.optional(v.string()),
    workersPresent: v.optional(v.number()),
    weatherCondition: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    photoStorageIds: v.optional(v.array(v.id("_storage"))),
    videos: v.optional(v.array(videoValidator)),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("siteReports", args);
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "site_report", entityId: id, details: args.reportDate });
    return id;
  },
});

export const setReportPublished = mutation({
  args: { id: v.id("siteReports"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { published: args.published });
  },
});

// ── PUBLIC ONGOING PROJECTS ───────────────────────────────────────
// Public reads never expose budget, spending or staff-only report fields.
const ONGOING_TOGGLE_KEY = "ongoing_projects_visible";
const ONGOING_STATUSES = ["planning", "active", "on_hold"] as const;

async function isOngoingSectionOn(ctx: QueryCtx): Promise<boolean> {
  const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", ONGOING_TOGGLE_KEY)).first();
  return row?.value !== "false";
}

function toPublicSite(s: Doc<"constructionSites">) {
  return {
    _id: s._id,
    name: s.name,
    location: s.location,
    status: s.status,
    completionPercent: s.completionPercent,
    startDate: s.startDate,
    expectedEndDate: s.expectedEndDate,
    description: s.description ?? null,
    image: s.image ?? null,
  };
}

export const listPublicOngoing = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isOngoingSectionOn(ctx))) return [];
    const groups = await Promise.all(
      ONGOING_STATUSES.map((st) => ctx.db.query("constructionSites").withIndex("by_status", (q) => q.eq("status", st)).take(100)),
    );
    const sites = groups.flat().filter((s) => s.published === true);
    const withUpdates = await Promise.all(sites.map(async (s) => {
      const latest = await ctx.db.query("siteReports").withIndex("by_site", (q) => q.eq("siteId", s._id)).order("desc").take(20);
      const published = latest.filter((r) => r.published === true);
      return { ...toPublicSite(s), lastUpdate: published[0]?.reportDate ?? null };
    }));
    return withUpdates.sort((a, b) => b.completionPercent - a.completionPercent);
  },
});

export const getPublicOngoing = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    if (!(await isOngoingSectionOn(ctx))) return null;
    const siteId = ctx.db.normalizeId("constructionSites", args.id);
    if (!siteId) return null;
    const site = await ctx.db.get(siteId);
    if (!site || site.published !== true || site.status === "completed") return null;
    const reports = await ctx.db.query("siteReports").withIndex("by_site", (q) => q.eq("siteId", siteId)).order("desc").take(100);
    const updates = await Promise.all(reports.filter((r) => r.published === true).map(async (r) => ({
      _id: r._id,
      reportDate: r.reportDate,
      workDone: r.workDone,
      nextSteps: r.nextSteps ?? null,
      photoUrls: (await Promise.all((r.photoStorageIds ?? []).map((sid) => ctx.storage.getUrl(sid)))).filter((u): u is string => !!u),
      videoItems: await Promise.all((r.videos ?? []).map(async (vd) => ({
        link: vd.link ?? null,
        fileUrl: vd.storageId ? await ctx.storage.getUrl(vd.storageId) : null,
      }))),
    })));
    return { site: toPublicSite(site), updates };
  },
});

export const getConstructionStats = query({
  args: {},
  handler: async (ctx): Promise<{
    totalSites: number; activeSites: number; completedSites: number;
    totalBudget: number; totalSpent: number; totalMaterials: number;
    totalSuppliers: number;
  }> => {
    await requireAdmin(ctx);
    const sites = await ctx.db.query("constructionSites").collect();
    const materials = await ctx.db.query("materials").take(500);
    const suppliers = await ctx.db.query("suppliers").collect();
    return {
      totalSites: sites.length,
      activeSites: sites.filter((s) => s.status === "active").length,
      completedSites: sites.filter((s) => s.status === "completed").length,
      totalBudget: sites.reduce((s, c) => s + c.budget, 0),
      totalSpent: sites.reduce((s, c) => s + c.spent, 0),
      totalMaterials: materials.length,
      totalSuppliers: suppliers.length,
    };
  },
});
