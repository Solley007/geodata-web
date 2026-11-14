import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { logAudit } from "../taskboard.ts";
import { requirePermission, requireSignedInUser } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Configurable pipeline stages + organisation types for Corporate Marketing
// & Bulk Sales. Administrators can add/rename/reorder/deactivate — never
// hard-coded so the pipeline can evolve, per the governing spec.
// ══════════════════════════════════════════════════════════════════════════

// ── Default 22-stage pipeline (seeded once; fully editable afterwards) ────
export const DEFAULT_STAGES: Array<{ key: string; label: string; requiresApproval?: boolean; isClosedWon?: boolean; isClosedLost?: boolean }> = [
  { key: "prospect_identified", label: "Prospect Identified" },
  { key: "initial_contact", label: "Initial Contact" },
  { key: "letter_prepared", label: "Partnership Letter Prepared" },
  { key: "letter_approved", label: "Partnership Letter Approved", requiresApproval: true },
  { key: "letter_sent", label: "Partnership Letter Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "acknowledgement_pending", label: "Acknowledgement Pending" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "follow_up_required", label: "Follow-Up Required" },
  { key: "meeting_scheduled", label: "Meeting Scheduled" },
  { key: "presentation_completed", label: "Presentation Completed" },
  { key: "eoi_requested", label: "EOI Requested" },
  { key: "eoi_received", label: "EOI Received" },
  { key: "proposal_submitted", label: "Proposal Submitted" },
  { key: "negotiation", label: "Negotiation" },
  { key: "approval_pending", label: "Approval Pending", requiresApproval: true },
  { key: "commitment_received", label: "Commitment Received" },
  { key: "agreement", label: "Contract / Agreement" },
  { key: "payment_pending", label: "Payment Pending" },
  { key: "closed_won", label: "Closed Won", isClosedWon: true },
  { key: "closed_lost", label: "Closed Lost", isClosedLost: true },
  { key: "nurture", label: "Nurture / Future Opportunity" },
];

export const seedDefaultStages = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requireSignedInUser(ctx);
    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const existing = await ctx.db.query("corporatePipelineStages").collect();
    const existingKeys = new Set(existing.map((s) => s.key));
    let inserted = 0;
    for (let i = 0; i < DEFAULT_STAGES.length; i++) {
      const s = DEFAULT_STAGES[i];
      if (existingKeys.has(s.key)) continue;
      await ctx.db.insert("corporatePipelineStages", {
        key: s.key,
        label: s.label,
        order: i,
        requiresApproval: s.requiresApproval ?? false,
        isClosedWon: s.isClosedWon ?? false,
        isClosedLost: s.isClosedLost ?? false,
        status: "active",
        createdBy: user._id,
      });
      inserted++;
    }
    return { inserted };
  },
});

export const listStages = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("corporatePipelineStages").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const createStage = mutation({
  args: { key: v.string(), label: v.string(), requiresApproval: v.optional(v.boolean()), isClosedWon: v.optional(v.boolean()), isClosedLost: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.manage", { requireEnabled: false });
    const dup = await ctx.db.query("corporatePipelineStages").withIndex("by_key", (q) => q.eq("key", args.key)).unique();
    if (dup) throw new ConvexError({ code: "CONFLICT", message: "A stage with this key already exists" });
    const all = await ctx.db.query("corporatePipelineStages").collect();
    const maxOrder = all.reduce((m, s) => Math.max(m, s.order), -1);
    const id = await ctx.db.insert("corporatePipelineStages", {
      key: args.key, label: args.label, order: maxOrder + 1,
      requiresApproval: args.requiresApproval ?? false,
      isClosedWon: args.isClosedWon ?? false,
      isClosedLost: args.isClosedLost ?? false,
      status: "active", createdBy: user._id,
    });
    await logAudit(ctx, {
      action: "create", entity: "corporate_pipeline_stages", entityId: id, entityRef: args.key,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created corporate pipeline stage "${args.label}"`,
    });
    return id;
  },
});

export const updateStage = mutation({
  args: {
    id: v.id("corporatePipelineStages"),
    label: v.optional(v.string()),
    order: v.optional(v.number()),
    requiresApproval: v.optional(v.boolean()),
    isClosedWon: v.optional(v.boolean()),
    isClosedLost: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.manage", { requireEnabled: false });
    const { id, ...patch } = args;
    const stage = await ctx.db.get(id);
    if (!stage) throw new ConvexError({ code: "NOT_FOUND", message: "Stage not found" });
    await ctx.db.patch(id, patch);
    await logAudit(ctx, {
      action: "update", entity: "corporate_pipeline_stages", entityId: id, entityRef: stage.key,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated corporate pipeline stage "${stage.label}"`,
    });
  },
});

