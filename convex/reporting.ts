import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { api } from "./_generated/api.js";
import { logAudit } from "./taskboard.ts";
import { hasPermission } from "./iam/access.ts";
import { isFeatureEnabled, requireFeatureEnabled } from "./featureToggles.ts";
import { notifyUser } from "./notifications.ts";

// ══════════════════════════════════════════════════════════════════════════
// MANAGEMENT REPORTING
//
// Configurable operational/commercial/finance/management/governance reports
// built ONLY from real data already in this app (tasks, approvals, kyc,
// finance, transactions, payments, audit) — never invented metrics. Report
// approval reuses the existing Tasks/Approvals engine (convex/taskboard.ts,
// `approvals` table, approvalType "report_approval") — no second approval
// system. The finalized report file is an ordinary vaultDocuments row
// (docType "report") in the EXISTING Documents & Vault — no second archive.
// Access follows existing IAM/RBAC; subscribing to Internal Communications
// never grants report access, and vice versa (kept as two distinct
// permission sets on purpose).
// ══════════════════════════════════════════════════════════════════════════

const STAFF_ROLES = ["super_admin", "admin", "manager", "agent"];

export const REPORT_PERMISSIONS = ["reports.view", "reports.create", "reports.approve", "reports.distribute", "reports.admin"] as const;
export type ReportPermission = (typeof REPORT_PERMISSIONS)[number];

async function requireStaff(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in required" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  if (!user || !STAFF_ROLES.includes(user.role ?? "")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return user;
}

async function requireReportPermission(ctx: QueryCtx | MutationCtx, permission: ReportPermission): Promise<Doc<"users">> {
  const user = await requireStaff(ctx);
  const allowed = await hasPermission(ctx, user._id, permission);
  if (!allowed && user.role !== "super_admin") {
    throw new ConvexError({ code: "FORBIDDEN", message: "You do not have explicit reporting authority for this action" });
  }
  return user;
}

async function nextRunRef(ctx: MutationCtx): Promise<string> {
  const last = await ctx.db.query("reportRuns").order("desc").first();
  const n = last ? parseInt(last.runRef.replace("GWS-RPT-", "") || "0", 10) + 1 : 1;
  return `GWS-RPT-${String(n).padStart(4, "0")}`;
}

// Shared Convex storage upload URL for the generated report PDF (same
// pattern as convex/cms.ts / convex/corporateMarketing/letters.ts) — the
// file still lands in the EXISTING vaultDocuments table via
// docvault.createDocument, never a second document store.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireReportPermission(ctx, "reports.create");
    return ctx.storage.generateUploadUrl();
  },
});

// ── Non-throwing access check for gating the Reports UI ────────────────────

export const getMyReportsAccess = query({
  args: {},
  handler: async (ctx): Promise<{
    featureEnabled: boolean; isStaff: boolean;
    canView: boolean; canCreate: boolean; canApprove: boolean; canDistribute: boolean; canAdmin: boolean;
  }> => {
    const featureEnabled = await isFeatureEnabled(ctx, "feature_management_reporting");
    const identity = await ctx.auth.getUserIdentity();
    const deny = { featureEnabled, isStaff: false, canView: false, canCreate: false, canApprove: false, canDistribute: false, canAdmin: false };
    if (!identity) return deny;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user || !STAFF_ROLES.includes(user.role ?? "")) return deny;
    const isSuperAdmin = user.role === "super_admin";
    return {
      featureEnabled,
      isStaff: true,
      canView: isSuperAdmin || (await hasPermission(ctx, user._id, "reports.view")),
      canCreate: isSuperAdmin || (await hasPermission(ctx, user._id, "reports.create")),
      canApprove: isSuperAdmin || (await hasPermission(ctx, user._id, "reports.approve")),
      canDistribute: isSuperAdmin || (await hasPermission(ctx, user._id, "reports.distribute")),
      canAdmin: isSuperAdmin || (await hasPermission(ctx, user._id, "reports.admin")),
    };
  },
});

// ── Report Definitions (configurable catalogue) ─────────────────────────────

