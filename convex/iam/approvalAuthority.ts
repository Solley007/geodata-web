import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel.d.ts";
import { internal } from "../_generated/api.js";
import { requireIamAdmin } from "./roles.ts";
import { logAudit } from "../taskboard.ts";

// ── Explicit approval authority ─────────────────────────────────────────────
// Approval authority is NEVER inferred from job title, system role, or
// dashboard profile. It is a standalone grant an IAM administrator makes
// explicitly, scoped by approval type, org unit, amount range, and time.

export const listApprovalAuthorities = query({
  args: { userId: v.optional(v.id("users")), approvalType: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    if (args.userId) {
      return await ctx.db.query("approvalAuthorities").withIndex("by_user", (q) => q.eq("userId", args.userId!)).collect();
    }
    if (args.approvalType) {
      return await ctx.db.query("approvalAuthorities").withIndex("by_type", (q) => q.eq("approvalType", args.approvalType!)).collect();
    }
    return await ctx.db.query("approvalAuthorities").order("desc").take(500);
  },
});

export const grantApprovalAuthority = mutation({
  args: {
    userId: v.id("users"),
    approvalType: v.string(),
    directorateId: v.optional(v.id("directorates")),
    departmentId: v.optional(v.id("departments")),
    minAmount: v.optional(v.number()),
    maxAmount: v.optional(v.number()),
    approvalLevel: v.optional(v.number()),
    requiresCoApprover: v.optional(v.boolean()),
    effectiveFrom: v.string(),
    effectiveTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    if (args.minAmount !== undefined && args.maxAmount !== undefined && args.minAmount > args.maxAmount) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Minimum amount cannot exceed maximum amount" });
    }
    const id = await ctx.db.insert("approvalAuthorities", {
      ...args,
      status: "active",
      grantedBy: me._id,
    });
    const targetUser = await ctx.db.get(args.userId);
    await logAudit(ctx, {
      action: "create", entity: "approval_authorities", entityId: id, entityRef: args.approvalType,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Granted "${args.approvalType}" approval authority to ${targetUser?.name ?? "user"}`,
      after: JSON.stringify(args),
    });
    if (targetUser?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendApprovalAuthorityEmail, {
        to: targetUser.email,
        phone: targetUser.phone,
        name: targetUser.name ?? "there",
        granted: true,
        approvalType: args.approvalType,
        maxAmount: args.maxAmount,
      });
    }
    return id;
  },
});

export const revokeApprovalAuthority = mutation({
  args: { id: v.id("approvalAuthorities") },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", message: "Approval authority not found" });
    await ctx.db.patch(args.id, { status: "revoked" });
    const targetUser = await ctx.db.get(row.userId);
    await logAudit(ctx, {
      action: "update", entity: "approval_authorities", entityId: args.id, entityRef: row.approvalType,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Revoked "${row.approvalType}" approval authority from ${targetUser?.name ?? "user"}`,
      before: JSON.stringify(row),
    });
    if (targetUser?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendApprovalAuthorityEmail, {
        to: targetUser.email,
        phone: targetUser.phone,
        name: targetUser.name ?? "there",
        granted: false,
        approvalType: row.approvalType,
      });
    }
  },
});

export const listMyApprovalAuthorities = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return [];
    const rows = await ctx.db.query("approvalAuthorities").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    return rows.filter((r) => r.status === "active");
  },
});

// Server-side helper: does `userId` hold ANY active authority for `approvalType`
// covering `amount` (if provided)? Used to gate decideApproval. Never call from
// the client — this is authorization logic, not presentation.
export async function hasApprovalAuthority(
  ctx: QueryCtx,
  userId: Id<"users">,
  approvalType: string,
  amount?: number,
): Promise<boolean> {
  const now = new Date().toISOString();
  const rows = await ctx.db
    .query("approvalAuthorities")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return rows.some((r) => {
    if (r.approvalType !== approvalType || r.status !== "active") return false;
    if (r.effectiveFrom > now) return false;
    if (r.effectiveTo && r.effectiveTo < now) return false;
    if (amount !== undefined) {
      if (r.minAmount !== undefined && amount < r.minAmount) return false;
      if (r.maxAmount !== undefined && amount > r.maxAmount) return false;
    }
    return true;
  });
}

// Whether ANY explicit authority has been configured for this approval type at
// all. If none exist, IAM has not been configured for that type yet, so we
// fall back to the legacy staff gate rather than locking everyone out.
export async function isApprovalTypeGoverned(ctx: QueryCtx, approvalType: string): Promise<boolean> {
  const rows = await ctx.db.query("approvalAuthorities").withIndex("by_type", (q) => q.eq("approvalType", approvalType)).take(1);
  return rows.length > 0;
}
