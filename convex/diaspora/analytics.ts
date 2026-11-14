import { v } from "convex/values";
import { query } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Diaspora Investment & Property Platform analytics — reads directly from
// the EXISTING `leads`/`diasporaConsultations`/`diasporaQrScans`/
// `partnerApplications`/`corporateOrganisations`/`transactions` tables.
// Never a separate analytics system: one more read-time-aggregation query,
// following the exact pattern set by corporateMarketing/analytics.ts and
// iam/dashboard.ts. Every count/value here is a bounded rollup over rows
// already tagged with Diaspora attribution — never a per-request full scan
// of an unbounded table without an index.
// ══════════════════════════════════════════════════════════════════════════

const PROGRAMME_KEYS = ["own", "invest", "partner", "refer", "corporate"] as const;
type ProgrammeKey = (typeof PROGRAMME_KEYS)[number];

export const PROGRAMME_LABELS: Record<ProgrammeKey, string> = {
  own: "Homeownership",
  invest: "Investment",
  partner: "Development & Partnership",
  refer: "Referral & Sales Partner",
  corporate: "Corporate & Institutional",
};

// A lead counts as "qualified" once it has progressed past the initial
// intake stages — mirrors the stage vocabulary already used by
// convex/sales.ts (new/contacted/qualified/proposal/negotiation/won/lost).
const QUALIFIED_STAGES = new Set(["qualified", "proposal", "negotiation", "won"]);

function isDiasporaLead(lead: Doc<"leads">): boolean {
  return lead.source === "diaspora_platform" || lead.source === "qr_code" || (lead.programmeInterest?.length ?? 0) > 0;
}

// ── Shared rollup builder — used by the platform-wide widget, the
//    campaign-comparison query, and the market-comparison query, so the
//    three views can never drift out of sync with each other.
type LeadRollup = {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  wonLeads: number;
  byProgramme: Record<ProgrammeKey, number>;
};

function rollupLeads(leads: Array<Doc<"leads">>): LeadRollup {
  const byProgramme: Record<ProgrammeKey, number> = { own: 0, invest: 0, partner: 0, refer: 0, corporate: 0 };
  let newLeads = 0;
  let qualifiedLeads = 0;
  let wonLeads = 0;
  for (const lead of leads) {
    if (lead.stage === "new") newLeads++;
    if (QUALIFIED_STAGES.has(lead.stage)) qualifiedLeads++;
    if (lead.stage === "won") wonLeads++;
    for (const key of lead.programmeInterest ?? []) byProgramme[key]++;
  }
  return { totalLeads: leads.length, newLeads, qualifiedLeads, wonLeads, byProgramme };
}

// ── Platform-wide dashboard widget rollup (used by iam/dashboard.ts) ───────
export type DiasporaDashboardStats = {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  activeOpportunities: number;
  consultations: number;
  propertyEnquiries: number;
  investmentEnquiries: number;
  partnershipEnquiries: number;
  corporateEnquiries: number;
  referralProspects: number;
  transactions: number;
  salesValue: number;
  conversionRatePercent: number;
};

export async function buildDiasporaDashboardStats(ctx: QueryCtx): Promise<DiasporaDashboardStats> {
  const allLeads = await ctx.db.query("leads").order("desc").take(2000);
  const diasporaLeads = allLeads.filter(isDiasporaLead);
  const rollup = rollupLeads(diasporaLeads);

  const activeOpportunities = diasporaLeads.filter((l) => !["won", "lost"].includes(l.stage)).length;

  const consultations = await ctx.db.query("diasporaConsultations").order("desc").take(2000);

  const partnerApplications = await ctx.db.query("partnerApplications").order("desc").take(1000);
  const referralProspects = partnerApplications.filter((a) => a.diasporaCampaignId !== undefined).length;

  const corporateOrgs = await ctx.db.query("corporateOrganisations").order("desc").take(1000);
  const corporateFromDiaspora = corporateOrgs.filter((o) => o.diasporaCampaignId !== undefined || o.source === "diaspora_platform");

  const diasporaLeadIds = new Set(diasporaLeads.map((l) => l._id));
  const transactions = await ctx.db.query("transactions").order("desc").take(2000);
  const diasporaTransactions = transactions.filter((t) => t.leadId && diasporaLeadIds.has(t.leadId));
  const salesValue = diasporaTransactions.reduce((sum, t) => sum + (t.purchasePrice ?? 0), 0);

  const totalContacts = rollup.totalLeads + corporateFromDiaspora.length;
  const conversionRatePercent = totalContacts > 0 ? Math.round(((rollup.wonLeads + diasporaTransactions.length) / totalContacts) * 1000) / 10 : 0;

  return {
    totalLeads: rollup.totalLeads,
    newLeads: rollup.newLeads,
    qualifiedLeads: rollup.qualifiedLeads,
    activeOpportunities,
    consultations: consultations.length,
    propertyEnquiries: rollup.byProgramme.own,
    investmentEnquiries: rollup.byProgramme.invest,
    partnershipEnquiries: rollup.byProgramme.partner,
    corporateEnquiries: rollup.byProgramme.corporate + corporateFromDiaspora.length,
    referralProspects: rollup.byProgramme.refer + referralProspects,
    transactions: diasporaTransactions.length,
    salesValue,
    conversionRatePercent,
  };
}

