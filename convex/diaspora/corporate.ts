import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { internal } from "../_generated/api.js";
import { logAudit } from "../taskboard.ts";
import { notifyStaffOfNewLead } from "../sales.ts";
import { isFeatureEnabled as isCorporateMarketingEnabled } from "../corporateMarketing/feature.ts";
import { nextOrgRef, nextOpportunityRef } from "../corporateMarketing/refs.ts";
import { campaignAcceptsLeads } from "./campaigns.ts";

// ══════════════════════════════════════════════════════════════════════════
// Diaspora "Corporate & Institutional" programme intake. Reuses the EXISTING
// Corporate Marketing & Bulk Sales module end-to-end — creates a real
// `corporateOrganisations` row and a real `corporateOpportunities` row (plus
// a primary `corporateContacts` row when a contact person is given), tagged
// with `diasporaCampaignId` for attribution. Never a second corporate
// intake/CRM. Requires the EXISTING `feature_corporate_marketing_sales`
// toggle to be ON (independent of the Diaspora master toggle, which the
// caller already checks before rendering this programme's page) — if it's
// off, this mutation fails cleanly and the public page shows a
// "currently unavailable" fallback instead of a broken form.
// ══════════════════════════════════════════════════════════════════════════

const OPPORTUNITY_TYPE = v.union(
  v.literal("staff_housing"),
  v.literal("investment_portfolio"),
  v.literal("off_take"),
  v.literal("cooperative"),
  v.literal("institutional"),
  v.literal("other"),
);

const FINANCING_PREFERENCE = v.union(v.literal("outright"), v.literal("mortgage"), v.literal("instalment"), v.literal("undecided"));

const OPPORTUNITY_TYPE_LABELS: Record<string, string> = {
  staff_housing: "Staff Housing Scheme",
  investment_portfolio: "Investment Portfolio",
  off_take: "Off-Take Agreement",
  cooperative: "Cooperative Purchase",
  institutional: "Institutional Acquisition",
  other: "Other",
};

