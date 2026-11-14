import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel.d.ts";
import { requireIamAdmin } from "./roles.ts";
import { logAudit } from "../taskboard.ts";

// ── Segregation of duties (SoD) ─────────────────────────────────────────────
// Configurable pairs of permission keys that must never both be held by the
// same user. Policy is "block" (deny the grant outright) or "flag_and_route"
// (allow but log a violation for review).

export const listSodRules = query({
  args: {},
  handler: async (ctx) => {
    await requireIamAdmin(ctx);
    return await ctx.db.query("sodRules").collect();
  },
});

export const createSodRule = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    conflictingPermissionA: v.string(),
    conflictingPermissionB: v.string(),
    policy: v.union(v.literal("block"), v.literal("flag_and_route")),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    if (args.conflictingPermissionA === args.conflictingPermissionB) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "A rule must compare two different permissions" });
    }
    const id = await ctx.db.insert("sodRules", { ...args, status: "active", createdBy: me._id });
    await logAudit(ctx, {
      action: "create", entity: "sod_rules", entityId: id, entityRef: args.name,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Created segregation of duties rule "${args.name}"`, after: JSON.stringify(args),
    });
    return id;
  },
});

export const updateSodRule = mutation({
  args: {
    id: v.id("sodRules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    policy: v.optional(v.union(v.literal("block"), v.literal("flag_and_route"))),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const { id, ...patch } = args;
    const rule = await ctx.db.get(id);
    if (!rule) throw new ConvexError({ code: "NOT_FOUND", message: "Rule not found" });
    await ctx.db.patch(id, patch);
    await logAudit(ctx, {
      action: "update", entity: "sod_rules", entityId: id, entityRef: rule.name,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Updated segregation of duties rule "${rule.name}"`, before: JSON.stringify(rule), after: JSON.stringify(patch),
    });
  },
});

export const deleteSodRule = mutation({
  args: { id: v.id("sodRules") },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const rule = await ctx.db.get(args.id);
    if (!rule) throw new ConvexError({ code: "NOT_FOUND", message: "Rule not found" });
    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      action: "delete", entity: "sod_rules", entityId: args.id, entityRef: rule.name,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Deleted segregation of duties rule "${rule.name}"`, before: JSON.stringify(rule),
    });
  },
});

// Returns the set of permission keys a user effectively holds via role grants
// plus explicit "grant" overrides, minus explicit "deny" overrides.
async function effectivePermissionKeysForUser(ctx: MutationCtx, userId: Id<"users">): Promise<Set<string>> {
  const user = await ctx.db.get(userId);
  const keys = new Set<string>();
  if (user?.role) {
    const rolePerms = await ctx.db.query("iamRolePermissions").withIndex("by_role", (q) => q.eq("roleKey", user.role!)).collect();
    for (const rp of rolePerms) keys.add(rp.permissionKey);
  }
  const overrides = await ctx.db.query("iamUserPermissions").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  for (const o of overrides) {
    if (o.effect === "grant") keys.add(o.permissionKey);
    if (o.effect === "deny") keys.delete(o.permissionKey);
  }
  return keys;
}

// Checks a prospective permission grant against all active SoD rules.
// Returns { violated: true, rule, policy } if a conflict is found. Callers
// that grant permissions must call this BEFORE writing the grant.
export const checkSodConflict = mutation({
  args: { userId: v.id("users"), permissionKey: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{ violated: boolean; ruleId?: Id<"sodRules">; ruleName?: string; policy?: "block" | "flag_and_route" }> => {
    await requireIamAdmin(ctx);
    const heldKeys = await effectivePermissionKeysForUser(ctx, args.userId);
    const rules = await ctx.db.query("sodRules").withIndex("by_status", (q) => q.eq("status", "active")).collect();
    for (const rule of rules) {
      const conflictsWithA = rule.conflictingPermissionB === args.permissionKey && heldKeys.has(rule.conflictingPermissionA);
      const conflictsWithB = rule.conflictingPermissionA === args.permissionKey && heldKeys.has(rule.conflictingPermissionB);
      if (conflictsWithA || conflictsWithB) {
        return { violated: true, ruleId: rule._id, ruleName: rule.name, policy: rule.policy };
      }
    }
    return { violated: false };
  },
});

export const recordSodViolation = mutation({
  args: {
    ruleId: v.id("sodRules"),
    userId: v.id("users"),
    context: v.string(),
    resolvedAction: v.optional(v.union(v.literal("blocked"), v.literal("routed"), v.literal("overridden"))),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    return await ctx.db.insert("sodViolations", {
      ruleId: args.ruleId,
      userId: args.userId,
      context: args.context,
      resolvedAction: args.resolvedAction,
      resolvedBy: args.resolvedAction ? me._id : undefined,
      timestamp: new Date().toISOString(),
    });
  },
});

export const listSodViolations = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    const rows = args.userId
      ? await ctx.db.query("sodViolations").withIndex("by_user", (q) => q.eq("userId", args.userId!)).collect()
      : await ctx.db.query("sodViolations").order("desc").take(300);
    return await Promise.all(
      rows.map(async (v) => {
        const rule = await ctx.db.get(v.ruleId);
        const user = await ctx.db.get(v.userId);
        return { ...v, ruleName: rule?.name ?? "Unknown rule", userName: user?.name ?? "Unknown user" };
      })
    );
  },
});

// Scans every user's role + override grants against all active rules and
// records any conflicts found that are not already logged. Bounded to the
// current user table size; run on demand from the IAM centre, not on a timer.
export const runSodScan = mutation({
  args: {},
  handler: async (ctx): Promise<{ violationsFound: number }> => {
    await requireIamAdmin(ctx);
    const rules = await ctx.db.query("sodRules").withIndex("by_status", (q) => q.eq("status", "active")).collect();
    if (rules.length === 0) return { violationsFound: 0 };
    const users = await ctx.db.query("users").take(500);
    let violationsFound = 0;
    for (const user of users) {
      const heldKeys = await effectivePermissionKeysForUser(ctx, user._id);
      for (const rule of rules) {
        if (heldKeys.has(rule.conflictingPermissionA) && heldKeys.has(rule.conflictingPermissionB)) {
          const existing = await ctx.db
            .query("sodViolations")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();
          const alreadyLogged = existing.some((v) => v.ruleId === rule._id && !v.resolvedAction);
          if (!alreadyLogged) {
            await ctx.db.insert("sodViolations", {
              ruleId: rule._id,
              userId: user._id,
              context: `Detected via scan: holds both ${rule.conflictingPermissionA} and ${rule.conflictingPermissionB}`,
              timestamp: new Date().toISOString(),
            });
            violationsFound++;
          }
        }
      }
    }
    return { violationsFound };
  },
});