export const listReportDefinitions = query({
  args: {},
  handler: async (ctx) => {
    await requireReportPermission(ctx, "reports.view");
    return await ctx.db.query("reportDefinitions").collect();
  },
});

const DEFAULT_DEFINITIONS: {
  key: string; name: string; description: string;
  reportType: "operational" | "commercial" | "finance" | "management" | "governance";
  dataSource: "operational_tasks" | "approvals_overview" | "finance_kyc_overview" | "commercial_transactions" | "governance_compliance";
  frequency: "on_demand" | "daily" | "weekly" | "monthly" | "quarterly";
  requiresApproval: boolean;
}[] = [
  { key: "operational_task_summary", name: "Operational Task Summary", description: "Open, overdue, and completed tasks across the organisation.", reportType: "operational", dataSource: "operational_tasks", frequency: "weekly", requiresApproval: false },
  { key: "approvals_overview", name: "Approvals Overview", description: "Pending, approved, rejected, and urgent approval requests.", reportType: "governance", dataSource: "approvals_overview", frequency: "weekly", requiresApproval: false },
  { key: "finance_kyc_overview", name: "Finance & KYC Overview", description: "KYC and finance application pipeline, plus payments received.", reportType: "finance", dataSource: "finance_kyc_overview", frequency: "monthly", requiresApproval: true },
  { key: "commercial_transactions_summary", name: "Commercial Transactions Summary", description: "Transaction volume and value across the sales pipeline.", reportType: "commercial", dataSource: "commercial_transactions", frequency: "monthly", requiresApproval: true },
  { key: "governance_compliance_report", name: "Governance & Compliance Report", description: "Audit activity and unresolved segregation-of-duties violations for Board/Audit review.", reportType: "governance", dataSource: "governance_compliance", frequency: "quarterly", requiresApproval: true },
];

// Idempotent seed for the standard report catalogue. Safe to call multiple times.
export const seedDefaultReportDefinitions = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requireStaff(ctx);
    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const existing = await ctx.db.query("reportDefinitions").collect();
    const existingKeys = new Set(existing.map((d) => d.key));
    let inserted = 0;
    for (const d of DEFAULT_DEFINITIONS) {
      if (existingKeys.has(d.key)) continue;
      await ctx.db.insert("reportDefinitions", { ...d, isActive: true, createdBy: user._id, createdAt: new Date().toISOString() });
      inserted++;
    }
    return { inserted };
  },
});

