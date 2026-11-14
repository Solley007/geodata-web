// WhatsApp notification settings — stored in the generic `siteSettings` key/value
// table (same pattern as other admin toggles like landing_lock, access_control).
import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { requireAdmin } from "./admin.ts";

const SETTINGS_KEY = "whatsapp_notifications_enabled";

/** Public: whether WhatsApp copies of notifications are turned on. Used by the admin UI. */
export const getWhatsAppEnabled = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .first();
    return row?.value ?? "false";
  },
});

/** Internal: same read, callable from the "use node" whatsapp action. */
export const getWhatsAppEnabledInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .first();
    return row?.value ?? "false";
  },
});

export const setWhatsAppEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: String(args.enabled) });
    } else {
      await ctx.db.insert("siteSettings", { key: SETTINGS_KEY, value: String(args.enabled) });
    }
  },
});
