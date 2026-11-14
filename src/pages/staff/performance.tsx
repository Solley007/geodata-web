import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { format, formatDistanceToNow } from "date-fns";
import {
  Trophy, Building2, Clock, CheckSquare, MessageSquare, TrendingUp, TrendingDown,
  FileText, Download, ExternalLink, Bell, Inbox, Target, BadgeCheck,
} from "lucide-react";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

type Tab = "performance" | "resources" | "notifications";

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  other: "General",
  legal_notice: "Legal Notice",
};

// ── KPI Card ─────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, progress, target, color,
}: {
  icon: React.ElementType; label: string; value: string | number; sub: string;
  progress: number; target: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
            <Icon size={15} style={{ color }} />
          </div>
          <p className="text-xs font-semibold text-gray-500">{label}</p>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
      <div className="mt-3">
        <Progress value={Math.min(progress, 100)} className="h-1.5" />
        <p className="text-[10px] text-gray-400 mt-1">{target}</p>
      </div>
    </div>
  );
}

// ── My Performance tab ──────────────────────────────────────────────────

function MyPerformanceTab() {
  const perf = useQuery(api.staffPortal.performance.getMyPerformance, {});

  if (perf === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
      </div>
    );
  }

  const responseOk = perf.responseTime.avgHours !== null && perf.responseTime.avgHours <= perf.responseTime.targetHours;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={Trophy}
          label="Sales This Month"
          value={perf.sales.completedThisMonth}
          sub={`₦${perf.sales.valueThisMonth.toLocaleString()} closed`}
          progress={(perf.sales.completedThisMonth / Math.max(perf.sales.target, 1)) * 100}
          target={`Target: ${perf.sales.target}/month`}
          color="#10b981"
        />
        <KpiCard
          icon={Building2}
          label="Inspections This Month"
          value={perf.inspections.completedThisMonth}
          sub={`${perf.inspections.totalCompleted} completed all-time`}
          progress={(perf.inspections.completedThisMonth / Math.max(perf.inspections.target, 1)) * 100}
          target={`Target: ${perf.inspections.target}/month`}
          color="#6366f1"
        />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
                <Clock size={15} className="text-amber-500" />
              </div>
              <p className="text-xs font-semibold text-gray-500">Avg Response Time</p>
            </div>
            {perf.responseTime.avgHours !== null && (
              responseOk
                ? <TrendingDown size={14} className="text-green-500" />
                : <TrendingUp size={14} className="text-red-500" />
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {perf.responseTime.avgHours !== null ? `${perf.responseTime.avgHours.toFixed(1)}h` : "—"}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {perf.responseTime.sampleSize > 0 ? `Based on ${perf.responseTime.sampleSize} inspection${perf.responseTime.sampleSize === 1 ? "" : "s"}` : "No inspection data yet"}
          </p>
          <div className="mt-3">
            <Progress
              value={perf.responseTime.avgHours !== null ? Math.min((perf.responseTime.targetHours / Math.max(perf.responseTime.avgHours, 0.1)) * 100, 100) : 0}
              className="h-1.5"
            />
            <p className="text-[10px] text-gray-400 mt-1">Target: under {perf.responseTime.targetHours}h</p>
          </div>
        </div>
        <KpiCard
          icon={CheckSquare}
          label="Task Completion Rate"
          value={`${perf.tasks.completionRate}%`}
          sub={`${perf.tasks.done}/${perf.tasks.total} tasks done · ${perf.tasks.overdue} overdue`}
          progress={perf.tasks.completionRate}
          target="Target: 100%"
          color="#f59e0b"
        />
        <KpiCard
          icon={MessageSquare}
          label="Inquiry Resolution Rate"
          value={`${perf.inquiries.resolutionRate}%`}
          sub={`${perf.inquiries.resolved}/${perf.inquiries.total} inquiries resolved`}
          progress={perf.inquiries.resolutionRate}
          target="Target: 100%"
          color="#0ea5e9"
        />
      </div>

      <div className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] rounded-2xl p-5 text-white shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-white/80" />
          <p className="text-sm font-semibold">Your Overall Snapshot</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-white/70 text-xs">Total Sales Assigned</p>
            <p className="text-xl font-bold mt-0.5">{perf.sales.totalAssigned}</p>
          </div>
          <div>
            <p className="text-white/70 text-xs">Total Inspections</p>
            <p className="text-xl font-bold mt-0.5">{perf.inspections.totalAssigned}</p>
          </div>
          <div>
            <p className="text-white/70 text-xs">Tasks Handled</p>
            <p className="text-xl font-bold mt-0.5">{perf.tasks.total}</p>
          </div>
          <div>
            <p className="text-white/70 text-xs">Inquiries Handled</p>
            <p className="text-xl font-bold mt-0.5">{perf.inquiries.total}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── My Resources tab ─────────────────────────────────────────────────────

function MyResourcesTab() {
  const [docType, setDocType] = useState("all");
  const resources = useQuery(api.staffPortal.performance.listMyResources, { docType: docType !== "all" ? docType : undefined });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">Company Resources & Documents</h3>
          <p className="text-xs text-gray-400 mt-0.5">Shared policies, guides, and templates relevant to your role</p>
        </div>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="other">General</SelectItem>
            <SelectItem value="legal_notice">Legal Notice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {resources === undefined ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : resources.length === 0 ? (
        <div className="py-10 bg-white rounded-2xl border border-gray-100">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><FileText /></EmptyMedia>
              <EmptyTitle>No resources shared yet</EmptyTitle>
              <EmptyDescription>Company policies, guides, and templates will appear here once added to the shared vault.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="space-y-2.5">
          {resources.map((r) => (
            <a
              key={r._id}
              href={r.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 hover:border-[var(--brand)]/40 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <FileText size={17} className="text-[var(--brand)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{r.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className="text-[10px] border-0 bg-gray-100 text-gray-500 capitalize">{RESOURCE_TYPE_LABELS[r.docType] ?? r.docType}</Badge>
                  <span className="text-[11px] text-gray-400">{format(new Date(r.uploadedAt), "MMM d, yyyy")}</span>
                </div>
              </div>
              <Download size={15} className="text-gray-300 group-hover:text-[var(--brand)] shrink-0 transition-colors" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── My Notifications tab ─────────────────────────────────────────────────

const NOTIF_ICON: Record<string, React.ElementType> = {
  lead_update: TrendingUp,
  task_assigned: CheckSquare,
  inspection_update: Building2,
  leave_status: BadgeCheck,
};

function MyNotificationsTab() {
  const activity = useQuery(api.staffPortal.performance.listMyRecentActivity, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell size={15} className="text-gray-400" />
        <h3 className="font-semibold text-gray-800 text-sm">Recent Notifications</h3>
        <p className="text-xs text-gray-400 ml-auto">Use the bell icon above for the full inbox</p>
      </div>

      {activity === undefined ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : activity.length === 0 ? (
        <div className="py-10 bg-white rounded-2xl border border-gray-100">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Inbox /></EmptyMedia>
              <EmptyTitle>You're all caught up</EmptyTitle>
              <EmptyDescription>New assignment, approval, and reminder notifications will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="space-y-2">
          {activity.map((n) => {
            const Icon = NOTIF_ICON[n.type] ?? Bell;
            return (
              <div
                key={n._id}
                className={cn(
                  "flex items-start gap-3 bg-white rounded-2xl border p-3.5 shadow-sm",
                  n.isRead ? "border-gray-100" : "border-[var(--brand)]/30 bg-blue-50/40"
                )}
              >
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                </div>
                {n.link && (
                  <a href={n.link} className="text-gray-300 hover:text-[var(--brand)] shrink-0">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page Root ──────────────────────────────────────────────────────────────

export default function StaffPerformance() {
  const [tab, setTab] = useState<Tab>("performance");

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Performance & Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track your KPIs against targets and stay on top of updates</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1.5 w-fit overflow-x-auto">
        {([
          { key: "performance" as Tab, label: "My Performance", icon: Trophy },
          { key: "resources" as Tab, label: "My Resources", icon: FileText },
          { key: "notifications" as Tab, label: "Notifications", icon: Bell },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all whitespace-nowrap",
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "performance" && <MyPerformanceTab />}
      {tab === "resources" && <MyResourcesTab />}
      {tab === "notifications" && <MyNotificationsTab />}
    </div>
  );
}
