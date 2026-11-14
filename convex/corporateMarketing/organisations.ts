import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";
import { nextOrgRef } from "./refs.ts";

// ══════════════════════════════════════════════════════════════════════════
// Corporate organisations — institutional/corporate customer records for
// bulk acquisition. Entirely separate from the existing individual
// `clients` CRM table; never merged. Deny-by-default IAM permissions and
// department/directorate/enterprise data scoping apply exactly like every
// other module (see convex/iam/scope.ts).
// ══════════════════════════════════════════════════════════════════════════

const STATUS = v.union(v.literal("prospect"), v.literal("active"), v.literal("dormant"), v.literal("disengaged"));
const PRIORITY = v.union(v.literal("low"), v.literal("medium"), v.literal("high"));

function getOwnerId(org: Doc<"corporateOrganisations">): Id<"users"> | null | undefined {
  return org.assignedOfficer ?? org.relationshipOwner;
}

export const listOrganisations = query({
  args: {
    status: v.optional(STATUS),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");

    let rows: Doc<"corporateOrganisations">[];
    if (args.search && args.search.trim().length > 0) {
      rows = await ctx.db
        .query("corporateOrganisations")
        .withSearchIndex("search_name", (q) => {
          const s = q.search("name", args.search!);
          return args.status ? s.eq("status", args.status) : s;
        })
        .take(200);
    } else if (args.status) {
      rows = await ctx.db.query("corporateOrganisations").withIndex("by_status", (q) => q.eq("status", args.status!)).order("desc").collect();
    } else {
      rows = await ctx.db.query("corporateOrganisations").order("desc").collect();
    }

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const scoped = await filterByScope(ctx, rows, scope, getOwnerId);

    // Enrich with owner/officer names for the list view without N+1 per row rendering.
    const userIds = new Set<Id<"users">>();
    for (const org of scoped) {
      if (org.relationshipOwner) userIds.add(org.relationshipOwner);
      if (org.assignedOfficer) userIds.add(org.assignedOfficer);
    }
    const userDocs = await Promise.all(Array.from(userIds).map((id) => ctx.db.get(id)));
    const nameById = new Map<Id<"users">, string>();
    for (const u of userDocs) if (u) nameById.set(u._id, u.name ?? u.email ?? "Unknown");

    const diasporaCampaignIds = Array.from(new Set(scoped.map((o) => o.diasporaCampaignId).filter((id): id is Id<"diasporaCampaigns"> => id !== undefined)));
    const diasporaCampaigns = await Promise.all(diasporaCampaignIds.map((id) => ctx.db.get(id)));
    const diasporaCampaignNameById = new Map<Id<"diasporaCampaigns">, string>();
    for (const c of diasporaCampaigns) if (c) diasporaCampaignNameById.set(c._id, c.name);

    return scoped.map((org) => ({
      ...org,
      relationshipOwnerName: org.relationshipOwner ? nameById.get(org.relationshipOwner) : undefined,
      assignedOfficerName: org.assignedOfficer ? nameById.get(org.assignedOfficer) : undefined,
      diasporaCampaignName: org.diasporaCampaignId ? diasporaCampaignNameById.get(org.diasporaCampaignId) : undefined,
    }));
  },
});

export const getOrganisation = query({
  args: { id: v.id("corporateOrganisations") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    const org = await ctx.db.get(args.id);
    if (!org) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const [visible] = await filterByScope(ctx, [org], scope, getOwnerId);
    if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this organisation" });

    const [relationshipOwner, assignedOfficer, contacts, diasporaCampaign] = await Promise.all([
      org.relationshipOwner ? ctx.db.get(org.relationshipOwner) : null,
      org.assignedOfficer ? ctx.db.get(org.assignedOfficer) : null,
      ctx.db.query("corporateContacts").withIndex("by_organisation", (q) => q.eq("organisationId", org._id)).collect(),
      org.diasporaCampaignId ? ctx.db.get(org.diasporaCampaignId) : null,
    ]);

    return {
      ...org,
      relationshipOwnerName: relationshipOwner?.name ?? relationshipOwner?.email,
      assignedOfficerName: assignedOfficer?.name ?? assignedOfficer?.email,
      contactCount: contacts.length,
      diasporaCampaignName: diasporaCampaign?.name,
    };
  },
});

export const createOrganisation = mutation({
  args: {
    name: v.string(),
    orgTypeKey: v.optional(v.string()),
    industry: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    officialEmail: v.optional(v.string()),
    phone: v.optional(v.string()),
    relationshipOwner: v.optional(v.id("users")),
    assignedOfficer: v.optional(v.id("users")),
    source: v.optional(v.string()),
    campaignId: v.optional(v.id("corporateCampaigns")),
    priority: v.optional(PRIORITY),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.create");
    if (!args.name.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Organisation name is required" });

    const orgRef = await nextOrgRef(ctx);
    const id = await ctx.db.insert("corporateOrganisations", {
      orgRef,
      name: args.name.trim(),
      orgTypeKey: args.orgTypeKey,
      industry: args.industry,
      registrationNumber: args.registrationNumber,
      website: args.website,
      address: args.address,
      city: args.city,
      state: args.state,
      country: args.country,
      officialEmail: args.officialEmail,
      phone: args.phone,
      relationshipOwner: args.relationshipOwner,
      assignedOfficer: args.assignedOfficer,
      source: args.source,
      campaignId: args.campaignId,
      status: "prospect",
      priority: args.priority ?? "medium",
      notes: args.notes,
      createdBy: user._id,
      updatedBy: user._id,
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_organisations", entityId: id, entityRef: orgRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created corporate organisation "${args.name.trim()}"`,
    });

    return id;
  },
});

export const updateOrganisation = mutation({
  args: {
    id: v.id("corporateOrganisations"),
    name: v.optional(v.string()),
    orgTypeKey: v.optional(v.string()),
    industry: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    officialEmail: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.optional(v.string()),
    campaignId: v.optional(v.id("corporateCampaigns")),
    status: v.optional(STATUS),
    priority: v.optional(PRIORITY),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const { id, ...patch } = args;
    const org = await ctx.db.get(id);
    if (!org) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const [visible] = await filterByScope(ctx, [org], scope, getOwnerId);
    if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this organisation" });

    await ctx.db.patch(id, { ...patch, updatedBy: user._id });

    await logAudit(ctx, {
      action: "update", entity: "corporate_organisations", entityId: id, entityRef: org.orgRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated corporate organisation "${org.name}"`,
      before: JSON.stringify(org),
      after: JSON.stringify(patch),
    });
  },
});

export const assignOrganisation = mutation({
  args: {
    id: v.id("corporateOrganisations"),
    relationshipOwner: v.optional(v.id("users")),
    assignedOfficer: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.assign");
    const org = await ctx.db.get(args.id);
    if (!org) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });

    await ctx.db.patch(args.id, {
      relationshipOwner: args.relationshipOwner,
      assignedOfficer: args.assignedOfficer,
      updatedBy: user._id,
    });

    await logAudit(ctx, {
      action: "assign", entity: "corporate_organisations", entityId: args.id, entityRef: org.orgRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Reassigned corporate organisation "${org.name}"`,
      after: JSON.stringify({ relationshipOwner: args.relationshipOwner, assignedOfficer: args.assignedOfficer }),
    });
  },
});
