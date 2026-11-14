import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";
import { nextProposalRef } from "./refs.ts";

// ══════════════════════════════════════════════════════════════════════════
// Proposals / offers — prepare, submit for internal approval, and track a
// commercial proposal through to the corporate organisation's decision.
// The proposal document lives in the EXISTING vaultDocuments table; internal
// approval routes through the EXISTING approvals table — never a second
// approval engine. Negotiation of specific terms happens in negotiations.ts.
// ══════════════════════════════════════════════════════════════════════════

function getOpportunityOwnerId(opp: Doc<"corporateOpportunities">): Id<"users"> | null | undefined {
  return opp.assignedOfficer ?? opp.relationshipOwner;
}

async function assertOpportunityVisible(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  opportunityId: Id<"corporateOpportunities">,
): Promise<Doc<"corporateOpportunities">> {
  const opp = await ctx.db.get(opportunityId);
  if (!opp) throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found" });
  const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
  const [visible] = await filterByScope(ctx, [opp], scope, getOpportunityOwnerId);
  if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this opportunity" });
  return opp;
}

async function assertProposalVisible(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  id: Id<"corporateProposals">,
): Promise<{ proposal: Doc<"corporateProposals">; opp: Doc<"corporateOpportunities"> }> {
  const proposal = await ctx.db.get(id);
  if (!proposal) throw new ConvexError({ code: "NOT_FOUND", message: "Proposal not found" });
  const opp = await assertOpportunityVisible(ctx, user, proposal.opportunityId);
  return { proposal, opp };
}

async function nextApprovalRef(ctx: Parameters<typeof requirePermission>[0]): Promise<string> {
  const last = await ctx.db.query("approvals").order("desc").first();
  const n = last ? parseInt(last.approvalRef.replace("GWS-APR-", "") || "0", 10) + 1 : 1;
  return `GWS-APR-${String(n).padStart(4, "0")}`;
}

export const listProposals = query({
  args: { opportunityId: v.id("corporateOpportunities") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    await assertOpportunityVisible(ctx, user, args.opportunityId);

    const rows = await ctx.db.query("corporateProposals").withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId)).order("desc").collect();

    const approvalIds = new Set(rows.map((r) => r.approvalId).filter((v): v is Id<"approvals"> => !!v));
    const approvals = await Promise.all(Array.from(approvalIds).map((id) => ctx.db.get(id)));
    const approvalStatusById = new Map<Id<"approvals">, string>();
    for (const a of approvals) if (a) approvalStatusById.set(a._id, a.status);

    return rows.map((r) => ({ ...r, approvalStatus: r.approvalId ? approvalStatusById.get(r.approvalId) : undefined }));
  },
});

export const getProposal = query({
  args: { id: v.id("corporateProposals") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    const { proposal } = await assertProposalVisible(ctx, user, args.id);

    const [vaultDoc, approval, preparedBy] = await Promise.all([
      proposal.vaultDocumentId ? ctx.db.get(proposal.vaultDocumentId) : null,
      proposal.approvalId ? ctx.db.get(proposal.approvalId) : null,
      proposal.preparedBy ? ctx.db.get(proposal.preparedBy) : null,
    ]);

    return {
      ...proposal,
      vaultDocument: vaultDoc,
      approvalStatus: approval?.status,
      approvalDecisionNote: approval?.decisionNote,
      preparedByName: preparedBy?.name ?? preparedBy?.email,
    };
  },
});

