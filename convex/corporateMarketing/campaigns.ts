import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { requirePermission } from "./feature.ts";
import { nextCampaignRef } from "./refs.ts";

// ══════════════════════════════════════════════════════════════════════════
// Marketing campaigns targeting corporate organisations. A campaign simply
// tags the corporate organisations/opportunities it targets (via the
// existing `campaignId` field on both tables) — never a second CRM/marketing
// system. Reuses the same `corporate_marketing.*` permission catalogue as
// every other corporate marketing module; no new permissions needed.
// ══════════════════════════════════════════════════════════════════════════

const STATUS = v.union(v.literal("planned"), v.literal("active"), v.literal("completed"), v.literal("paused"));

export const listCampaigns = query({
  args: { status: v.optional(STATUS) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "corporate_marketing.view");

    const rows = args.status
      ? await ctx.db.query("corporateCampaigns").withIndex("by_status", (q) => q.eq("status", args.status!)).order("desc").collect()
      : await ctx.db.query("corporateCampaigns").order("desc").collect();

    // Rollup counts per campaign — organisations targeted and opportunities
    // sourced from it, plus how many of those opportunities are closed won.
    const [allOrgs, allOpps, stages] = await Promise.all([
      ctx.db.query("corporateOrganisations").collect(),
      ctx.db.query("corporateOpportunities").collect(),
      ctx.db.query("corporatePipelineStages").collect(),
    ]);
    const closedWonKeys = new Set(stages.filter((s) => s.isClosedWon).map((s) => s.key));

    const ownerIds = new Set<Id<"users">>();
    for (const r of rows) if (r.ownerId) ownerIds.add(r.ownerId);
    const owners = await Promise.all(Array.from(ownerIds).map((id) => ctx.db.get(id)));
    const ownerNameById = new Map<Id<"users">, string>();
    for (const o of owners) if (o) ownerNameById.set(o._id, o.name ?? o.email ?? "Unknown");

    return rows.map((c) => {
      const orgsTargeted = allOrgs.filter((o) => o.campaignId === c._id).length;
      const opportunities = allOpps.filter((o) => o.campaignId === c._id);
      const closedWon = opportunities.filter((o) => closedWonKeys.has(o.stageKey)).length;
      return {
        ...c,
        ownerName: c.ownerId ? ownerNameById.get(c.ownerId) : undefined,
        organisationsTargeted: orgsTargeted,
        opportunitiesCount: opportunities.length,
        closedWonCount: closedWon,
      };
    });
  },
});

export const getCampaign = query({
  args: { id: v.id("corporateCampaigns") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "corporate_marketing.view");
    const campaign = await ctx.db.get(args.id);
    if (!campaign) throw new ConvexError({ code: "NOT_FOUND", message: "Campaign not found" });

    const [organisations, opportunities, stages, owner] = await Promise.all([
      ctx.db.query("corporateOrganisations").withIndex("by_campaign", (q) => q.eq("campaignId", args.id)).collect(),
      ctx.db.query("corporateOpportunities").withIndex("by_campaign", (q) => q.eq("campaignId", args.id)).collect(),
      ctx.db.query("corporatePipelineStages").collect(),
      campaign.ownerId ? ctx.db.get(campaign.ownerId) : null,
    ]);
    const stageByKey = new Map(stages.map((s) => [s.key, s]));
    const closedWon = opportunities.filter((o) => stageByKey.get(o.stageKey)?.isClosedWon).length;
    const closedLost = opportunities.filter((o) => stageByKey.get(o.stageKey)?.isClosedLost).length;
    const totalValue = opportunities.reduce((sum, o) => sum + (o.proposedDeposit ?? 0), 0);

    return {
      ...campaign,
      ownerName: owner?.name ?? owner?.email,
      organisations,
      opportunities: opportunities.map((o) => ({ ...o, stageLabel: stageByKey.get(o.stageKey)?.label ?? o.stageKey })),
      closedWon,
      closedLost,
      totalValue,
    };
  },
});

export const createCampaign = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    targetSector: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
    budget: v.optional(v.number()),
    objectives: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.create");
    if (!args.name.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Campaign name is required" });

    const campaignRef = await nextCampaignRef(ctx);
    const id = await ctx.db.insert("corporateCampaigns", {
      campaignRef,
      name: args.name.trim(),
      description: args.description,
      targetSector: args.targetSector,
      startDate: args.startDate,
      endDate: args.endDate,
      ownerId: args.ownerId,
      status: "planned",
      budget: args.budget,
      objectives: args.objectives,
      notes: args.notes,
      createdBy: user._id,
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_campaigns", entityId: id, entityRef: campaignRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created corporate marketing campaign "${args.name.trim()}"`,
    });

    return id;
  },
});

export const updateCampaign = mutation({
  args: {
    id: v.id("corporateCampaigns"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    targetSector: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
    status: v.optional(STATUS),
    budget: v.optional(v.number()),
    objectives: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const { id, ...patch } = args;
    const campaign = await ctx.db.get(id);
    if (!campaign) throw new ConvexError({ code: "NOT_FOUND", message: "Campaign not found" });

    await ctx.db.patch(id, patch);

    await logAudit(ctx, {
      action: "update", entity: "corporate_campaigns", entityId: id, entityRef: campaign.campaignRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated corporate marketing campaign "${campaign.name}"`,
      before: JSON.stringify(campaign),
      after: JSON.stringify(patch),
    });
  },
});

export const deleteCampaign = mutation({
  args: { id: v.id("corporateCampaigns") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const campaign = await ctx.db.get(args.id);
    if (!campaign) throw new ConvexError({ code: "NOT_FOUND", message: "Campaign not found" });

    const [linkedOrgs, linkedOpps] = await Promise.all([
      ctx.db.query("corporateOrganisations").withIndex("by_campaign", (q) => q.eq("campaignId", args.id)).first(),
      ctx.db.query("corporateOpportunities").withIndex("by_campaign", (q) => q.eq("campaignId", args.id)).first(),
    ]);
    if (linkedOrgs || linkedOpps) {
      throw new ConvexError({ code: "CONFLICT", message: "Cannot delete a campaign with organisations or opportunities linked to it" });
    }

    await ctx.db.delete(args.id);

    await logAudit(ctx, {
      action: "delete", entity: "corporate_campaigns", entityId: args.id, entityRef: campaign.campaignRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Deleted corporate marketing campaign "${campaign.name}"`,
      before: JSON.stringify(campaign),
    });
  },
});

// Lightweight list for pickers (org/opportunity create forms) — active +
// planned campaigns only, no rollups.
export const listCampaignOptions = query({
  args: {},
  handler: async (ctx): Promise<Array<{ _id: Id<"corporateCampaigns">; name: string; status: Doc<"corporateCampaigns">["status"] }>> => {
    await requirePermission(ctx, "corporate_marketing.view");
    const rows = await ctx.db.query("corporateCampaigns").collect();
    return rows
      .filter((c) => c.status === "active" || c.status === "planned")
      .map((c) => ({ _id: c._id, name: c.name, status: c.status }));
  },
});