export const reorderStages = mutation({
  args: { ids: v.array(v.id("corporatePipelineStages")) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "corporate_marketing.manage", { requireEnabled: false });
    await Promise.all(args.ids.map((id, i) => ctx.db.patch(id, { order: i })));
  },
});

// ── Configurable acquisition lifecycle statuses (Institutional / Bulk
//    Acquisition Management) — exact same seed/CRUD pattern as pipeline
//    stages above. Never hard-coded so the workflow can evolve. ───────────
export const DEFAULT_ACQUISITION_STATUSES: Array<{ key: string; label: string; isFulfilled?: boolean; isCancelled?: boolean; isOnHold?: boolean; isDisputed?: boolean }> = [
  { key: "draft", label: "Draft" },
  { key: "pending_commercial_approval", label: "Pending Commercial Approval" },
  { key: "approved", label: "Approved" },
  { key: "committed", label: "Committed" },
  { key: "agreement_pending", label: "Agreement Pending" },
  { key: "agreement_executed", label: "Agreement Executed" },
  { key: "payment_in_progress", label: "Payment In Progress" },
  { key: "partially_fulfilled", label: "Partially Fulfilled" },
  { key: "partially_allocated", label: "Partially Allocated" },
  { key: "fully_paid", label: "Fully Paid" },
  { key: "fully_allocated", label: "Fully Allocated" },
  { key: "fulfilled", label: "Fulfilled", isFulfilled: true },
  { key: "completed", label: "Completed", isFulfilled: true },
  { key: "cancelled", label: "Cancelled", isCancelled: true },
  { key: "on_hold", label: "On Hold", isOnHold: true },
  { key: "disputed", label: "Disputed", isDisputed: true },
];

export const seedDefaultAcquisitionStatuses = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requireSignedInUser(ctx);
    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const existing = await ctx.db.query("corporateAcquisitionStatuses").collect();
    const existingKeys = new Set(existing.map((s) => s.key));
    let inserted = 0;
    for (let i = 0; i < DEFAULT_ACQUISITION_STATUSES.length; i++) {
      const s = DEFAULT_ACQUISITION_STATUSES[i];
      if (existingKeys.has(s.key)) continue;
      await ctx.db.insert("corporateAcquisitionStatuses", {
        key: s.key,
        label: s.label,
        order: i,
        isFulfilled: s.isFulfilled ?? false,
        isCancelled: s.isCancelled ?? false,
        isOnHold: s.isOnHold ?? false,
        isDisputed: s.isDisputed ?? false,
        status: "active",
        createdBy: user._id,
      });
      inserted++;
    }
    return { inserted };
  },
});

