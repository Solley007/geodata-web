import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api.js";
import { requireIamAdmin } from "./roles.ts";
import { hasApprovalAuthority } from "./approvalAuthority.ts";
import { logAudit } from "../taskboard.ts";
import { tokenOf } from "../authIdentity";

// ── Temporary access grants (auto-expiring) ─────────────────────────────────
// Grants a role, permission, or data scope for a bounded window. Expiry is
// enforced lazily (checked whenever access is evaluated) and swept by
// `sweepExpiredAccess`, which any IAM admin action can trigger — no cron
// required for correctness, since every read also checks `endAt`.

export const listTemporaryAccess = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    if (args.userId) {
      return await ctx.db.query("temporaryAccess").withIndex("by_user", (q) => q.eq("userId", args.userId!)).collect();
    }
    return await ctx.db.query("temporaryAccess").order("desc").take(300);
  },
});

export const grantTemporaryAccess = mutation({
  args: {
    userId: v.id("users"),
    accessType: v.union(v.literal("role"), v.literal("permission"), v.literal("scope")),
    grantedKey: v.string(),
    reason: v.string(),
    startAt: v.string(),
    endAt: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    if (args.endAt <= args.startAt) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "End date must be after start date" });
    }
    const id = await ctx.db.insert("temporaryAccess", {
      ...args,
      grantedBy: me._id,
      status: "active",
    });
    const targetUser = await ctx.db.get(args.userId);
    await logAudit(ctx, {
      action: "create", entity: "temporary_access", entityId: id, entityRef: args.grantedKey,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Granted temporary ${args.accessType} "${args.grantedKey}" to ${targetUser?.name ?? "user"} until ${args.endAt}`,
      after: JSON.stringify(args),
    });
    if (targetUser?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendTemporaryAccessGrantedEmail, {
        to: targetUser.email,
        phone: targetUser.phone,
        name: targetUser.name ?? "there",
        accessType: args.accessType,
        grantedKey: args.grantedKey,
        endAt: args.endAt,
      });
    }
    return id;
  },
});

export const revokeTemporaryAccess = mutation({
  args: { id: v.id("temporaryAccess") },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", message: "Grant not found" });
    await ctx.db.patch(args.id, { status: "revoked", revokedBy: me._id, revokedAt: new Date().toISOString() });
    await logAudit(ctx, {
      action: "update", entity: "temporary_access", entityId: args.id, entityRef: row.grantedKey,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Revoked temporary ${row.accessType} "${row.grantedKey}"`,
      before: JSON.stringify(row),
    });
  },
});

// Marks any temporary access past its `endAt` as expired. Safe to call
// repeatedly; only touches rows that are still "active" and past expiry, so
// the per-call write volume is bounded to genuinely newly-expired rows.
export const sweepExpiredAccess = mutation({
  args: {},
  handler: async (ctx): Promise<{ expired: number }> => {
    await requireIamAdmin(ctx);
    const now = new Date().toISOString();
    const active = await ctx.db.query("temporaryAccess").withIndex("by_status", (q) => q.eq("status", "active")).collect();
    let expired = 0;
    for (const row of active) {
      if (row.endAt < now) {
        await ctx.db.patch(row._id, { status: "expired" });
        expired++;
        const targetUser = await ctx.db.get(row.userId);
        if (targetUser?.email) {
          await ctx.scheduler.runAfter(0, internal.emails.sendTemporaryAccessExpiryEmail, {
            to: targetUser.email,
            phone: targetUser.phone,
            name: targetUser.name ?? "there",
            grantedKey: row.grantedKey,
            endAt: row.endAt,
            alreadyExpired: true,
          });
        }
      }
    }
    return { expired };
  },
});

export const listMyActiveTemporaryAccess = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
    if (!user) return [];
    const now = new Date().toISOString();
    const rows = await ctx.db.query("temporaryAccess").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    return rows.filter((r) => r.status === "active" && r.startAt <= now && r.endAt >= now);
  },
});

// ── Approval delegation (time-bound; delegate authority ≤ delegator authority) ─
export const listApprovalDelegations = query({
  args: { delegatorId: v.optional(v.id("users")), delegateId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    if (args.delegatorId) {
      return await ctx.db.query("approvalDelegations").withIndex("by_delegator", (q) => q.eq("delegatorId", args.delegatorId!)).collect();
    }
    if (args.delegateId) {
      return await ctx.db.query("approvalDelegations").withIndex("by_delegate", (q) => q.eq("delegateId", args.delegateId!)).collect();
    }
    return await ctx.db.query("approvalDelegations").order("desc").take(300);
  },
});

