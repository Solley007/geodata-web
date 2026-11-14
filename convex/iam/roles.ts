import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "../_generated/server";
import { requireAdmin } from "../admin.ts";
import { logAudit } from "../taskboard.ts";

// ── The 12 initial configurable RBAC roles ──────────────────────────────────
// These map onto the legacy `users.role` enum where relevant, but this table
// is the granular layer used by the new IAM centre. Roles remain editable —
// this list only seeds the initial configuration, it is never hard-coded
// into authorization logic elsewhere.
export const INITIAL_ROLES = [
  { key: "super_administrator", name: "Super Administrator", dashboardProfileKey: "md_ceo", description: "Full technical administration of the platform. Does not automatically carry business approval authority." },
  { key: "system_administrator", name: "System Administrator", dashboardProfileKey: "manager", description: "Technical administration (users, settings, security). Does not automatically carry business approval authority." },
  { key: "shareholder", name: "Shareholder", dashboardProfileKey: "shareholder", description: "Ultimate owner. Enterprise performance and investment visibility." },
  { key: "board_member", name: "Board Member", dashboardProfileKey: "board", description: "Strategic oversight and governance." },
  { key: "board_committee_member", name: "Board Committee Member", dashboardProfileKey: "board", description: "Serves on one or more Board Committees." },
  { key: "md_ceo", name: "Managing Director / CEO", dashboardProfileKey: "md_ceo", description: "Executive leadership, enterprise-wide operational authority." },
  { key: "director", name: "Director", dashboardProfileKey: "director", description: "Leads a Directorate." },
  { key: "manager", name: "Manager / Head of Unit", dashboardProfileKey: "manager", description: "Leads a Department or Unit." },
  { key: "officer", name: "Officer", dashboardProfileKey: "officer_staff", description: "Executes assigned operational work." },
  { key: "staff", name: "Staff", dashboardProfileKey: "officer_staff", description: "General staff member." },
  { key: "auditor", name: "Auditor", dashboardProfileKey: "auditor", description: "Independent audit and compliance visibility." },
  { key: "external_restricted", name: "External / Restricted User", dashboardProfileKey: "external_restricted", description: "External consultants, contractors, and strategic partners. Access classification, not an organisational position." },
] as const;

export async function requireIamAdmin(ctx: QueryCtx | MutationCtx) {
  // Reuses the existing admin gate — no duplicate auth/RBAC system.
  return await requireAdmin(ctx);
}

// Idempotent seed — safe to call multiple times; only inserts missing roles.
export const seedInitialRoles = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    await requireIamAdmin(ctx);
    const existing = await ctx.db.query("iamRoles").collect();
    const existingKeys = new Set(existing.map((r) => r.key));
    let inserted = 0;
    for (const r of INITIAL_ROLES) {
      if (existingKeys.has(r.key)) continue;
      await ctx.db.insert("iamRoles", {
        key: r.key,
        name: r.name,
        description: r.description,
        isSystem: true,
        dashboardProfileKey: r.dashboardProfileKey,
        status: "active",
      });
      inserted++;
    }
    return { inserted };
  },
});

export const listRoles = query({
  args: {},
  handler: async (ctx) => {
    await requireIamAdmin(ctx);
    return await ctx.db.query("iamRoles").collect();
  },
});

export const createRole = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    inheritsFromKey: v.optional(v.string()),
    dashboardProfileKey: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const dup = await ctx.db.query("iamRoles").withIndex("by_key", (q) => q.eq("key", args.key)).unique();
    if (dup) throw new ConvexError({ code: "CONFLICT", message: "A role with this key already exists" });
    const id = await ctx.db.insert("iamRoles", {
      key: args.key,
      name: args.name,
      description: args.description,
      inheritsFromKey: args.inheritsFromKey,
      isSystem: false,
      dashboardProfileKey: args.dashboardProfileKey,
      status: "active",
      createdBy: me._id,
    });
    await logAudit(ctx, {
      action: "create", entity: "iam_roles", entityId: id, entityRef: args.key,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Created IAM role "${args.name}"`, after: JSON.stringify(args),
    });
    return id;
  },
});

export const updateRole = mutation({
  args: {
    id: v.id("iamRoles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    inheritsFromKey: v.optional(v.string()),
    dashboardProfileKey: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const { id, ...patch } = args;
    const role = await ctx.db.get(id);
    if (!role) throw new ConvexError({ code: "NOT_FOUND", message: "Role not found" });
    await ctx.db.patch(id, patch);
    await logAudit(ctx, {
      action: "update", entity: "iam_roles", entityId: id, entityRef: role.key,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Updated IAM role "${role.name}"`, before: JSON.stringify(role), after: JSON.stringify(patch),
    });
  },
});

export const deleteRole = mutation({
  args: { id: v.id("iamRoles") },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const role = await ctx.db.get(args.id);
    if (!role) throw new ConvexError({ code: "NOT_FOUND", message: "Role not found" });
    if (role.isSystem) {
      throw new ConvexError({ code: "FORBIDDEN", message: "System roles cannot be deleted, only deactivated" });
    }
    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      action: "delete", entity: "iam_roles", entityId: args.id, entityRef: role.key,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Deleted IAM role "${role.name}"`, before: JSON.stringify(role),
    });
  },
});
