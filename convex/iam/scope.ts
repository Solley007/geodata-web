import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";

// ══════════════════════════════════════════════════════════════════════════
// DEPARTMENT-SCOPED DATA VISIBILITY — core resolution engine.
//
// Two independent dimensions stay separate, matching the rest of the IAM
// centre:
//   - System Role  → which modules/actions are available at all (unchanged,
//                     enforced today by ROLE_MODULE_ACCESS in AdminLayout).
//   - Data Scope    → which *records* within an available module a viewer
//                     sees. That's what this file resolves.
//
// Resolution order per viewer:
//   1. An explicit per-user, per-module override in `iamDataScopes` (set
//      from the Assignments tooling) always wins when present.
//   2. Otherwise fall back to the sensible default for their System Role.
//   3. No explicit IAM role assignment at all → "enterprise" (unrestricted),
//      identical to today's behaviour, so existing users see no change
//      until an admin assigns them a role.
// ══════════════════════════════════════════════════════════════════════════

export type ScopeLevel = "own" | "assigned" | "department" | "directorate" | "enterprise" | "governance" | "audit";

// Roles above this line need whole-enterprise visibility by design (MD/CEO,
// Super/System Admin technical oversight, Board & Shareholder governance
// reporting, and Auditor independence). Everyone else defaults to their own
// place in the org chart.
const ROLE_DEFAULT_SCOPE: Record<string, ScopeLevel> = {
  super_administrator: "enterprise",
  system_administrator: "enterprise",
  md_ceo: "enterprise",
  shareholder: "enterprise",
  board_member: "governance",
  board_committee_member: "governance",
  auditor: "audit",
  director: "directorate",
  manager: "department",
  officer: "department",
  staff: "assigned",
  external_restricted: "assigned",
};

// Scopes that see everything, enterprise-wide, with no record filtering.
const UNRESTRICTED_LEVELS: ScopeLevel[] = ["enterprise", "governance", "audit"];

export type ViewerScope =
  | { level: "enterprise" | "governance" | "audit" }
  | { level: "directorate"; directorateId: Id<"directorates"> | null }
  | { level: "department"; directorateId: Id<"directorates"> | null; departmentId: Id<"departments"> | null }
  | { level: "assigned" | "own"; userId: Id<"users"> };

// Resolves the current viewer's org placement (primary active assignment).
async function getPrimaryAssignment(ctx: QueryCtx, userId: Id<"users">) {
  const assignments = await ctx.db
    .query("userOrgAssignments")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "active"))
    .collect();
  return assignments.find((a) => a.isPrimary) ?? assignments[0] ?? null;
}

/**
 * Resolves the current viewer's data scope for a given module. Call once per
 * query, then use `matchesScope` / `filterByScope` below to narrow results.
 *
 * `module` should match the sidebar module keys used in ROLE_MODULE_ACCESS
 * (e.g. "clients", "tasks", "finance") — pass it so a per-module override in
 * iamDataScopes (module-specific) is respected; a scope row with no module
 * set applies to every module for that user.
 */
export async function resolveViewerScope(ctx: QueryCtx, viewer: Doc<"users">, module: string): Promise<ViewerScope> {
  // 1. Explicit per-user override, if configured.
  const overrides = await ctx.db.query("iamDataScopes").withIndex("by_user", (q) => q.eq("userId", viewer._id)).collect();
  const now = new Date().toISOString();
  const active = overrides.filter((o) => (!o.effectiveTo || o.effectiveTo > now));
  const moduleOverride = active.find((o) => o.module === module) ?? active.find((o) => !o.module);

  const assignment = await getPrimaryAssignment(ctx, viewer._id);
  const roleKey = assignment?.roleKey;

  const level: ScopeLevel = moduleOverride?.scope
    ?? (roleKey ? ROLE_DEFAULT_SCOPE[roleKey] : undefined)
    ?? "enterprise"; // no explicit IAM role yet — unrestricted, unchanged legacy behaviour

  if (UNRESTRICTED_LEVELS.includes(level)) {
    return { level: level as "enterprise" | "governance" | "audit" };
  }
  if (level === "directorate") {
    return { level: "directorate", directorateId: assignment?.directorateId ?? null };
  }
  if (level === "department") {
    return { level: "department", directorateId: assignment?.directorateId ?? null, departmentId: assignment?.departmentId ?? null };
  }
  // "assigned" / "own" — scoped to records owned by/assigned to this viewer specifically
  return { level: level as "assigned" | "own", userId: viewer._id };
}

// Cache of ownerId → their primary assignment's org placement, so a list of
// 100 records with the same 3 owners only looks up placement 3 times.
type OwnerPlacement = { directorateId: Id<"directorates"> | null; departmentId: Id<"departments"> | null };

async function getOwnerPlacement(ctx: QueryCtx, ownerId: Id<"users">, cache: Map<Id<"users">, OwnerPlacement>): Promise<OwnerPlacement> {
  const cached = cache.get(ownerId);
  if (cached) return cached;
  const assignment = await getPrimaryAssignment(ctx, ownerId);
  const placement: OwnerPlacement = { directorateId: assignment?.directorateId ?? null, departmentId: assignment?.departmentId ?? null };
  cache.set(ownerId, placement);
  return placement;
}

/**
 * Filters a list of records down to what the viewer's scope allows.
 * `getOwnerId` extracts the owning user (e.g. assignedAgent, createdBy) from
 * each record — records with no owner are visible only to unrestricted
 * scopes, since they can't be placed in anyone's directorate/department.
 */
export async function filterByScope<T>(
  ctx: QueryCtx,
  records: T[],
  scope: ViewerScope,
  getOwnerId: (record: T) => Id<"users"> | null | undefined,
): Promise<T[]> {
  if (scope.level === "enterprise" || scope.level === "governance" || scope.level === "audit") return records;

  if (scope.level === "assigned" || scope.level === "own") {
    return records.filter((r) => getOwnerId(r) === scope.userId);
  }

  const cache = new Map<Id<"users">, OwnerPlacement>();
  const kept: T[] = [];
  for (const record of records) {
    const ownerId = getOwnerId(record);
    if (!ownerId) continue; // unowned records aren't placeable — only unrestricted scopes see them
    const placement = await getOwnerPlacement(ctx, ownerId, cache);
    if (scope.level === "directorate") {
      if (scope.directorateId && placement.directorateId === scope.directorateId) kept.push(record);
    } else if (scope.level === "department") {
      if (scope.departmentId && placement.departmentId === scope.departmentId) kept.push(record);
    }
  }
  return kept;
}
