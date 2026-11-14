import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Admin-configurable CTA catalogue. Public pages resolve a CTA by `key`
// instead of hard-coding a button label/destination, so admins can rename
// a button or point it somewhere else without a code change.
// ══════════════════════════════════════════════════════════════════════════

const PROGRAMME_KEY = v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate"));
const DESTINATION_TYPE = v.union(v.literal("programme"), v.literal("campaign"), v.literal("external"));

export const listCtas = query({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"diasporaCtas">>> => {
    await requirePermission(ctx, "diaspora.view", { requireEnabled: false });
    const rows = await ctx.db.query("diasporaCtas").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

// Public: resolve a single enabled+visible CTA by its stable key. Returns
// null if missing/disabled/hidden so callers can fall back to a default.
export const getPublicCta = query({
  args: { key: v.string() },
  handler: async (ctx, args): Promise<Doc<"diasporaCtas"> | null> => {
    const row = await ctx.db.query("diasporaCtas").withIndex("by_key", (q) => q.eq("key", args.key)).first();
    if (!row || !row.enabled || !row.visible) return null;
    return row;
  },
});

export const createCta = mutation({
  args: {
    key: v.string(),
    label: v.string(),
    destinationType: DESTINATION_TYPE,
    destinationRef: v.string(),
    programmeKey: v.optional(PROGRAMME_KEY),
    campaignId: v.optional(v.id("diasporaCampaigns")),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Doc<"diasporaCtas">["_id"]> => {
    const user = await requirePermission(ctx, "diaspora.cta_manage", { requireEnabled: false });
    const key = args.key.trim();
    const label = args.label.trim();
    if (!key) throw new ConvexError({ code: "BAD_REQUEST", message: "CTA key is required" });
    if (!label) throw new ConvexError({ code: "BAD_REQUEST", message: "CTA label is required" });
    if (!args.destinationRef.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Destination is required" });

    const existing = await ctx.db.query("diasporaCtas").withIndex("by_key", (q) => q.eq("key", key)).first();
    if (existing) throw new ConvexError({ code: "CONFLICT", message: `A CTA with key "${key}" already exists` });

    const id = await ctx.db.insert("diasporaCtas", {
      key, label,
      destinationType: args.destinationType,
      destinationRef: args.destinationRef.trim(),
      enabled: true,
      visible: true,
      programmeKey: args.programmeKey,
      campaignId: args.campaignId,
      order: args.order ?? 0,
      updatedBy: user._id,
    });

    await logAudit(ctx, {
      action: "create", entity: "diaspora_ctas", entityId: id, entityRef: key,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created Diaspora CTA "${label}" (${key})`,
    });

    return id;
  },
});

export const updateCta = mutation({
  args: {
    id: v.id("diasporaCtas"),
    label: v.optional(v.string()),
    destinationType: v.optional(DESTINATION_TYPE),
    destinationRef: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    visible: v.optional(v.boolean()),
    programmeKey: v.optional(PROGRAMME_KEY),
    campaignId: v.optional(v.id("diasporaCampaigns")),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.cta_manage", { requireEnabled: false });
    const { id, ...patch } = args;
    const cta = await ctx.db.get(id);
    if (!cta) throw new ConvexError({ code: "NOT_FOUND", message: "CTA not found" });

    const filtered = Object.fromEntries(Object.entries(patch).filter(([, val]) => val !== undefined));
    if (Object.keys(filtered).length === 0) return;

    await ctx.db.patch(id, { ...filtered, updatedBy: user._id });

    await logAudit(ctx, {
      action: "update", entity: "diaspora_ctas", entityId: id, entityRef: cta.key,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated Diaspora CTA "${cta.label}"`,
      before: JSON.stringify(cta),
      after: JSON.stringify(filtered),
    });
  },
});

export const deleteCta = mutation({
  args: { id: v.id("diasporaCtas") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.cta_manage", { requireEnabled: false });
    const cta = await ctx.db.get(args.id);
    if (!cta) throw new ConvexError({ code: "NOT_FOUND", message: "CTA not found" });
    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      action: "delete", entity: "diaspora_ctas", entityId: args.id, entityRef: cta.key,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Deleted Diaspora CTA "${cta.label}"`,
      before: JSON.stringify(cta),
    });
  },
});
