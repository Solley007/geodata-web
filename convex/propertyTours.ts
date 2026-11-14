import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel.d.ts";
import { logAudit } from "./taskboard.ts";
import { hasPermission } from "./iam/access.ts";

// ══════════════════════════════════════════════════════════════════════════
// GEODATA LIVE INSPECT™ — INTERACTIVE 360°/VR TOUR (second mode).
//
// Extends the existing Live Virtual Inspection product with a self-guided
// panoramic tour experience per property. Gated by its OWN siteSettings
// toggle, independent of the live-session feature toggle in
// convex/liveInspections.ts — flipping one never affects the other.
//
// Reuses: properties (propertyId FK only, no duplicate property data),
// Convex file storage (same generateUploadUrl pattern as convex/cms.ts /
// convex/gallery.ts), the shared IAM permission catalogue + hasPermission,
// and the shared audit log (logAudit) — no bespoke systems.
// ══════════════════════════════════════════════════════════════════════════

export const FEATURE_KEY = "feature_360_vr_tour";

export const TOUR_PERMISSIONS = [
  "property_tour.view",
  "property_tour.create",
  "property_tour.edit",
  "property_tour.publish",
  "property_tour.delete",
] as const;
export type TourPermission = (typeof TOUR_PERMISSIONS)[number];

const PERMISSION_LABELS: Record<TourPermission, string> = {
  "property_tour.view": "View 360°/VR Tours",
  "property_tour.create": "Create 360°/VR Tours",
  "property_tour.edit": "Edit 360°/VR Tour Scenes & Hotspots",
  "property_tour.publish": "Publish/Unpublish 360°/VR Tours",
  "property_tour.delete": "Delete 360°/VR Tours",
};

// ── Auth helpers ─────────────────────────────────────────────────────────
async function requireSignedInUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  return user;
}

async function isFeatureEnabled(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", FEATURE_KEY)).first();
  return row?.value === "true";
}

async function requireFeatureEnabled(ctx: QueryCtx | MutationCtx): Promise<void> {
  if (!(await isFeatureEnabled(ctx))) {
    throw new ConvexError({ code: "FORBIDDEN", message: "The 360°/VR Tour experience is currently disabled" });
  }
}

// Deny-by-default: explicit IAM permission grant AND feature toggle ON.
// Read access (viewing a published tour, or admins viewing/auditing
// existing drafts) is allowed even while the toggle is off — never trusts
// the client to have hidden a button.
async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  permissionKey: TourPermission,
  options: { requireEnabled: boolean } = { requireEnabled: true }
): Promise<Doc<"users">> {
  const user = await requireSignedInUser(ctx);
  if (options.requireEnabled) await requireFeatureEnabled(ctx);
  const allowed = await hasPermission(ctx, user._id, permissionKey);
  if (!allowed) {
    throw new ConvexError({ code: "FORBIDDEN", message: "You do not have permission to perform this action" });
  }
  return user;
}

// ── Feature toggle admin controls ───────────────────────────────────────
export const getFeatureStatus = query({
  args: {},
  handler: async (ctx): Promise<{ enabled: boolean }> => {
    return { enabled: await isFeatureEnabled(ctx) };
  },
});

export const setFeatureStatus = mutation({
  args: { enabled: v.boolean(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireSignedInUser(ctx);
    const allowed = await hasPermission(ctx, user._id, "property_tour.publish");
    const isLegacyAdmin = user.role === "super_admin" || user.role === "admin";
    if (!allowed && !isLegacyAdmin) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only administrators can change this setting" });
    }
    const existing = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", FEATURE_KEY)).first();
    const previousValue = existing?.value === "true";
    if (existing) {
      await ctx.db.patch(existing._id, { value: String(args.enabled) });
    } else {
      await ctx.db.insert("siteSettings", { key: FEATURE_KEY, value: String(args.enabled) });
    }
    await logAudit(ctx, {
      action: args.enabled ? "enable" : "disable",
      entity: "feature_toggle",
      entityRef: FEATURE_KEY,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `${args.enabled ? "Enabled" : "Disabled"} the Interactive 360°/VR Tour feature`,
      before: JSON.stringify({ enabled: previousValue }),
      after: JSON.stringify({ enabled: args.enabled }),
      metadata: args.reason ? JSON.stringify({ reason: args.reason }) : undefined,
    });
  },
});