export const upsertReportDefinition = mutation({
  args: {
    id: v.optional(v.id("reportDefinitions")),
    key: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    reportType: v.union(v.literal("operational"), v.literal("commercial"), v.literal("finance"), v.literal("management"), v.literal("governance")),
    dataSource: v.union(
      v.literal("operational_tasks"), v.literal("approvals_overview"), v.literal("finance_kyc_overview"),
      v.literal("commercial_transactions"), v.literal("governance_compliance"),
    ),
    frequency: v.union(v.literal("on_demand"), v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("quarterly")),
    requiresApproval: v.boolean(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"reportDefinitions">> => {
    const user = await requireReportPermission(ctx, "reports.admin");
    await requireFeatureEnabled(ctx, "feature_management_reporting");
    const { id, ...rest } = args;
    if (id) {
      await ctx.db.patch(id, rest);
      await logAudit(ctx, {
        action: "update", entity: "report_definitions", entityId: id, entityRef: args.key,
        userId: user._id, userName: user.name, userRole: user.role,
        description: `Updated report definition "${args.name}"`,
      });
      return id;
    }
    const dup = await ctx.db.query("reportDefinitions").withIndex("by_key", (q) => q.eq("key", args.key)).first();
    if (dup) throw new ConvexError({ code: "CONFLICT", message: "A report definition with this key already exists" });
    const newId = await ctx.db.insert("reportDefinitions", { ...rest, createdBy: user._id, createdAt: new Date().toISOString() });
    await logAudit(ctx, {
      action: "create", entity: "report_definitions", entityId: newId, entityRef: args.key,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created report definition "${args.name}"`,
    });
    return newId;
  },
});

// ── Real-data metric builders — bounded, indexed reads only ─────────────────

type ReportMetrics = { generatedAt: string; sections: { label: string; stats: { label: string; value: string | number }[] }[] };

async function buildReportMetrics(ctx: QueryCtx | MutationCtx, dataSource: string): Promise<ReportMetrics> {
  const generatedAt = new Date().toISOString();

  if (dataSource === "operational_tasks") {
    const tasks = await ctx.db.query("tasks").order("desc").take(500);
    const now = new Date().toISOString().slice(0, 10);
    const open = tasks.filter((t) => !["done", "cancelled"].includes(t.status));
    const overdue = open.filter((t) => t.dueDate && t.dueDate < now);
    const completed = tasks.filter((t) => t.status === "done");
    const byPriority = ["low", "medium", "high", "urgent"].map((p) => ({ label: `${p.charAt(0).toUpperCase()}${p.slice(1)} priority (open)`, value: open.filter((t) => t.priority === p).length }));
    return {
      generatedAt,
      sections: [
        { label: "Task Overview", stats: [
          { label: "Open Tasks", value: open.length },
          { label: "Overdue Tasks", value: overdue.length },
          { label: "Completed Tasks", value: completed.length },
          { label: "Total Tasks (last 500)", value: tasks.length },
        ] },
        { label: "Open Tasks by Priority", stats: byPriority },
      ],
    };
  }

  if (dataSource === "approvals_overview") {
    const approvals = await ctx.db.query("approvals").order("desc").take(500);
    const pending = approvals.filter((a) => a.status === "pending" || a.status === "escalated");
    const approved = approvals.filter((a) => a.status === "approved");
    const rejected = approvals.filter((a) => a.status === "rejected");
    const urgent = pending.filter((a) => a.priority === "urgent");
    return {
      generatedAt,
      sections: [
        { label: "Approvals Overview", stats: [
          { label: "Pending / Escalated", value: pending.length },
          { label: "Urgent Pending", value: urgent.length },
          { label: "Approved", value: approved.length },
          { label: "Rejected", value: rejected.length },
          { label: "Total (last 500)", value: approvals.length },
        ] },
      ],
    };
  }

  if (dataSource === "finance_kyc_overview") {
    const [kyc, finance, payments] = await Promise.all([
      ctx.db.query("kycSubmissions").order("desc").take(500),
      ctx.db.query("financeApplications").order("desc").take(500),
      ctx.db.query("geoPayments").order("desc").take(500),
    ]);
    const kycPending = kyc.filter((k) => k.status === "pending" || k.status === "submitted").length;
    const kycApproved = kyc.filter((k) => k.status === "approved").length;
    const kycRejected = kyc.filter((k) => k.status === "rejected").length;
    const financePending = finance.filter((f) => f.status === "submitted" || f.status === "under_review").length;
    const financeApproved = finance.filter((f) => f.status === "approved").length;
    const received = payments.filter((p) => ["completed", "verified", "successful"].includes(p.status));
    const totalReceived = received.reduce((s, p) => s + (p.amountDisplay ?? 0), 0);
    return {
      generatedAt,
      sections: [
        { label: "KYC Pipeline", stats: [
          { label: "Pending", value: kycPending },
          { label: "Approved", value: kycApproved },
          { label: "Rejected", value: kycRejected },
        ] },
        { label: "Finance Pipeline", stats: [
          { label: "Pending / Under Review", value: financePending },
          { label: "Approved", value: financeApproved },
        ] },
        { label: "Payments", stats: [
          { label: "Successful Payments (last 500)", value: received.length },
          { label: "Total Received", value: `₦${totalReceived.toLocaleString()}` },
        ] },
      ],
    };
  }

  if (dataSource === "commercial_transactions") {
    const transactions = await ctx.db.query("transactions").order("desc").take(500);
    const completed = transactions.filter((t) => t.status === "completed");
    const totalValue = transactions.reduce((s, t) => s + (t.purchasePrice ?? 0), 0);
    const totalPaid = transactions.reduce((s, t) => s + (t.amountPaid ?? 0), 0);
    const totalOutstanding = transactions.reduce((s, t) => s + (t.outstandingBalance ?? 0), 0);
    const byStatus = Array.from(new Set(transactions.map((t) => t.status))).map((s) => ({ label: s.replace(/_/g, " "), value: transactions.filter((t) => t.status === s).length }));
    return {
      generatedAt,
      sections: [
        { label: "Transaction Volume & Value", stats: [
          { label: "Total Transactions (last 500)", value: transactions.length },
          { label: "Completed", value: completed.length },
          { label: "Total Portfolio Value", value: `₦${totalValue.toLocaleString()}` },
          { label: "Total Amount Paid", value: `₦${totalPaid.toLocaleString()}` },
          { label: "Total Outstanding", value: `₦${totalOutstanding.toLocaleString()}` },
        ] },
        { label: "Transactions by Status", stats: byStatus },
      ],
    };
  }

  if (dataSource === "governance_compliance") {
    const [auditEntries, sodViolations] = await Promise.all([
      ctx.db.query("auditLog").order("desc").take(200),
      ctx.db.query("sodViolations").order("desc").take(200),
    ]);
    const unresolvedSod = sodViolations.filter((v_) => !v_.resolvedAction);
    const byAction = Array.from(new Set(auditEntries.map((a) => a.action))).map((a) => ({ label: a.replace(/_/g, " "), value: auditEntries.filter((e) => e.action === a).length }));
    return {
      generatedAt,
      sections: [
        { label: "Audit Activity (most recent 200 entries)", stats: [
          { label: "Total Audit Entries", value: auditEntries.length },
          { label: "Unresolved SoD Violations", value: unresolvedSod.length },
        ] },
        { label: "Audit Entries by Action", stats: byAction.slice(0, 10) },
      ],
    };
  }

  throw new ConvexError({ code: "BAD_REQUEST", message: "Unknown report data source" });
}

// ── Report Runs ──────────────────────────────────────────────────────────

export const listReportRuns = query({
  args: { reportDefinitionId: v.optional(v.id("reportDefinitions")), mineOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await requireReportPermission(ctx, "reports.view");
    let runs;
    if (args.reportDefinitionId) {
      runs = await ctx.db.query("reportRuns").withIndex("by_definition", (q) => q.eq("reportDefinitionId", args.reportDefinitionId!)).order("desc").take(200);
    } else if (args.mineOnly) {
      runs = await ctx.db.query("reportRuns").withIndex("by_generatedBy", (q) => q.eq("generatedBy", user._id)).order("desc").take(200);
    } else {
      runs = await ctx.db.query("reportRuns").order("desc").take(200);
    }
    return await Promise.all(
      runs.map(async (r) => {
        const definition = await ctx.db.get(r.reportDefinitionId);
        const generator = await ctx.db.get(r.generatedBy);
        const vaultDoc = r.vaultDocumentId ? await ctx.db.get(r.vaultDocumentId) : null;
        return {
          ...r,
          definitionName: definition?.name ?? "Unknown report",
          reportType: definition?.reportType ?? "management",
          generatedByName: generator?.name ?? "Unknown",
          fileUrl: vaultDoc?.fileUrl ?? null,
        };
      })
    );
  },
});

export const getReportRun = query({
  args: { id: v.id("reportRuns") },
  handler: async (ctx, args) => {
    await requireReportPermission(ctx, "reports.view");
    const run = await ctx.db.get(args.id);
    if (!run) return null;
    const definition = await ctx.db.get(run.reportDefinitionId);
    const vaultDoc = run.vaultDocumentId ? await ctx.db.get(run.vaultDocumentId) : null;
    return { ...run, definition, fileUrl: vaultDoc?.fileUrl ?? null };
  },
});

// Computes real-data metrics and creates a run row (status "generated" for
// definitions with no approval requirement, "pending_approval" otherwise —
// reusing the existing Tasks/Approvals engine, never a second workflow).
export const generateReportRun = mutation({
  args: { reportDefinitionId: v.id("reportDefinitions"), periodLabel: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Id<"reportRuns">> => {
    const user = await requireReportPermission(ctx, "reports.create");
    await requireFeatureEnabled(ctx, "feature_management_reporting");

    const definition = await ctx.db.get(args.reportDefinitionId);
    if (!definition) throw new ConvexError({ code: "NOT_FOUND", message: "Report definition not found" });
    if (!definition.isActive) throw new ConvexError({ code: "BAD_REQUEST", message: "This report definition is inactive" });

    const metrics = await buildReportMetrics(ctx, definition.dataSource);
    const runRef = await nextRunRef(ctx);
    const now = new Date().toISOString();

    const runId = await ctx.db.insert("reportRuns", {
      reportDefinitionId: args.reportDefinitionId,
      runRef,
      periodLabel: args.periodLabel,
      status: definition.requiresApproval ? "pending_approval" : "generated",
      dataSnapshot: JSON.stringify(metrics),
      generatedBy: user._id,
      generatedAt: now,
    });

    if (definition.requiresApproval) {
      const approvalId: Id<"approvals"> = await ctx.runMutation(api.taskboard.createApproval, {
        approvalType: "report_approval",
        priority: "medium",
        summary: `Approval requested for report "${definition.name}" (${runRef})`,
        relatedRef: runRef,
      });
      await ctx.db.patch(runId, { approvalId });
    }

    await logAudit(ctx, {
      action: "create",
      entity: "report_runs",
      entityId: runId,
      entityRef: runRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Generated report run "${definition.name}" (${runRef})${args.periodLabel ? ` for ${args.periodLabel}` : ""}`,
    });

    // Notify subscribers of this definition (existing notifications table/bell).
    const subs = await ctx.db.query("reportSubscriptions").withIndex("by_definition", (q) => q.eq("reportDefinitionId", args.reportDefinitionId)).collect();
    for (const sub of subs) {
      if (sub.userId === user._id) continue;
      await notifyUser(ctx, {
        userId: sub.userId,
        type: "report_generated",
        title: "New report generated",
        message: `"${definition.name}" (${runRef}) has been generated.`,
        link: "/admin/communications",
      });
    }

    return runId;
  },
});

// Called once the frontend has rendered the report PDF and uploaded it to
// the EXISTING Documents & Vault via docvault.createDocument — attaches the
// resulting vaultDocumentId to the run and marks it ready. Never a second
// document repository.
export const attachReportDocument = mutation({
  args: { runId: v.id("reportRuns"), vaultDocumentId: v.id("vaultDocuments") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireReportPermission(ctx, "reports.create");
    const run = await ctx.db.get(args.runId);
    if (!run) throw new ConvexError({ code: "NOT_FOUND", message: "Report run not found" });
    if (run.status !== "generated" && run.status !== "approved") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This report run is not ready to receive its document" });
    }
    await ctx.db.patch(args.runId, { vaultDocumentId: args.vaultDocumentId });
    await logAudit(ctx, {
      action: "update", entity: "report_runs", entityId: args.runId, entityRef: run.runRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Archived report file for run "${run.runRef}" in Documents & Vault`,
    });
  },
});

// Syncs a report run's status from its linked approval decision. Explicit
// sync step (Convex has no cross-table triggers) — mirrors the exact pattern
// used by enhancedDocuments.syncReviewStatusFromApproval.
export const syncReportRunFromApproval = mutation({
  args: { runId: v.id("reportRuns") },
  handler: async (ctx, args): Promise<string | null> => {
    await requireReportPermission(ctx, "reports.view");
    const run = await ctx.db.get(args.runId);
    if (!run || !run.approvalId) return run?.status ?? null;
    const approval = await ctx.db.get(run.approvalId);
    if (!approval) return run.status;
    const nextStatus =
      approval.status === "approved" ? "approved" :
      approval.status === "rejected" ? "rejected" :
      "pending_approval";
    if (nextStatus !== run.status) {
      await ctx.db.patch(args.runId, { status: nextStatus });
    }
    return nextStatus;
  },
});

export const distributeReportRun = mutation({
  args: { runId: v.id("reportRuns") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireReportPermission(ctx, "reports.distribute");
    const run = await ctx.db.get(args.runId);
    if (!run) throw new ConvexError({ code: "NOT_FOUND", message: "Report run not found" });
    if (run.status !== "generated" && run.status !== "approved") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Only a generated or approved report may be distributed" });
    }
    if (!run.vaultDocumentId) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This report has no archived document yet" });
    }
    const definition = await ctx.db.get(run.reportDefinitionId);
    const subs = await ctx.db.query("reportSubscriptions").withIndex("by_definition", (q) => q.eq("reportDefinitionId", run.reportDefinitionId)).collect();
    for (const sub of subs) {
      await notifyUser(ctx, {
        userId: sub.userId,
        type: "report_distributed",
        title: "Report distributed",
        message: `"${definition?.name ?? "Report"}" (${run.runRef}) has been distributed and is available in Documents & Vault.`,
        link: "/admin/documents",
      });
    }
    await ctx.db.patch(args.runId, {
      status: "distributed",
      distributedAt: new Date().toISOString(),
      distributedCount: subs.length,
    });
    await logAudit(ctx, {
      action: "update", entity: "report_runs", entityId: args.runId, entityRef: run.runRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Distributed report "${definition?.name ?? "Report"}" (${run.runRef}) to ${subs.length} subscriber(s)`,
    });
  },
});

// ── Subscriptions — explicitly separate from Internal Communications access ─

export const listReportSubscriptions = query({
  args: { reportDefinitionId: v.id("reportDefinitions") },
  handler: async (ctx, args) => {
    await requireReportPermission(ctx, "reports.admin");
    const subs = await ctx.db.query("reportSubscriptions").withIndex("by_definition", (q) => q.eq("reportDefinitionId", args.reportDefinitionId)).collect();
    return await Promise.all(subs.map(async (s) => {
      const user = await ctx.db.get(s.userId);
      return { ...s, userName: user?.name ?? "Unknown", userEmail: user?.email ?? null };
    }));
  },
});

export const addReportSubscription = mutation({
  args: { reportDefinitionId: v.id("reportDefinitions"), userId: v.id("users") },
  handler: async (ctx, args): Promise<Id<"reportSubscriptions">> => {
    const user = await requireReportPermission(ctx, "reports.admin");
    const existing = await ctx.db.query("reportSubscriptions").withIndex("by_definition_and_user", (q) => q.eq("reportDefinitionId", args.reportDefinitionId).eq("userId", args.userId)).unique();
    if (existing) return existing._id;
    const id = await ctx.db.insert("reportSubscriptions", { ...args, createdBy: user._id, createdAt: new Date().toISOString() });
    await logAudit(ctx, {
      action: "create", entity: "report_subscriptions", entityId: id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: "Added a report subscriber",
    });
    return id;
  },
});

export const removeReportSubscription = mutation({
  args: { id: v.id("reportSubscriptions") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireReportPermission(ctx, "reports.admin");
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", message: "Subscription not found" });
    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      action: "delete", entity: "report_subscriptions", entityId: args.id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: "Removed a report subscriber",
    });
  },
});

