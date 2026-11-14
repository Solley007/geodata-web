import { query } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel.d.ts";

// ══════════════════════════════════════════════════════════════════════════
// STAFF SELF-SERVICE PORTAL (/staff) — access gate + profile header.
//
// A friendlier, self-scoped alternative to the full /admin ERP, for accounts
// explicitly holding the "Officer" or "Staff" IAM role (dashboardProfileKey
// "officer_staff" — the same profile that already renders "My Tasks"/"My
// Approvals" on the admin dashboard) or the "Manager" IAM role (who may
// still prefer this lighter view alongside their full /admin access).
// Every other role is unaffected and keeps using /admin exactly as before.
// ══════════════════════════════════════════════════════════════════════════

async function getPrimaryAssignment(ctx: QueryCtx, userId: Id<"users">) {
  const assignments = await ctx.db
    .query("userOrgAssignments")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "active"))
    .collect();
  return assignments.find((a) => a.isPrimary) ?? assignments[0] ?? null;
}

export type StaffPortalProfile = {
  allowed: boolean;
  autoRedirect: boolean; // true only for the Officer/Staff profile — default landing page
  name: string;
  email?: string;
  avatar?: string;
  jobTitle?: string;
  roleName?: string;
  directorateName?: string;
  departmentName?: string;
  unitName?: string;
  managerName?: string;
};

export const getMyStaffPortalProfile = query({
  args: {},
  handler: async (ctx): Promise<StaffPortalProfile | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;

    const assignment = await getPrimaryAssignment(ctx, user._id);
    const role = assignment?.roleKey
      ? await ctx.db.query("iamRoles").withIndex("by_key", (q) => q.eq("key", assignment.roleKey!)).unique()
      : null;

    const isOfficerStaff = role?.dashboardProfileKey === "officer_staff";
    const isManager = assignment?.roleKey === "manager";
    const allowed = isOfficerStaff || isManager;
    if (!allowed) return { allowed: false, autoRedirect: false, name: user.name ?? "there" };

    const [directorate, department, unit, position] = await Promise.all([
      assignment?.directorateId ? ctx.db.get(assignment.directorateId) : null,
      assignment?.departmentId ? ctx.db.get(assignment.departmentId) : null,
      assignment?.unitId ? ctx.db.get(assignment.unitId) : null,
      assignment?.positionId ? ctx.db.get(assignment.positionId) : null,
    ]);

    // Best-effort "reports to" lookup: find whoever's primary assignment
    // currently sits in the position this viewer's position reports to.
    let managerName: string | undefined;
    if (position?.reportsToPositionId) {
      const activeAssignments = await ctx.db.query("userOrgAssignments").withIndex("by_status", (q) => q.eq("status", "active")).collect();
      const managerAssignment = activeAssignments.find((a) => a.isPrimary && a.positionId === position.reportsToPositionId);
      if (managerAssignment) {
        const managerUser = await ctx.db.get(managerAssignment.userId);
        managerName = managerUser?.name ?? undefined;
      }
    }

    return {
      allowed: true,
      autoRedirect: isOfficerStaff,
      name: user.name ?? "there",
      email: user.email,
      avatar: user.avatar,
      jobTitle: assignment?.jobTitle ?? position?.title,
      roleName: role?.name,
      directorateName: directorate?.name,
      departmentName: department?.name,
      unitName: unit?.name,
      managerName,
    };
  },
});
