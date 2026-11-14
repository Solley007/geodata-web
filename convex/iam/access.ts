import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel.d.ts";

// ══════════════════════════════════════════════════════════════════════════
// Shared, reusable "does this user effectively hold permission X" check.
// Used by any module (not just the IAM admin screens) that needs to gate a
// specific action behind a granular permission key from iamPermissions.
//
// Resolution:
//   1. Role-level grants: the user's current primary IAM role (from
//      userOrgAssignments.roleKey) → iamRolePermissions.
//   2. User-level overrides: iamUserPermissions — "grant" adds, "deny"
//      always removes, even if the role would otherwise grant it.
//   3. No explicit IAM role assignment at all → treated as holding NONE of
//      the granular permissions (deny by default), unlike data-scope
//      resolution which falls back to "enterprise" for legacy compatibility.
//      Granular feature permissions must always be explicitly granted.
// ══════════════════════════════════════════════════════════════════════════

export async function getUserRoleKey(ctx: QueryCtx, userId: Id<"users">): Promise<string | null> {
  const assignments = await ctx.db
    .query("userOrgAssignments")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "active"))
    .collect();
  const primary = assignments.find((a) => a.isPrimary) ?? assignments[0];
  return primary?.roleKey ?? null;
}

export async function getEffectivePermissionKeys(ctx: QueryCtx, userId: Id<"users">): Promise<Set<string>> {
  const keys = new Set<string>();
  const roleKey = await getUserRoleKey(ctx, userId);
  if (roleKey) {
    const rolePerms = await ctx.db.query("iamRolePermissions").withIndex("by_role", (q) => q.eq("roleKey", roleKey)).collect();
    for (const rp of rolePerms) keys.add(rp.permissionKey);
  }
  const now = new Date().toISOString();
  const overrides = await ctx.db.query("iamUserPermissions").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  for (const o of overrides) {
    if (o.effectiveFrom && o.effectiveFrom > now) continue;
    if (o.effectiveTo && o.effectiveTo < now) continue;
    if (o.effect === "grant") keys.add(o.permissionKey);
    if (o.effect === "deny") keys.delete(o.permissionKey);
  }
  return keys;
}

export async function hasPermission(ctx: QueryCtx, userId: Id<"users">, permissionKey: string): Promise<boolean> {
  const keys = await getEffectivePermissionKeys(ctx, userId);
  return keys.has(permissionKey);
}
