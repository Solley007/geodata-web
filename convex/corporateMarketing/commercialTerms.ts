import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";
import { recomputeAcquisitionRollups } from "./bulkAcquisitions.ts";
import { recordException, syncExceptionFromApproval } from "./exceptions.ts";

// ══════════════════════════════════════════════════════════════════════════
// Commercial terms — versioned commercial-terms proposals for a bulk
// acquisition (Institutional / Bulk Acquisition Management enhancement,
// spec sections 10-11). Every proposal inserts a brand-new
// corporateCommercialTerms row — never patches an existing one — so the
// full negotiation history stays intact. A discount above the configured
// threshold routes through the EXISTING approvals table (same table used by
// letters.ts/proposals.ts/negotiations.ts — never a second approval engine)
// and can only be decided by whoever holds explicit approval authority
// (enforced centrally by taskboard.decideApproval), never by the requesting
// officer themselves, regardless of role.
// ══════════════════════════════════════════════════════════════════════════

export const DISCOUNT_APPROVAL_TYPE = "corporate_commercial_terms_discount";
const DISCOUNT_THRESHOLD_KEY = "corporate_marketing_discount_threshold_percent";

// ── Configurable discount approval threshold (percent) ─────────────────────
// Defaults to 0 — i.e. ANY discount requires approval — until an
// administrator explicitly raises it. Never hard-coded so the business can
// tune it without a code change.
export const getDiscountApprovalThreshold = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", DISCOUNT_THRESHOLD_KEY)).first();
    return row ? Number(row.value) : 0;
  },
});

