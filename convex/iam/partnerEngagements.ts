import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel.js";
import { internal } from "../_generated/api.js";
import { requireIamAdmin } from "./roles.ts";
import { logAudit } from "../taskboard.ts";

// ══════════════════════════════════════════════════════════════════════════
// EXTERNAL STRATEGIC PARTNER ENGAGEMENTS
// Time-bound, advisory/functional-only relationships (e.g. GRBS). A partner
// engagement is NEVER a permanent organisational node — it has no
// directorate/department/unit/position of its own, and any alignment it
// has to the org structure is always "advisory_functional", never
// "reporting". Named `partnerEngagements` module (not `partners.ts`, which
// is the existing, unrelated Partner Program feature for sales referral
// partners) to avoid any collision with that existing module.
// ══════════════════════════════════════════════════════════════════════════

function nowIso(): string {
  return new Date().toISOString();
}

async function logEngagementHistory(
  ctx: MutationCtx,
  engagementId: Id<"partnerEngagements">,
  action: string,
  fromStatus: string | undefined,
  toStatus: string | undefined,
  detail: string | undefined,
  actorId: Id<"users"> | undefined,
) {
  await ctx.db.insert("partnerEngagementHistory", {
    engagementId,
    action,
    fromStatus,
    toStatus,
    detail,
    actorId,
    timestamp: nowIso(),
  });
  // Mirrored into the main Audit Log so external partner engagement changes
  // show up alongside every other administrative action in one place.
  const actor = actorId ? await ctx.db.get(actorId) : null;
  await logAudit(ctx, {
    action: action.includes("expired") || action.includes("terminated") ? "status_change" : "update",
    entity: "partner_engagements",
    entityId: engagementId,
    userId: actorId,
    userName: actor?.name,
    userRole: actor?.role,
    description: `Partner engagement ${action.replace(/_/g, " ")}${detail ? `: ${detail}` : ""}`,
    metadata: JSON.stringify({ fromStatus, toStatus }),
  });
}

// ── External Partners (the organisation Geodata is engaging with) ──────────

export const listExternalPartners = query({
  args: {},
  handler: async (ctx) => {
    await requireIamAdmin(ctx);
    return await ctx.db.query("externalPartners").collect();
  },
});

export const createExternalPartner = mutation({
  args: {
    name: v.string(),
    partnerType: v.string(),
    description: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"externalPartners">> => {
    const admin = await requireIamAdmin(ctx);
    const id = await ctx.db.insert("externalPartners", {
      ...args,
      status: "active",
      createdBy: admin._id,
    });
    await logAudit(ctx, {
      action: "create", entity: "external_partners", entityId: id, entityRef: args.name,
      userId: admin._id, userName: admin.name, userRole: admin.role,
      description: `Added external strategic partner "${args.name}"`, after: JSON.stringify(args),
    });
    return id;
  },
});

export const updateExternalPartner = mutation({
  args: {
    id: v.id("externalPartners"),
    name: v.optional(v.string()),
    partnerType: v.optional(v.string()),
    description: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireIamAdmin(ctx);
    const { id, ...patch } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ message: "Partner not found", code: "NOT_FOUND" });
    await ctx.db.patch(id, patch);
    await logAudit(ctx, {
      action: "update", entity: "external_partners", entityId: id, entityRef: existing.name,
      userId: admin._id, userName: admin.name, userRole: admin.role,
      description: `Updated external strategic partner "${existing.name}"`, before: JSON.stringify(existing), after: JSON.stringify(patch),
    });
    return null;
  },
});

// ── Partner Engagements (the time-bound relationship itself) ───────────────

