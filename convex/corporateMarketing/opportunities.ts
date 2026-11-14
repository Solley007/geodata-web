import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";
import { nextOpportunityRef } from "./refs.ts";

// ══════════════════════════════════════════════════════════════════════════
// Corporate opportunities — one per bulk-acquisition pursuit for a corporate
// organisation. Line items (per property type) live in lineItems.ts. Never
// a second sales/opportunity system: this is scoped strictly to corporate,
// multi-unit acquisitions and eventually converts into the EXISTING
// transactions table (see corporateOpportunities.transactionId, wired up in
// a later milestone) rather than a parallel transaction concept.
// ══════════════════════════════════════════════════════════════════════════

const PRIORITY = v.union(v.literal("low"), v.literal("medium"), v.literal("high"));

function getOwnerId(opp: Doc<"corporateOpportunities">): Id<"users"> | null | undefined {
  return opp.assignedOfficer ?? opp.relationshipOwner;
}

async function assertStageIsUsable(ctx: Parameters<typeof requirePermission>[0], stageKey: string): Promise<void> {
  const stage = await ctx.db.query("corporatePipelineStages").withIndex("by_key", (q) => q.eq("key", stageKey)).unique();
  if (!stage) throw new ConvexError({ code: "BAD_REQUEST", message: "Unknown pipeline stage" });
  if (stage.status !== "active") throw new ConvexError({ code: "BAD_REQUEST", message: "This pipeline stage is inactive" });
}

export const listOpportunities = query({
  args: {
    organisationId: v.optional(v.id("corporateOrganisations")),
    stageKey: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");

    let rows: Doc<"corporateOpportunities">[];
    if (args.search && args.search.trim().length > 0) {
      rows = await ctx.db
        .query("corporateOpportunities")
        .withSearchIndex("search_name", (q) => {
          const s = q.search("name", args.search!);
          return args.stageKey ? s.eq("stageKey", args.stageKey) : s;
        })
        .take(200);
    } else if (args.organisationId) {
      rows = await ctx.db.query("corporateOpportunities").withIndex("by_organisation", (q) => q.eq("organisationId", args.organisationId!)).order("desc").collect();
    } else if (args.stageKey) {
      rows = await ctx.db.query("corporateOpportunities").withIndex("by_stage", (q) => q.eq("stageKey", args.stageKey!)).order("desc").collect();
    } else {
      rows = await ctx.db.query("corporateOpportunities").order("desc").collect();
    }

    if (args.organisationId && (args.search || args.stageKey)) {
      rows = rows.filter((r) => r.organisationId === args.organisationId);
    }

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const scoped = await filterByScope(ctx, rows, scope, getOwnerId);

    const orgIds = new Set(scoped.map((o) => o.organisationId));
    const userIds = new Set<Id<"users">>();
    for (const o of scoped) {
      if (o.relationshipOwner) userIds.add(o.relationshipOwner);
      if (o.assignedOfficer) userIds.add(o.assignedOfficer);
    }
    const [orgDocs, userDocs, stages] = await Promise.all([
      Promise.all(Array.from(orgIds).map((id) => ctx.db.get(id))),
      Promise.all(Array.from(userIds).map((id) => ctx.db.get(id))),
      ctx.db.query("corporatePipelineStages").collect(),
    ]);
    const orgNameById = new Map<Id<"corporateOrganisations">, string>();
    for (const o of orgDocs) if (o) orgNameById.set(o._id, o.name);
    const userNameById = new Map<Id<"users">, string>();
    for (const u of userDocs) if (u) userNameById.set(u._id, u.name ?? u.email ?? "Unknown");
    const stageByKey = new Map(stages.map((s) => [s.key, s]));

    const diasporaCampaignIds = Array.from(new Set(scoped.map((o) => o.diasporaCampaignId).filter((id): id is Id<"diasporaCampaigns"> => id !== undefined)));
    const diasporaCampaigns = await Promise.all(diasporaCampaignIds.map((id) => ctx.db.get(id)));
    const diasporaCampaignNameById = new Map<Id<"diasporaCampaigns">, string>();
    for (const c of diasporaCampaigns) if (c) diasporaCampaignNameById.set(c._id, c.name);

    return scoped.map((opp) => ({
      ...opp,
      organisationName: orgNameById.get(opp.organisationId) ?? "Unknown Organisation",
      relationshipOwnerName: opp.relationshipOwner ? userNameById.get(opp.relationshipOwner) : undefined,
      assignedOfficerName: opp.assignedOfficer ? userNameById.get(opp.assignedOfficer) : undefined,
      stageLabel: stageByKey.get(opp.stageKey)?.label ?? opp.stageKey,
      stageOrder: stageByKey.get(opp.stageKey)?.order ?? 0,
      diasporaCampaignName: opp.diasporaCampaignId ? diasporaCampaignNameById.get(opp.diasporaCampaignId) : undefined,
    }));
  },
});

