import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Follow-up tasks for corporate organisations/opportunities. These are
// EXISTING `tasks` rows (never a second task system) tagged with
// `corporateOrganisationId`/`corporateOpportunityId` and category
// "corporate_marketing". Inserted directly here (gated by the
// corporate_marketing permission catalogue) rather than through
// `taskboard.createTask`, which requires the broader staff-role gate —
// mirrors the approach already used for approvals in letters.ts.
// ══════════════════════════════════════════════════════════════════════════

async function nextTaskRef(ctx: Parameters<typeof requirePermission>[0]): Promise<string> {
  const last = await ctx.db.query("tasks").order("desc").first();
  const n = last ? parseInt(last.taskRef.replace("GWS-TSK-", "") || "0", 10) + 1 : 1;
  return `GWS-TSK-${String(n).padStart(4, "0")}`;
}

async function getOrgOwnerId(ctx: Parameters<typeof requirePermission>[0], organisationId: Id<"corporateOrganisations">): Promise<Id<"users"> | null | undefined> {
  const org = await ctx.db.get(organisationId);
  return org?.assignedOfficer ?? org?.relationshipOwner;
}

export const listFollowUps = query({
  args: {
    organisationId: v.optional(v.id("corporateOrganisations")),
    opportunityId: v.optional(v.id("corporateOpportunities")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");

    let rows: Doc<"tasks">[];
    if (args.opportunityId) {
      rows = await ctx.db.query("tasks").withIndex("by_corporate_opportunity", (q) => q.eq("corporateOpportunityId", args.opportunityId)).order("desc").collect();
    } else if (args.organisationId) {
      rows = await ctx.db.query("tasks").withIndex("by_corporate_organisation", (q) => q.eq("corporateOrganisationId", args.organisationId)).order("desc").collect();
    } else {
      rows = await ctx.db.query("tasks").filter((q) => q.eq(q.field("category"), "corporate_marketing")).order("desc").collect();
    }

    const orgIds = new Set(rows.map((r) => r.corporateOrganisationId).filter((v): v is Id<"corporateOrganisations"> => !!v));
    const orgDocs = await Promise.all(Array.from(orgIds).map((id) => ctx.db.get(id)));
    const ownerByOrg = new Map<Id<"corporateOrganisations">, Id<"users"> | null | undefined>();
    for (const org of orgDocs) if (org) ownerByOrg.set(org._id, org.assignedOfficer ?? org.relationshipOwner);

    const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
    const scoped = await filterByScope(ctx, rows, scope, (t) => (t.corporateOrganisationId ? ownerByOrg.get(t.corporateOrganisationId) : t.assignedTo ?? t.createdBy));

    const assigneeIds = new Set(scoped.map((t) => t.assignedTo).filter((v): v is Id<"users"> => !!v));
    const assignees = await Promise.all(Array.from(assigneeIds).map((id) => ctx.db.get(id)));
    const assigneeNameById = new Map<Id<"users">, string>();
    for (const a of assignees) if (a) assigneeNameById.set(a._id, a.name ?? a.email ?? "Unknown");

    return scoped.map((t) => ({
      ...t,
      assigneeName: t.assignedTo ? assigneeNameById.get(t.assignedTo) : undefined,
    }));
  },
});

export const createFollowUp = mutation({
  args: {
    organisationId: v.id("corporateOrganisations"),
    opportunityId: v.optional(v.id("corporateOpportunities")),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.create");
    if (!args.title.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Title is required" });

    const organisation = await ctx.db.get(args.organisationId);
    if (!organisation) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found" });

    const taskRef = await nextTaskRef(ctx);
    const id = await ctx.db.insert("tasks", {
      taskRef,
      title: args.title.trim(),
      description: args.description,
      priority: args.priority,
      status: "todo",
      category: "corporate_marketing",
      assignedTo: args.assignedTo,
      createdBy: user._id,
      dueDate: args.dueDate,
      corporateOrganisationId: args.organisationId,
      corporateOpportunityId: args.opportunityId,
      notes: args.notes,
    });

    await logAudit(ctx, {
      action: "create", entity: "tasks", entityId: id, entityRef: taskRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created follow-up "${args.title.trim()}" for ${organisation.name}`,
    });

    return id;
  },
});

export const updateFollowUpStatus = mutation({
  args: { id: v.id("tasks"), status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("blocked"), v.literal("done"), v.literal("cancelled")) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.edit");
    const task = await ctx.db.get(args.id);
    if (!task || task.category !== "corporate_marketing") throw new ConvexError({ code: "NOT_FOUND", message: "Follow-up not found" });
    if (task.corporateOrganisationId) {
      const ownerId = await getOrgOwnerId(ctx, task.corporateOrganisationId);
      const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
      const [visible] = await filterByScope(ctx, [task], scope, () => ownerId);
      if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this follow-up" });
    }

    await ctx.db.patch(args.id, { status: args.status, completedAt: args.status === "done" ? new Date().toISOString() : undefined });

    await logAudit(ctx, {
      action: "status_change", entity: "tasks", entityId: args.id, entityRef: task.taskRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Follow-up status: ${task.status} → ${args.status}`,
    });
  },
});
