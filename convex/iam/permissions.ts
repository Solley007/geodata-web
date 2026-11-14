import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel.js";
import { requireIamAdmin } from "./roles.ts";
import { logAudit } from "../taskboard.ts";
import { internal } from "../_generated/api.js";

async function notifyUserOfPermissionOverride(
  ctx: MutationCtx,
  userId: Id<"users">,
  permissionKey: string,
  effect: "grant" | "deny",
  changedByName: string,
  reason: string | undefined,
): Promise<void> {
  const user = await ctx.db.get(userId);
  if (!user?.email) return;
  await ctx.scheduler.runAfter(0, internal.emails.sendPermissionOverrideEmail, {
    to: user.email,
    phone: user.phone,
    name: user.name ?? "there",
    permissionKey,
    effect,
    changedByName,
    reason,
  });
}

// ── Granular permission catalogue, module + action aware ────────────────────
const ACTIONS = ["VIEW", "CREATE", "EDIT", "SUBMIT", "REVIEW", "APPROVE", "REJECT", "ASSIGN", "SIGN", "EXPORT", "DELETE", "ADMIN", "AUDIT", "COMMENT"] as const;
const SENSITIVE_ACTIONS = new Set(["APPROVE", "SIGN", "ADMIN", "DELETE"]);

export const MODULES = [
  "properties", "estates", "clients", "inquiries", "allocations", "sales",
  "transactions", "kyc", "finance", "payments", "documents", "tasks",
  "audit", "backup", "construction", "partners", "analytics",
  "communications", "content", "staff", "users", "settings",
];

export const INITIAL_PERMISSIONS = MODULES.flatMap((module) =>
  ACTIONS.map((action) => ({
    key: `${module}.${action.toLowerCase()}`,
    module,
    action,
    label: `${action} ${module}`,
    sensitive: SENSITIVE_ACTIONS.has(action),
  }))
);

export const seedInitialPermissions = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    await requireIamAdmin(ctx);
    const existing = await ctx.db.query("iamPermissions").collect();
    const existingKeys = new Set(existing.map((p) => p.key));
    let inserted = 0;
    for (const p of INITIAL_PERMISSIONS) {
      if (existingKeys.has(p.key)) continue;
      await ctx.db.insert("iamPermissions", p);
      inserted++;
    }
    return { inserted };
  },
});

export const listPermissions = query({
  args: { module: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    if (args.module) {
      return await ctx.db.query("iamPermissions").withIndex("by_module", (q) => q.eq("module", args.module!)).collect();
    }
    return await ctx.db.query("iamPermissions").collect();
  },
});

export const listRolePermissions = query({
  args: { roleKey: v.string() },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    return await ctx.db.query("iamRolePermissions").withIndex("by_role", (q) => q.eq("roleKey", args.roleKey)).collect();
  },
});