export const getOpportunity = query({
  args: { id: v.id("corporateOpportunities") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    const opp = await ctx.db.get(args.id);
    if (!opp) throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found" });

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const [visible] = await filterByScope(ctx, [opp], scope, getOwnerId);
    if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this opportunity" });

    const [organisation, relationshipOwner, assignedOfficer, lineItems, stage, diasporaCampaign] = await Promise.all([
      ctx.db.get(opp.organisationId),
      opp.relationshipOwner ? ctx.db.get(opp.relationshipOwner) : null,
      opp.assignedOfficer ? ctx.db.get(opp.assignedOfficer) : null,
      ctx.db.query("corporateOpportunityLineItems").withIndex("by_opportunity", (q) => q.eq("opportunityId", opp._id)).collect(),
      ctx.db.query("corporatePipelineStages").withIndex("by_key", (q) => q.eq("key", opp.stageKey)).unique(),
      opp.diasporaCampaignId ? ctx.db.get(opp.diasporaCampaignId) : null,
    ]);

    return {
      ...opp,
      organisationName: organisation?.name ?? "Unknown Organisation",
      relationshipOwnerName: relationshipOwner?.name ?? relationshipOwner?.email,
      assignedOfficerName: assignedOfficer?.name ?? assignedOfficer?.email,
      stageLabel: stage?.label ?? opp.stageKey,
      lineItemCount: lineItems.length,
      diasporaCampaignName: diasporaCampaign?.name,
    };
  },
});

export const createOpportunity = mutation({
  args: {
    organisationId: v.id("corporateOrganisations"),
    name: v.string(),
    opportunityType: v.optional(v.string()),
    relationshipOwner: v.optional(v.id("users")),
    assignedOfficer: v.optional(v.id("users")),
    campaignId: v.optional(v.id("corporateCampaigns")),
    source: v.optional(v.string()),
    priority: v.optional(PRIORITY),
    stageKey: v.optional(v.string()),
    preferredLocation: v.optional(v.string()),
    intendedUse: v.optional(v.string()),
    requirementNotes: v.optional(v.string()),
    expectedCloseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.create");
    if (!args.name.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Opportunity name is required" });

    const organisation = await ctx.db.get(args.organisationId);
    if (!organisation) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });

    let stageKey = args.stageKey;
    if (stageKey) {
      await assertStageIsUsable(ctx, stageKey);
    } else {
      const firstStage = (await ctx.db.query("corporatePipelineStages").withIndex("by_status", (q) => q.eq("status", "active")).collect()).sort((a, b) => a.order - b.order)[0];
      if (!firstStage) throw new ConvexError({ code: "BAD_REQUEST", message: "No pipeline stages are configured yet. Seed the default stages first." });
      stageKey = firstStage.key;
    }

    const opportunityRef = await nextOpportunityRef(ctx);
    const id = await ctx.db.insert("corporateOpportunities", {
      opportunityRef,
      organisationId: args.organisationId,
      name: args.name.trim(),
      opportunityType: args.opportunityType,
      relationshipOwner: args.relationshipOwner,
      assignedOfficer: args.assignedOfficer,
      campaignId: args.campaignId,
      source: args.source,
      priority: args.priority ?? "medium",
      stageKey,
      preferredLocation: args.preferredLocation,
      intendedUse: args.intendedUse,
      requirementNotes: args.requirementNotes,
      expectedCloseDate: args.expectedCloseDate,
      notes: args.notes,
      createdBy: user._id,
      updatedBy: user._id,
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_opportunities", entityId: id, entityRef: opportunityRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created corporate opportunity "${args.name.trim()}" for "${organisation.name}"`,
    });

    return id;
  },
});

