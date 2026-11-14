import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { internal } from "../_generated/api.js";
import { logAudit } from "../taskboard.ts";
import { notifyStaffOfNewLead } from "../sales.ts";
import { notifyUser } from "../notifications.ts";
import { insertDiasporaLead, PROGRAMME_KEY, PROGRAMME_LABELS } from "./leads.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Consultation bookings for the Diaspora Investment & Property Platform.
// A "Book a Consultation" CTA creates a `diasporaConsultations` row AND its
// underlying `leads` row (via `insertDiasporaLead`, shared with
// `submitDiasporaEnquiry`) in one mutation — never a parallel booking system
// disconnected from the existing CRM.
// ══════════════════════════════════════════════════════════════════════════

const CONSULTATION_TYPE = v.union(
  v.literal("property"), v.literal("investment"), v.literal("advisory"),
  v.literal("development"), v.literal("partnership"), v.literal("corporate"), v.literal("virtual_presentation"),
);

const STATUS = v.union(v.literal("requested"), v.literal("scheduled"), v.literal("completed"), v.literal("no_show"), v.literal("cancelled"));

export const CONSULTATION_TYPE_LABELS: Record<Doc<"diasporaConsultations">["consultationType"], string> = {
  property: "Property Consultation",
  investment: "Investment Consultation",
  advisory: "General Advisory",
  development: "Development Discussion",
  partnership: "Partnership Discussion",
  corporate: "Corporate / Institutional Briefing",
  virtual_presentation: "Virtual Presentation",
};

const STATUS_LABELS: Record<Doc<"diasporaConsultations">["status"], string> = {
  requested: "Requested",
  scheduled: "Scheduled",
  completed: "Completed",
  no_show: "No-Show",
  cancelled: "Cancelled",
};

// Public — no sign-in required. Books a consultation from a programme page's
// "Book a Consultation" CTA. Creates the underlying lead in the same call so
// staff never have to reconcile two disconnected records.
export const requestConsultation = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    country: v.string(),
    city: v.optional(v.string()),
    customerSegment: v.optional(v.string()),
    programmeKey: PROGRAMME_KEY,
    consultationType: CONSULTATION_TYPE,
    preferredContact: v.optional(v.string()),
    notes: v.optional(v.string()),
    campaignCode: v.optional(v.string()),
    consent: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ consultationId: Id<"diasporaConsultations"> }> => {
    const name = args.name.trim();
    const email = args.email.trim();
    const phone = args.phone.trim();
    const country = args.country.trim();
    if (!name) throw new ConvexError({ code: "BAD_REQUEST", message: "Name is required" });
    if (!email) throw new ConvexError({ code: "BAD_REQUEST", message: "Email is required" });
    if (!phone) throw new ConvexError({ code: "BAD_REQUEST", message: "Phone number is required" });
    if (!country) throw new ConvexError({ code: "BAD_REQUEST", message: "Country is required" });
    if (!args.consent) throw new ConvexError({ code: "BAD_REQUEST", message: "Consent to be contacted is required" });

    const { leadId, campaign } = await insertDiasporaLead(ctx, {
      name, email, phone, country,
      city: args.city,
      customerSegment: args.customerSegment,
      programmeInterest: [args.programmeKey],
      campaignCode: args.campaignCode,
      extraNotesLines: [
        args.city ? `City: ${args.city}` : null,
        `Requested a consultation: ${CONSULTATION_TYPE_LABELS[args.consultationType]}`,
        args.preferredContact ? `Preferred contact: ${args.preferredContact}` : null,
        args.notes ? `Notes: ${args.notes}` : null,
      ],
    });

    const consultationId = await ctx.db.insert("diasporaConsultations", {
      leadId,
      consultationType: args.consultationType,
      programmeKey: args.programmeKey,
      diasporaCampaignId: campaign?._id,
      status: "requested",
      notes: args.notes,
    });

    const typeLabel = CONSULTATION_TYPE_LABELS[args.consultationType];
    await ctx.scheduler.runAfter(0, internal.emails.sendAdminNewInquiryAlert, {
      to: await ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      adminPhones: await ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      name,
      email,
      phone,
      message: `${name} (${country}) requested a ${typeLabel.toLowerCase()} for the ${PROGRAMME_LABELS[args.programmeKey]} programme.${campaign ? ` Campaign: ${campaign.name} (${campaign.code}).` : ""}`,
      subject: `New Consultation Request — ${name}`,
    });
    await notifyStaffOfNewLead(ctx, {
      title: "New Consultation Request",
      message: `${name} (${country}) requested a ${typeLabel.toLowerCase()}${campaign ? ` via ${campaign.name}` : ""}.`,
    });

    return { consultationId };
  },
});

