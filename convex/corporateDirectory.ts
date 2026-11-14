import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { logAudit } from "./taskboard.ts";

// ══════════════════════════════════════════════════════════════════════════
// GEODATA GROUP CORPORATE DIRECTORY — business directory data model
//
// CMS-driven records for the Group's business units, powering the public
// corporate gateway (business ecosystem + immersive portfolio). Entirely
// additive: the existing Real Estate app/CMS/routes/data are untouched.
//
// Whether the directory is the live public entry point is a separate concern
// (a "feature_corporate_directory" flag added to the existing siteSettings
// table in a later milestone) — this module only manages the business
// records themselves and is safe to seed/edit ahead of that switch.
// ══════════════════════════════════════════════════════════════════════════

const ADMIN_ROLES = ["super_admin", "admin", "manager"] as const;

async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  if (!user || !(ADMIN_ROLES as readonly string[]).includes(user.role ?? "")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Admin, Manager access required" });
  }
  return user;
}

const entityTypeValidator = v.union(
  v.literal("group"), v.literal("company"), v.literal("operating_business"),
  v.literal("business_unit"), v.literal("division"), v.literal("business_vertical"),
  v.literal("strategic_partner"),
);
const statusValidator = v.union(v.literal("live"), v.literal("coming_soon"), v.literal("inactive"));
const destinationTypeValidator = v.union(v.literal("internal_route"), v.literal("external_url"));

async function resolveImageUrls(ctx: QueryCtx, biz: Doc<"groupBusinesses">) {
  const [logoUrl, coverStorageUrl, gallery] = await Promise.all([
    biz.logoStorageId ? ctx.storage.getUrl(biz.logoStorageId) : Promise.resolve(null),
    biz.coverImageStorageId ? ctx.storage.getUrl(biz.coverImageStorageId) : Promise.resolve(null),
    biz.galleryStorageIds
      ? Promise.all(biz.galleryStorageIds.map((id) => ctx.storage.getUrl(id)))
      : Promise.resolve([]),
  ]);
  return {
    ...biz,
    logoUrl,
    coverImageResolvedUrl: coverStorageUrl ?? biz.coverImageUrl ?? null,
    galleryUrls: gallery.filter((u): u is string => !!u),
  };
}

// ── Queries ──────────────────────────────────────────────────────────────

// Admin: every business, regardless of visibility/status, ordered for management.
export const listAllBusinesses = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("groupBusinesses").withIndex("by_displayOrder").order("asc").collect();
    return await Promise.all(rows.map((b) => resolveImageUrls(ctx, b)));
  },
});

// Public: only publicly-visible businesses whose effective date has passed,
// ordered for display on the corporate directory.
export const listPublicBusinesses = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("groupBusinesses").withIndex("by_displayOrder").order("asc").collect();
    const now = new Date().toISOString();
    const visible = rows.filter((b) => b.publicVisibility && (!b.effectiveDate || b.effectiveDate <= now));
    return await Promise.all(visible.map((b) => resolveImageUrls(ctx, b)));
  },
});

export const getBusinessBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const biz = await ctx.db.query("groupBusinesses").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (!biz || !biz.publicVisibility) return null;
    return await resolveImageUrls(ctx, biz);
  },
});

// ── Mutations ────────────────────────────────────────────────────────────

