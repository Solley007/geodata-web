import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.d.ts";
import { logAudit } from "./taskboard.ts";
import { hasPermission } from "./iam/access.ts";

// ══════════════════════════════════════════════════════════════════════════
// FEATURE TOGGLE / CONTROL CENTRE
//
// Controlled activation switches for the Documents/E-Signature/E-Stamp,
// Enhanced Internal Communications, and Management Reporting enhancements.
// Follows the exact pattern already used by convex/liveInspections.ts,
// convex/propertyTours.ts, and convex/corporateMarketing/feature.ts:
//   - state lives in the existing `siteSettings` table (no new table)
//   - server-side enforcement via a shared isFeatureEnabled() helper other
//     modules import directly — never a frontend-only hide
//   - every change is written to the existing `auditLog` via logAudit()
//   - OFF only hides new functionality; it never deletes or resets data
// ══════════════════════════════════════════════════════════════════════════

export type FeatureToggleKey =
  | "feature_enhanced_documents"
  | "feature_esignature"
  | "feature_corporate_estamp"
  | "feature_enhanced_communications"
  | "feature_management_reporting"
  | "feature_corporate_directory";

export const FEATURE_TOGGLE_DEFS: { key: FeatureToggleKey; name: string; description: string }[] = [
  {
    key: "feature_enhanced_documents",
    name: "Enhanced Document Management",
    description: "Configurable document types, richer metadata, version history, and review/approval workflow on top of the existing Documents & Vault.",
  },
  {
    key: "feature_esignature",
    name: "E-Signature",
    description: "Optional, workflow-controlled electronic signing of vault documents by explicitly authorized signers.",
  },
  {
    key: "feature_corporate_estamp",
    name: "Official Geodata Corporate E-Stamp",
    description: "System-generated official GEODATA WORLD SERVICES LIMITED e-stamp linked to a specific document version, with public verification.",
  },
  {
    key: "feature_enhanced_communications",
    name: "Enhanced Internal Communications",
    description: "Internal messaging, channels, and announcements inside the existing Communications Centre — separate from the public ticker/pop notifications.",
  },
  {
    key: "feature_management_reporting",
    name: "Management Reporting",
    description: "Configurable management/operational/commercial/finance/governance reports built from existing enterprise data, with scheduling and approval.",
  },
  {
    key: "feature_corporate_directory",
    name: "Geodata World Corporate Directory",
    description: "When ON, the public homepage (\"/\") shows the Geodata World Corporate Directory (all six Group businesses) instead of the Real Estate landing page. The Real Estate site itself is never removed — it stays fully reachable at /real-estate either way. Turning this OFF restores the Real Estate landing at \"/\" exactly as before.",
  },
];

const FEATURE_KEY_SET = new Set<string>(FEATURE_TOGGLE_DEFS.map((d) => d.key));

// ── Granular permissions for this control centre itself ────────────────────
export const FEATURE_SETTINGS_PERMISSIONS = ["feature_toggles.view", "feature_toggles.manage"] as const;
export type FeatureTogglePermission = (typeof FEATURE_SETTINGS_PERMISSIONS)[number];

type ToggleState = {
  enabled: boolean;
  changedBy?: string; // users._id, stored as string inside JSON
  changedByName?: string;
  changedAt?: string; // ISO 8601
  reason?: string;
};

function parseToggleValue(raw: string | null | undefined): ToggleState {
  if (!raw) return { enabled: false };
  try {
    const parsed = JSON.parse(raw) as Partial<ToggleState>;
    return { enabled: parsed.enabled === true, changedBy: parsed.changedBy, changedByName: parsed.changedByName, changedAt: parsed.changedAt, reason: parsed.reason };
  } catch {
    // Legacy plain "true"/"false" value, tolerated defensively — never thrown.
    return { enabled: raw === "true" };
  }
}

// ── Auth helpers ─────────────────────────────────────────────────────────
async function requireSignedInUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  return user;
}

// Server-side gate other modules import directly to decide whether to expose
// their new functionality. Never trust the frontend to hide a disabled
// feature — every mutation/query for enhanced documents, e-signature,
// e-stamp, enhanced communications, and management reporting must call this.
export async function isFeatureEnabled(ctx: QueryCtx | MutationCtx, key: FeatureToggleKey): Promise<boolean> {
  const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", key)).first();
  return parseToggleValue(row?.value).enabled;
}

// Public, permission-free read of the single toggle that decides what the
// public "/" route renders. Safe to expose without auth — it returns only a
// boolean, the same way the existing landing_lock setting is read publicly
// via api.cms.getSiteSettings. Every other toggle stays behind
// requireFeatureSettingsPermission via listFeatureToggles.
export const isCorporateDirectoryEnabled = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    return await isFeatureEnabled(ctx, "feature_corporate_directory");
  },
});

