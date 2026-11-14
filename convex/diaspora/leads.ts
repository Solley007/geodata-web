import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { internal } from "../_generated/api.js";
import { notifyStaffOfNewLead } from "../sales.ts";
import { campaignAcceptsLeads } from "./campaigns.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Registration / enquiry capture for the Diaspora Investment & Property
// Platform. Reuses the EXISTING `leads` table end-to-end — never a second
// CRM. Every enquiry lands in the same pipeline sales staff already work
// from (src/pages/admin/sales.tsx), tagged with the extra Diaspora context
// (country, programme interest, campaign) as additive optional fields.
// ══════════════════════════════════════════════════════════════════════════

export const PROGRAMME_KEY = v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate"));

export const PROGRAMME_LABELS: Record<Doc<"diasporaProgrammes">["key"], string> = {
  own: "Homeownership",
  invest: "Investment",
  partner: "Development & Partnership",
  refer: "Referral & Sales Partner",
  corporate: "Corporate & Institutional",
};

// Shared by `submitDiasporaEnquiry` (below) and `diaspora/consultations.ts`'s
// `requestConsultation` — both create a Diaspora-tagged row in the EXISTING
// `leads` table plus the same campaign attribution/notification side effects.
// Never duplicate this insert logic elsewhere.
export async function insertDiasporaLead(
  ctx: MutationCtx,
  args: {
    name: string;
    email: string;
    phone: string;
    country: string;
    city?: string;
    customerSegment?: string;
    programmeInterest: Array<Doc<"diasporaProgrammes">["key"]>;
    campaignCode?: string;
    propertyInterest?: string;
    extraNotesLines?: Array<string | null | undefined>;
  },
): Promise<{ leadId: Id<"leads">; campaign: Doc<"diasporaCampaigns"> | null }> {
  const name = args.name.trim();
  const email = args.email.trim();
  const phone = args.phone.trim();
  const country = args.country.trim();

  // Safe-config rule (spec section 16): a programme that is disabled or has
  // closed enquiries platform-wide must never accept a new enquiry, no
  // matter what the client sent — the public page is expected to hide it,
  // but this is the one place that actually enforces it.
  for (const key of args.programmeInterest) {
    const programme = await ctx.db.query("diasporaProgrammes").withIndex("by_key", (q) => q.eq("key", key)).unique();
    if (!programme || !programme.enabled || !programme.acceptingEnquiries) {
      throw new ConvexError({ code: "FORBIDDEN", message: `The "${PROGRAMME_LABELS[key]}" programme is not currently accepting enquiries.` });
    }
  }

  // Resolve campaign attribution — a stale/unknown/paused campaign code is
  // never fatal: the record still goes through, just without attribution,
  // since a broken QR/link should never block a genuine lead.
  let campaign: Doc<"diasporaCampaigns"> | null = null;
  if (args.campaignCode) {
    const found = await ctx.db.query("diasporaCampaigns").withIndex("by_code", (q) => q.eq("code", args.campaignCode!.trim().toUpperCase())).first();
    if (found && campaignAcceptsLeads(found)) campaign = found;
  }

  // Best-effort match to an existing market by country name so the lead can
  // be filtered/reported on alongside its market — never blocks the record
  // if no matching market exists yet.
  const market = await ctx.db
    .query("diasporaMarkets")
    .withSearchIndex("search_country", (q) => q.search("country", country))
    .first();
  const diasporaMarketId = market && market.country.toLowerCase() === country.toLowerCase() ? market._id : undefined;

  const notesLines = (args.extraNotesLines ?? []).filter((line): line is string => Boolean(line));

  const leadId = await ctx.db.insert("leads", {
    name,
    email,
    phone,
    source: campaign ? "qr_code" : "diaspora_platform",
    stage: "new",
    propertyInterest: args.propertyInterest,
    notes: notesLines.length > 0 ? notesLines.join("\n") : undefined,
    priority: "high",
    country,
    diasporaMarketId,
    programmeInterest: args.programmeInterest,
    diasporaCampaignId: campaign?._id,
    customerSegment: args.customerSegment,
  });

  await ctx.db.insert("activityLog", {
    action: "create",
    entity: "lead",
    entityId: leadId,
    details: `Diaspora enquiry — ${name} (${country}) — ${args.programmeInterest.map((k) => PROGRAMME_LABELS[k]).join(", ")}`,
  });

  // Write-time aggregation: bump the campaign's denormalized lead counter
  // right here rather than ever scanning `leads` to compute it later.
  if (campaign) {
    await ctx.db.patch(campaign._id, { leadCount: campaign.leadCount + 1 });
  }

  return { leadId, campaign };
}

function listLine(label: string, values: string[] | undefined): string | null {
  return values && values.length > 0 ? `${label}: ${values.join(", ")}` : null;
}

