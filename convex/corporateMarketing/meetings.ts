import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Corporate meetings / presentations — scheduling and outcome tracking for
// in-person or virtual meetings with a prospective corporate organisation.
// Any presentation deck lives in the EXISTING vaultDocuments table. Every
// meeting also lands a row in corporateActivities (activities.ts) so it
// shows up on the unified organisation/opportunity timeline.
// ══════════════════════════════════════════════════════════════════════════

async function getOrgOwnerId(ctx: Parameters<typeof requirePermission>[0], organisationId: Id<"corporateOrganisations">): Promise<Id<"users"> | null | undefined> {
  const org = await ctx.db.get(organisationId);
  return org?.assignedOfficer ?? org?.relationshipOwner;
}

async function assertMeetingVisible(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  id: Id<"corporateMeetings">,
): Promise<Doc<"corporateMeetings">> {
  const meeting = await ctx.db.get(id);
  if (!meeting) throw new ConvexError({ code: "NOT_FOUND", message: "Meeting not found" });
  const ownerId = await getOrgOwnerId(ctx, meeting.organisationId);
  const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
  const [visible] = await filterByScope(ctx, [meeting], scope, () => ownerId);
  if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this meeting" });
  return meeting;
}

export const listMeetings = query({
  args: {
    organisationId: v.optional(v.id("corporateOrganisations")),
    opportunityId: v.optional(v.id("corporateOpportunities")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");

    let rows: Doc<"corporateMeetings">[];
    if (args.opportunityId) {
      rows = await ctx.db.query("corporateMeetings").withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId!)).order("desc").collect();
    } else if (args.organisationId) {
      rows = await ctx.db.query("corporateMeetings").withIndex("by_organisation", (q) => q.eq("organisationId", args.organisationId!)).order("desc").collect();
    } else {
      rows = await ctx.db.query("corporateMeetings").order("desc").collect();
    }

    const orgIds = new Set(rows.map((r) => r.organisationId));
    const orgDocs = await Promise.all(Array.from(orgIds).map((id) => ctx.db.get(id)));
    const ownerByOrg = new Map<Id<"corporateOrganisations">, Id<"users"> | null | undefined>();
    for (const org of orgDocs) if (org) ownerByOrg.set(org._id, org.assignedOfficer ?? org.relationshipOwner);

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    return filterByScope(ctx, rows, scope, (m) => ownerByOrg.get(m.organisationId));
  },
});

export const getMeeting = query({
  args: { id: v.id("corporateMeetings") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    return assertMeetingVisible(ctx, user, args.id);
  },
});

export const createMeeting = mutation({
  args: {
    organisationId: v.id("corporateOrganisations"),
    opportunityId: v.optional(v.id("corporateOpportunities")),
    meetingDate: v.string(),
    location: v.optional(v.string()),
    isVirtual: v.optional(v.boolean()),
    participants: v.optional(v.string()),
    agenda: v.optional(v.string()),
    presentationVaultDocumentId: v.optional(v.id("vaultDocuments")),
    responsibleOfficer: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<Id<"corporateMeetings">> => {
    const user = await requirePermission(ctx, "corporate_marketing.create");

    const organisation = await ctx.db.get(args.organisationId);
    if (!organisation) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });

    const id = await ctx.db.insert("corporateMeetings", {
      organisationId: args.organisationId,
      opportunityId: args.opportunityId,
      meetingDate: args.meetingDate,
      location: args.location,
      isVirtual: args.isVirtual,
      participants: args.participants,
      agenda: args.agenda,
      presentationVaultDocumentId: args.presentationVaultDocumentId,
      responsibleOfficer: args.responsibleOfficer ?? user._id,
      createdBy: user._id,
    });

    await ctx.db.insert("corporateActivities", {
      organisationId: args.organisationId,
      opportunityId: args.opportunityId,
      activityType: "meeting",
      subject: `Meeting scheduled for ${new Date(args.meetingDate).toLocaleDateString()}`,
      notes: args.agenda,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_meetings", entityId: id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Scheduled a meeting with ${organisation.name} for ${new Date(args.meetingDate).toLocaleDateString()}`,
    });

    return id;
  },
});

export const recordMeetingOutcome = mutation({
  args: {
    id: v.id("corporateMeetings"),
    outcome: v.string(),
    decisions: v.optional(v.string()),
    nextActionDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const meeting = await assertMeetingVisible(ctx, user, args.id);

    await ctx.db.patch(args.id, {
      outcome: args.outcome,
      decisions: args.decisions,
      nextActionDate: args.nextActionDate,
    });

    await ctx.db.insert("corporateActivities", {
      organisationId: meeting.organisationId,
      opportunityId: meeting.opportunityId,
      activityType: "meeting",
      subject: "Meeting outcome recorded",
      notes: args.outcome,
      nextActionDate: args.nextActionDate,
      performedBy: user._id,
      occurredAt: new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "update", entity: "corporate_meetings", entityId: args.id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Recorded outcome for meeting on ${new Date(meeting.meetingDate).toLocaleDateString()}`,
    });
  },
});

export const updateMeeting = mutation({
  args: {
    id: v.id("corporateMeetings"),
    meetingDate: v.optional(v.string()),
    location: v.optional(v.string()),
    isVirtual: v.optional(v.boolean()),
    participants: v.optional(v.string()),
    agenda: v.optional(v.string()),
    presentationVaultDocumentId: v.optional(v.id("vaultDocuments")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const { id, ...patch } = args;
    const meeting = await assertMeetingVisible(ctx, user, id);

    await ctx.db.patch(id, patch);

    await logAudit(ctx, {
      action: "update", entity: "corporate_meetings", entityId: id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated meeting on ${new Date(meeting.meetingDate).toLocaleDateString()}`,
    });
  },
});

// Shared Convex storage upload URL for presentation decks (same pattern as
// convex/cms.ts / letters.ts / esignature.ts).
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "corporate_marketing.document_upload");
    return ctx.storage.generateUploadUrl();
  },
});
