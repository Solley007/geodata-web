import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Corporate contacts — multiple named contacts per corporate organisation,
// each optionally flagged with role(s): decision maker, procurement,
// finance, legal, HR, executive. Access follows the parent organisation's
// data scope (own/assigned/department/directorate/enterprise).
// ══════════════════════════════════════════════════════════════════════════

export const listContacts = query({
  args: { organisationId: v.id("corporateOrganisations") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    const org = await ctx.db.get(args.organisationId);
    if (!org) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const [visible] = await filterByScope(ctx, [org], scope, (o) => o.assignedOfficer ?? o.relationshipOwner);
    if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this organisation" });

    const rows = await ctx.db
      .query("corporateContacts")
      .withIndex("by_organisation", (q) => q.eq("organisationId", args.organisationId))
      .collect();
    return rows.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  },
});

export const createContact = mutation({
  args: {
    organisationId: v.id("corporateOrganisations"),
    name: v.string(),
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    preferredChannel: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    isAuthorised: v.optional(v.boolean()),
    isDecisionMaker: v.optional(v.boolean()),
    isProcurementContact: v.optional(v.boolean()),
    isFinanceContact: v.optional(v.boolean()),
    isLegalContact: v.optional(v.boolean()),
    isHrContact: v.optional(v.boolean()),
    isExecutiveContact: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.create");
    if (!args.name.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Contact name is required" });

    const org = await ctx.db.get(args.organisationId);
    if (!org) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });

    // Only one primary contact per organisation — demote any existing primary.
    if (args.isPrimary) {
      const existingPrimary = await ctx.db
        .query("corporateContacts")
        .withIndex("by_organisation", (q) => q.eq("organisationId", args.organisationId))
        .collect();
      for (const c of existingPrimary) {
        if (c.isPrimary) await ctx.db.patch(c._id, { isPrimary: false });
      }
    }

    const id = await ctx.db.insert("corporateContacts", {
      organisationId: args.organisationId,
      name: args.name.trim(),
      jobTitle: args.jobTitle,
      department: args.department,
      email: args.email,
      phone: args.phone,
      preferredChannel: args.preferredChannel,
      isPrimary: args.isPrimary ?? false,
      isAuthorised: args.isAuthorised ?? false,
      isDecisionMaker: args.isDecisionMaker ?? false,
      isProcurementContact: args.isProcurementContact ?? false,
      isFinanceContact: args.isFinanceContact ?? false,
      isLegalContact: args.isLegalContact ?? false,
      isHrContact: args.isHrContact ?? false,
      isExecutiveContact: args.isExecutiveContact ?? false,
      notes: args.notes,
      status: "active",
    });

    await logAudit(ctx, {
      action: "create", entity: "corporate_contacts", entityId: id, entityRef: org.orgRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Added contact "${args.name.trim()}" to "${org.name}"`,
    });

    return id;
  },
});

export const updateContact = mutation({
  args: {
    id: v.id("corporateContacts"),
    name: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    preferredChannel: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    isAuthorised: v.optional(v.boolean()),
    isDecisionMaker: v.optional(v.boolean()),
    isProcurementContact: v.optional(v.boolean()),
    isFinanceContact: v.optional(v.boolean()),
    isLegalContact: v.optional(v.boolean()),
    isHrContact: v.optional(v.boolean()),
    isExecutiveContact: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const { id, ...patch } = args;
    const contact = await ctx.db.get(id);
    if (!contact) throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });

    if (patch.isPrimary) {
      const siblings = await ctx.db
        .query("corporateContacts")
        .withIndex("by_organisation", (q) => q.eq("organisationId", contact.organisationId))
        .collect();
      for (const c of siblings) {
        if (c._id !== id && c.isPrimary) await ctx.db.patch(c._id, { isPrimary: false });
      }
    }

    await ctx.db.patch(id, patch);

    const org = await ctx.db.get(contact.organisationId);
    await logAudit(ctx, {
      action: "update", entity: "corporate_contacts", entityId: id, entityRef: org?.orgRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated contact "${contact.name}"`,
    });
  },
});

export const deleteContact = mutation({
  args: { id: v.id("corporateContacts") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const contact = await ctx.db.get(args.id);
    if (!contact) throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });

    await ctx.db.delete(args.id);

    const org = await ctx.db.get(contact.organisationId);
    await logAudit(ctx, {
      action: "delete", entity: "corporate_contacts", entityId: args.id, entityRef: org?.orgRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Removed contact "${contact.name}" from "${org?.name ?? "organisation"}"`,
    });
  },
});
