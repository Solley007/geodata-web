import { ConvexError, v } from "convex/values";
import { query, mutation } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { requirePermission } from "./feature.ts";
import { resolveUrls } from "../properties.ts";

// ══════════════════════════════════════════════════════════════════════════
// Property & opportunity visibility controls for the Diaspora Platform.
// Reuses the EXISTING `properties`/`estates` tables — never a parallel
// property database. Every field added to those tables is optional and
// additive (see convex/schema.ts), so existing queries/UI are unaffected.
// ══════════════════════════════════════════════════════════════════════════

type ProgrammeKey = NonNullable<Doc<"properties">["diasporaProgrammeKeys"]>[number];

const PROGRAMME_KEYS = ["own", "invest", "partner", "refer", "corporate"] as const;

const VISIBILITY_TOGGLE_FIELDS = ["diasporaVisible", "diasporaFeatured", "diasporaEnquiriesOpen"] as const;
type VisibilityToggleField = (typeof VISIBILITY_TOGGLE_FIELDS)[number];

const TOGGLE_LABELS: Record<VisibilityToggleField, string> = {
  diasporaVisible: "Diaspora Visibility",
  diasporaFeatured: "Diaspora Featured",
  diasporaEnquiriesOpen: "Diaspora Enquiries Open",
};

// ── Admin: list all properties with their Diaspora visibility state ────────
// Bounded the same way the existing admin property list is (paginated table
// already exists in admin.ts) — this returns a lightweight projection for
// the Diaspora Visibility panel embedded in the existing property edit form,
// so it only needs a single property, not the whole table.
export const getPropertyVisibility = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args): Promise<{
    diasporaVisible: boolean;
    diasporaFeatured: boolean;
    diasporaEnquiriesOpen: boolean;
    diasporaProgrammeKeys: ProgrammeKey[];
    diasporaCampaignIds: Id<"diasporaCampaigns">[];
  } | null> => {
    await requirePermission(ctx, "diaspora.view", { requireEnabled: false });
    const property = await ctx.db.get(args.propertyId);
    if (!property) return null;
    return {
      diasporaVisible: property.diasporaVisible ?? false,
      diasporaFeatured: property.diasporaFeatured ?? false,
      diasporaEnquiriesOpen: property.diasporaEnquiriesOpen ?? true,
      diasporaProgrammeKeys: property.diasporaProgrammeKeys ?? [],
      diasporaCampaignIds: property.diasporaCampaignIds ?? [],
    };
  },
});

export const updatePropertyVisibilityToggle = mutation({
  args: {
    propertyId: v.id("properties"),
    field: v.union(...VISIBILITY_TOGGLE_FIELDS.map((f) => v.literal(f))),
    value: v.boolean(),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.property_visibility_manage", { requireEnabled: false });
    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });

    const previousValue = property[args.field] ?? (args.field === "diasporaEnquiriesOpen");
    await ctx.db.patch(args.propertyId, { [args.field]: args.value });

    await logAudit(ctx, {
      action: "update",
      entity: "diaspora_property_visibility",
      entityId: args.propertyId,
      entityRef: property.title,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Property: ${property.title}\nSetting: ${TOGGLE_LABELS[args.field]}\nPrevious: ${previousValue ? "On" : "Off"}\nNew: ${args.value ? "On" : "Off"}`,
      before: JSON.stringify({ [args.field]: previousValue }),
      after: JSON.stringify({ [args.field]: args.value }),
    });
  },
});

export const updatePropertyProgrammeKeys = mutation({
  args: {
    propertyId: v.id("properties"),
    programmeKeys: v.array(v.union(...PROGRAMME_KEYS.map((k) => v.literal(k)))),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.property_visibility_manage", { requireEnabled: false });
    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });

    const previousKeys = property.diasporaProgrammeKeys ?? [];
    await ctx.db.patch(args.propertyId, { diasporaProgrammeKeys: args.programmeKeys });

    await logAudit(ctx, {
      action: "update",
      entity: "diaspora_property_visibility",
      entityId: args.propertyId,
      entityRef: property.title,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Property: ${property.title}\nUpdated Diaspora programme assignment`,
      before: JSON.stringify({ diasporaProgrammeKeys: previousKeys }),
      after: JSON.stringify({ diasporaProgrammeKeys: args.programmeKeys }),
    });
  },
});

export const updatePropertyCampaignIds = mutation({
  args: {
    propertyId: v.id("properties"),
    campaignIds: v.array(v.id("diasporaCampaigns")),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.property_visibility_manage", { requireEnabled: false });
    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });

    const previousIds = property.diasporaCampaignIds ?? [];
    await ctx.db.patch(args.propertyId, { diasporaCampaignIds: args.campaignIds });

    await logAudit(ctx, {
      action: "update",
      entity: "diaspora_property_visibility",
      entityId: args.propertyId,
      entityRef: property.title,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Property: ${property.title}\nUpdated Diaspora campaign assignment`,
      before: JSON.stringify({ diasporaCampaignIds: previousIds }),
      after: JSON.stringify({ diasporaCampaignIds: args.campaignIds }),
    });
  },
});

// ── Public: properties visible on the Diaspora platform ────────────────────
// Callers (public Diaspora pages, built in a later milestone) are
// responsible for checking the master platform toggle and programme toggle
// before calling this — kept permission-free here so it stays usable from
// public pages, same pattern as `diaspora.programmes.listPublicProgrammes`.
export const listDiasporaVisibleProperties = query({
  args: {
    programmeKey: v.optional(v.union(...PROGRAMME_KEYS.map((k) => v.literal(k)))),
    campaignId: v.optional(v.id("diasporaCampaigns")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<Doc<"properties">>> => {
    // `by_status` index keeps this bounded to available listings rather than
    // scanning every property in the table.
    const rows = await ctx.db
      .query("properties")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .order("desc")
      .take(500);

    let visible = rows.filter((p) => p.diasporaVisible === true);
    if (args.programmeKey) {
      visible = visible.filter((p) => (p.diasporaProgrammeKeys ?? []).includes(args.programmeKey!));
    }
    if (args.campaignId) {
      const campaignId = args.campaignId as Id<"diasporaCampaigns">;
      visible = visible.filter((p) => (p.diasporaCampaignIds ?? []).includes(campaignId));
    }
    visible.sort((a, b) => (b.diasporaFeatured ? 1 : 0) - (a.diasporaFeatured ? 1 : 0));
    const limited = visible.slice(0, args.limit ?? 60);
    return Promise.all(limited.map((p) => resolveUrls(ctx, p)));
  },
});