export const getDashboardStats = query({
  args: {},
  handler: async (ctx): Promise<DiasporaDashboardStats> => {
    await requirePermission(ctx, "diaspora.analytics_view", { requireEnabled: false });
    return await buildDiasporaDashboardStats(ctx);
  },
});

// ── Campaign-to-campaign comparison ─────────────────────────────────────
export type CampaignAnalyticsRow = {
  campaignId: Id<"diasporaCampaigns">;
  campaignName: string;
  campaignCode: string;
  status: Doc<"diasporaCampaigns">["status"];
  qrScans: number;
  landingVisits: number;
  leads: number;
  qualifiedLeads: number;
  consultations: number;
  opportunities: number;
  transactions: number;
  salesValue: number;
  conversionRatePercent: number;
  byProgramme: Record<ProgrammeKey, number>;
};

export const getCampaignAnalytics = query({
  args: {},
  handler: async (ctx): Promise<Array<CampaignAnalyticsRow>> => {
    await requirePermission(ctx, "diaspora.analytics_view", { requireEnabled: false });

    const campaigns = await ctx.db.query("diasporaCampaigns").collect();
    if (campaigns.length === 0) return [];

    const [allLeads, allScans, allConsultations, allTransactions] = await Promise.all([
      ctx.db.query("leads").order("desc").take(5000),
      ctx.db.query("diasporaQrScans").order("desc").take(5000),
      ctx.db.query("diasporaConsultations").order("desc").take(2000),
      ctx.db.query("transactions").order("desc").take(2000),
    ]);

    const leadsByCampaign = new Map<Id<"diasporaCampaigns">, Array<Doc<"leads">>>();
    for (const lead of allLeads) {
      if (!lead.diasporaCampaignId) continue;
      const list = leadsByCampaign.get(lead.diasporaCampaignId) ?? [];
      list.push(lead);
      leadsByCampaign.set(lead.diasporaCampaignId, list);
    }

    const scansByCampaign = new Map<Id<"diasporaCampaigns">, number>();
    for (const scan of allScans) scansByCampaign.set(scan.campaignId, (scansByCampaign.get(scan.campaignId) ?? 0) + 1);

    const consultationsByCampaign = new Map<Id<"diasporaCampaigns">, number>();
    for (const c of allConsultations) {
      if (!c.diasporaCampaignId) continue;
      consultationsByCampaign.set(c.diasporaCampaignId, (consultationsByCampaign.get(c.diasporaCampaignId) ?? 0) + 1);
    }

    return campaigns.map((campaign) => {
      const leads = leadsByCampaign.get(campaign._id) ?? [];
      const rollup = rollupLeads(leads);
      const leadIds = new Set(leads.map((l) => l._id));
      const transactions = allTransactions.filter((t) => t.leadId && leadIds.has(t.leadId));
      const salesValue = transactions.reduce((sum, t) => sum + (t.purchasePrice ?? 0), 0);
      const opportunities = leads.filter((l) => !["won", "lost"].includes(l.stage)).length;
      const conversionRatePercent = leads.length > 0 ? Math.round(((rollup.wonLeads + transactions.length) / leads.length) * 1000) / 10 : 0;

      return {
        campaignId: campaign._id,
        campaignName: campaign.name,
        campaignCode: campaign.code,
        status: campaign.status,
        qrScans: scansByCampaign.get(campaign._id) ?? 0,
        landingVisits: campaign.leadCount, // proxy: every attributed lead reached the landing page; no separate page-view table exists
        leads: rollup.totalLeads,
        qualifiedLeads: rollup.qualifiedLeads,
        consultations: consultationsByCampaign.get(campaign._id) ?? 0,
        opportunities,
        transactions: transactions.length,
        salesValue,
        conversionRatePercent,
        byProgramme: rollup.byProgramme,
      };
    }).sort((a, b) => b.leads - a.leads);
  },
});