// ── Permission catalogue seeding ────────────────────────────────────────
export const seedTourPermissions = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requireSignedInUser(ctx);
    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const existing = await ctx.db.query("iamPermissions").withIndex("by_module", (q) => q.eq("module", "property_tour")).collect();
    const existingKeys = new Set(existing.map((p) => p.key));
    let inserted = 0;
    for (const key of TOUR_PERMISSIONS) {
      if (existingKeys.has(key)) continue;
      const action = key.split(".")[1].toUpperCase();
      await ctx.db.insert("iamPermissions", {
        key,
        module: "property_tour",
        action,
        label: PERMISSION_LABELS[key],
        sensitive: key === "property_tour.delete" || key === "property_tour.publish",
      });
      inserted++;
    }
    return { inserted };
  },
});

// Safe, non-throwing access check — mirrors listToursForProperty's actual
// enforcement so the admin UI can render a clear "access denied" screen
// instead of an unhandled query error (which would otherwise render blank).
export const getMyAccess = query({
  args: {},
  handler: async (ctx): Promise<{ signedIn: boolean; canView: boolean; isAdmin: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { signedIn: false, canView: false, isAdmin: false };
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return { signedIn: false, canView: false, isAdmin: false };
    const isAdmin = user.role === "super_admin" || user.role === "admin";
    const canView = await hasPermission(ctx, user._id, "property_tour.view");
    return { signedIn: true, canView, isAdmin };
  },
});

// ── File uploads (shared Convex storage — same pattern as cms.ts) ──────
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "property_tour.edit", { requireEnabled: false });
    return ctx.storage.generateUploadUrl();
  },
});

// ── Enrichment ───────────────────────────────────────────────────────────
async function resolveStorageUrl(ctx: QueryCtx, storageId: Id<"_storage"> | undefined): Promise<string | null> {
  if (!storageId) return null;
  return ctx.storage.getUrl(storageId);
}

async function enrichScene(ctx: QueryCtx, scene: Doc<"tourScenes">) {
  const panoramaUrl = await resolveStorageUrl(ctx, scene.panoramaStorageId);
  return { ...scene, panoramaUrl };
}

// ── Admin: manage tours (create/edit/publish/delete) ────────────────────
export const listToursForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args): Promise<Doc<"propertyTours">[]> => {
    await requirePermission(ctx, "property_tour.view", { requireEnabled: false });
    return ctx.db.query("propertyTours").withIndex("by_property", (q) => q.eq("propertyId", args.propertyId)).collect();
  },
});

export const getTourAdmin = query({
  args: { id: v.id("propertyTours") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "property_tour.view", { requireEnabled: false });
    const tour = await ctx.db.get(args.id);
    if (!tour) return null;
    const scenes = await ctx.db.query("tourScenes").withIndex("by_tour_and_order", (q) => q.eq("tourId", args.id)).collect();
    scenes.sort((a, b) => a.order - b.order);
    const enrichedScenes = await Promise.all(
      scenes.map(async (scene) => {
        const hotspots = await ctx.db.query("tourHotspots").withIndex("by_scene", (q) => q.eq("sceneId", scene._id)).collect();
        return { ...(await enrichScene(ctx, scene)), hotspots };
      })
    );
    const floorPlanUrl = await resolveStorageUrl(ctx, tour.floorPlanStorageId);
    return { ...tour, floorPlanUrl, scenes: enrichedScenes };
  },
});

export const createTour = mutation({
  args: { propertyId: v.id("properties"), title: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Id<"propertyTours">> => {
    const user = await requirePermission(ctx, "property_tour.create", { requireEnabled: false });
    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });
    const id = await ctx.db.insert("propertyTours", {
      propertyId: args.propertyId,
      title: args.title,
      description: args.description,
      status: "draft",
      createdBy: user._id,
      updatedAt: new Date().toISOString(),
    });
    await logAudit(ctx, {
      action: "create", entity: "property_tour", entityId: id, entityRef: args.title,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created 360°/VR tour "${args.title}" for property`,
      metadata: JSON.stringify({ propertyId: args.propertyId }),
    });
    return id;
  },
});

export const updateTour = mutation({
  args: {
    id: v.id("propertyTours"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startSceneId: v.optional(v.id("tourScenes")),
    floorPlanStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "property_tour.edit", { requireEnabled: false });
    const tour = await ctx.db.get(args.id);
    if (!tour) throw new ConvexError({ code: "NOT_FOUND", message: "Tour not found" });
    const { id, ...patch } = args;
    await ctx.db.patch(id, { ...patch, updatedBy: user._id, updatedAt: new Date().toISOString() });
    await logAudit(ctx, {
      action: "update", entity: "property_tour", entityId: id, entityRef: tour.title,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated 360°/VR tour "${tour.title}"`,
    });
  },
});