export const createApprovalDelegation = mutation({
  args: {
    delegatorId: v.id("users"),
    delegateId: v.id("users"),
    approvalType: v.string(),
    scopeNote: v.optional(v.string()),
    maxAmount: v.optional(v.number()),
    reason: v.string(),
    startAt: v.string(),
    endAt: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    if (args.delegatorId === args.delegateId) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "A user cannot delegate approval authority to themselves" });
    }
    if (args.endAt <= args.startAt) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "End date must be after start date" });
    }

    // The delegate's authority may never exceed the delegator's own authority.
    // If the delegator holds no explicit authority for this type at all, the
    // delegation cannot be created — there is nothing to delegate.
    const delegatorHasAuthority = await hasApprovalAuthority(ctx, args.delegatorId, args.approvalType);
    if (!delegatorHasAuthority) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "The delegator does not hold active approval authority for this type",
      });
    }
    if (args.maxAmount !== undefined) {
      const delegatorAuthorities = await ctx.db
        .query("approvalAuthorities")
        .withIndex("by_user", (q) => q.eq("userId", args.delegatorId))
        .collect();
      const applicable = delegatorAuthorities.filter((a) => a.approvalType === args.approvalType && a.status === "active");
      const delegatorMax = applicable.reduce<number | undefined>((max, a) => {
        if (a.maxAmount === undefined) return max; // unlimited authority covers any delegated cap
        return max === undefined ? a.maxAmount : Math.max(max, a.maxAmount);
      }, undefined);
      if (delegatorMax !== undefined && args.maxAmount > delegatorMax) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: `Delegated amount cannot exceed the delegator's own authority (₦${delegatorMax.toLocaleString()})`,
        });
      }
    }

    const id = await ctx.db.insert("approvalDelegations", {
      ...args,
      status: "active",
      authorizedBy: me._id,
    });
    const delegate = await ctx.db.get(args.delegateId);
    const delegator = await ctx.db.get(args.delegatorId);
    await logAudit(ctx, {
      action: "create", entity: "approval_delegations", entityId: id, entityRef: args.approvalType,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Created approval delegation for "${args.approvalType}" to ${delegate?.name ?? "user"} until ${args.endAt}`,
      after: JSON.stringify(args),
    });
    if (delegate?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendApprovalDelegationEmail, {
        to: delegate.email,
        phone: delegate.phone,
        name: delegate.name ?? "there",
        isDelegate: true,
        started: true,
        counterpartName: delegator?.name ?? "a colleague",
        approvalType: args.approvalType,
        endAt: args.endAt,
      });
    }
    if (delegator?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendApprovalDelegationEmail, {
        to: delegator.email,
        phone: delegator.phone,
        name: delegator.name ?? "there",
        isDelegate: false,
        started: true,
        counterpartName: delegate?.name ?? "a colleague",
        approvalType: args.approvalType,
        endAt: args.endAt,
      });
    }
    return id;
  },
});

export const revokeApprovalDelegation = mutation({
  args: { id: v.id("approvalDelegations") },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", message: "Delegation not found" });
    await ctx.db.patch(args.id, { status: "revoked" });
    await logAudit(ctx, {
      action: "update", entity: "approval_delegations", entityId: args.id, entityRef: row.approvalType,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Revoked approval delegation for "${row.approvalType}"`,
      before: JSON.stringify(row),
    });
    const [delegate, delegator] = await Promise.all([ctx.db.get(row.delegateId), ctx.db.get(row.delegatorId)]);
    if (delegate?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendApprovalDelegationEmail, {
        to: delegate.email, phone: delegate.phone, name: delegate.name ?? "there",
        isDelegate: true, started: false, counterpartName: delegator?.name ?? "a colleague", approvalType: row.approvalType,
      });
    }
    if (delegator?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendApprovalDelegationEmail, {
        to: delegator.email, phone: delegator.phone, name: delegator.name ?? "there",
        isDelegate: false, started: false, counterpartName: delegate?.name ?? "a colleague", approvalType: row.approvalType,
      });
    }
  },
});

export async function sweepExpiredDelegations(ctx: MutationCtx): Promise<number> {
  const now = new Date().toISOString();
  const active = await ctx.db.query("approvalDelegations").withIndex("by_status", (q) => q.eq("status", "active")).collect();
  let count = 0;
  for (const row of active) {
    if (row.endAt < now) {
      await ctx.db.patch(row._id, { status: "expired" });
      count++;
    }
  }
  return count;
}

export const sweepExpiredDelegationsMutation = mutation({
  args: {},
  handler: async (ctx): Promise<{ expired: number }> => {
    await requireIamAdmin(ctx);
    const expired = await sweepExpiredDelegations(ctx);
    return { expired };
  },
});

// ── Access reviews ───────────────────────────────────────────────────────────
export const listAccessReviews = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    const rows = args.userId
      ? await ctx.db.query("accessReviews").withIndex("by_user", (q) => q.eq("userId", args.userId!)).collect()
      : await ctx.db.query("accessReviews").order("desc").take(300);
    return await Promise.all(
      rows.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        const reviewer = await ctx.db.get(r.reviewedBy);
        return { ...r, userName: user?.name ?? "Unknown user", reviewerName: reviewer?.name ?? "Unknown reviewer" };
      })
    );
  },
});

export const recordAccessReview = mutation({
  args: {
    userId: v.id("users"),
    scopeReviewed: v.string(),
    outcome: v.union(v.literal("confirmed"), v.literal("modified"), v.literal("revoked"), v.literal("flagged")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const id = await ctx.db.insert("accessReviews", {
      ...args,
      reviewedBy: me._id,
      reviewedAt: new Date().toISOString(),
    });
    const targetUser = await ctx.db.get(args.userId);
    await logAudit(ctx, {
      action: "review", entity: "access_reviews", entityId: id,
      userId: me._id, userName: me.name, userRole: me.role,
      description: `Reviewed access for ${targetUser?.name ?? "user"}: ${args.outcome}`,
      metadata: JSON.stringify(args),
    });
    // A "flagged" outcome means the review itself surfaced a concern that
    // needs administrator follow-up — notify the wider admin/manager team,
    // not just whoever performed this specific review.
    if (args.outcome === "flagged") {
      const [emails, phones] = await Promise.all([
        ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
        ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      ]);
      await ctx.scheduler.runAfter(0, internal.emails.sendAccessReviewDueEmail, {
        to: emails,
        adminPhones: phones,
        userName: targetUser?.name ?? "a user",
        reason: args.notes ?? `Access review for scope "${args.scopeReviewed}" was flagged for follow-up.`,
      });
    }
    return id;
  },
});