export const setDiscountApprovalThreshold = mutation({
  args: { thresholdPercent: v.number() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.manage", { requireEnabled: false });
    if (args.thresholdPercent < 0 || args.thresholdPercent > 100) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Threshold must be between 0 and 100" });
    }
    const existing = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", DISCOUNT_THRESHOLD_KEY)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: String(args.thresholdPercent) });
    } else {
      await ctx.db.insert("siteSettings", { key: DISCOUNT_THRESHOLD_KEY, value: String(args.thresholdPercent) });
    }
    await logAudit(ctx, {
      action: "update", entity: "site_settings", entityRef: DISCOUNT_THRESHOLD_KEY,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Set commercial-terms discount approval threshold to ${args.thresholdPercent}%`,
    });
  },
});

async function assertAcquisitionVisible(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  id: Id<"corporateBulkAcquisitions">,
): Promise<Doc<"corporateBulkAcquisitions">> {
  const acq = await ctx.db.get(id);
  if (!acq) throw new ConvexError({ code: "NOT_FOUND", message: "Bulk acquisition not found" });
  const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
  const [visible] = await filterByScope(ctx, [acq], scope, (a) => a.assignedOfficer ?? a.relationshipOwner);
  if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this bulk acquisition" });
  return acq;
}

async function nextApprovalRef(ctx: Parameters<typeof requirePermission>[0]): Promise<string> {
  const last = await ctx.db.query("approvals").order("desc").first();
  const n = last ? parseInt(last.approvalRef.replace("GWS-APR-", "") || "0", 10) + 1 : 1;
  return `GWS-APR-${String(n).padStart(4, "0")}`;
}

export const listCommercialTerms = query({
  args: { bulkAcquisitionId: v.id("corporateBulkAcquisitions") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");
    await assertAcquisitionVisible(ctx, user, args.bulkAcquisitionId);

    const rows = await ctx.db.query("corporateCommercialTerms").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", args.bulkAcquisitionId)).order("desc").collect();

    const approvalIds = new Set(rows.map((r) => r.approvalId).filter((v): v is Id<"approvals"> => !!v));
    const approvals = await Promise.all(Array.from(approvalIds).map((id) => ctx.db.get(id)));
    const approvalStatusById = new Map<Id<"approvals">, string>();
    for (const a of approvals) if (a) approvalStatusById.set(a._id, a.status);

    return rows
      .sort((a, b) => b.version - a.version)
      .map((r) => ({ ...r, approvalStatus: r.approvalId ? approvalStatusById.get(r.approvalId) : undefined }));
  },
});

export const getActiveCommercialTerms = query({
  args: { bulkAcquisitionId: v.id("corporateBulkAcquisitions") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_view");
    await assertAcquisitionVisible(ctx, user, args.bulkAcquisitionId);
    const rows = await ctx.db.query("corporateCommercialTerms").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", args.bulkAcquisitionId)).collect();
    return rows.find((r) => r.status === "active") ?? null;
  },
});

const TERMS_FIELDS = {
  totalUnits: v.optional(v.number()),
  totalPlots: v.optional(v.number()),
  pricePerUnit: v.optional(v.number()),
  totalContractValue: v.optional(v.number()),
  discountPercent: v.optional(v.number()),
  discountAmount: v.optional(v.number()),
  discountJustification: v.optional(v.string()),
  depositPercent: v.optional(v.number()),
  depositAmount: v.optional(v.number()),
  instalmentStructure: v.optional(v.string()),
  instalmentFrequency: v.optional(v.union(v.literal("monthly"), v.literal("quarterly"), v.literal("biannually"), v.literal("annually"), v.literal("custom"))),
  instalmentDurationMonths: v.optional(v.number()),
  gracePeriodDays: v.optional(v.number()),
  allocationConditions: v.optional(v.string()),
  completionConditions: v.optional(v.string()),
  offTakeTerms: v.optional(v.string()),
  agreementConditions: v.optional(v.string()),
  specialTerms: v.optional(v.string()),
  notes: v.optional(v.string()),
};

// Proposes a new commercial-terms version. If the discount exceeds the
// configured threshold, the version is created as "pending_approval" and a
// real approvals row is created — it can NOT become active until that
// approval is decided, no matter who proposed it or what role they hold.
export const proposeCommercialTerms = mutation({
  args: { bulkAcquisitionId: v.id("corporateBulkAcquisitions"), ...TERMS_FIELDS },
  handler: async (ctx, args): Promise<Id<"corporateCommercialTerms">> => {
    const user = await requirePermission(ctx, "corporate_marketing.terms_manage");
    const { bulkAcquisitionId, ...fields } = args;
    const acq = await assertAcquisitionVisible(ctx, user, bulkAcquisitionId);

    if (fields.discountPercent !== undefined && (fields.discountPercent < 0 || fields.discountPercent > 100)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Discount percent must be between 0 and 100" });
    }

    const existingVersions = await ctx.db.query("corporateCommercialTerms").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", bulkAcquisitionId)).collect();
    const latest = existingVersions.sort((a, b) => b.version - a.version)[0];
    const nextVersion = (latest?.version ?? 0) + 1;

    const thresholdRow = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", DISCOUNT_THRESHOLD_KEY)).first();
    const threshold = thresholdRow ? Number(thresholdRow.value) : 0;
    const discountPercent = fields.discountPercent ?? 0;
    const approvalRequired = discountPercent > threshold;

    const id = await ctx.db.insert("corporateCommercialTerms", {
      bulkAcquisitionId,
      version: nextVersion,
      supersedes: latest?._id,
      status: approvalRequired ? "pending_approval" : "draft",
      ...fields,
      approvalRequired,
      proposedBy: user._id,
      proposedAt: new Date().toISOString(),
    });

    let approvalId: Id<"approvals"> | undefined;
    if (approvalRequired) {
      const approvalRef = await nextApprovalRef(ctx);
      approvalId = await ctx.db.insert("approvals", {
        approvalRef,
        approvalType: DISCOUNT_APPROVAL_TYPE,
        status: "pending",
        priority: discountPercent >= 25 ? "high" : "medium",
        summary: `Approve ${discountPercent}% discount on commercial terms v${nextVersion} for "${acq.name}"`,
        relatedRef: acq.acquisitionRef,
        requestedBy: user._id,
        requestedAt: new Date().toISOString(),
      });
      await ctx.db.patch(id, { approvalId });
      await recordException(ctx, {
        bulkAcquisitionId,
        exceptionType: "discount",
        reason: fields.discountJustification || `${discountPercent}% discount exceeds the ${threshold}% approval threshold`,
        requestedBy: user._id,
        approvalId,
        relatedRef: `Commercial Terms v${nextVersion}`,
      });
    }

    await logAudit(ctx, {
      action: "propose", entity: "corporate_commercial_terms", entityId: id, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Proposed commercial terms v${nextVersion} for bulk acquisition "${acq.name}"${approvalRequired ? ` — requires approval (${discountPercent}% discount)` : ""}`,
    });

    return id;
  },
});