export const setTourStatus = mutation({
  args: { id: v.id("propertyTours"), status: v.union(v.literal("draft"), v.literal("published"), v.literal("unpublished")) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "property_tour.publish", { requireEnabled: false });
    const tour = await ctx.db.get(args.id);
    if (!tour) throw new ConvexError({ code: "NOT_FOUND", message: "Tour not found" });
    if (args.status === "published") {
      const sceneCount = (await ctx.db.query("tourScenes").withIndex("by_tour", (q) => q.eq("tourId", args.id)).collect()).length;
      if (sceneCount === 0) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Add at least one scene before publishing" });
      }
    }
    await ctx.db.patch(args.id, { status: args.status, updatedBy: user._id, updatedAt: new Date().toISOString() });
    await logAudit(ctx, {
      action: "update", entity: "property_tour", entityId: args.id, entityRef: tour.title,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Set 360°/VR tour "${tour.title}" status to ${args.status}`,
      before: JSON.stringify({ status: tour.status }),
      after: JSON.stringify({ status: args.status }),
    });
  },
});

export const deleteTour = mutation({
  args: { id: v.id("propertyTours") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "property_tour.delete", { requireEnabled: false });
    const tour = await ctx.db.get(args.id);
    if (!tour) throw new ConvexError({ code: "NOT_FOUND", message: "Tour not found" });
    const scenes = await ctx.db.query("tourScenes").withIndex("by_tour", (q) => q.eq("tourId", args.id)).collect();
    for (const scene of scenes) {
      const hotspots = await ctx.db.query("tourHotspots").withIndex("by_scene", (q) => q.eq("sceneId", scene._id)).collect();
      for (const h of hotspots) await ctx.db.delete(h._id);
      await ctx.db.delete(scene._id);
    }
    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      action: "delete", entity: "property_tour", entityId: args.id, entityRef: tour.title,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Deleted 360°/VR tour "${tour.title}" (${scenes.length} scene(s))`,
    });
  },
});

// ── Scenes ────────────────────────────────────────────────────────────────
export const addScene = mutation({
  args: {
    tourId: v.id("propertyTours"),
    name: v.string(),
    sceneType: v.union(v.literal("interior"), v.literal("exterior"), v.literal("estate")),
    panoramaStorageId: v.id("_storage"),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"tourScenes">> => {
    const user = await requirePermission(ctx, "property_tour.edit", { requireEnabled: false });
    const tour = await ctx.db.get(args.tourId);
    if (!tour) throw new ConvexError({ code: "NOT_FOUND", message: "Tour not found" });
    const existing = await ctx.db.query("tourScenes").withIndex("by_tour", (q) => q.eq("tourId", args.tourId)).collect();
    const id = await ctx.db.insert("tourScenes", {
      tourId: args.tourId,
      name: args.name,
      sceneType: args.sceneType,
      panoramaStorageId: args.panoramaStorageId,
      description: args.description,
      order: existing.length,
    });
    // First scene added becomes the default start scene automatically.
    if (!tour.startSceneId) {
      await ctx.db.patch(args.tourId, { startSceneId: id, updatedBy: user._id, updatedAt: new Date().toISOString() });
    }
    await logAudit(ctx, {
      action: "create", entity: "tour_scene", entityId: id, entityRef: args.name,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Added scene "${args.name}" to 360°/VR tour "${tour.title}"`,
    });
    return id;
  },
});

export const updateScene = mutation({
  args: {
    id: v.id("tourScenes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    initialYaw: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "property_tour.edit", { requireEnabled: false });
    const scene = await ctx.db.get(args.id);
    if (!scene) throw new ConvexError({ code: "NOT_FOUND", message: "Scene not found" });
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    await logAudit(ctx, {
      action: "update", entity: "tour_scene", entityId: id, entityRef: scene.name,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated scene "${scene.name}"`,
    });
  },
});

export const reorderScenes = mutation({
  args: { tourId: v.id("propertyTours"), orderedSceneIds: v.array(v.id("tourScenes")) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "property_tour.edit", { requireEnabled: false });
    const tour = await ctx.db.get(args.tourId);
    if (!tour) throw new ConvexError({ code: "NOT_FOUND", message: "Tour not found" });
    for (let i = 0; i < args.orderedSceneIds.length; i++) {
      await ctx.db.patch(args.orderedSceneIds[i], { order: i });
    }
    await logAudit(ctx, {
      action: "update", entity: "property_tour", entityId: args.tourId, entityRef: tour.title,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Reordered scenes in 360°/VR tour "${tour.title}"`,
    });
  },
});

export const deleteScene = mutation({
  args: { id: v.id("tourScenes") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "property_tour.edit", { requireEnabled: false });
    const scene = await ctx.db.get(args.id);
    if (!scene) throw new ConvexError({ code: "NOT_FOUND", message: "Scene not found" });
    const hotspots = await ctx.db.query("tourHotspots").withIndex("by_scene", (q) => q.eq("sceneId", args.id)).collect();
    for (const h of hotspots) await ctx.db.delete(h._id);
    // Clear navigation hotspots elsewhere in the tour that pointed here.
    const tour = await ctx.db.get(scene.tourId);
    const siblingScenes = await ctx.db.query("tourScenes").withIndex("by_tour", (q) => q.eq("tourId", scene.tourId)).collect();
    for (const sibling of siblingScenes) {
      if (sibling._id === args.id) continue;
      const siblingHotspots = await ctx.db.query("tourHotspots").withIndex("by_scene", (q) => q.eq("sceneId", sibling._id)).collect();
      for (const h of siblingHotspots) {
        if (h.targetSceneId === args.id) await ctx.db.delete(h._id);
      }
    }
    if (tour?.startSceneId === args.id) {
      const remaining = siblingScenes.filter((s) => s._id !== args.id).sort((a, b) => a.order - b.order);
      await ctx.db.patch(scene.tourId, { startSceneId: remaining[0]?._id, updatedAt: new Date().toISOString() });
    }
    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      action: "delete", entity: "tour_scene", entityId: args.id, entityRef: scene.name,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Deleted scene "${scene.name}"`,
    });
  },
});

