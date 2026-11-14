import type { MutationCtx } from "../_generated/server";

// ── Shared ref-number generators, following the existing GWS-XXX-NNNN
// convention used across the app (see convex/liveInspections.ts, taskboard.ts,
// docvault.ts, etc). One counter per prefix, derived from the last inserted
// row — never a separate counters table.

async function nextRef(ctx: MutationCtx, table: "corporateOrganisations" | "corporateOpportunities" | "corporateCampaigns" | "corporatePartnershipLetters" | "corporateEois" | "corporateProposals" | "corporateNegotiations" | "corporateBulkAcquisitions" | "corporateAllocationBatches", prefix: string, field: string): Promise<string> {
  const last = await ctx.db.query(table).order("desc").first();
  const lastValue = last ? (last as unknown as Record<string, string>)[field] : undefined;
  const n = lastValue ? parseInt(lastValue.replace(`${prefix}-`, "") || "0", 10) + 1 : 1;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

export const nextOrgRef = (ctx: MutationCtx) => nextRef(ctx, "corporateOrganisations", "GWS-CORG", "orgRef");
export const nextOpportunityRef = (ctx: MutationCtx) => nextRef(ctx, "corporateOpportunities", "GWS-COPP", "opportunityRef");
export const nextCampaignRef = (ctx: MutationCtx) => nextRef(ctx, "corporateCampaigns", "GWS-CCMP", "campaignRef");
export const nextLetterRef = (ctx: MutationCtx) => nextRef(ctx, "corporatePartnershipLetters", "GWS-CLTR", "letterRef");
export const nextEoiRef = (ctx: MutationCtx) => nextRef(ctx, "corporateEois", "GWS-CEOI", "eoiRef");
export const nextProposalRef = (ctx: MutationCtx) => nextRef(ctx, "corporateProposals", "GWS-CPRO", "proposalRef");
export const nextNegotiationRef = (ctx: MutationCtx) => nextRef(ctx, "corporateNegotiations", "GWS-CNEG", "negotiationRef");
export const nextBulkAcquisitionRef = (ctx: MutationCtx) => nextRef(ctx, "corporateBulkAcquisitions", "GWS-CBAQ", "acquisitionRef");
export const nextAllocationBatchRef = (ctx: MutationCtx) => nextRef(ctx, "corporateAllocationBatches", "GWS-CBAT", "batchRef");