export const listStaffForSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    await requireReportPermission(ctx, "reports.admin");
    const users = await ctx.db.query("users").collect();
    return users.filter((u) => STAFF_ROLES.includes(u.role ?? "")).map((u) => ({ _id: u._id, name: u.name ?? u.email ?? "Unnamed", role: u.role }));
  },
});

// Idempotent seed for the granular reporting permissions. Safe to call multiple times.
export const seedReportingPermissions = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requireStaff(ctx);
    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const existing = await ctx.db.query("iamPermissions").withIndex("by_module", (q) => q.eq("module", "reports")).collect();
    const existingKeys = new Set(existing.map((p) => p.key));
    const labels: Record<ReportPermission, string> = {
      "reports.view": "View Management Reports",
      "reports.create": "Generate Management Reports",
      "reports.approve": "Approve Management Reports",
      "reports.distribute": "Distribute Management Reports",
      "reports.admin": "Administer Report Definitions & Subscriptions",
    };
    let inserted = 0;
    for (const key of REPORT_PERMISSIONS) {
      if (existingKeys.has(key)) continue;
      await ctx.db.insert("iamPermissions", {
        key,
        module: "reports",
        action: key.split(".")[1].toUpperCase(),
        label: labels[key],
        sensitive: key === "reports.approve" || key === "reports.distribute",
      });
      inserted++;
    }
    return { inserted };
  },
});
