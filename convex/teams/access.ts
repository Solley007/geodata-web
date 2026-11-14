import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { requireAdmin } from "../admin.ts";

// Teams are a staff-only space: anyone passing requireAdmin (staff roles) may
// use it, but only members see a team. super_admin / admin can oversee any team.

export type TeamAccess = { user: Doc<"users">; team: Doc<"teams">; isOwner: boolean; isMember: boolean };

export async function requireTeamAccess(ctx: QueryCtx | MutationCtx, teamId: Id<"teams">): Promise<TeamAccess> {
  const user = await requireAdmin(ctx);
  const team = await ctx.db.get(teamId);
  if (!team) throw new ConvexError({ code: "NOT_FOUND", message: "Team not found" });
  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_and_user", (q) => q.eq("teamId", teamId).eq("userId", user._id))
    .unique();
  const oversight = user.role === "super_admin" || user.role === "admin";
  if (!membership && !oversight) throw new ConvexError({ code: "FORBIDDEN", message: "You are not a member of this team" });
  return { user, team, isOwner: membership?.role === "owner" || oversight, isMember: !!membership };
}

export async function requireTeamOwner(ctx: QueryCtx | MutationCtx, teamId: Id<"teams">): Promise<TeamAccess> {
  const access = await requireTeamAccess(ctx, teamId);
  if (!access.isOwner) throw new ConvexError({ code: "FORBIDDEN", message: "Only team owners can do this" });
  return access;
}

export function canCreateTeam(user: Doc<"users">): boolean {
  return user.role === "super_admin" || user.role === "admin" || user.role === "manager";
}