export const createProposal = mutation({
  args: {
    opportunityId: v.id("corporateOpportunities"),
    validityPeriodDays: v.optional(v.number()),
    terms: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"corporateProposals">> => {
    const user = await requirePermission(ctx, "corporate_marketing.proposal_manage");
    const opp = await assertOpportunityVisible(ctx, user, args.opportunityId);

    const proposalRef = await nextProposalRef(ctx);
    const id = await ctx.db.insert("corporateProposals", {
      proposalRef,
      opportunityId: args.opportunityId,
      validityPeriodDays: args.validityPeriodDays,
      terms: args.terms,
      status: "draft",
      preparedBy: user._id,
      notes: args.notes,
      createdBy: user._id,
    });

    await ctx.db.insert("corporateActivities", {
      organisationId: opp.organisationId,
      opportunityId: opp._id,
      activityType: "proposal",
      subject: `Proposal drafted (${proposalRef})`,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_proposals", entityId: id, entityRef: proposalRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Drafted proposal for opportunity "${opp.name}"`,
    });

    return id;
  },
});

export const updateProposal = mutation({
  args: {
    id: v.id("corporateProposals"),
    validityPeriodDays: v.optional(v.number()),
    terms: v.optional(v.string()),
    vaultDocumentId: v.optional(v.id("vaultDocuments")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.proposal_manage");
    const { id, ...patch } = args;
    const { proposal, opp } = await assertProposalVisible(ctx, user, id);

    if (proposal.status !== "draft" && proposal.status !== "under_review") {
      throw new ConvexError({ code: "CONFLICT", message: "This proposal is no longer editable" });
    }

    await ctx.db.patch(id, patch);

    await logAudit(ctx, {
      action: "update", entity: "corporate_proposals", entityId: id, entityRef: proposal.proposalRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated proposal for opportunity "${opp.name}"`,
    });
  },
});

// Submits a draft proposal for internal commercial approval via the
// EXISTING approvals table — never a second approval engine.
export const submitProposalForApproval = mutation({
  args: { id: v.id("corporateProposals") },
  handler: async (ctx, args): Promise<Id<"approvals">> => {
    const user = await requirePermission(ctx, "corporate_marketing.proposal_manage");
    const { proposal, opp } = await assertProposalVisible(ctx, user, args.id);

    if (proposal.status !== "draft") {
      throw new ConvexError({ code: "CONFLICT", message: "Only draft proposals can be submitted for approval" });
    }
    if (!proposal.vaultDocumentId) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Attach the proposal document before submitting for approval" });
    }

    const approvalRef = await nextApprovalRef(ctx);
    const approvalId = await ctx.db.insert("approvals", {
      approvalRef,
      approvalType: "corporate_proposal",
      status: "pending",
      priority: "medium",
      summary: `Approve commercial proposal for "${opp.name}"`,
      relatedRef: proposal.proposalRef,
      requestedBy: user._id,
      requestedAt: new Date().toISOString(),
    });

    await ctx.db.patch(args.id, { status: "pending_approval", approvalId });

    await logAudit(ctx, {
      action: "submit_for_approval", entity: "corporate_proposals", entityId: args.id, entityRef: proposal.proposalRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Submitted proposal for opportunity "${opp.name}" for approval`,
    });

    return approvalId;
  },
});

// Reflects a decision already made on the linked `approvals` record — call
// `taskboard.decideApproval` first, then this to sync the proposal status.
export const decideProposalApproval = mutation({
  args: {
    id: v.id("corporateProposals"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    decisionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.approve");
    const { proposal, opp } = await assertProposalVisible(ctx, user, args.id);

    if (proposal.status !== "pending_approval") {
      throw new ConvexError({ code: "CONFLICT", message: "Only proposals pending approval can be decided" });
    }

    if (proposal.approvalId) {
      const approval = await ctx.db.get(proposal.approvalId);
      if (approval && approval.status === "pending") {
        await ctx.db.patch(proposal.approvalId, {
          status: args.decision,
          decision: args.decision,
          decisionNote: args.decisionNote,
          decisionBy: user._id,
          decisionAt: new Date().toISOString(),
        });
      }
    }

    await ctx.db.patch(args.id, {
      status: args.decision === "approved" ? "approved" : "draft",
      reviewedBy: user._id,
      approvedBy: args.decision === "approved" ? user._id : undefined,
    });

    await logAudit(ctx, {
      action: args.decision === "approved" ? "approve" : "reject",
      entity: "corporate_proposals", entityId: args.id, entityRef: proposal.proposalRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `${args.decision === "approved" ? "Approved" : "Rejected"} proposal for opportunity "${opp.name}"${args.decisionNote ? ` — ${args.decisionNote}` : ""}`,
    });
  },
});

// Marks an approved proposal as submitted to the corporate organisation.
export const submitProposalToClient = mutation({
  args: { id: v.id("corporateProposals") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.proposal_manage");
    const { proposal, opp } = await assertProposalVisible(ctx, user, args.id);

    if (proposal.status !== "approved") {
      throw new ConvexError({ code: "CONFLICT", message: "Only approved proposals can be submitted to the client" });
    }

    await ctx.db.patch(args.id, { status: "submitted", submittedAt: new Date().toISOString() });

    await ctx.db.insert("corporateActivities", {
      organisationId: opp.organisationId,
      opportunityId: opp._id,
      activityType: "proposal",
      subject: `Proposal submitted (${proposal.proposalRef})`,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "submit", entity: "corporate_proposals", entityId: args.id, entityRef: proposal.proposalRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Submitted proposal to ${opp.name}`,
    });
  },
});

// Records the client's response to a submitted proposal (accepted, entering
// negotiation, or rejected/expired/withdrawn).
export const recordProposalResponse = mutation({
  args: {
    id: v.id("corporateProposals"),
    status: v.union(v.literal("accepted"), v.literal("negotiation"), v.literal("rejected"), v.literal("expired"), v.literal("withdrawn")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.proposal_manage");
    const { proposal, opp } = await assertProposalVisible(ctx, user, args.id);

    if (proposal.status !== "submitted" && proposal.status !== "negotiation") {
      throw new ConvexError({ code: "CONFLICT", message: "Only a submitted proposal can have a client response recorded" });
    }

    await ctx.db.patch(args.id, { status: args.status, notes: args.notes ?? proposal.notes });

    await ctx.db.insert("corporateActivities", {
      organisationId: opp.organisationId,
      opportunityId: opp._id,
      activityType: "proposal",
      subject: `Proposal ${args.status.replace("_", " ")} (${proposal.proposalRef})`,
      notes: args.notes,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "update", entity: "corporate_proposals", entityId: args.id, entityRef: proposal.proposalRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Recorded proposal response "${args.status}" for opportunity "${opp.name}"${args.notes ? ` — ${args.notes}` : ""}`,
    });
  },
});

// Shared Convex storage upload URL for proposal documents (same pattern as
// convex/cms.ts / letters.ts / meetings.ts).
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "corporate_marketing.document_upload");
    return ctx.storage.generateUploadUrl();
  },
});