export const listPartnerEngagements = query({
  args: { partnerId: v.optional(v.id("externalPartners")) },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    const engagements = args.partnerId
      ? await ctx.db.query("partnerEngagements").withIndex("by_partner", (q) => q.eq("partnerId", args.partnerId!)).collect()
      : await ctx.db.query("partnerEngagements").collect();

    const partners = await ctx.db.query("externalPartners").collect();
    const partnerById = new Map(partners.map((p) => [p._id, p]));

    return engagements
      .sort((a, b) => b._creationTime - a._creationTime)
      .map((e) => ({ ...e, partnerName: partnerById.get(e.partnerId)?.name ?? "Unknown partner" }));
  },
});

export const getPartnerEngagement = query({
  args: { id: v.id("partnerEngagements") },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    const engagement = await ctx.db.get(args.id);
    if (!engagement) return null;
    const [partner, alignments, history] = await Promise.all([
      ctx.db.get(engagement.partnerId),
      ctx.db.query("partnerAlignments").withIndex("by_engagement", (q) => q.eq("engagementId", args.id)).collect(),
      ctx.db.query("partnerEngagementHistory").withIndex("by_engagement", (q) => q.eq("engagementId", args.id)).order("desc").collect(),
    ]);

    const [directorates, departments, units, liaison, externalUser] = await Promise.all([
      ctx.db.query("directorates").collect(),
      ctx.db.query("departments").collect(),
      ctx.db.query("units").collect(),
      engagement.liaisonUserId ? ctx.db.get(engagement.liaisonUserId) : null,
      engagement.externalUserId ? ctx.db.get(engagement.externalUserId) : null,
    ]);
    const dirById = new Map(directorates.map((d) => [d._id, d.name]));
    const depById = new Map(departments.map((d) => [d._id, d.name]));
    const unitById = new Map(units.map((u) => [u._id, u.name]));

    return {
      engagement,
      partnerName: partner?.name ?? "Unknown partner",
      liaisonName: liaison?.name ?? liaison?.email,
      externalUserName: externalUser?.name ?? externalUser?.email,
      alignments: alignments.map((a) => ({
        ...a,
        directorateName: a.directorateId ? dirById.get(a.directorateId) : undefined,
        departmentName: a.departmentId ? depById.get(a.departmentId) : undefined,
        unitName: a.unitId ? unitById.get(a.unitId) : undefined,
      })),
      history,
    };
  },
});

export const createPartnerEngagement = mutation({
  args: {
    partnerId: v.id("externalPartners"),
    engagementType: v.string(),
    strategicScope: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    liaisonUserId: v.optional(v.id("users")),
    externalUserId: v.optional(v.id("users")),
    dashboardAccess: v.boolean(),
    documentAccess: v.boolean(),
    workflowAccess: v.boolean(),
    exportAccess: v.boolean(),
    isTemporary: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"partnerEngagements">> => {
    const admin = await requireIamAdmin(ctx);
    const partner = await ctx.db.get(args.partnerId);
    if (!partner) throw new ConvexError({ message: "Partner not found", code: "NOT_FOUND" });

    // Time-bound engagements MUST carry an end date — this is what keeps an
    // engagement from silently becoming a permanent fixture.
    if (args.isTemporary && !args.endDate) {
      throw new ConvexError({ message: "A temporary engagement requires an end date", code: "BAD_REQUEST" });
    }
    if (args.endDate && args.endDate < args.startDate) {
      throw new ConvexError({ message: "End date must be after the start date", code: "BAD_REQUEST" });
    }

    const { isTemporary: _isTemporary, ...rest } = args;
    const engagementId = await ctx.db.insert("partnerEngagements", {
      ...rest,
      status: "draft",
      approvalStatus: "pending",
      createdBy: admin._id,
    });

    await logEngagementHistory(ctx, engagementId, "created", undefined, "draft", `Engagement created for ${partner.name}`, admin._id);
    return engagementId;
  },
});

export const updatePartnerEngagementScope = mutation({
  args: {
    id: v.id("partnerEngagements"),
    engagementType: v.optional(v.string()),
    strategicScope: v.optional(v.string()),
    endDate: v.optional(v.string()),
    liaisonUserId: v.optional(v.id("users")),
    externalUserId: v.optional(v.id("users")),
    dashboardAccess: v.optional(v.boolean()),
    documentAccess: v.optional(v.boolean()),
    workflowAccess: v.optional(v.boolean()),
    exportAccess: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireIamAdmin(ctx);
    const { id, ...patch } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ message: "Engagement not found", code: "NOT_FOUND" });
    if (patch.endDate && patch.endDate < existing.startDate) {
      throw new ConvexError({ message: "End date must be after the start date", code: "BAD_REQUEST" });
    }

    await ctx.db.patch(id, patch);
    await logEngagementHistory(ctx, id, "scope_changed", existing.status, existing.status, "Engagement scope or access updated", admin._id);
    return null;
  },
});