export async function requireFeatureEnabled(ctx: QueryCtx | MutationCtx, key: FeatureToggleKey): Promise<void> {
  if (!(await isFeatureEnabled(ctx, key))) {
    const def = FEATURE_TOGGLE_DEFS.find((d) => d.key === key);
    throw new ConvexError({ code: "FORBIDDEN", message: `${def?.name ?? key} is currently disabled` });
  }
}

// Only explicitly authorized administrators may view/manage toggles.
// super_admin retains break-glass access (consistent with every other
// feature module in this app); no one else bypasses the permission check.
async function requireFeatureSettingsPermission(
  ctx: QueryCtx | MutationCtx,
  permission: FeatureTogglePermission,
): Promise<Doc<"users">> {
  const user = await requireSignedInUser(ctx);
  const allowed = await hasPermission(ctx, user._id, permission);
  // Break-glass fallback: both super_admin and admin retain full access to the
  // Feature Control Centre (view + manage) until a granular IAM role is
  // explicitly assigned, consistent with every other module's admin fallback
  // (see enhancedDocuments.ts, estamp.ts, internalComms.ts, reporting.ts —
  // all treat "admin" as equivalent to "super_admin" for break-glass access).
  const isLegacyAdmin = user.role === "super_admin" || user.role === "admin";
  if (!allowed && !isLegacyAdmin) {
    throw new ConvexError({ code: "FORBIDDEN", message: "You do not have permission to manage system features" });
  }
  return user;
}

// ── Queries ──────────────────────────────────────────────────────────────

export const listFeatureToggles = query({
  args: {},
  handler: async (ctx) => {
    await requireFeatureSettingsPermission(ctx, "feature_toggles.view");
    const rows = await Promise.all(
      FEATURE_TOGGLE_DEFS.map(async (def) => {
        const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", def.key)).first();
        const state = parseToggleValue(row?.value);
        return { ...def, ...state };
      })
    );
    return rows;
  },
});

// Safe, non-throwing access check for gating the Settings tab itself.
export const getMyFeatureSettingsAccess = query({
  args: {},
  handler: async (ctx): Promise<{ canView: boolean; canManage: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { canView: false, canManage: false };
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return { canView: false, canManage: false };
    const isLegacyAdmin = user.role === "super_admin" || user.role === "admin";
    const canView = (await hasPermission(ctx, user._id, "feature_toggles.view")) || isLegacyAdmin;
    const canManage = (await hasPermission(ctx, user._id, "feature_toggles.manage")) || isLegacyAdmin;
    return { canView, canManage };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────

export const setFeatureToggle = mutation({
  args: { key: v.string(), enabled: v.boolean(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!FEATURE_KEY_SET.has(args.key)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Unknown feature toggle key" });
    }
    const user = await requireFeatureSettingsPermission(ctx, "feature_toggles.manage");
    const def = FEATURE_TOGGLE_DEFS.find((d) => d.key === args.key)!;

    const existing = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", args.key)).first();
    const previous = parseToggleValue(existing?.value);

    const next: ToggleState = {
      enabled: args.enabled,
      changedBy: user._id,
      changedByName: user.name ?? user.email ?? "Unknown",
      changedAt: new Date().toISOString(),
      reason: args.reason,
    };
    const value = JSON.stringify(next);
    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("siteSettings", { key: args.key, value });
    }

    await logAudit(ctx, {
      action: args.enabled ? "enable" : "disable",
      entity: "feature_toggle",
      entityRef: args.key,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `${args.enabled ? "Enabled" : "Disabled"} feature "${def.name}"${args.reason ? ` — ${args.reason}` : ""}`,
      before: JSON.stringify({ enabled: previous.enabled }),
      after: JSON.stringify({ enabled: args.enabled }),
      metadata: args.reason ? JSON.stringify({ reason: args.reason }) : undefined,
    });

    return next;
  },
});

// Idempotent seed for the two granular permissions this control centre uses.
// Safe to call multiple times; only inserts what's missing.
export const seedFeatureSettingsPermissions = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requireSignedInUser(ctx);
    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const existing = await ctx.db.query("iamPermissions").withIndex("by_module", (q) => q.eq("module", "feature_toggles")).collect();
    const existingKeys = new Set(existing.map((p) => p.key));
    const labels: Record<FeatureTogglePermission, string> = {
      "feature_toggles.view": "View System Feature Toggles",
      "feature_toggles.manage": "Manage System Feature Toggles",
    };
    let inserted = 0;
    for (const key of FEATURE_SETTINGS_PERMISSIONS) {
      if (existingKeys.has(key)) continue;
      await ctx.db.insert("iamPermissions", {
        key,
        module: "feature_toggles",
        action: key.split(".")[1].toUpperCase(),
        label: labels[key],
        sensitive: key === "feature_toggles.manage",
      });
      inserted++;
    }
    return { inserted };
  },
});
