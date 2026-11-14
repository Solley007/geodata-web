import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { hasPermission } from "../iam/access.ts";
import { tokenOf } from "../authIdentity";

// ══════════════════════════════════════════════════════════════════════════
// GEODATA DIASPORA INVESTMENT & PROPERTY PLATFORM — feature toggle + granular
// permission catalogue. Follows the exact pattern established by
// convex/corporateMarketing/feature.ts (FEATURE_KEY in siteSettings,
// deny-by-default IAM permissions checked via convex/iam/access.ts).
// Default OFF. Turning this OFF only hides the public Diaspora experience —
// it never deletes or hides underlying CRM leads/clients/opportunities.
// ══════════════════════════════════════════════════════════════════════════

export const FEATURE_KEY = "feature_diaspora_platform";
export const MODULE_KEY = "diaspora";

export const DIASPORA_PERMISSIONS = [
  "diaspora.view",
  "diaspora.manage", // feature master toggle
  "diaspora.programme_manage",
  "diaspora.market_manage",
  "diaspora.campaign_manage",
  "diaspora.property_visibility_manage",
  "diaspora.cta_manage",
  "diaspora.referral_manage",
  "diaspora.corporate_manage",
  "diaspora.consultation_manage",
  "diaspora.analytics_view",
  "diaspora.export",
  "diaspora.audit_view",
] as const;
export type DiasporaPermission = (typeof DIASPORA_PERMISSIONS)[number];

const PERMISSION_LABELS: Record<DiasporaPermission, string> = {
  "diaspora.view": "View Diaspora Platform",
  "diaspora.manage": "Manage Diaspora Platform Settings",
  "diaspora.programme_manage": "Manage Programmes",
  "diaspora.market_manage": "Manage Markets",
  "diaspora.campaign_manage": "Manage Campaigns",
  "diaspora.property_visibility_manage": "Manage Property/Opportunity Diaspora Visibility",
  "diaspora.cta_manage": "Manage Diaspora Content & CTAs",
  "diaspora.referral_manage": "Manage Referral Programme",
  "diaspora.corporate_manage": "Manage Corporate Programme",
  "diaspora.consultation_manage": "Manage Consultations",
  "diaspora.analytics_view": "View Diaspora Analytics",
  "diaspora.export": "Export Diaspora Reports",
  "diaspora.audit_view": "View Diaspora Audit Logs",
};

const SENSITIVE_PERMISSIONS = new Set<DiasporaPermission>([
  "diaspora.manage",
  "diaspora.export",
  "diaspora.market_manage",
  "diaspora.campaign_manage",
]);

// ── Auth helpers ─────────────────────────────────────────────────────────
export async function requireSignedInUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  return user;
}

export async function isFeatureEnabled(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", FEATURE_KEY)).first();
  return row?.value === "true";
}

async function requireFeatureEnabled(ctx: QueryCtx | MutationCtx): Promise<void> {
  if (!(await isFeatureEnabled(ctx))) {
    throw new ConvexError({ code: "FORBIDDEN", message: "The Diaspora Investment & Property Platform is currently disabled" });
  }
}

// Deny-by-default: requires an explicit IAM permission grant AND (unless
// `requireEnabled: false`, used only for read-only historical/audit access)
// the feature toggle to be ON. Never trusts the client to have hidden a
// button — every mutation/query re-checks this server-side.
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  permissionKey: DiasporaPermission,
  options: { requireEnabled: boolean } = { requireEnabled: true },
): Promise<Doc<"users">> {
  const user = await requireSignedInUser(ctx);
  if (options.requireEnabled) await requireFeatureEnabled(ctx);
  const allowed = await hasPermission(ctx, user._id, permissionKey);
  const isLegacyAdmin = user.role === "super_admin"; // super_admin retains break-glass access; never a bypass for anyone else
  if (!allowed && !isLegacyAdmin) {
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

// Safe, non-throwing access check for the admin UI.
export const getMyAccess = query({
  args: {},
  handler: async (ctx): Promise<{ signedIn: boolean; canView: boolean; isSuperAdmin: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { signedIn: false, canView: false, isSuperAdmin: false };
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
    if (!user) return { signedIn: false, canView: false, isSuperAdmin: false };
    const isSuperAdmin = user.role === "super_admin";
    const canView = (await hasPermission(ctx, user._id, "diaspora.view")) || isSuperAdmin;
    return { signedIn: true, canView, isSuperAdmin };
  },
});

export const setFeatureStatus = mutation({
  args: { enabled: v.boolean(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireSignedInUser(ctx);
    const allowed = await hasPermission(ctx, user._id, "diaspora.manage");
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
      description: `${args.enabled ? "Enabled" : "Disabled"} the Diaspora Investment & Property Platform`,
      before: JSON.stringify({ enabled: previousValue }),
      after: JSON.stringify({ enabled: args.enabled }),
      metadata: args.reason ? JSON.stringify({ reason: args.reason }) : undefined,
    });
  },
});

// ── Permission catalogue seeding ────────────────────────────────────────
export const seedPermissions = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requireSignedInUser(ctx);
    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const existing = await ctx.db.query("iamPermissions").withIndex("by_module", (q) => q.eq("module", MODULE_KEY)).collect();
    const existingKeys = new Set(existing.map((p) => p.key));
    let inserted = 0;
    for (const key of DIASPORA_PERMISSIONS) {
      if (existingKeys.has(key)) continue;
      const action = key.split(".")[1].toUpperCase();
      await ctx.db.insert("iamPermissions", {
        key,
        module: MODULE_KEY,
        action,
        label: PERMISSION_LABELS[key],
        sensitive: SENSITIVE_PERMISSIONS.has(key),
      });
      inserted++;
    }
    return { inserted };
  },
});
