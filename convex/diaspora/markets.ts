import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Diaspora Markets = the countries the platform actively operates in (spec
// section 10). Admin-created only — never auto-seeded — so we never invent
// country data that wasn't explicitly provided by the user.
// ══════════════════════════════════════════════════════════════════════════

const PROGRAMME_KEY = v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate"));

export const listMarkets = query({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"diasporaMarkets">>> => {
    await requirePermission(ctx, "diaspora.view", { requireEnabled: false });
    return await ctx.db.query("diasporaMarkets").order("desc").collect();
  },
});

// Public: markets visible to end users on the Diaspora site (caller must
// also check the master platform toggle before rendering).
export const listPublicMarkets = query({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"diasporaMarkets">>> => {
    const rows = await ctx.db.query("diasporaMarkets").withIndex("by_enabled", (q) => q.eq("enabled", true)).collect();
    return rows.filter((m) => m.publicVisible);
  },
});

export const createMarket = mutation({
  args: {
    country: v.string(),
    supportedProgrammeKeys: v.array(PROGRAMME_KEY),
    assignedTeam: v.optional(v.array(v.id("users"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Doc<"diasporaMarkets">["_id"]> => {
    const user = await requirePermission(ctx, "diaspora.market_manage", { requireEnabled: false });
    const country = args.country.trim();
    if (!country) throw new ConvexError({ code: "BAD_REQUEST", message: "Country is required" });

    const existing = await ctx.db.query("diasporaMarkets").withSearchIndex("search_country", (q) => q.search("country", country)).first();
    if (existing && existing.country.toLowerCase() === country.toLowerCase()) {
      throw new ConvexError({ code: "CONFLICT", message: `A market for "${country}" already exists` });
    }

    const id = await ctx.db.insert("diasporaMarkets", {
      country,
      enabled: true,
      publicVisible: true,
      acceptingLeads: true,
      featured: false,
      assignedTeam: args.assignedTeam,
      supportedProgrammeKeys: args.supportedProgrammeKeys,
      notes: args.notes,
      createdBy: user._id,
    });

    await logAudit(ctx, {
      action: "create", entity: "diaspora_markets", entityId: id, entityRef: country,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created Diaspora market "${country}"`,
    });

    return id;
  },
});

export const updateMarket = mutation({
  args: {
    id: v.id("diasporaMarkets"),
    country: v.optional(v.string()),
    supportedProgrammeKeys: v.optional(v.array(PROGRAMME_KEY)),
    assignedTeam: v.optional(v.array(v.id("users"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.market_manage", { requireEnabled: false });
    const { id, ...patch } = args;
    const market = await ctx.db.get(id);
    if (!market) throw new ConvexError({ code: "NOT_FOUND", message: "Market not found" });

    const filtered = Object.fromEntries(Object.entries(patch).filter(([, val]) => val !== undefined));
    if (Object.keys(filtered).length === 0) return;

    await ctx.db.patch(id, filtered);

    await logAudit(ctx, {
      action: "update", entity: "diaspora_markets", entityId: id, entityRef: market.country,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated Diaspora market "${market.country}"`,
      before: JSON.stringify(market),
      after: JSON.stringify(filtered),
    });
  },
});

const MARKET_TOGGLE_FIELDS = ["enabled", "publicVisible", "acceptingLeads", "featured"] as const;
const MARKET_TOGGLE_LABELS: Record<(typeof MARKET_TOGGLE_FIELDS)[number], string> = {
  enabled: "Enabled",
  publicVisible: "Public Visibility",
  acceptingLeads: "Accepting Leads",
  featured: "Featured",
};

export const updateMarketToggle = mutation({
  args: {
    id: v.id("diasporaMarkets"),
    field: v.union(...MARKET_TOGGLE_FIELDS.map((f) => v.literal(f))),
    value: v.boolean(),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.market_manage", { requireEnabled: false });
    const market = await ctx.db.get(args.id);
    if (!market) throw new ConvexError({ code: "NOT_FOUND", message: "Market not found" });

    const previousValue = market[args.field];
    await ctx.db.patch(args.id, { [args.field]: args.value });

    await logAudit(ctx, {
      action: "update", entity: "diaspora_markets", entityId: args.id, entityRef: market.country,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Market: ${market.country}\nSetting: ${MARKET_TOGGLE_LABELS[args.field]}\nPrevious: ${previousValue ? "Enabled" : "Disabled"}\nNew: ${args.value ? "Enabled" : "Disabled"}`,
      before: JSON.stringify({ [args.field]: previousValue }),
      after: JSON.stringify({ [args.field]: args.value }),
    });
  },
});

export const deleteMarket = mutation({
  args: { id: v.id("diasporaMarkets") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.market_manage", { requireEnabled: false });
    const market = await ctx.db.get(args.id);
    if (!market) throw new ConvexError({ code: "NOT_FOUND", message: "Market not found" });

    const linkedCampaign = await ctx.db.query("diasporaCampaigns").withIndex("by_market", (q) => q.eq("marketId", args.id)).first();
    if (linkedCampaign) {
      throw new ConvexError({ code: "CONFLICT", message: "Cannot delete a market with campaigns linked to it. Reassign or delete those campaigns first." });
    }

    await ctx.db.delete(args.id);

    await logAudit(ctx, {
      action: "delete", entity: "diaspora_markets", entityId: args.id, entityRef: market.country,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Deleted Diaspora market "${market.country}"`,
      before: JSON.stringify(market),
    });
  },
});
