import { v } from "convex/values";
import { query } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.js";
import { hasPermission } from "./access.ts";
import { buildBulkAcquisitionDashboardStats } from "../corporateMarketing/analytics.ts";
import { isFeatureEnabled as isDiasporaFeatureEnabled } from "../diaspora/feature.ts";
import { buildDiasporaDashboardStats } from "../diaspora/analytics.ts";
import { getMyPartnerEngagementForUser } from "./partnerEngagements.ts";

// ══════════════════════════════════════════════════════════════════════════
// DYNAMIC DASHBOARD ENGINE
// One engine, one query, one generic widget schema — rendered by a single
// frontend component. Configured per dashboard profile (not 8 separate
// apps/pages). The External/Restricted profile is intentionally the most
// limited: it never receives HR, payroll, finance, Board, Shareholder,
// audit, or RBAC data, regardless of what other widgets exist.
// ══════════════════════════════════════════════════════════════════════════

export const DASHBOARD_PROFILE_KEYS = [
  "shareholder", "board", "md_ceo", "director", "manager",
  "officer_staff", "auditor", "external_restricted",
] as const;
export type DashboardProfileKey = (typeof DASHBOARD_PROFILE_KEYS)[number];

const PROFILE_LABELS: Record<DashboardProfileKey, string> = {
  shareholder: "Shareholder",
  board: "Board",
  md_ceo: "MD / CEO",
  director: "Director",
  manager: "Manager / Head of Unit",
  officer_staff: "Officer / Staff",
  auditor: "Auditor",
  external_restricted: "External / Restricted",
};

// A small, generic widget vocabulary. The frontend renders these with a
// registry keyed on `type` — new profiles reuse the same widget types
// instead of each profile getting bespoke UI.
export type DashboardWidget =
  | { type: "stat_grid"; title: string; href?: string; stats: Array<{ label: string; value: string; sub?: string; alert?: boolean }> }
  | { type: "list"; title: string; href?: string; emptyLabel: string; items: Array<{ label: string; value: string; sub?: string; href?: string }> }
  | { type: "message"; title: string; body: string };

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

// Resolves a dashboard profile ONLY from an explicit IAM role assignment
// (userOrgAssignments.roleKey → iamRoles.dashboardProfileKey). Accounts with
// no explicit assignment yet return `null` here so the frontend keeps
// showing the original operational ERP dashboard exactly as before —
// nothing changes for existing users until an admin explicitly assigns
// them an IAM role via the Organisation/Assignments tabs.
async function resolveExplicitDashboardProfile(ctx: QueryCtx, user: Doc<"users">): Promise<{ profileKey: DashboardProfileKey; roleLabel: string } | null> {
  const assignments = await ctx.db
    .query("userOrgAssignments")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .filter((q) => q.eq(q.field("status"), "active"))
    .collect();
  const primary = assignments.find((a) => a.isPrimary) ?? assignments[0];
  if (!primary?.roleKey) return null;

  const role = await ctx.db.query("iamRoles").withIndex("by_key", (q) => q.eq("key", primary.roleKey!)).unique();
  if (!role || !DASHBOARD_PROFILE_KEYS.includes(role.dashboardProfileKey as DashboardProfileKey)) return null;
  return { profileKey: role.dashboardProfileKey as DashboardProfileKey, roleLabel: role.name };
}

export const getMyDashboardProfile = query({
  args: {},
  handler: async (ctx): Promise<{ profileKey: DashboardProfileKey; profileLabel: string; roleLabel: string } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;
    const resolved = await resolveExplicitDashboardProfile(ctx, user);
    if (!resolved) return null; // no explicit IAM assignment — caller keeps the legacy dashboard
    return { profileKey: resolved.profileKey, profileLabel: PROFILE_LABELS[resolved.profileKey], roleLabel: resolved.roleLabel };
  },
});

// Self-service lookup of the caller's own explicit IAM system-role key (not
// gated behind requireIamAdmin, since every signed-in account needs this to
// know which modules its own sidebar should show). Returns null when the
// account has no explicit assignment yet, so the sidebar falls back to
// showing every module exactly as before.
export const getMyRoleKey = query({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;
    const assignments = await ctx.db
      .query("userOrgAssignments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    const primary = assignments.find((a) => a.isPrimary) ?? assignments[0];
    return primary?.roleKey ?? null;
  },
});