// Public — no sign-in required. Submitted from the Opportunity Finder /
// registration form on any /diaspora/* programme page.
export const submitDiasporaEnquiry = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    country: v.string(),
    city: v.optional(v.string()),
    customerSegment: v.optional(v.string()),
    programmeInterest: v.array(PROGRAMME_KEY),
    preferredLocation: v.optional(v.string()),
    opportunityType: v.optional(v.string()),
    budgetRange: v.optional(v.string()),
    timeline: v.optional(v.string()),
    preferredContact: v.optional(v.string()),
    notes: v.optional(v.string()),
    campaignCode: v.optional(v.string()), // from ?ref=CAMPAIGNCODE attribution
    consent: v.boolean(),
    // ── Fields aligned with the printed lead capture form (all optional so
    //    older clients / the consultation flow keep working unchanged).
    organisation: v.optional(v.string()),
    homesOfInterest: v.optional(v.array(v.string())),
    paymentRoute: v.optional(v.string()),
    partnerTypes: v.optional(v.array(v.string())),
    proposal: v.optional(v.string()),
    organisationNeeds: v.optional(v.array(v.string())),
    approxUnits: v.optional(v.string()),
    nextSteps: v.optional(v.array(v.string())),
    heardAbout: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ id: Id<"leads"> }> => {
    const name = args.name.trim();
    const email = args.email.trim();
    const phone = args.phone.trim();
    const country = args.country.trim();
    if (!name) throw new ConvexError({ code: "BAD_REQUEST", message: "Name is required" });
    if (!email) throw new ConvexError({ code: "BAD_REQUEST", message: "Email is required" });
    if (!phone) throw new ConvexError({ code: "BAD_REQUEST", message: "Phone number is required" });
    if (!country) throw new ConvexError({ code: "BAD_REQUEST", message: "Country is required" });
    if (args.programmeInterest.length === 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Select at least one programme of interest" });
    }
    if (!args.consent) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Consent to be contacted is required" });
    }

    const { leadId: id, campaign } = await insertDiasporaLead(ctx, {
      name, email, phone, country,
      city: args.city,
      customerSegment: args.customerSegment,
      programmeInterest: args.programmeInterest,
      campaignCode: args.campaignCode,
      propertyInterest: args.homesOfInterest && args.homesOfInterest.length > 0 ? args.homesOfInterest.join(", ") : args.opportunityType,
      // Stored as readable lines on the existing lead notes so sales staff see
      // every answer in the pipeline they already use — no new CRM columns.
      extraNotesLines: [
        args.organisation ? `Organisation: ${args.organisation}` : null,
        args.city ? `City: ${args.city}` : null,
        args.preferredLocation ? `Preferred location: ${args.preferredLocation}` : null,
        args.opportunityType ? `Opportunity type: ${args.opportunityType}` : null,
        listLine("Homes of interest", args.homesOfInterest),
        args.budgetRange ? `Budget: ${args.budgetRange}` : null,
        args.paymentRoute ? `Payment route: ${args.paymentRoute}` : null,
        args.timeline ? `Timeline: ${args.timeline}` : null,
        listLine("Partner type", args.partnerTypes),
        args.proposal ? `Proposal: ${args.proposal}` : null,
        listLine("Organisation need", args.organisationNeeds),
        args.approxUnits ? `Approx. staff/units: ${args.approxUnits}` : null,
        args.preferredContact ? `Preferred contact: ${args.preferredContact}` : null,
        listLine("Next step requested", args.nextSteps),
        args.heardAbout ? `Heard about us: ${args.heardAbout}` : null,
        args.notes ? `Notes: ${args.notes}` : null,
      ],
    });

    const programmeSummary = args.programmeInterest.map((k) => PROGRAMME_LABELS[k]).join(", ");
    await ctx.scheduler.runAfter(0, internal.emails.sendAdminNewInquiryAlert, {
      to: await ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      adminPhones: await ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      name,
      email,
      phone,
      message: `Diaspora enquiry from ${country}${args.city ? `, ${args.city}` : ""}. Interested in: ${programmeSummary}.${campaign ? ` Campaign: ${campaign.name} (${campaign.code}).` : ""}`,
      subject: `New Diaspora Enquiry — ${name}`,
    });
    await notifyStaffOfNewLead(ctx, {
      title: "New Diaspora Enquiry",
      message: `${name} (${country}) registered interest in ${programmeSummary}${campaign ? ` via ${campaign.name}` : ""}.`,
    });

    return { id };
  },
});

// Lightweight public lookup so a campaign landing page (`?ref=CODE`) can
// confirm the code is real and currently accepting leads before showing its
// content — never exposes internal fields like leadCount/assignedTeam.
export const resolveCampaignByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args): Promise<{ id: Id<"diasporaCampaigns">; name: string; code: string; acceptsLeads: boolean } | null> => {
    const campaign = await ctx.db.query("diasporaCampaigns").withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase())).first();
    if (!campaign) return null;
    return { id: campaign._id, name: campaign.name, code: campaign.code, acceptsLeads: campaignAcceptsLeads(campaign) };
  },
});

// Admin: Diaspora-specific leads view (filtered from the existing leads
// table, never a separate table) — used by Diaspora analytics/audit panels
// in a later milestone. Bounded via the campaign index, never a full scan.
export const listLeadsByCampaign = query({
  args: { campaignId: v.id("diasporaCampaigns") },
  handler: async (ctx, args): Promise<Array<Doc<"leads">>> => {
    await requirePermission(ctx, "diaspora.analytics_view", { requireEnabled: false });
    return await ctx.db.query("leads").withIndex("by_diaspora_campaign", (q) => q.eq("diasporaCampaignId", args.campaignId)).order("desc").collect();
  },
});