// ── Market-to-market (country) comparison ───────────────────────────────
export type MarketAnalyticsRow = {
  marketId: Id<"diasporaMarkets"> | null;
  country: string;
  leads: number;
  qualifiedLeads: number;
  consultations: number;
  opportunities: number;
  transactions: number;
  salesValue: number;
  conversionRatePercent: number;
  byProgramme: Record<ProgrammeKey, number>;
};

export const getMarketAnalytics = query({
  args: {},
  handler: async (ctx): Promise<Array<MarketAnalyticsRow>> => {
    await requirePermission(ctx, "diaspora.analytics_view", { requireEnabled: false });

    const [markets, allLeads, allConsultations, allTransactions] = await Promise.all([
      ctx.db.query("diasporaMarkets").collect(),
      ctx.db.query("leads").order("desc").take(5000),
      ctx.db.query("diasporaConsultations").order("desc").take(2000),
      ctx.db.query("transactions").order("desc").take(2000),
    ]);

    const diasporaLeads = allLeads.filter(isDiasporaLead).filter((l) => l.country);
    const leadsByCountry = new Map<string, Array<Doc<"leads">>>();
    for (const lead of diasporaLeads) {
      const key = lead.country!.trim().toLowerCase();
      const list = leadsByCountry.get(key) ?? [];
      list.push(lead);
      leadsByCountry.set(key, list);
    }

    const leadIdToCountry = new Map<Id<"leads">, string>();
    for (const [country, leads] of leadsByCountry) for (const l of leads) leadIdToCountry.set(l._id, country);

    const consultationLeadIds = new Set(allConsultations.map((c) => c.leadId));
    const consultationsByCountry = new Map<string, number>();
    for (const leadId of consultationLeadIds) {
      const country = leadIdToCountry.get(leadId);
      if (country) consultationsByCountry.set(country, (consultationsByCountry.get(country) ?? 0) + 1);
    }

    // Every registered market gets a row (even with zero activity, so an
    // admin can see which markets haven't produced any leads yet), plus one
    // additional row per country that has Diaspora leads but no registered
    // market record.
    const countriesWithLeads = new Set(leadsByCountry.keys());
    const marketCountries = new Set(markets.map((m) => m.country.trim().toLowerCase()));
    const extraCountries = Array.from(countriesWithLeads).filter((c) => !marketCountries.has(c));

    const buildRow = (marketId: Id<"diasporaMarkets"> | null, countryKey: string, displayCountry: string): MarketAnalyticsRow => {
      const leads = leadsByCountry.get(countryKey) ?? [];
      const rollup = rollupLeads(leads);
      const leadIds = new Set(leads.map((l) => l._id));
      const transactions = allTransactions.filter((t) => t.leadId && leadIds.has(t.leadId));
      const salesValue = transactions.reduce((sum, t) => sum + (t.purchasePrice ?? 0), 0);
      const opportunities = leads.filter((l) => !["won", "lost"].includes(l.stage)).length;
      const conversionRatePercent = leads.length > 0 ? Math.round(((rollup.wonLeads + transactions.length) / leads.length) * 1000) / 10 : 0;
      return {
        marketId,
        country: displayCountry,
        leads: rollup.totalLeads,
        qualifiedLeads: rollup.qualifiedLeads,
        consultations: consultationsByCountry.get(countryKey) ?? 0,
        opportunities,
        transactions: transactions.length,
        salesValue,
        conversionRatePercent,
        byProgramme: rollup.byProgramme,
      };
    };

    const marketRows = markets.map((m) => buildRow(m._id, m.country.trim().toLowerCase(), m.country));
    const extraRows = extraCountries.map((countryKey) => {
      const display = leadsByCountry.get(countryKey)?.[0]?.country ?? countryKey;
      return buildRow(null, countryKey, display);
    });

    return [...marketRows, ...extraRows].sort((a, b) => b.leads - a.leads);
  },
});