// Explicit lifecycle transitions — every status change is logged, and moving
// to "active" is the only transition that requires an approval decision to
// already be recorded (approvalStatus === "approved"), keeping the approval
// step meaningful rather than implicit.
const ENGAGEMENT_STATUSES = ["draft", "pending_approval", "active", "suspended", "expired", "terminated", "completed"] as const;

export const transitionPartnerEngagement = mutation({
  args: {
    id: v.id("partnerEngagements"),
    toStatus: v.union(...ENGAGEMENT_STATUSES.map((s) => v.literal(s))),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireIamAdmin(ctx);
    const engagement = await ctx.db.get(args.id);
    if (!engagement) throw new ConvexError({ message: "Engagement not found", code: "NOT_FOUND" });

    if (args.toStatus === "active" && engagement.approvalStatus !== "approved") {
      throw new ConvexError({ message: "Engagement must be approved before it can be activated", code: "FORBIDDEN" });
    }
    if (["expired", "terminated", "completed"].includes(engagement.status)) {
      throw new ConvexError({ message: "This engagement has already ended and cannot change status", code: "BAD_REQUEST" });
    }

    const patch: Record<string, unknown> = { status: args.toStatus };
    if (args.toStatus === "terminated" && args.detail) patch.terminatedReason = args.detail;

    await ctx.db.patch(args.id, patch);

    const actionByStatus: Record<string, string> = {
      pending_approval: "submitted_for_approval",
      active: "activated",
      suspended: "suspended",
      expired: "expired",
      terminated: "terminated",
      completed: "completed",
      draft: "reverted_to_draft",
    };
    await logEngagementHistory(ctx, args.id, actionByStatus[args.toStatus] ?? args.toStatus, engagement.status, args.toStatus, args.detail, admin._id);

    if (args.toStatus === "pending_approval") {
      const partner = await ctx.db.get(engagement.partnerId);
      const [emails, phones] = await Promise.all([
        ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
        ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      ]);
      await ctx.scheduler.runAfter(0, internal.emails.sendPartnerEngagementSubmittedEmail, {
        to: emails,
        adminPhones: phones,
        partnerName: partner?.name ?? "Unknown partner",
        engagementType: engagement.engagementType,
      });
    }
    return null;
  },
});

export const decidePartnerEngagementApproval = mutation({
  args: {
    id: v.id("partnerEngagements"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireIamAdmin(ctx);
    const engagement = await ctx.db.get(args.id);
    if (!engagement) throw new ConvexError({ message: "Engagement not found", code: "NOT_FOUND" });

    await ctx.db.patch(args.id, {
      approvalStatus: args.decision,
      approvedBy: admin._id,
      approvedAt: nowIso(),
    });
    await logEngagementHistory(ctx, args.id, args.decision === "approved" ? "approval_granted" : "approval_rejected", engagement.status, engagement.status, undefined, admin._id);

    if (engagement.liaisonUserId) {
      const [liaison, partner] = await Promise.all([
        ctx.db.get(engagement.liaisonUserId),
        ctx.db.get(engagement.partnerId),
      ]);
      if (liaison?.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendPartnerEngagementDecisionEmail, {
          to: liaison.email,
          phone: liaison.phone,
          name: liaison.name ?? "there",
          partnerName: partner?.name ?? "Unknown partner",
          approved: args.decision === "approved",
        });
      }
    }
    return null;
  },
});