// Public — no sign-in required. Submitted from the Diaspora "I Represent an
// Organisation" programme page. Always OFF the Diaspora `leads` table:
// corporate/institutional requirements go straight into the corporate
// marketing pipeline staff already work from (src/pages/admin/corporate.tsx).
export const submitCorporateEnquiry = mutation({
  args: {
    organisationName: v.string(),
    orgTypeKey: v.optional(v.string()),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.string(),
    contactJobTitle: v.optional(v.string()),
    country: v.string(),
    city: v.optional(v.string()),
    beneficiaryCount: v.optional(v.number()),
    unitsRequired: v.optional(v.number()),
    propertyType: v.optional(v.string()),
    preferredLocation: v.optional(v.string()),
    budgetRange: v.optional(v.string()),
    financingPreference: v.optional(FINANCING_PREFERENCE),
    opportunityType: v.optional(OPPORTUNITY_TYPE),
    purpose: v.optional(v.string()),
    timeline: v.optional(v.string()),
    isBulkAcquisition: v.optional(v.boolean()),
    isPartnershipInterest: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    campaignCode: v.optional(v.string()), // from ?ref=CAMPAIGNCODE attribution
    consent: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ organisationId: Id<"corporateOrganisations">; opportunityId: Id<"corporateOpportunities"> }> => {
    if (!(await isCorporateMarketingEnabled(ctx))) {
      throw new ConvexError({ code: "FORBIDDEN", message: "The Corporate & Institutional programme is currently unavailable. Please contact us directly." });
    }
    // Safe-config rule (spec section 16): the Diaspora "corporate" programme
    // itself must also be enabled and accepting enquiries — independent of
    // (and in addition to) the underlying Corporate Marketing module toggle
    // checked above.
    const corporateProgramme = await ctx.db.query("diasporaProgrammes").withIndex("by_key", (q) => q.eq("key", "corporate")).unique();
    if (!corporateProgramme || !corporateProgramme.enabled || !corporateProgramme.acceptingEnquiries) {
      throw new ConvexError({ code: "FORBIDDEN", message: "The Corporate & Institutional programme is not currently accepting enquiries." });
    }

    const organisationName = args.organisationName.trim();
    const contactName = args.contactName.trim();
    const contactEmail = args.contactEmail.trim();
    const contactPhone = args.contactPhone.trim();
    const country = args.country.trim();
    if (!organisationName) throw new ConvexError({ code: "BAD_REQUEST", message: "Organisation name is required" });
    if (!contactName) throw new ConvexError({ code: "BAD_REQUEST", message: "Contact name is required" });
    if (!contactEmail) throw new ConvexError({ code: "BAD_REQUEST", message: "Contact email is required" });
    if (!contactPhone) throw new ConvexError({ code: "BAD_REQUEST", message: "Contact phone number is required" });
    if (!country) throw new ConvexError({ code: "BAD_REQUEST", message: "Country is required" });
    if (!args.consent) throw new ConvexError({ code: "BAD_REQUEST", message: "Consent to be contacted is required" });

    // Resolve campaign attribution — a stale/unknown/paused campaign code is
    // never fatal, matching insertDiasporaLead's rule: a broken QR/link must
    // never block a genuine enquiry.
    let campaign: Doc<"diasporaCampaigns"> | null = null;
    if (args.campaignCode) {
      const found = await ctx.db.query("diasporaCampaigns").withIndex("by_code", (q) => q.eq("code", args.campaignCode!.trim().toUpperCase())).first();
      if (found && campaignAcceptsLeads(found)) campaign = found;
    }

    const orgRef = await nextOrgRef(ctx);
    const organisationId = await ctx.db.insert("corporateOrganisations", {
      orgRef,
      name: organisationName,
      orgTypeKey: args.orgTypeKey,
      city: args.city,
      country,
      officialEmail: contactEmail,
      phone: contactPhone,
      source: "diaspora_platform",
      diasporaCampaignId: campaign?._id,
      status: "prospect",
      priority: "high",
      notes: args.notes,
    });

    await ctx.db.insert("corporateContacts", {
      organisationId,
      name: contactName,
      jobTitle: args.contactJobTitle,
      email: contactEmail,
      phone: contactPhone,
      isPrimary: true,
      isAuthorised: true,
      isDecisionMaker: false,
      isProcurementContact: false,
      isFinanceContact: false,
      isLegalContact: false,
      isHrContact: false,
      isExecutiveContact: false,
      status: "active",
    });

    const firstStage = (await ctx.db.query("corporatePipelineStages").withIndex("by_status", (q) => q.eq("status", "active")).collect()).sort((a, b) => a.order - b.order)[0];
    if (!firstStage) throw new ConvexError({ code: "BAD_REQUEST", message: "The Corporate & Institutional programme is not fully configured yet. Please contact us directly." });

    const requirementLines = [
      args.beneficiaryCount ? `Beneficiaries: ${args.beneficiaryCount}` : null,
      args.unitsRequired ? `Units required: ${args.unitsRequired}` : null,
      args.budgetRange ? `Budget range: ${args.budgetRange}` : null,
      args.financingPreference ? `Financing preference: ${args.financingPreference}` : null,
      args.timeline ? `Timeline: ${args.timeline}` : null,
      args.isBulkAcquisition ? "Interested in bulk acquisition" : null,
      args.isPartnershipInterest ? "Interested in a development/partnership arrangement" : null,
      args.purpose ? `Purpose: ${args.purpose}` : null,
      args.notes ? `Notes: ${args.notes}` : null,
    ].filter((l): l is string => Boolean(l));

    const opportunityRef = await nextOpportunityRef(ctx);
    const opportunityId = await ctx.db.insert("corporateOpportunities", {
      opportunityRef,
      organisationId,
      name: `${organisationName} — Corporate & Institutional Enquiry`,
      opportunityType: args.opportunityType,
      source: "diaspora_platform",
      diasporaCampaignId: campaign?._id,
      priority: "high",
      stageKey: firstStage.key,
      preferredLocation: args.preferredLocation,
      intendedUse: args.purpose,
      requirementNotes: requirementLines.length > 0 ? requirementLines.join("\n") : undefined,
    });

    if (args.unitsRequired && args.unitsRequired > 0) {
      await ctx.db.insert("corporateOpportunityLineItems", {
        opportunityId,
        propertyType: args.propertyType,
        quantityRequired: args.unitsRequired,
        quantityEoi: 0,
        quantityProposed: 0,
        quantityNegotiated: 0,
        quantityCommitted: 0,
        quantityPaid: 0,
        quantityAllocated: 0,
        allocationStatus: "not_started",
      });
    }

    await logAudit(ctx, {
      action: "create", entity: "corporate_organisations", entityId: organisationId, entityRef: orgRef,
      userId: undefined, userName: contactName, userRole: "diaspora_visitor",
      description: `Diaspora Corporate & Institutional enquiry — "${organisationName}" (${country})${campaign ? ` via campaign ${campaign.name} (${campaign.code})` : ""}`,
    });

    if (campaign) {
      await ctx.db.patch(campaign._id, { leadCount: campaign.leadCount + 1 });
    }

    const typeLabel = args.opportunityType ? OPPORTUNITY_TYPE_LABELS[args.opportunityType] : "Corporate & Institutional Enquiry";
    await ctx.scheduler.runAfter(0, internal.emails.sendAdminNewInquiryAlert, {
      to: await ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      adminPhones: await ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      message: `${organisationName} (${country}) submitted a ${typeLabel} enquiry via the Diaspora Corporate & Institutional programme.${campaign ? ` Campaign: ${campaign.name} (${campaign.code}).` : ""}`,
      subject: `New Corporate Diaspora Enquiry — ${organisationName}`,
    });
    await notifyStaffOfNewLead(ctx, {
      title: "New Corporate Diaspora Enquiry",
      message: `${organisationName} (${country}) submitted a corporate/institutional requirement${campaign ? ` via ${campaign.name}` : ""}.`,
    });

    return { organisationId, opportunityId };
  },
});

// Lightweight public check so the Diaspora Corporate programme page can show
// a clean "currently unavailable" fallback instead of a broken form when the
// underlying Corporate Marketing & Bulk Sales module is switched off.
export const getCorporateProgrammeAvailability = query({
  args: {},
  handler: async (ctx): Promise<{ available: boolean }> => {
    return { available: await isCorporateMarketingEnabled(ctx) };
  },
});
