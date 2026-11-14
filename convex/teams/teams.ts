import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAdmin } from "../admin.ts";
import { notifyUser } from "../notifications.ts";
import { canCreateTeam, requireTeamAccess, requireTeamOwner } from "./access.ts";

const MAX_MEMBERS = 500;

export const listMyTeams = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const memberships = await ctx.db.query("teamMembers").withIndex("by_user", (q) => q.eq("userId", user._id)).take(200);
    const teams = await Promise.all(
      memberships.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        if (!team || team.archived) return null;
        const channels = await ctx.db.query("teamChannels").withIndex("by_team", (q) => q.eq("teamId", team._id)).take(100);
        return { ...team, myRole: m.role, channels: channels.filter((c) => !c.archived) };
      }),
    );
    return {
      canCreate: canCreateTeam(user),
      teams: teams.filter((t): t is NonNullable<typeof t> => t !== null),
    };
  },
});

export const getTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const { team, isOwner, user } = await requireTeamAccess(ctx, args.teamId);
    const members = await ctx.db.query("teamMembers").withIndex("by_team", (q) => q.eq("teamId", args.teamId)).take(MAX_MEMBERS);
    const people = await Promise.all(
      members.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return { userId: m.userId, role: m.role, name: u?.name ?? u?.email ?? "Unknown", email: u?.email ?? null, avatar: u?.avatar ?? null };
      }),
    );
    return { team, isOwner, myUserId: user._id, members: people };
  },
});

// Staff who can be added to a team, with optional name search
export const searchStaff = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const roles = ["super_admin", "admin", "manager", "agent"] as const;
    const term = args.search.trim().toLowerCase();
    const lists = await Promise.all(roles.map((r) => ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", r)).take(200)));
    return lists
      .flat()
      .filter((u) => u.isActive !== false && (!term || (u.name ?? "").toLowerCase().includes(term) || (u.email ?? "").toLowerCase().includes(term)))
      .slice(0, 50)
      .map((u) => ({ _id: u._id, name: u.name ?? u.email ?? "Unnamed", email: u.email ?? null }));
  },
});

export const createTeam = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    if (!canCreateTeam(user)) throw new ConvexError({ code: "FORBIDDEN", message: "Only managers and admins can create teams" });
    if (!args.name.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Team name is required" });
    const teamId = await ctx.db.insert("teams", { name: args.name.trim(), description: args.description?.trim() || undefined, createdBy: user._id, archived: false });
    await ctx.db.insert("teamMembers", { teamId, userId: user._id, role: "owner" });
    const channelId = await ctx.db.insert("teamChannels", { teamId, name: "General", isGeneral: true, archived: false, createdBy: user._id });
    return { teamId, channelId };
  },
});

export const updateTeam = mutation({
  args: { teamId: v.id("teams"), name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args): Promise<null> => {
    await requireTeamOwner(ctx, args.teamId);
    if (!args.name.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Team name is required" });
    await ctx.db.patch(args.teamId, { name: args.name.trim(), description: args.description?.trim() || undefined });
    return null;
  },
});

export const archiveTeam = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args): Promise<null> => {
    await requireTeamOwner(ctx, args.teamId);
    await ctx.db.patch(args.teamId, { archived: true });
    return null;
  },
});

export const addMember = mutation({
  args: { teamId: v.id("teams"), userId: v.id("users") },
  handler: async (ctx, args): Promise<null> => {
    const { team, user } = await requireTeamOwner(ctx, args.teamId);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    const existing = await ctx.db.query("teamMembers").withIndex("by_team_and_user", (q) => q.eq("teamId", args.teamId).eq("userId", args.userId)).unique();
    if (existing) throw new ConvexError({ code: "CONFLICT", message: "Already a member" });
    await ctx.db.insert("teamMembers", { teamId: args.teamId, userId: args.userId, role: "member" });
    await notifyUser(ctx, { userId: args.userId, type: "team", title: "Added to a team", message: `${user.name ?? "A colleague"} added you to ${team.name}`, link: "/admin/teams" });
    return null;
  },
});

export const setMemberRole = mutation({
  args: { teamId: v.id("teams"), userId: v.id("users"), role: v.union(v.literal("owner"), v.literal("member")) },
  handler: async (ctx, args): Promise<null> => {
    await requireTeamOwner(ctx, args.teamId);
    const m = await ctx.db.query("teamMembers").withIndex("by_team_and_user", (q) => q.eq("teamId", args.teamId).eq("userId", args.userId)).unique();
    if (!m) throw new ConvexError({ code: "NOT_FOUND", message: "Member not found" });
    if (m.role === "owner" && args.role === "member") {
      const all = await ctx.db.query("teamMembers").withIndex("by_team", (q) => q.eq("teamId", args.teamId)).take(MAX_MEMBERS);
      if (all.filter((x) => x.role === "owner").length < 2) throw new ConvexError({ code: "BAD_REQUEST", message: "A team needs at least one owner" });
    }
    await ctx.db.patch(m._id, { role: args.role });
    return null;
  },
});

// Owners remove others; any member may remove themselves (leave). The last owner cannot leave.
export const removeMember = mutation({
  args: { teamId: v.id("teams"), userId: v.id("users") },
  handler: async (ctx, args): Promise<null> => {
    const access = await requireTeamAccess(ctx, args.teamId);
    const leaving = access.user._id === args.userId;
    if (!leaving && !access.isOwner) throw new ConvexError({ code: "FORBIDDEN", message: "Only team owners can remove members" });
    const m = await ctx.db.query("teamMembers").withIndex("by_team_and_user", (q) => q.eq("teamId", args.teamId).eq("userId", args.userId)).unique();
    if (!m) return null;
    if (m.role === "owner") {
      const all = await ctx.db.query("teamMembers").withIndex("by_team", (q) => q.eq("teamId", args.teamId)).take(MAX_MEMBERS);
      if (all.filter((x) => x.role === "owner").length < 2) throw new ConvexError({ code: "BAD_REQUEST", message: "Make someone else an owner first" });
    }
    await ctx.db.delete(m._id);
    return null;
  },
});

export const createChannel = mutation({
  args: { teamId: v.id("teams"), name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireTeamOwner(ctx, args.teamId);
    if (!args.name.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Channel name is required" });
    return await ctx.db.insert("teamChannels", { teamId: args.teamId, name: args.name.trim(), description: args.description?.trim() || undefined, isGeneral: false, archived: false, createdBy: user._id });
  },
});

export const archiveChannel = mutation({
  args: { channelId: v.id("teamChannels") },
  handler: async (ctx, args): Promise<null> => {
    const ch = await ctx.db.get(args.channelId);
    if (!ch) return null;
    await requireTeamOwner(ctx, ch.teamId);
    if (ch.isGeneral) throw new ConvexError({ code: "BAD_REQUEST", message: "The General channel cannot be archived" });
    await ctx.db.patch(ch._id, { archived: true });
    return null;
  },
});