export const extendPartnerEngagement = mutation({
  args: { id: v.id("partnerEngagements"), newEndDate: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireIamAdmin(ctx);
    const engagement = await ctx.db.get(args.id);
    if (!engagement) throw new ConvexError({ message: "Engagement not found", code: "NOT_FOUND" });
    if (args.newEndDate < engagement.startDate) {
      throw new ConvexError({ message: "New end date must be after the start date", code: "BAD_REQUEST" });
    }

    await ctx.db.patch(args.id, { endDate: args.newEndDate });
    await logEngagementHistory(ctx, args.id, "extended", engagement.status, engagement.status, `End date extended to ${args.newEndDate}`, admin._id);
    return null;
  },
});

// Sweeps active/pending engagements whose end date has passed and marks them
// expired. Bounded, idempotent, safe to run repeatedly (e.g. from a cron or
// on-demand from the admin UI) — mirrors the sweep pattern already used by
// temporaryAccess.ts.
export const sweepExpiredEngagements = mutation({
  args: {},
  handler: async (ctx): Promise<{ expired: number }> => {
    const today = nowIso().slice(0, 10);
    const candidates = await ctx.db
      .query("partnerEngagements")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    let expired = 0;
    for (const e of candidates) {
      if (e.endDate && e.endDate < today) {
        await ctx.db.patch(e._id, { status: "expired" });
        await logEngagementHistory(ctx, e._id, "expired", "active", "expired", "Automatically expired: end date passed", undefined);
        expired++;

        const partner = await ctx.db.get(e.partnerId);
        const liaison = e.liaisonUserId ? await ctx.db.get(e.liaisonUserId) : null;
        const [emails, phones] = await Promise.all([
          ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
          ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
        ]);
        await ctx.scheduler.runAfter(0, internal.emails.sendPartnerEngagementExpiryEmail, {
          to: emails,
          adminPhones: phones,
          liaisonEmail: liaison?.email,
          liaisonPhone: liaison?.phone,
          liaisonName: liaison?.name,
          partnerName: partner?.name ?? "Unknown partner",
          endDate: e.endDate,
          alreadyExpired: true,
        });
      }
    }
    return { expired };
  },
});

// ── Alignments (advisory/functional only — NEVER a permanent org node) ─────

export const listPartnerAlignments = query({
  args: { engagementId: v.id("partnerEngagements") },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    return await ctx.db.query("partnerAlignments").withIndex("by_engagement", (q) => q.eq("engagementId", args.engagementId)).collect();
  },
});