export const createBusiness = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    legalEntityName: v.optional(v.string()),
    entityType: entityTypeValidator,
    sector: v.string(),
    shortDescription: v.string(),
    fullDescription: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    coverImageStorageId: v.optional(v.id("_storage")),
    coverImageUrl: v.optional(v.string()),
    galleryStorageIds: v.optional(v.array(v.id("_storage"))),
    capabilities: v.optional(v.array(v.string())),
    status: statusValidator,
    destinationType: destinationTypeValidator,
    destinationRoute: v.optional(v.string()),
    destinationUrl: v.optional(v.string()),
    displayOrder: v.number(),
    featured: v.boolean(),
    publicVisibility: v.boolean(),
    effectiveDate: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"groupBusinesses">> => {
    const user = await requireAdmin(ctx);
    if (args.destinationType === "internal_route" && !args.destinationRoute) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Internal route destination requires destinationRoute" });
    }
    if (args.destinationType === "external_url" && !args.destinationUrl) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "External URL destination requires destinationUrl" });
    }
    const existing = await ctx.db.query("groupBusinesses").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (existing) {
      throw new ConvexError({ code: "CONFLICT", message: `A business with slug "${args.slug}" already exists` });
    }
    const id = await ctx.db.insert("groupBusinesses", { ...args, createdBy: user._id });
    await logAudit(ctx, {
      action: "create", entity: "group_business", entityId: id, entityRef: args.slug,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created business "${args.name}" in the Corporate Directory`,
      after: JSON.stringify({ name: args.name, status: args.status }),
    });
    return id;
  },
});

export const updateBusiness = mutation({
  args: {
    id: v.id("groupBusinesses"),
    name: v.optional(v.string()),
    legalEntityName: v.optional(v.string()),
    entityType: v.optional(entityTypeValidator),
    sector: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
    fullDescription: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    coverImageStorageId: v.optional(v.id("_storage")),
    coverImageUrl: v.optional(v.string()),
    galleryStorageIds: v.optional(v.array(v.id("_storage"))),
    capabilities: v.optional(v.array(v.string())),
    status: v.optional(statusValidator),
    destinationType: v.optional(destinationTypeValidator),
    destinationRoute: v.optional(v.string()),
    destinationUrl: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    publicVisibility: v.optional(v.boolean()),
    effectiveDate: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const user = await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Business not found" });

    const nextDestinationType = fields.destinationType ?? existing.destinationType;
    const nextRoute = fields.destinationRoute !== undefined ? fields.destinationRoute : existing.destinationRoute;
    const nextUrl = fields.destinationUrl !== undefined ? fields.destinationUrl : existing.destinationUrl;
    if (nextDestinationType === "internal_route" && !nextRoute) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Internal route destination requires destinationRoute" });
    }
    if (nextDestinationType === "external_url" && !nextUrl) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "External URL destination requires destinationUrl" });
    }

    await ctx.db.patch(id, { ...fields, updatedBy: user._id, updatedAt: new Date().toISOString() });
    await logAudit(ctx, {
      action: "update", entity: "group_business", entityId: id, entityRef: existing.slug,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated business "${existing.name}" in the Corporate Directory`,
      before: JSON.stringify({ status: existing.status, publicVisibility: existing.publicVisibility }),
      after: JSON.stringify({ status: fields.status ?? existing.status, publicVisibility: fields.publicVisibility ?? existing.publicVisibility }),
    });
  },
});

