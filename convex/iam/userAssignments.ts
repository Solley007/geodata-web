import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api.js";
import { requireIamAdmin } from "./roles.ts";
import { logAudit } from "../taskboard.ts";

// ── User organisational + RBAC role assignment (time-bound) ─────────────────
export const listAssignmentsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    return await ctx.db.query("userOrgAssignments").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
  },
});

export const getPrimaryAssignment = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    const assignments = await ctx.db
      .query("userOrgAssignments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    return assignments.find((a) => a.isPrimary) ?? null;
  },
});

// One active + primary assignment per user, at most — bounded by user count.
// Used to render the organisation-wide assignment table without N+1 queries.
export const listAllActivePrimaryAssignments = query({
  args: {},
  handler: async (ctx) => {
    await requireIamAdmin(ctx);
    const active = await ctx.db.query("userOrgAssignments").withIndex("by_status", (q) => q.eq("status", "active")).collect();
    return active.filter((a) => a.isPrimary);
  },
});

export const assignUserToOrganization = mutation({
  args: {
    userId: v.id("users"),
    directorateId: v.optional(v.id("directorates")),
    departmentId: v.optional(v.id("departments")),
    unitId: v.optional(v.id("units")),
    positionId: v.optional(v.id("positions")),
    jobTitle: v.optional(v.string()),
    roleKey: v.optional(v.string()),
    isPrimary: v.boolean(),
    effectiveFrom: v.string(),
    effectiveTo: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);

    // If this is the new primary, end the previous primary assignment
    if (args.isPrimary) {
      const existing = await ctx.db
        .query("userOrgAssignments")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      const previousPrimary = existing.find((a) => a.isPrimary);
      if (previousPrimary) {
        await ctx.db.patch(previousPrimary._id, { status: "ended", effectiveTo: args.effectiveFrom });
      }
    }

    const id = await ctx.db.insert("userOrgAssignments", {
      userId: args.userId,
      directorateId: args.directorateId,
      departmentId: args.departmentId,
      unitId: args.unitId,
      positionId: args.positionId,
      jobTitle: args.jobTitle,
      roleKey: args.roleKey,
      isPrimary: args.isPrimary,
      effectiveFrom: args.effectiveFrom,
      effectiveTo: args.effectiveTo,
      status: "active",
      assignedBy: me._id,
      reason: args.reason,
    });

    await ctx.db.insert("organizationalChanges", {
      changeType: "assign_user",
      entityType: "user",
      entityId: args.userId,
      newState: JSON.stringify(args),
      reason: args.reason,
      effectiveDate: args.effectiveFrom,
      actorId: me._id,
      timestamp: new Date().toISOString(),
    });
    const targetUser = await ctx.db.get(args.userId);
    await logAudit(ctx, {
      action: "create", entity: "user_org_assignments", entityId: id,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Assigned ${targetUser?.name ?? "user"} to organisation${args.roleKey ? ` as ${args.roleKey}` : ""}`,
      after: JSON.stringify(args),
    });

    if (targetUser?.email) {
      const [role, directorate, department] = await Promise.all([
        args.roleKey ? ctx.db.query("iamRoles").withIndex("by_key", (q) => q.eq("key", args.roleKey!)).unique() : null,
        args.directorateId ? ctx.db.get(args.directorateId) : null,
        args.departmentId ? ctx.db.get(args.departmentId) : null,
      ]);
      await ctx.scheduler.runAfter(0, internal.emails.sendOrgAssignmentEmail, {
        to: targetUser.email,
        phone: targetUser.phone,
        name: targetUser.name ?? "there",
        roleName: role?.name,
        jobTitle: args.jobTitle,
        directorateName: directorate?.name,
        departmentName: department?.name,
        reason: args.reason,
      });
    }

    return id;
  },
});

export const endUserAssignment = mutation({
  args: { id: v.id("userOrgAssignments"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const assignment = await ctx.db.get(args.id);
    if (!assignment) throw new ConvexError({ code: "NOT_FOUND", message: "Assignment not found" });
    const now = new Date().toISOString();
    await ctx.db.patch(args.id, { status: "ended", effectiveTo: now });
    await ctx.db.insert("organizationalChanges", {
      changeType: "end_user_assignment",
      entityType: "user",
      entityId: assignment.userId,
      previousState: JSON.stringify(assignment),
      reason: args.reason,
      effectiveDate: now,
      actorId: me._id,
      timestamp: now,
    });
    await logAudit(ctx, {
      action: "update", entity: "user_org_assignments", entityId: args.id,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Ended organisational assignment${args.reason ? `: ${args.reason}` : ""}`,
      before: JSON.stringify(assignment),
    });

    const targetUser = await ctx.db.get(assignment.userId);
    if (targetUser?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendOrgChangeAffectingUserEmail, {
        to: targetUser.email,
        phone: targetUser.phone,
        name: targetUser.name ?? "there",
        changeDescription: `Your organisational assignment${assignment.jobTitle ? ` as ${assignment.jobTitle}` : ""} has ended${args.reason ? `: ${args.reason}` : "."}`,
      });
    }
  },
});

// ── Data scopes ──────────────────────────────────────────────────────────────
export const listDataScopesForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    return await ctx.db.query("iamDataScopes").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
  },
});

export const setDataScope = mutation({
  args: {
    userId: v.id("users"),
    scope: v.union(
      v.literal("own"), v.literal("assigned"), v.literal("department"),
      v.literal("directorate"), v.literal("enterprise"), v.literal("governance"), v.literal("audit"),
    ),
    module: v.optional(v.string()),
    effectiveFrom: v.optional(v.string()),
    effectiveTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    return await ctx.db.insert("iamDataScopes", { ...args, assignedBy: me._id });
  },
});

export const removeDataScope = mutation({
  args: { id: v.id("iamDataScopes") },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", message: "Data scope not found" });
    await ctx.db.delete(args.id);
  },
});