export const addPartnerAlignment = mutation({
  args: {
    engagementId: v.id("partnerEngagements"),
    alignmentType: v.union(v.literal("directorate"), v.literal("department"), v.literal("unit"), v.literal("project"), v.literal("programme")),
    directorateId: v.optional(v.id("directorates")),
    departmentId: v.optional(v.id("departments")),
    unitId: v.optional(v.id("units")),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"partnerAlignments">> => {
    const admin = await requireIamAdmin(ctx);
    const engagement = await ctx.db.get(args.engagementId);
    if (!engagement) throw new ConvexError({ message: "Engagement not found", code: "NOT_FOUND" });

    if (args.alignmentType === "directorate" && !args.directorateId) {
      throw new ConvexError({ message: "Select a directorate for a directorate alignment", code: "BAD_REQUEST" });
    }
    if (args.alignmentType === "department" && !args.departmentId) {
      throw new ConvexError({ message: "Select a department for a department alignment", code: "BAD_REQUEST" });
    }
    if (args.alignmentType === "unit" && !args.unitId) {
      throw new ConvexError({ message: "Select a unit for a unit alignment", code: "BAD_REQUEST" });
    }
    if ((args.alignmentType === "project" || args.alignmentType === "programme") && !args.label) {
      throw new ConvexError({ message: "Provide a name for the project/programme alignment", code: "BAD_REQUEST" });
    }

    const alignmentId = await ctx.db.insert("partnerAlignments", {
      ...args,
      // Always advisory/functional — an alignment is a dotted-line, never a
      // reporting relationship, and this is never accepted as user input.
      relationshipKind: "advisory_functional",
    });
    await logEngagementHistory(ctx, args.engagementId, "scope_changed", engagement.status, engagement.status, "Advisory/functional alignment added", admin._id);
    return alignmentId;
  },
});

export const removePartnerAlignment = mutation({
  args: { id: v.id("partnerAlignments") },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireIamAdmin(ctx);
    const alignment = await ctx.db.get(args.id);
    if (!alignment) throw new ConvexError({ message: "Alignment not found", code: "NOT_FOUND" });
    await ctx.db.delete(args.id);
    await logEngagementHistory(ctx, alignment.engagementId, "scope_changed", undefined, undefined, "Advisory/functional alignment removed", admin._id);
    return null;
  },
});

// ── Self-service: the External/Restricted account's own engagement ─────────
// No requireIamAdmin gate — this is the one partner-engagement read every
// signed-in account may call for itself, scoped strictly to the engagement(s)
// where `externalUserId` matches the caller. Used by the External/Restricted
// dashboard widget to show its own Advisory/Functional Alignment, status, and
// scope — never any other engagement's data.
export type MyPartnerEngagement = {
  partnerName: string;
  engagementType: string;
  status: string;
  strategicScope?: string;
  startDate: string;
  endDate?: string;
  alignments: Array<{ alignmentType: string; name: string }>;
};

export async function getMyPartnerEngagementForUser(ctx: QueryCtx, userId: Id<"users">): Promise<MyPartnerEngagement | null> {
  const engagements = await ctx.db
    .query("partnerEngagements")
    .withIndex("by_externalUser", (q) => q.eq("externalUserId", userId))
    .collect();
  if (engagements.length === 0) return null;
  // Prefer an active engagement if the account has more than one; otherwise
  // fall back to the most recently created.
  const engagement = engagements.find((e) => e.status === "active")
    ?? engagements.sort((a, b) => b._creationTime - a._creationTime)[0];

  const [partner, alignments, directorates, departments, units] = await Promise.all([
    ctx.db.get(engagement.partnerId),
    ctx.db.query("partnerAlignments").withIndex("by_engagement", (q) => q.eq("engagementId", engagement._id)).collect(),
    ctx.db.query("directorates").collect(),
    ctx.db.query("departments").collect(),
    ctx.db.query("units").collect(),
  ]);
  const dirById = new Map(directorates.map((d) => [d._id, d.name]));
  const depById = new Map(departments.map((d) => [d._id, d.name]));
  const unitById = new Map(units.map((u) => [u._id, u.name]));

  return {
    partnerName: partner?.name ?? "Unknown partner",
    engagementType: engagement.engagementType,
    status: engagement.status,
    strategicScope: engagement.strategicScope,
    startDate: engagement.startDate,
    endDate: engagement.endDate,
    alignments: alignments.map((a) => ({
      alignmentType: a.alignmentType,
      name: (a.directorateId ? dirById.get(a.directorateId) : undefined)
        ?? (a.departmentId ? depById.get(a.departmentId) : undefined)
        ?? (a.unitId ? unitById.get(a.unitId) : undefined)
        ?? a.label
        ?? "—",
    })),
  };
}

export const getMyPartnerEngagement = query({
  args: {},
  handler: async (ctx): Promise<MyPartnerEngagement | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;
    return await getMyPartnerEngagementForUser(ctx, user._id);
  },
});