export const listAcquisitionStatuses = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("corporateAcquisitionStatuses").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const createAcquisitionStatus = mutation({
  args: { key: v.string(), label: v.string(), isFulfilled: v.optional(v.boolean()), isCancelled: v.optional(v.boolean()), isOnHold: v.optional(v.boolean()), isDisputed: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.manage", { requireEnabled: false });
    const dup = await ctx.db.query("corporateAcquisitionStatuses").withIndex("by_key", (q) => q.eq("key", args.key)).unique();
    if (dup) throw new ConvexError({ code: "CONFLICT", message: "A status with this key already exists" });
    const all = await ctx.db.query("corporateAcquisitionStatuses").collect();
    const maxOrder = all.reduce((m, s) => Math.max(m, s.order), -1);
    const id = await ctx.db.insert("corporateAcquisitionStatuses", {
      key: args.key, label: args.label, order: maxOrder + 1,
      isFulfilled: args.isFulfilled ?? false,
      isCancelled: args.isCancelled ?? false,
      isOnHold: args.isOnHold ?? false,
      isDisputed: args.isDisputed ?? false,
      status: "active", createdBy: user._id,
    });
    await logAudit(ctx, {
      action: "create", entity: "corporate_acquisition_statuses", entityId: id, entityRef: args.key,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created bulk acquisition status "${args.label}"`,
    });
    return id;
  },
});

export const updateAcquisitionStatus = mutation({
  args: {
    id: v.id("corporateAcquisitionStatuses"),
    label: v.optional(v.string()),
    order: v.optional(v.number()),
    isFulfilled: v.optional(v.boolean()),
    isCancelled: v.optional(v.boolean()),
    isOnHold: v.optional(v.boolean()),
    isDisputed: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.manage", { requireEnabled: false });
    const { id, ...patch } = args;
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", message: "Status not found" });
    await ctx.db.patch(id, patch);
    await logAudit(ctx, {
      action: "update", entity: "corporate_acquisition_statuses", entityId: id, entityRef: row.key,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated bulk acquisition status "${row.label}"`,
    });
  },
});

// ── Configurable organisation types ───────────────────────────────────────
export const DEFAULT_ORG_TYPES = [
  "Government Agency", "Government-Owned Organisation", "Private Company", "Public Company",
  "Bank / Financial Institution", "Insurance Company", "Pension / Investment Organisation",
  "Cooperative", "Professional Association", "NGO", "Development Organisation",
  "Educational Institution", "Religious Organisation", "Hospital / Healthcare Institution",
  "Real Estate / Developer", "Investment Company", "Other",
];

export const seedDefaultOrgTypes = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requireSignedInUser(ctx);
    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const existing = await ctx.db.query("corporateOrgTypes").collect();
    const existingNames = new Set(existing.map((t) => t.name));
    let inserted = 0;
    for (let i = 0; i < DEFAULT_ORG_TYPES.length; i++) {
      const name = DEFAULT_ORG_TYPES[i];
      if (existingNames.has(name)) continue;
      await ctx.db.insert("corporateOrgTypes", { name, order: i, status: "active", createdBy: user._id });
      inserted++;
    }
    return { inserted };
  },
});

export const listOrgTypes = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("corporateOrgTypes").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const createOrgType = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.manage", { requireEnabled: false });
    const all = await ctx.db.query("corporateOrgTypes").collect();
    if (all.some((t) => t.name.toLowerCase() === args.name.toLowerCase())) {
      throw new ConvexError({ code: "CONFLICT", message: "An organisation type with this name already exists" });
    }
    const maxOrder = all.reduce((m, t) => Math.max(m, t.order), -1);
    const id = await ctx.db.insert("corporateOrgTypes", { name: args.name, order: maxOrder + 1, status: "active", createdBy: user._id });
    await logAudit(ctx, {
      action: "create", entity: "corporate_org_types", entityId: id, entityRef: args.name,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created corporate organisation type "${args.name}"`,
    });
    return id;
  },
});

export const updateOrgType = mutation({
  args: { id: v.id("corporateOrgTypes"), name: v.optional(v.string()), status: v.optional(v.union(v.literal("active"), v.literal("inactive"))) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.manage", { requireEnabled: false });
    const { id, ...patch } = args;
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation type not found" });
    await ctx.db.patch(id, patch);
    await logAudit(ctx, {
      action: "update", entity: "corporate_org_types", entityId: id, entityRef: row.name,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated corporate organisation type "${row.name}"`,
    });
  },
});