export const getMyDashboardWidgets = query({
  args: {},
  handler: async (ctx): Promise<{ profileKey: DashboardProfileKey; profileLabel: string; widgets: DashboardWidget[] } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;

    const resolved = await resolveExplicitDashboardProfile(ctx, user);
    if (!resolved) return null;
    const widgets = await buildWidgetsForProfile(ctx, resolved.profileKey, user._id);
    return { profileKey: resolved.profileKey, profileLabel: PROFILE_LABELS[resolved.profileKey], widgets };
  },
});

async function buildWidgetsForProfile(ctx: QueryCtx, profileKey: DashboardProfileKey, userId: Id<"users">): Promise<DashboardWidget[]> {
  // Live Virtual Inspection — only surfaced when the feature is enabled, and
  // only counts what each profile is already allowed to see (feature toggle
  // + permission checks live in convex/liveInspections.ts; here we simply
  // skip the widget when the toggle is off so nothing new appears while OFF).
  const liveInspectionFeature = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", "feature_live_virtual_inspection")).first();
  const liveInspectionEnabled = liveInspectionFeature?.value === "true";
  let liveInspectionWidget: DashboardWidget | null = null;
  if (liveInspectionEnabled) {
    const inspections = await ctx.db.query("liveInspections").order("desc").take(300);
    const upcoming = inspections.filter((i) => ["scheduled", "confirmed", "requested"].includes(i.status)).length;
    const liveNow = inspections.filter((i) => i.status === "live").length;
    const completed = inspections.filter((i) => i.status === "completed").length;
    const myInspections = inspections.filter((i) => i.assignedOfficer === userId);
    const myUpcoming = myInspections.filter((i) => ["scheduled", "confirmed", "requested"].includes(i.status));
    if (profileKey === "officer_staff") {
      liveInspectionWidget = {
        type: "list",
        title: "My Live Inspections",
        href: "/admin/live-inspections",
        emptyLabel: "No live inspections assigned to you.",
        items: myUpcoming.slice(0, 6).map((i) => ({
          label: i.inspectionRef,
          value: i.status,
          sub: i.scheduledAt ? new Date(i.scheduledAt).toLocaleDateString() : "Not scheduled",
          href: `/admin/live-inspections/${i._id}`,
        })),
      };
    } else if (profileKey !== "shareholder" && profileKey !== "board" && profileKey !== "external_restricted") {
      liveInspectionWidget = {
        type: "stat_grid",
        title: "Live Virtual Inspections",
        href: "/admin/live-inspections",
        stats: [
          { label: "Live Now", value: String(liveNow), alert: liveNow > 0 },
          { label: "Upcoming", value: String(upcoming) },
          { label: "Completed", value: String(completed) },
        ],
      };
    }
  }

  // Corporate Marketing & Bulk Sales — only surfaced when the feature is
  // enabled AND the viewer explicitly holds `corporate_marketing.view` (GRBS
  // and any other user without an explicit grant never see this, per the
  // governing spec's "never automatic access" rule). Read-only rollup —
  // never a second analytics system, see convex/corporateMarketing/analytics.ts.
  const corporateFeature = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", "feature_corporate_marketing_sales")).first();
  const corporateEnabled = corporateFeature?.value === "true";
  let corporateWidget: DashboardWidget | null = null;
  if (corporateEnabled && (await hasPermission(ctx, userId, "corporate_marketing.view")) && profileKey !== "shareholder" && profileKey !== "board" && profileKey !== "external_restricted") {
    const [organisations, opportunities, stages] = await Promise.all([
      ctx.db.query("corporateOrganisations").collect(),
      ctx.db.query("corporateOpportunities").collect(),
      ctx.db.query("corporatePipelineStages").collect(),
    ]);
    const stageByKey = new Map(stages.map((s) => [s.key, s]));
    const openOpportunities = opportunities.filter((o) => {
      const stage = stageByKey.get(o.stageKey);
      return !stage?.isClosedWon && !stage?.isClosedLost;
    });
    const closedWon = opportunities.filter((o) => stageByKey.get(o.stageKey)?.isClosedWon).length;

    if (profileKey === "officer_staff") {
      const myOpen = openOpportunities.filter((o) => o.assignedOfficer === userId || o.relationshipOwner === userId);
      corporateWidget = {
        type: "list",
        title: "My Corporate Opportunities",
        href: "/admin/corporate",
        emptyLabel: "No corporate opportunities assigned to you.",
        items: myOpen.slice(0, 6).map((o) => ({
          label: o.name,
          value: o.priority,
          sub: stageByKey.get(o.stageKey)?.label ?? o.stageKey,
          href: "/admin/corporate",
        })),
      };
    } else {
      corporateWidget = {
        type: "stat_grid",
        title: "Corporate Marketing & Bulk Sales",
        href: "/admin/corporate",
        stats: [
          { label: "Organisations", value: String(organisations.length) },
          { label: "Open Opportunities", value: String(openOpportunities.length) },
          { label: "Closed Won", value: String(closedWon) },
        ],
      };
    }
  }

  // Institutional / Bulk Acquisition Management — a sibling widget block,
  // gated the exact same way as corporateWidget above (feature toggle +
  // explicit `corporate_marketing.acquisition_view` grant, never automatic
  // for GRBS or anyone else) but with its own, more granular permission key
  // since a role could hold `corporate_marketing.view` without also holding
  // acquisition-level visibility. Enterprise-wide rollup only — every figure
  // here is already an aggregate — so it is only shown to the same
  // enterprise-level profiles as corporateWidget (never officer_staff, whose
  // work is scoped to their own assignments elsewhere on their dashboard).
  let bulkAcquisitionWidgets: DashboardWidget[] = [];
  if (corporateEnabled && (await hasPermission(ctx, userId, "corporate_marketing.acquisition_view")) && profileKey !== "shareholder" && profileKey !== "board" && profileKey !== "external_restricted" && profileKey !== "officer_staff") {
    const stats = await buildBulkAcquisitionDashboardStats(ctx);
    bulkAcquisitionWidgets = [
      {
        type: "stat_grid",
        title: "Bulk Acquisitions — Value & Fulfilment",
        href: "/admin/corporate",
        stats: [
          { label: "Active Acquisitions", value: String(stats.activeAcquisitions) },
          { label: "Partially Fulfilled", value: String(stats.partiallyFulfilled) },
          { label: "Committed Value", value: fmt(stats.committedValue) },
          { label: "Paid Value", value: fmt(stats.paidValue) },
          { label: "Outstanding Value", value: fmt(stats.outstandingValue), alert: stats.outstandingValue > 0 },
          { label: "Units Committed", value: String(stats.committedQuantity) },
          { label: "Units Paid", value: String(stats.paidQuantity) },
          { label: "Units Allocated", value: String(stats.allocatedQuantity) },
        ],
      },
      {
        type: "stat_grid",
        title: "Bulk Acquisitions — Payments & Allocations",
        href: "/admin/corporate",
        stats: [
          { label: "Payment Due", value: String(stats.paymentDue) },
          { label: "Payment Overdue", value: String(stats.paymentOverdue), alert: stats.paymentOverdue > 0 },
          { label: "Allocation Pending", value: String(stats.allocationPending) },
          { label: "Allocation Completed", value: String(stats.allocationCompleted) },
          { label: "Commercial Approval Pending", value: String(stats.commercialApprovalPending), alert: stats.commercialApprovalPending > 0 },
        ],
      },
      {
        type: "list",
        title: "Top Institutional Buyers",
        href: "/admin/corporate",
        emptyLabel: "No committed bulk acquisitions yet.",
        items: stats.topBuyers.map((b) => ({
          label: b.organisationName,
          value: fmt(b.committedValue),
          href: "/admin/corporate",
        })),
      },
      {
        type: "list",
        title: "Acquisitions by Property Type",
        href: "/admin/corporate",
        emptyLabel: "No bulk acquisition line items yet.",
        items: stats.byPropertyType.slice(0, 6).map((t) => ({
          label: t.propertyType,
          value: fmt(t.committedValue),
          sub: `${t.count} line item(s)`,
          href: "/admin/corporate",
        })),
      },
    ];
  }

  // Diaspora Investment & Property Platform — sibling widget block to
  // corporateWidget/bulkAcquisitionWidgets above, same gating pattern:
  // feature toggle + explicit `diaspora.analytics_view` grant (never
  // automatic for GRBS or anyone else). Read-only rollup only — every figure
  // here is already an aggregate — so it is shown to the same enterprise-
  // level profiles as corporateWidget (never officer_staff, shareholder,
  // board, or external_restricted).
  const diasporaFeatureEnabled = await isDiasporaFeatureEnabled(ctx);
  let diasporaWidget: DashboardWidget | null = null;
  if (diasporaFeatureEnabled && (await hasPermission(ctx, userId, "diaspora.analytics_view")) && profileKey !== "shareholder" && profileKey !== "board" && profileKey !== "external_restricted" && profileKey !== "officer_staff") {
    const stats = await buildDiasporaDashboardStats(ctx);
    diasporaWidget = {
      type: "stat_grid",
      title: "Diaspora Investment & Property Platform",
      href: "/admin/diaspora",
      stats: [
        { label: "Total Diaspora Leads", value: String(stats.totalLeads) },
        { label: "New Leads", value: String(stats.newLeads) },
        { label: "Qualified Leads", value: String(stats.qualifiedLeads) },
        { label: "Active Opportunities", value: String(stats.activeOpportunities) },
        { label: "Consultations", value: String(stats.consultations) },
        { label: "Property Enquiries", value: String(stats.propertyEnquiries) },
        { label: "Investment Enquiries", value: String(stats.investmentEnquiries) },
        { label: "Partnership Enquiries", value: String(stats.partnershipEnquiries) },
        { label: "Corporate Enquiries", value: String(stats.corporateEnquiries) },
        { label: "Referral Prospects", value: String(stats.referralProspects) },
        { label: "Transactions", value: String(stats.transactions) },
        { label: "Sales Value", value: fmt(stats.salesValue) },
        { label: "Conversion Rate", value: `${stats.conversionRatePercent}%` },
      ],
    };
  }

  // Enhanced Document Management / E-Signature / Official Corporate E-Stamp —
  // a single combined operational widget summarising each feature's own
  // bounded/indexed queue. Never shown to Shareholder, Board's own operations
  // detail, or External/Restricted — same tier as corporateWidget above.
  // Reusing each module's own status fields; never a second data model.
  const [enhDocsFeature, esigFeature, estampFeature] = await Promise.all([
    ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", "feature_enhanced_documents")).first(),
    ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", "feature_esignature")).first(),
    ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", "feature_corporate_estamp")).first(),
  ]);
  const enhDocsEnabled = enhDocsFeature?.value === "true";
  const esigEnabled = esigFeature?.value === "true";
  const estampEnabled = estampFeature?.value === "true";
  let documentsWidget: DashboardWidget | null = null;
  if (enhDocsEnabled || esigEnabled || estampEnabled) {
    const statsArr: Array<{ label: string; value: string; alert?: boolean }> = [];
    if (enhDocsEnabled) {
      const docs = await ctx.db.query("vaultDocuments").order("desc").take(500);
      const pendingReview = docs.filter((d) => d.reviewStatus === "pending_review").length;
      statsArr.push({ label: "Documents Pending Review", value: String(pendingReview), alert: pendingReview > 0 });
    }
    if (esigEnabled) {
      const requests = await ctx.db.query("signatureRequests").order("desc").take(300);
      const awaitingSignature = requests.filter((r) => ["pending", "sent", "viewed"].includes(r.status)).length;
      statsArr.push({ label: "Signature Requests In Progress", value: String(awaitingSignature) });
    }
    if (estampEnabled) {
      const applied = await ctx.db.query("eStamps").withIndex("by_status", (q) => q.eq("status", "applied")).take(500);
      statsArr.push({ label: "Documents Officially Stamped", value: String(applied.length) });
    }
    if (statsArr.length > 0) {
      documentsWidget = { type: "stat_grid", title: "Document Governance", href: "/admin/documents", stats: statsArr };
    }
  }

  // Enhanced Internal Communications — a light "My Inbox" summary: unread
  // direct/group conversations plus unacknowledged mandatory announcements.
  // Org-wide channels are intentionally excluded from the unread count to
  // keep this a cheap, bounded, per-user read (see convex/internalComms.ts
  // listMyConversations for the full inbox view).
  const commsFeature = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", "feature_enhanced_communications")).first();
  const commsEnabled = commsFeature?.value === "true";
  let commsWidget: DashboardWidget | null = null;
  if (commsEnabled) {
    const participantRows = await ctx.db.query("conversationParticipants").withIndex("by_user", (q) => q.eq("userId", userId)).take(200);
    const convos = await Promise.all(participantRows.map((p) => ctx.db.get(p.conversationId)));
    const unreadCount = convos.filter((c, i) => c && !c.archivedAt && c.lastMessageAt && (!participantRows[i].lastReadAt || participantRows[i].lastReadAt! < c.lastMessageAt)).length;

    const now = new Date().toISOString();
    const announcements = await ctx.db.query("announcements").withIndex("by_status", (q) => q.eq("status", "published")).collect();
    const myAcks = await ctx.db.query("announcementAcknowledgements").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const ackedIds = new Set(myAcks.filter((a) => a.acknowledgedAt).map((a) => a.announcementId));
    const pendingAck = announcements.filter((a) =>
      a.requiresAcknowledgement && !ackedIds.has(a._id) &&
      (!a.publishAt || a.publishAt <= now) && (!a.expiresAt || a.expiresAt >= now)
    ).length;

    commsWidget = {
      type: "stat_grid",
      title: "Internal Communications",
      href: "/admin/communications",
      stats: [
        { label: "Unread Messages", value: String(unreadCount), alert: unreadCount > 0 },
        { label: "Announcements Awaiting Acknowledgement", value: String(pendingAck), alert: pendingAck > 0 },
      ],
    };
  }

  // ── My work — used by every profile except the enterprise-level ones,
  //    always scoped to the current user only (safe for every profile).
  const myTasks = await ctx.db.query("tasks").withIndex("by_assigned", (q) => q.eq("assignedTo", userId)).order("desc").take(50);
  const myOpenTasks = myTasks.filter((t) => !["done", "cancelled"].includes(t.status));
  const myPendingApprovals = await ctx.db.query("approvals").withIndex("by_assigned", (q) => q.eq("assignedTo", userId)).order("desc").take(50);
  const myPending = myPendingApprovals.filter((a) => a.status === "pending" || a.status === "escalated");

  // Management Reporting — shown only to explicit holders of "reports.view".
  // "Awaiting My Approval" reuses the approval rows already loaded above
  // (myPending) — never a second approvals read. Subscribing to Internal
  // Communications never grants this; it is gated purely on its own
  // reporting permission, per the governing spec.
  const reportsFeature = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", "feature_management_reporting")).first();
  const reportsEnabled = reportsFeature?.value === "true";
  let reportsWidget: DashboardWidget | null = null;
  if (reportsEnabled && (await hasPermission(ctx, userId, "reports.view"))) {
    const runs = await ctx.db.query("reportRuns").order("desc").take(300);
    const pendingApproval = runs.filter((r) => r.status === "pending_approval").length;
    const distributed = runs.filter((r) => r.status === "distributed").length;
    const myReportApprovals = myPending.filter((a) => a.approvalType === "report_approval").length;
    reportsWidget = {
      type: "stat_grid",
      title: "Management Reporting",
      href: "/admin/communications",
      stats: [
        { label: "Reports Pending Approval", value: String(pendingApproval), alert: pendingApproval > 0 },
        { label: "Awaiting My Approval", value: String(myReportApprovals), alert: myReportApprovals > 0 },
        { label: "Reports Distributed", value: String(distributed) },
      ],
    };
  }

  const myTaskWidget: DashboardWidget = {
    type: "list",
    title: "My Tasks",
    href: "/admin/tasks",
    emptyLabel: "No tasks assigned to you right now.",
    items: myOpenTasks.slice(0, 6).map((t) => ({
      label: t.title,
      value: t.priority,
      sub: t.dueDate ? `Due ${t.dueDate}` : undefined,
      href: "/admin/tasks",
    })),
  };
  const myApprovalWidget: DashboardWidget = {
    type: "list",
    title: "My Approvals",
    href: "/admin/tasks",
    emptyLabel: "No approvals waiting on you.",
    items: myPending.slice(0, 6).map((a) => ({
      label: a.summary,
      value: a.priority,
      sub: a.approvalType.replace(/_/g, " "),
      href: "/admin/tasks",
    })),
  };

  // ── External / Restricted — the most limited profile. Own work plus their
  //    own Advisory/Functional Alignment (never any other engagement's data,
  //    and never finance, payments, HR, audit, RBAC, or board tables).
  if (profileKey === "external_restricted") {
    const myEngagement = await getMyPartnerEngagementForUser(ctx, userId);
    const widgets: DashboardWidget[] = [
      { type: "message", title: "Welcome", body: "You have restricted, external access to this workspace. Only items directly assigned to you are visible here." },
    ];
    if (myEngagement) {
      widgets.push({
        type: "stat_grid",
        title: "My Engagement",
        stats: [
          { label: "Partner", value: myEngagement.partnerName },
          { label: "Type", value: myEngagement.engagementType.replace(/_/g, " ") },
          { label: "Status", value: myEngagement.status.replace(/_/g, " "), alert: myEngagement.status === "suspended" },
          { label: "Start Date", value: myEngagement.startDate.slice(0, 10), sub: myEngagement.endDate ? `Ends ${myEngagement.endDate.slice(0, 10)}` : "Open-ended" },
        ],
      });
      widgets.push({
        type: "list",
        title: "Advisory / Functional Alignment",
        emptyLabel: "No alignment configured yet.",
        items: myEngagement.alignments.map((a) => ({ label: a.name, value: a.alignmentType })),
      });
    }
    widgets.push(myTaskWidget);
    return widgets;
  }

  // ── Officer / Staff — own work plus a light view of what's in the queue.
  if (profileKey === "officer_staff") {
    const staffWidgets: DashboardWidget[] = [myTaskWidget, myApprovalWidget];
    if (liveInspectionWidget) staffWidgets.push(liveInspectionWidget);
    if (corporateWidget) staffWidgets.push(corporateWidget);
    if (documentsWidget) staffWidgets.push(documentsWidget);
    if (commsWidget) staffWidgets.push(commsWidget);
    if (reportsWidget) staffWidgets.push(reportsWidget);
    return staffWidgets;
  }

  // Everything below this line uses enterprise-wide aggregates. These
  // profiles all pass the requireAdmin gate on /admin already (or will,
  // once granted IAM roles are wired into org access), so enterprise-wide
  // counts are appropriate — but the specific widgets shown differ per
  // profile, and Shareholder/Board/Auditor never see the operational task
  // queue or admin-only levers (RBAC, backup, settings).
  const [properties, transactions, kycSubs, financeApps, payments, tasks, approvals, auditEntries, sodViolations] = await Promise.all([
    ctx.db.query("properties").collect(),
    ctx.db.query("transactions").order("desc").take(300),
    ctx.db.query("kycSubmissions").order("desc").take(200),
    ctx.db.query("financeApplications").order("desc").take(200),
    ctx.db.query("geoPayments").order("desc").take(300),
    ctx.db.query("tasks").order("desc").take(300),
    ctx.db.query("approvals").order("desc").take(200),
    ctx.db.query("auditLog").order("desc").take(50),
    ctx.db.query("sodViolations").order("desc").take(50),
  ]);

  const completedTx = transactions.filter((t) => t.status === "completed");
  const totalTxValue = transactions.reduce((s, t) => s + (t.purchasePrice ?? 0), 0);
  const receivedPayments = payments.filter((p) => p.status === "completed" || p.status === "verified" || p.status === "successful");
  const totalReceived = receivedPayments.reduce((s, p) => s + (p.amountDisplay ?? 0), 0);
  const pendingKyc = kycSubs.filter((k) => k.status === "pending" || k.status === "submitted").length;
  const approvedKyc = kycSubs.filter((k) => k.status === "approved").length;
  const pendingFinance = financeApps.filter((f) => f.status === "submitted" || f.status === "under_review").length;
  const approvedFinance = financeApps.filter((f) => f.status === "approved").length;
  const openTasks = tasks.filter((t) => !["done", "cancelled"].includes(t.status)).length;
  const pendingApprovals = approvals.filter((a) => a.status === "pending" || a.status === "escalated").length;
  const urgentApprovals = approvals.filter((a) => a.priority === "urgent" && (a.status === "pending" || a.status === "escalated")).length;
  const unresolvedSod = sodViolations.filter((v) => !v.resolvedAction).length;

  const enterpriseStat: DashboardWidget = {
    type: "stat_grid",
    title: "Enterprise Performance",
    href: "/admin/transactions",
    stats: [
      { label: "Portfolio Value", value: fmt(totalTxValue) },
      { label: "Total Payments Received", value: fmt(totalReceived) },
      { label: "Completed Transactions", value: String(completedTx.length) },
      { label: "Total Properties", value: String(properties.length) },
    ],
  };

  const complianceStat: DashboardWidget = {
    type: "stat_grid",
    title: "Compliance Overview",
    href: "/admin/kyc",
    stats: [
      { label: "KYC Approved", value: String(approvedKyc) },
      { label: "KYC Pending", value: String(pendingKyc), alert: pendingKyc > 5 },
      { label: "Finance Approved", value: String(approvedFinance) },
      { label: "Finance Pending", value: String(pendingFinance) },
    ],
  };

  // ── Shareholder — enterprise value only, no operational or governance detail.
  if (profileKey === "shareholder") {
    return [enterpriseStat];
  }

  // ── Board / Board Committee — enterprise value + governance-level compliance.
  if (profileKey === "board") {
    return [
      enterpriseStat,
      complianceStat,
      {
        type: "stat_grid",
        title: "Governance Queue",
        href: "/admin/tasks",
        stats: [
          { label: "Pending Approvals", value: String(pendingApprovals) },
          { label: "Urgent Approvals", value: String(urgentApprovals), alert: urgentApprovals > 0 },
        ],
      },
    ];
  }

  // ── Auditor — read-only compliance and control visibility. No financial
  //    figures beyond what's already in Compliance Overview.
  if (profileKey === "auditor") {
    const auditWidgets: DashboardWidget[] = [
      complianceStat,
      {
        type: "stat_grid",
        title: "Controls & Audit",
        href: "/admin/audit",
        stats: [
          { label: "Recent Audit Entries", value: String(auditEntries.length) },
          { label: "Unresolved SoD Violations", value: String(unresolvedSod), alert: unresolvedSod > 0 },
        ],
      },
    ];
    if (liveInspectionWidget) auditWidgets.push(liveInspectionWidget);
    if (documentsWidget) auditWidgets.push(documentsWidget);
    if (reportsWidget) auditWidgets.push(reportsWidget);
    return auditWidgets;
  }

  // ── MD/CEO — the fullest operational + enterprise picture.
  if (profileKey === "md_ceo") {
    const mdWidgets: DashboardWidget[] = [
      enterpriseStat,
      complianceStat,
      {
        type: "stat_grid",
        title: "Operations",
        href: "/admin/tasks",
        stats: [
          { label: "Open Tasks", value: String(openTasks) },
          { label: "Pending Approvals", value: String(pendingApprovals) },
          { label: "Urgent Approvals", value: String(urgentApprovals), alert: urgentApprovals > 0 },
        ],
      },
    ];
    if (liveInspectionWidget) mdWidgets.push(liveInspectionWidget);
    if (corporateWidget) mdWidgets.push(corporateWidget);
    mdWidgets.push(...bulkAcquisitionWidgets);
    if (diasporaWidget) mdWidgets.push(diasporaWidget);
    if (documentsWidget) mdWidgets.push(documentsWidget);
    if (commsWidget) mdWidgets.push(commsWidget);
    if (reportsWidget) mdWidgets.push(reportsWidget);
    mdWidgets.push(myTaskWidget);
    return mdWidgets;
  }

  // ── Director / Manager — operational focus: their own queue plus the
  //    department/unit-level operational counts. (Tasks/approvals aren't
  //    tagged by directorate/department yet, so team-wide counts are shown
  //    as the closest available scope until that tagging is added.)
  const managerWidgets: DashboardWidget[] = [
    {
      type: "stat_grid",
      title: "Team Operations",
      href: "/admin/tasks",
      stats: [
        { label: "Open Tasks", value: String(openTasks) },
        { label: "Pending Approvals", value: String(pendingApprovals) },
        { label: "Urgent", value: String(urgentApprovals), alert: urgentApprovals > 0 },
      ],
    },
    myTaskWidget,
    myApprovalWidget,
  ];
  if (liveInspectionWidget) managerWidgets.push(liveInspectionWidget);
  if (corporateWidget) managerWidgets.push(corporateWidget);
  managerWidgets.push(...bulkAcquisitionWidgets);
  if (diasporaWidget) managerWidgets.push(diasporaWidget);
  if (documentsWidget) managerWidgets.push(documentsWidget);
  if (commsWidget) managerWidgets.push(commsWidget);
  if (reportsWidget) managerWidgets.push(reportsWidget);
  return managerWidgets;
}