type ConsultationWithLead = Doc<"diasporaConsultations"> & {
  leadName: string;
  leadEmail: string | undefined;
  leadPhone: string;
  leadCountry: string | undefined;
  campaignName: string | undefined;
};

// Admin: consultation list, optionally filtered by status. Bounded via the
// status index, never a full scan.
export const listConsultations = query({
  args: { status: v.optional(STATUS) },
  handler: async (ctx, args): Promise<Array<ConsultationWithLead>> => {
    await requirePermission(ctx, "diaspora.consultation_manage", { requireEnabled: false });

    const rows = args.status
      ? await ctx.db.query("diasporaConsultations").withIndex("by_status", (q) => q.eq("status", args.status!)).order("desc").collect()
      : await ctx.db.query("diasporaConsultations").order("desc").collect();

    const leadIds = Array.from(new Set(rows.map((r) => r.leadId)));
    const leads = await Promise.all(leadIds.map((id) => ctx.db.get(id)));
    const leadById = new Map(leads.filter((l): l is Doc<"leads"> => l !== null).map((l) => [l._id, l]));

    const campaignIds = Array.from(new Set(rows.map((r) => r.diasporaCampaignId).filter((id): id is Id<"diasporaCampaigns"> => id !== undefined)));
    const campaigns = await Promise.all(campaignIds.map((id) => ctx.db.get(id)));
    const campaignById = new Map(campaigns.filter((c): c is Doc<"diasporaCampaigns"> => c !== null).map((c) => [c._id, c]));

    return rows.map((r) => {
      const lead = leadById.get(r.leadId);
      const campaign = r.diasporaCampaignId ? campaignById.get(r.diasporaCampaignId) : undefined;
      return {
        ...r,
        leadName: lead?.name ?? "Unknown",
        leadEmail: lead?.email,
        leadPhone: lead?.phone ?? "",
        leadCountry: lead?.country,
        campaignName: campaign?.name,
      };
    });
  },
});

export const assignConsultationOfficer = mutation({
  args: { id: v.id("diasporaConsultations"), officerId: v.optional(v.id("users")) },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.consultation_manage", { requireEnabled: false });
    const consultation = await ctx.db.get(args.id);
    if (!consultation) throw new ConvexError({ code: "NOT_FOUND", message: "Consultation not found" });

    await ctx.db.patch(args.id, { assignedOfficer: args.officerId });

    if (args.officerId) {
      await notifyUser(ctx, {
        userId: args.officerId,
        type: "consultation_assigned",
        title: "Consultation Assigned To You",
        message: `You've been assigned a ${CONSULTATION_TYPE_LABELS[consultation.consultationType]}.`,
        link: "/admin/diaspora",
      });
    }

    // Reassignments are logged (lighter than a full financial audit, but
    // kept for traceability) — status changes below get their own entry.
    await logAudit(ctx, {
      action: "update", entity: "diaspora_consultations", entityId: args.id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Consultation reassigned${args.officerId ? "" : " (unassigned)"}`,
      before: JSON.stringify({ assignedOfficer: consultation.assignedOfficer ?? null }),
      after: JSON.stringify({ assignedOfficer: args.officerId ?? null }),
    });
  },
});

export const updateConsultationStatus = mutation({
  args: {
    id: v.id("diasporaConsultations"),
    status: STATUS,
    scheduledAt: v.optional(v.string()),
    outcome: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.consultation_manage", { requireEnabled: false });
    const consultation = await ctx.db.get(args.id);
    if (!consultation) throw new ConvexError({ code: "NOT_FOUND", message: "Consultation not found" });

    const patch: Partial<Doc<"diasporaConsultations">> = { status: args.status };
    if (args.scheduledAt !== undefined) patch.scheduledAt = args.scheduledAt;
    if (args.outcome !== undefined) patch.outcome = args.outcome;
    if (args.followUpDate !== undefined) patch.followUpDate = args.followUpDate;
    await ctx.db.patch(args.id, patch);

    await logAudit(ctx, {
      action: "update", entity: "diaspora_consultations", entityId: args.id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Consultation status: ${STATUS_LABELS[consultation.status]} → ${STATUS_LABELS[args.status]}`,
      before: JSON.stringify({ status: consultation.status }),
      after: JSON.stringify({ status: args.status }),
    });
  },
});