export const deleteBusiness = mutation({
  args: { id: v.id("groupBusinesses") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (existing.logoStorageId) await ctx.storage.delete(existing.logoStorageId);
    if (existing.coverImageStorageId) await ctx.storage.delete(existing.coverImageStorageId);
    if (existing.galleryStorageIds) {
      for (const sid of existing.galleryStorageIds) await ctx.storage.delete(sid);
    }
    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      action: "delete", entity: "group_business", entityId: args.id, entityRef: existing.slug,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Deleted business "${existing.name}" from the Corporate Directory`,
      before: JSON.stringify({ name: existing.name, status: existing.status }),
    });
  },
});

export const reorderBusinesses = mutation({
  args: { orderedIds: v.array(v.id("groupBusinesses")) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { displayOrder: i, updatedBy: user._id, updatedAt: new Date().toISOString() });
    }
    await logAudit(ctx, {
      action: "reorder", entity: "group_business", userId: user._id, userName: user.name, userRole: user.role,
      description: `Reordered ${args.orderedIds.length} businesses in the Corporate Directory`,
    });
  },
});

// ── Seed ─────────────────────────────────────────────────────────────────
// Idempotent: inserts only the six initial businesses whose slug does not
// already exist. Safe to call multiple times. Real Estate is marked LIVE
// and routes to the existing "/" application; Concrete & Batching is marked
// COMING SOON and routes to the existing "/readymix" page — no duplicate
// pages or data are created by this seed.
export const seedInitialBusinesses = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number; skipped: number }> => {
    const user = await requireAdmin(ctx);
    const now = new Date().toISOString();

    const SEED: Array<Omit<Doc<"groupBusinesses">, "_id" | "_creationTime" | "createdBy" | "updatedBy" | "updatedAt"> & { slug: string }> = [
      {
        slug: "real-estate",
        name: "Real Estate",
        legalEntityName: "Geodata World Services Limited",
        entityType: "company",
        sector: "Real Estate Development & Investment",
        shortDescription: "Development, investment and property management across Nigeria.",
        fullDescription: "Geodata World Services Limited develops, sells and manages residential, commercial and estate properties, serving buyers, investors and the diaspora community.",
        capabilities: ["Development", "Investment", "Property Management"],
        status: "live",
        destinationType: "internal_route",
        // Always points at the dedicated Real Estate route, regardless of
        // whether the Corporate Directory toggle currently owns "/" — never
        // a self-referencing link back to the directory.
        destinationRoute: "/real-estate",
        coverImageUrl: "https://images.unsplash.com/photo-1685266325960-8ea392f6f026?auto=format&fit=crop&w=1600&q=80",
        displayOrder: 0,
        featured: true,
        publicVisibility: true,
      },
      {
        slug: "infrastructure",
        name: "Road & Infrastructure Construction",
        entityType: "business_unit",
        sector: "Infrastructure and Civil Construction",
        shortDescription: "Roads, civil infrastructure and development works.",
        fullDescription: "Our infrastructure business delivers roads, drainage, and civil construction works supporting the Group's development projects and third-party clients.",
        capabilities: ["Roads", "Civil Infrastructure", "Development"],
        status: "coming_soon",
        destinationType: "internal_route",
        destinationRoute: "/businesses/infrastructure",
        coverImageUrl: "https://images.unsplash.com/photo-1595734939818-f4e0d44957df?auto=format&fit=crop&w=1600&q=80",
        displayOrder: 1,
        featured: false,
        publicVisibility: true,
      },
      {
        slug: "concrete-batching",
        name: "Concrete & Batching",
        legalEntityName: "Geodata ReadyMix",
        entityType: "business_unit",
        sector: "Construction Materials",
        shortDescription: "Ready-mix concrete batching and delivery.",
        fullDescription: "Geodata ReadyMix produces and delivers quality-tested concrete mixes for residential, commercial and structural projects.",
        capabilities: ["Batching", "Ready-Mix Delivery", "Mix Design"],
        status: "coming_soon",
        destinationType: "internal_route",
        destinationRoute: "/readymix",
        coverImageUrl: "https://images.unsplash.com/photo-1527410651988-c2f385ccd3f7?auto=format&fit=crop&w=1600&q=80",
        displayOrder: 2,
        featured: false,
        publicVisibility: true,
      },
      {
        slug: "quarry-aggregates",
        name: "Quarry & Aggregates",
        entityType: "business_unit",
        sector: "Quarrying and Construction Materials",
        shortDescription: "Quarrying and construction aggregates supply.",
        fullDescription: "Our quarry and aggregates business supplies processed stone and construction materials for infrastructure and building projects.",
        capabilities: ["Quarrying", "Aggregates Processing", "Materials Supply"],
        status: "coming_soon",
        destinationType: "internal_route",
        destinationRoute: "/businesses/quarry",
        coverImageUrl: "https://images.unsplash.com/photo-1625496146061-ab953566e1ea?auto=format&fit=crop&w=1600&q=80",
        displayOrder: 3,
        featured: false,
        publicVisibility: true,
      },
      {
        slug: "equipment-leasing",
        name: "Equipment Leasing & Plant Services",
        entityType: "business_unit",
        sector: "Equipment, Plant and Machinery",
        shortDescription: "Heavy equipment leasing and plant services.",
        fullDescription: "Our equipment leasing business provides heavy machinery and plant services to support construction and infrastructure projects.",
        capabilities: ["Equipment Leasing", "Plant Services", "Machinery Support"],
        status: "coming_soon",
        destinationType: "internal_route",
        destinationRoute: "/businesses/equipment",
        coverImageUrl: "https://images.unsplash.com/photo-1575281923032-f40d94ef6160?auto=format&fit=crop&w=1600&q=80",
        displayOrder: 4,
        featured: false,
        publicVisibility: true,
      },
      {
        slug: "technology-digital",
        name: "Technology & Digital Solutions",
        entityType: "business_unit",
        sector: "Technology and Digital Transformation",
        shortDescription: "Digital transformation for the built environment.",
        fullDescription: "Our technology business builds digital solutions supporting the Group's businesses and the broader built-environment sector.",
        capabilities: ["Digital Transformation", "Enterprise Technology", "Built-Environment Tech"],
        status: "coming_soon",
        destinationType: "internal_route",
        destinationRoute: "/businesses/technology",
        coverImageUrl: "https://images.unsplash.com/photo-1759661990336-51bd4b951fea?auto=format&fit=crop&w=1600&q=80",
        displayOrder: 5,
        featured: false,
        publicVisibility: true,
      },
    ];

    let inserted = 0;
    let skipped = 0;
    for (const biz of SEED) {
      const existing = await ctx.db.query("groupBusinesses").withIndex("by_slug", (q) => q.eq("slug", biz.slug)).unique();
      if (existing) { skipped++; continue; }
      await ctx.db.insert("groupBusinesses", { ...biz, createdBy: user._id });
      inserted++;
    }

    if (inserted > 0) {
      await logAudit(ctx, {
        action: "seed", entity: "group_business", userId: user._id, userName: user.name, userRole: user.role,
        description: `Seeded ${inserted} initial Corporate Directory businesses (${skipped} already existed)`,
        metadata: JSON.stringify({ inserted, skipped, at: now }),
      });
    }

    return { inserted, skipped };
  },
});
