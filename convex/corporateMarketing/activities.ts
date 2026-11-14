import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Unified corporate activity/communication timeline. Manual entries (calls,
// emails, notes) are logged directly here; other corporate_marketing
// mutations (meetings.ts, letters.ts, etc) also insert rows here so every
// touchpoint with a corporate organisation surfaces in one place. Distinct
// from convex/communications.ts, which manages public site ticker/pop
// content, not CRM activity — never conflate the two.
// ══════════════════════════════════════════════════════════════════════════

const ACTIVITY_TYPES = [
  "call", "email", "meeting", "presentation", "letter", "follow_up",
  "eoi", "proposal", "negotiation", "inspection", "other",
] as const;

async function getOrgOwnerId(ctx: Parameters<typeof requirePermission>[0], organisationId: Id<"corporateOrganisations">): Promise<Id<"users"> | null | undefined> {
  const org = await ctx.db.get(organisationId);
  return org?.assignedOfficer ?? org?.relationshipOwner;
}

export const listActivities = query({
  args: {
    organisationId: v.optional(v.id("corporateOrganisations")),
    opportunityId: v.optional(v.id("corporateOpportunities")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");

    let rows: Doc<"corporateActivities">[];
    if (args.opportunityId) {
      rows = await ctx.db.query("corporateActivities").withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId!)).order("desc").collect();
    } else if (args.organisationId) {
      rows = await ctx.db.query("corporateActivities").withIndex("by_organisation", (q) => q.eq("organisationId", args.organisationId!)).order("desc").collect();
    } else {
      rows = await ctx.db.query("corporateActivities").order("desc").collect();
    }

    const orgIds = new Set(rows.map((r) => r.organisationId));
    const orgDocs = await Promise.all(Array.from(orgIds).map((id) => ctx.db.get(id)));
    const ownerByOrg = new Map<Id<"corporateOrganisations">, Id<"users"> | null | undefined>();
    for (const org of orgDocs) if (org) ownerByOrg.set(org._id, org.assignedOfficer ?? org.relationshipOwner);

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const scoped = await filterByScope(ctx, rows, scope, (a) => ownerByOrg.get(a.organisationId));

    const performerIds = new Set(scoped.map((a) => a.performedBy).filter((v): v is Id<"users"> => !!v));
    const contactIds = new Set(scoped.map((a) => a.contactId).filter((v): v is Id<"corporateContacts"> => !!v));
    const [performers, contacts] = await Promise.all([
      Promise.all(Array.from(performerIds).map((id) => ctx.db.get(id))),
      Promise.all(Array.from(contactIds).map((id) => ctx.db.get(id))),
    ]);
    const performerNameById = new Map<Id<"users">, string>();
    for (const p of performers) if (p) performerNameById.set(p._id, p.name ?? p.email ?? "Unknown");
    const contactNameById = new Map<Id<"corporateContacts">, string>();
    for (const c of contacts) if (c) contactNameById.set(c._id, c.name);

    return scoped.map((a) => ({
      ...a,
      performedByName: a.performedBy ? performerNameById.get(a.performedBy) : undefined,
      contactName: a.contactId ? contactNameById.get(a.contactId) : undefined,
    }));
  },
});

export const logActivity = mutation({
  args: {
    organisationId: v.id("corporateOrganisations"),
    opportunityId: v.optional(v.id("corporateOpportunities")),
    contactId: v.optional(v.id("corporateContacts")),
    activityType: v.union(...ACTIVITY_TYPES.map((t) => v.literal(t))),
    subject: v.optional(v.string()),
    notes: v.optional(v.string()),
    outcome: v.optional(v.string()),
    nextActionDate: v.optional(v.string()),
    occurredAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.create");

    const organisation = await ctx.db.get(args.organisationId);
    if (!organisation) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });

    const id = await ctx.db.insert("corporateActivities", {
      organisationId: args.organisationId,
      opportunityId: args.opportunityId,
      contactId: args.contactId,
      activityType: args.activityType,
      subject: args.subject,
      notes: args.notes,
      outcome: args.outcome,
      nextActionDate: args.nextActionDate,
      performedBy: user._id,
      occurredAt: args.occurredAt ?? new Date().toISOString(),
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_activities", entityId: id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Logged ${args.activityType.replace("_", " ")} activity for ${organisation.name}${args.subject ? `: ${args.subject}` : ""}`,
    });

    return id;
  },
});
