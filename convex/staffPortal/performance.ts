import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../admin.ts";

// ══════════════════════════════════════════════════════════════════════════
// STAFF PORTAL — MY PERFORMANCE (self-service, /staff)
//
// Read-only KPI rollups computed live from records already scoped to the
// viewer (transactions.assignedStaff/salesOfficer, liveInspections.assignedOfficer,
// tasks.assignedTo, inquiries.assignedTo). No new tables — this module only
// aggregates what other staff-portal modules already scope to "me". Response
// time is measured from an inspection's _creationTime (request) to its
// scheduledAt (confirmed slot) since there's no separate "requestedAt" field.
// ══════════════════════════════════════════════════════════════════════════

// Simple built-in monthly targets. Not stored per-staff yet (no target-setting
// UI exists) — these are reasonable fixed benchmarks so "vs target" always has
// a meaningful denominator. Revisit if admins ask to set targets per staff.
const MONTHLY_TARGETS = {
  sales: 3, // completed transactions/month
  inspections: 8, // completed live inspections/month
  responseHours: 24, // target average response time in hours
};

function isThisMonth(iso: string | undefined): boolean {
  if (!iso) return false;
  return iso.slice(0, 7) === new Date().toISOString().slice(0, 7);
}

export const getMyPerformance = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);

    const [transactions, inspections, tasks, inquiries] = await Promise.all([
      ctx.db.query("transactions").withIndex("by_assigned", (q) => q.eq("assignedStaff", user._id)).collect(),
      ctx.db.query("liveInspections").withIndex("by_officer", (q) => q.eq("assignedOfficer", user._id)).collect(),
      ctx.db.query("tasks").withIndex("by_assigned", (q) => q.eq("assignedTo", user._id)).collect(),
      ctx.db.query("inquiries").withIndex("by_assigned", (q) => q.eq("assignedTo", user._id)).collect(),
    ]);

    // ── Sales ──────────────────────────────────────────────────────────
    const completedSales = transactions.filter((t) => t.status === "completed");
    const completedSalesThisMonth = completedSales.filter((t) => isThisMonth(t._creationTime ? new Date(t._creationTime).toISOString() : undefined));
    const salesValueThisMonth = completedSalesThisMonth.reduce((s, t) => s + (t.purchasePrice ?? 0), 0);

    // ── Inspections ──────────────────────────────────────────────────────
    const completedInspections = inspections.filter((i) => i.status === "completed");
    const completedInspectionsThisMonth = completedInspections.filter((i) => isThisMonth(i.endedAt ?? (i._creationTime ? new Date(i._creationTime).toISOString() : undefined)));

    // Average response time: request (_creationTime) → first scheduled slot (scheduledAt)
    const responseTimesHours = inspections
      .filter((i) => i.scheduledAt)
      .map((i) => (new Date(i.scheduledAt!).getTime() - i._creationTime) / (1000 * 60 * 60))
      .filter((h) => h >= 0);
    const avgResponseHours = responseTimesHours.length > 0
      ? responseTimesHours.reduce((s, h) => s + h, 0) / responseTimesHours.length
      : null;

    // ── Tasks ──────────────────────────────────────────────────────────
    const doneTasks = tasks.filter((t) => t.status === "done");
    const now = new Date().toISOString().slice(0, 10);
    const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < now && !["done", "cancelled"].includes(t.status));

    // ── Inquiries ─────────────────────────────────────────────────────
    const resolvedInquiries = inquiries.filter((i) => i.status === "resolved");

    return {
      sales: {
        completedThisMonth: completedSalesThisMonth.length,
        target: MONTHLY_TARGETS.sales,
        valueThisMonth: salesValueThisMonth,
        totalCompleted: completedSales.length,
        totalAssigned: transactions.length,
      },
      inspections: {
        completedThisMonth: completedInspectionsThisMonth.length,
        target: MONTHLY_TARGETS.inspections,
        totalCompleted: completedInspections.length,
        totalAssigned: inspections.length,
      },
      responseTime: {
        avgHours: avgResponseHours,
        targetHours: MONTHLY_TARGETS.responseHours,
        sampleSize: responseTimesHours.length,
      },
      tasks: {
        total: tasks.length,
        done: doneTasks.length,
        overdue: overdueTasks.length,
        completionRate: tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0,
      },
      inquiries: {
        total: inquiries.length,
        resolved: resolvedInquiries.length,
        resolutionRate: inquiries.length > 0 ? Math.round((resolvedInquiries.length / inquiries.length) * 100) : 0,
      },
    };
  },
});

// ── My Resources & Documents ────────────────────────────────────────────
// Non-confidential vault documents relevant to staff generally (policies,
// guides, templates) — never client-specific or transaction-specific docs,
// which stay in My Clients/My Sales. Confidential documents are excluded:
// this self-service view has no per-role document ACL to check against.

export const listMyResources = query({
  args: { docType: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const all = await ctx.db.query("vaultDocuments").order("desc").take(300);
    let resources = all.filter(
      (d) => !d.isConfidential && !d.clientId && !d.transactionId && !d.kycSubmissionId && !d.financeApplicationId
    );
    if (args.docType && args.docType !== "all") {
      resources = resources.filter((d) => d.docType === args.docType);
    }
    return resources;
  },
});

export const getMyResourceStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("vaultDocuments").order("desc").take(300);
    const resources = all.filter(
      (d) => !d.isConfidential && !d.clientId && !d.transactionId && !d.kycSubmissionId && !d.financeApplicationId
    );
    return { total: resources.length };
  },
});

// ── My Notifications (staff-portal view of the shared notifications inbox) ──
// Reuses convex/notifications.ts's listMine/unreadCount/markRead/markAllRead
// directly (same "recipientUserId" rows) — no separate storage needed here.
// This query only adds a bounded, paginated-feeling "recent activity" list
// filtered to types relevant to staff, for the Performance page's activity feed.
export const listMyRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_recipientUser_and_isRead", (q) => q.eq("recipientUserId", user._id))
      .order("desc")
      .take(15);
    return notifs;
  },
});