// ── Hotspots ──────────────────────────────────────────────────────────────
export const addHotspot = mutation({
  args: {
    sceneId: v.id("tourScenes"),
    kind: v.union(v.literal("navigation"), v.literal("info")),
    yaw: v.number(),
    pitch: v.number(),
    label: v.string(),
    targetSceneId: v.optional(v.id("tourScenes")),
    infoText: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"tourHotspots">> => {
    const user = await requirePermission(ctx, "property_tour.edit", { requireEnabled: false });
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) throw new ConvexError({ code: "NOT_FOUND", message: "Scene not found" });
    if (args.kind === "navigation" && !args.targetSceneId) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Navigation hotspots require a target scene" });
    }
    if (args.kind === "info" && !args.infoText) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Info hotspots require info text" });
    }
    const id = await ctx.db.insert("tourHotspots", args);
    await logAudit(ctx, {
      action: "create", entity: "tour_hotspot", entityId: id, entityRef: args.label,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Added ${args.kind} hotspot "${args.label}" to scene "${scene.name}"`,
    });
    return id;
  },
});

export const deleteHotspot = mutation({
  args: { id: v.id("tourHotspots") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "property_tour.edit", { requireEnabled: false });
    const hotspot = await ctx.db.get(args.id);
    if (!hotspot) throw new ConvexError({ code: "NOT_FOUND", message: "Hotspot not found" });
    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      action: "delete", entity: "tour_hotspot", entityId: args.id, entityRef: hotspot.label,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Deleted hotspot "${hotspot.label}"`,
    });
  },
});

// ── Public: self-guided viewer ───────────────────────────────────────────
// No IAM permission required to view a *published* tour — this is a public
// marketing/sales experience, same visibility level as the property page
// itself. Still respects the feature toggle: while OFF, nothing is served.
export const getPublishedTourForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    if (!(await isFeatureEnabled(ctx))) return null;
    const tour = await ctx.db
      .query("propertyTours")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter((q) => q.eq(q.field("status"), "published"))
      .first();
    if (!tour) return null;
    const scenes = await ctx.db.query("tourScenes").withIndex("by_tour_and_order", (q) => q.eq("tourId", tour._id)).collect();
    scenes.sort((a, b) => a.order - b.order);
    const enrichedScenes = await Promise.all(
      scenes.map(async (scene) => {
        const hotspots = await ctx.db.query("tourHotspots").withIndex("by_scene", (q) => q.eq("sceneId", scene._id)).collect();
        return { ...(await enrichScene(ctx, scene)), hotspots };
      })
    );
    const floorPlanUrl = await resolveStorageUrl(ctx, tour.floorPlanStorageId);
    return { ...tour, floorPlanUrl, scenes: enrichedScenes };
  },
});