export const updateOpportunity = mutation({
  args: {
    id: v.id("corporateOpportunities"),
    name: v.optional(v.string()),
    opportunityType: v.optional(v.string()),
    source: v.optional(v.string()),
    campaignId: v.optional(v.id("corporateCampaigns")),
    priority: v.optional(PRIORITY),
    preferredLocation: v.optional(v.string()),
    intendedUse: v.optional(v.string()),
    requirementNotes: v.optional(v.string()),
    paymentStructure: v.optional(v.string()),
    proposedDeposit: v.optional(v.number()),
    instalmentStructure: v.optional(v.string()),
    commercialNotes: v.optional(v.string()),
    expectedCloseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const { id, ...patch } = args;
    const opp = await ctx.db.get(id);
    if (!opp) throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found" });

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const [visible] = await filterByScope(ctx, [opp], scope, getOwnerId);
    if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this opportunity" });

    await ctx.db.patch(id, { ...patch, updatedBy: user._id });

    await logAudit(ctx, {
      action: "update", entity: "corporate_opportunities", entityId: id, entityRef: opp.opportunityRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated corporate opportunity "${opp.name}"`,
      before: JSON.stringify(opp),
      after: JSON.stringify(patch),
    });
  },
});

export const assignOpportunity = mutation({
  args: {
    id: v.id("corporateOpportunities"),
    relationshipOwner: v.optional(v.id("users")),
    assignedOfficer: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.assign");
    const opp = await ctx.db.get(args.id);
    if (!opp) throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found" });

    await ctx.db.patch(args.id, {
      relationshipOwner: args.relationshipOwner,
      assignedOfficer: args.assignedOfficer,
      updatedBy: user._id,
    });

    await logAudit(ctx, {
      action: "assign", entity: "corporate_opportunities", entityId: args.id, entityRef: opp.opportunityRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Reassigned corporate opportunity "${opp.name}"`,
      after: JSON.stringify({ relationshipOwner: args.relationshipOwner, assignedOfficer: args.assignedOfficer }),
    });
  },
});

// Moves an opportunity to a different pipeline stage. Closing (won/lost) is
// handled here too, but closing to "lost" NEVER deletes the record — it can
// always be moved into the "nurture" stage later per the governing spec.
export const moveOpportunityStage = mutation({
  args: {
    id: v.id("corporateOpportunities"),
    stageKey: v.string(),
    lostReason: v.optional(v.string()),
    competitorNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const opp = await ctx.db.get(args.id);
    if (!opp) throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found" });

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const [visible] = await filterByScope(ctx, [opp], scope, getOwnerId);
    if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this opportunity" });

    const stage = await ctx.db.query("corporatePipelineStages").withIndex("by_key", (q) => q.eq("key", args.stageKey)).unique();
    if (!stage) throw new ConvexError({ code: "BAD_REQUEST", message: "Unknown pipeline stage" });
    if (stage.status !== "active") throw new ConvexError({ code: "BAD_REQUEST", message: "This pipeline stage is inactive" });

    const isClosing = stage.isClosedWon || stage.isClosedLost;
    if (isClosing) {
      await requirePermission(ctx, "corporate_marketing.opportunity_close");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.id, {
      stageKey: args.stageKey,
      isNurture: stage.key === "nurture" ? true : opp.isNurture,
      nurtureDate: stage.key === "nurture" ? now : opp.nurtureDate,
      actualCloseDate: isClosing ? now : opp.actualCloseDate,
      lostReason: stage.isClosedLost ? (args.lostReason ?? opp.lostReason) : opp.lostReason,
      competitorNote: stage.isClosedLost ? (args.competitorNote ?? opp.competitorNote) : opp.competitorNote,
      updatedBy: user._id,
    });

    await logAudit(ctx, {
      action: "stage_change", entity: "corporate_opportunities", entityId: args.id, entityRef: opp.opportunityRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Moved corporate opportunity "${opp.name}" from "${opp.stageKey}" to "${stage.label}"`,
      before: JSON.stringify({ stageKey: opp.stageKey }),
      after: JSON.stringify({ stageKey: args.stageKey }),
    });
  },
});