// Activates a draft version that never needed approval (no discount beyond
// threshold) — supersedes whichever version is currently active, if any.
export const activateCommercialTerms = mutation({
  args: { id: v.id("corporateCommercialTerms") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.terms_manage");
    const version = await ctx.db.get(args.id);
    if (!version) throw new ConvexError({ code: "NOT_FOUND", message: "Commercial terms version not found" });
    const acq = await assertAcquisitionVisible(ctx, user, version.bulkAcquisitionId);

    if (version.status !== "draft") {
      throw new ConvexError({ code: "CONFLICT", message: "Only a draft version awaiting no approval can be activated directly" });
    }

    const siblings = await ctx.db.query("corporateCommercialTerms").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", version.bulkAcquisitionId)).collect();
    const currentActive = siblings.find((s) => s.status === "active");
    if (currentActive) await ctx.db.patch(currentActive._id, { status: "superseded" });

    await ctx.db.patch(args.id, { status: "active", activatedAt: new Date().toISOString() });
    await recomputeAcquisitionRollups(ctx, version.bulkAcquisitionId);

    await logAudit(ctx, {
      action: "activate", entity: "corporate_commercial_terms", entityId: args.id, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Activated commercial terms v${version.version} for bulk acquisition "${acq.name}"`,
    });
  },
});

// Reflects a decision already made on the linked `approvals` record (via
// taskboard.decideApproval, which enforces explicit approval authority) —
// call that first, then this to sync the terms version and, on approval,
// activate it in the same step. Matches decideLetterApproval /
// decideNegotiationApproval / decideProposalApproval exactly.
export const decideCommercialTermsApproval = mutation({
  args: {
    id: v.id("corporateCommercialTerms"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    decisionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acquisition_approve");
    const version = await ctx.db.get(args.id);
    if (!version) throw new ConvexError({ code: "NOT_FOUND", message: "Commercial terms version not found" });
    const acq = await assertAcquisitionVisible(ctx, user, version.bulkAcquisitionId);

    if (version.status !== "pending_approval") {
      throw new ConvexError({ code: "CONFLICT", message: "Only a version pending approval can be decided" });
    }
    if (version.proposedBy === user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "The requesting officer cannot decide their own commercial terms proposal" });
    }

    if (version.approvalId) {
      const approval = await ctx.db.get(version.approvalId);
      if (approval && approval.status === "pending") {
        await ctx.db.patch(version.approvalId, {
          status: args.decision,
          decision: args.decision,
          decisionNote: args.decisionNote,
          decisionBy: user._id,
          decisionAt: new Date().toISOString(),
        });
      }
      await syncExceptionFromApproval(ctx, version.approvalId, args.decision, user._id);
    }

    await ctx.db.patch(args.id, {
      status: args.decision === "approved" ? "active" : "rejected",
      decidedBy: user._id,
      decidedAt: new Date().toISOString(),
      decisionNote: args.decisionNote,
      activatedAt: args.decision === "approved" ? new Date().toISOString() : undefined,
    });

    if (args.decision === "approved") {
      const siblings = await ctx.db.query("corporateCommercialTerms").withIndex("by_acquisition", (q) => q.eq("bulkAcquisitionId", version.bulkAcquisitionId)).collect();
      const currentActive = siblings.find((s) => s.status === "active" && s._id !== args.id);
      if (currentActive) await ctx.db.patch(currentActive._id, { status: "superseded" });
      await recomputeAcquisitionRollups(ctx, version.bulkAcquisitionId);
    }

    await logAudit(ctx, {
      action: args.decision === "approved" ? "approve" : "reject",
      entity: "corporate_commercial_terms", entityId: args.id, entityRef: acq.acquisitionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `${args.decision === "approved" ? "Approved" : "Rejected"} commercial terms v${version.version} for bulk acquisition "${acq.name}"${args.decisionNote ? ` — ${args.decisionNote}` : ""}`,
    });
  },
});
