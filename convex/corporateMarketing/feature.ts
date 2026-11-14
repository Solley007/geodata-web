import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { hasPermission } from "../iam/access.ts";
import { tokenOf } from "../authIdentity";

// ══════════════════════════════════════════════════════════════════════════
// CORPORATE MARKETING & BULK SALES — feature toggle + granular permission
// catalogue. Follows the exact pattern established by
// convex/liveInspections.ts (FEATURE_KEY in siteSettings, deny-by-default
// IAM permissions checked via convex/iam/access.ts). Default OFF.
// ══════════════════════════════════════════════════════════════════════════

export const FEATURE_KEY = "feature_corporate_marketing_sales";
export const MODULE_KEY = "corporate_marketing";

export const CORPORATE_MARKETING_PERMISSIONS = [
  "corporate_marketing.view",
  "corporate_marketing.create",
  "corporate_marketing.edit",
  "corporate_marketing.assign",
  "corporate_marketing.send",
  "corporate_marketing.approve",
  "corporate_marketing.export",
  "corporate_marketing.document_upload",
  "corporate_marketing.acknowledgement_record",
  "corporate_marketing.eoi_manage",
  "corporate_marketing.proposal_manage",
  "corporate_marketing.negotiation_manage",
  "corporate_marketing.opportunity_close",
  "corporate_marketing.esignature_request",
  "corporate_marketing.commitment_manage", // record commitments, bulk payments, allocation linkage, transaction conversion
  "corporate_marketing.manage", // feature toggle + pipeline/org-type configuration
  // ── Institutional / Bulk Acquisition Management (enhancement) ──────────
  "corporate_marketing.acquisition_view",
  "corporate_marketing.acquisition_create",
  "corporate_marketing.acquisition_edit",
  "corporate_marketing.acquisition_approve",
  "corporate_marketing.acquisition_close",
  "corporate_marketing.terms_manage", // propose/version commercial terms on a bulk acquisition
] as const;
export type CorporateMarketingPermission = (typeof CORPORATE_MARKETING_PERMISSIONS)[number];

const PERMISSION_LABELS: Record<CorporateMarketingPermission, string> = {
  "corporate_marketing.view": "View Corporate Marketing & Bulk Sales",
  "corporate_marketing.create": "Create Organisations/Opportunities",
  "corporate_marketing.edit": "Edit Organisations/Opportunities",
  "corporate_marketing.assign": "Assign Ownership",
  "corporate_marketing.send": "Send Partnership Letters",
  "corporate_marketing.approve": "Approve Commercial Terms",
  "corporate_marketing.export": "Export Corporate Marketing Data",
  "corporate_marketing.document_upload": "Upload Corporate Documents",
  "corporate_marketing.acknowledgement_record": "Record Acknowledgements",
  "corporate_marketing.eoi_manage": "Manage EOIs",
  "corporate_marketing.proposal_manage": "Manage Proposals",
  "corporate_marketing.negotiation_manage": "Manage Negotiations",
  "corporate_marketing.opportunity_close": "Close Opportunities (Won/Lost)",
  "corporate_marketing.esignature_request": "Request E-Signatures",
  "corporate_marketing.commitment_manage": "Record Commitments, Payments & Allocation",
  "corporate_marketing.manage": "Manage Feature Settings & Configuration",
  "corporate_marketing.acquisition_view": "View Bulk Acquisitions",
  "corporate_marketing.acquisition_create": "Create Bulk Acquisitions",
  "corporate_marketing.acquisition_edit": "Edit Bulk Acquisitions",
  "corporate_marketing.acquisition_approve": "Approve Bulk Acquisition Terms/Exceptions",
  "corporate_marketing.acquisition_close": "Close/Cancel Bulk Acquisitions",
  "corporate_marketing.terms_manage": "Propose Commercial Terms",
};

const SENSITIVE_PERMISSIONS = new Set<CorporateMarketingPermission>([
  "corporate_marketing.approve",
  "corporate_marketing.export",
  "corporate_marketing.opportunity_close",
  "corporate_marketing.commitment_manage",
  "corporate_marketing.manage",
  "corporate_marketing.acquisition_approve",
  "corporate_marketing.acquisition_close",
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
    throw new ConvexError({ code: "FORBIDDEN", message: "Corporate Marketing & Bulk Sales is currently disabled" });
  }
}

// Deny-by-default: requires an explicit IAM permission grant AND (unless
// `requireEnabled: false`, used only for read-only historical/audit access)
// the feature toggle to be ON. Never trusts the client to have hidden a
// button — every mutation/query re-checks this server-side.
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  permissionKey: CorporateMarketingPermission,
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
    const canView = (await hasPermission(ctx, user._id, "corporate_marketing.view")) || isSuperAdmin;
    return { signedIn: true, canView, isSuperAdmin };
  },
});

export const setFeatureStatus = mutation({
  args: { enabled: v.boolean(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireSignedInUser(ctx);
    const allowed = await hasPermission(ctx, user._id, "corporate_marketing.manage");
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
      description: `${args.enabled ? "Enabled" : "Disabled"} Corporate Marketing & Bulk Sales feature`,
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
    for (const key of CORPORATE_MARKETING_PERMISSIONS) {
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