export const grantPermissionToRole = mutation({
  args: { roleKey: v.string(), permissionKey: v.string() },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const dup = await ctx.db
      .query("iamRolePermissions")
      .withIndex("by_role_and_permission", (q) => q.eq("roleKey", args.roleKey).eq("permissionKey", args.permissionKey))
      .unique();
    if (dup) return dup._id;

    // Segregation of duties: check whether any user holding this role already
    // holds the conflicting permission via another route.
    const rules = await ctx.db.query("sodRules").withIndex("by_status", (q) => q.eq("status", "active")).collect();
    const conflictingRule = rules.find(
      (r) => r.conflictingPermissionA === args.permissionKey || r.conflictingPermissionB === args.permissionKey
    );
    if (conflictingRule) {
      const otherKey = conflictingRule.conflictingPermissionA === args.permissionKey
        ? conflictingRule.conflictingPermissionB
        : conflictingRule.conflictingPermissionA;
      const alreadyHeld = await ctx.db
        .query("iamRolePermissions")
        .withIndex("by_role_and_permission", (q) => q.eq("roleKey", args.roleKey).eq("permissionKey", otherKey))
        .unique();
      if (alreadyHeld && conflictingRule.policy === "block") {
        throw new ConvexError({
          code: "CONFLICT",
          message: `Segregation of duties: "${conflictingRule.name}" prevents this role from holding both permissions`,
        });
      }
    }

    const id = await ctx.db.insert("iamRolePermissions", {
      roleKey: args.roleKey,
      permissionKey: args.permissionKey,
      grantedBy: me._id,
      grantedAt: new Date().toISOString(),
    });
    await logAudit(ctx, {
      action: "create", entity: "iam_role_permissions", entityId: id, entityRef: `${args.roleKey}:${args.permissionKey}`,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Granted permission "${args.permissionKey}" to role "${args.roleKey}"`,
    });
    return id;
  },
});

export const revokePermissionFromRole = mutation({
  args: { roleKey: v.string(), permissionKey: v.string() },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const existing = await ctx.db
      .query("iamRolePermissions")
      .withIndex("by_role_and_permission", (q) => q.eq("roleKey", args.roleKey).eq("permissionKey", args.permissionKey))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      await logAudit(ctx, {
        action: "delete", entity: "iam_role_permissions", entityId: existing._id, entityRef: `${args.roleKey}:${args.permissionKey}`,
        userId: me._id, userName: me.name, userRole: me.role,
        description: `Revoked permission "${args.permissionKey}" from role "${args.roleKey}"`,
      });
    }
  },
});

// ── User-level permission overrides (explicit deny always wins) ─────────────
export const listUserPermissionOverrides = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    return await ctx.db.query("iamUserPermissions").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
  },
});

export const setUserPermissionOverride = mutation({
  args: {
    userId: v.id("users"),
    permissionKey: v.string(),
    effect: v.union(v.literal("grant"), v.literal("deny")),
    reason: v.optional(v.string()),
    effectiveFrom: v.optional(v.string()),
    effectiveTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);

    // Segregation of duties: block or flag a grant that would create a conflict.
    if (args.effect === "grant") {
      const user = await ctx.db.get(args.userId);
      const heldKeys = new Set<string>();
      if (user?.role) {
        const rolePerms = await ctx.db.query("iamRolePermissions").withIndex("by_role", (q) => q.eq("roleKey", user.role!)).collect();
        for (const rp of rolePerms) heldKeys.add(rp.permissionKey);
      }
      const overrides = await ctx.db.query("iamUserPermissions").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
      for (const o of overrides) {
        if (o.effect === "grant") heldKeys.add(o.permissionKey);
        if (o.effect === "deny") heldKeys.delete(o.permissionKey);
      }
      const rules = await ctx.db.query("sodRules").withIndex("by_status", (q) => q.eq("status", "active")).collect();
      for (const rule of rules) {
        const conflict =
          (rule.conflictingPermissionB === args.permissionKey && heldKeys.has(rule.conflictingPermissionA)) ||
          (rule.conflictingPermissionA === args.permissionKey && heldKeys.has(rule.conflictingPermissionB));
        if (!conflict) continue;
        if (rule.policy === "block") {
          throw new ConvexError({
            code: "CONFLICT",
            message: `Segregation of duties: "${rule.name}" prevents granting this permission alongside an existing one`,
          });
        }
        await ctx.db.insert("sodViolations", {
          ruleId: rule._id,
          userId: args.userId,
          context: `Flagged at grant time: ${args.permissionKey} conflicts with rule "${rule.name}"`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const existing = await ctx.db
      .query("iamUserPermissions")
      .withIndex("by_user_and_permission", (q) => q.eq("userId", args.userId).eq("permissionKey", args.permissionKey))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { effect: args.effect, reason: args.reason, effectiveFrom: args.effectiveFrom, effectiveTo: args.effectiveTo });
      await logAudit(ctx, {
        action: "update", entity: "iam_user_permissions", entityId: existing._id, entityRef: args.permissionKey,
        userId: me._id, userName: me.name, userRole: me.role,
        description: `Set permission override "${args.permissionKey}" to ${args.effect} for user`,
        metadata: JSON.stringify({ targetUserId: args.userId, reason: args.reason }),
      });
      await notifyUserOfPermissionOverride(ctx, args.userId, args.permissionKey, args.effect, me.name ?? "an administrator", args.reason);
      return existing._id;
    }
    const id = await ctx.db.insert("iamUserPermissions", {
      userId: args.userId,
      permissionKey: args.permissionKey,
      effect: args.effect,
      reason: args.reason,
      grantedBy: me._id,
      effectiveFrom: args.effectiveFrom,
      effectiveTo: args.effectiveTo,
    });
    await logAudit(ctx, {
      action: "create", entity: "iam_user_permissions", entityId: id, entityRef: args.permissionKey,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Created permission override "${args.permissionKey}" (${args.effect}) for user`,
      metadata: JSON.stringify({ targetUserId: args.userId, reason: args.reason }),
    });
    await notifyUserOfPermissionOverride(ctx, args.userId, args.permissionKey, args.effect, me.name ?? "an administrator", args.reason);
    return id;
  },
});

export const removeUserPermissionOverride = mutation({
  args: { id: v.id("iamUserPermissions") },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", message: "Override not found" });
    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      action: "delete", entity: "iam_user_permissions", entityId: args.id, entityRef: row.permissionKey,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Removed permission override "${row.permissionKey}"`,
      metadata: JSON.stringify({ targetUserId: row.userId }),
    });
  },
});
