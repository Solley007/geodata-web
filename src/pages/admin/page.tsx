import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion } from "motion/react";
import {
  Building2, TrendingUp, Users, MessageSquare, CheckCircle2,
  Clock, AlertCircle, ArrowLeftRight, ShieldCheck, Landmark,
  Receipt, CheckSquare, AlertTriangle, ChevronRight,
  BarChart3, Activity, Wallet, FileCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils.ts";
import { Link } from "react-router-dom";
import ProfileDashboard from "./_components/iam/ProfileDashboard.tsx";

// ── Color palettes ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  available: "#22c55e",
  sold: "#3b82f6",
  reserved: "#f59e0b",
  under_construction: "#8b5cf6",
  completed: "#10b981",
  cancelled: "#ef4444",
};

const TYPE_COLORS = ["var(--brand)", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const TXN_STATUS_COLORS: Record<string, string> = {
  reserved: "#f59e0b",
  kyc_pending: "#8b5cf6",
  finance_pending: "#3b82f6",
  payment_pending: "#06b6d4",
  agreement_pending: "#ec4899",
  completed: "#10b981",
  cancelled: "#ef4444",
  in_progress: "#6366f1",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, color, sub, href, alert,
  delay = 0,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  sub?: string;
  href?: string;
  alert?: boolean;
  delay?: number;
}) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn(
        "bg-white rounded-2xl p-5 border shadow-sm transition-all",
        href ? "cursor-pointer hover:shadow-md hover:border-blue-200" : "",
        alert ? "border-red-200 bg-red-50/40" : "border-gray-100"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + "1a" }}>
          <Icon size={17} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</div>
      {sub && <div className={cn("text-xs mt-0.5", alert ? "text-red-500 font-semibold" : "text-gray-400")}>{sub}</div>}
    </motion.div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h2>
      {href && (
        <Link to={href} className="text-xs text-[var(--brand)] font-medium hover:underline flex items-center gap-0.5">
          View all <ChevronRight size={11} />
        </Link>
      )}
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-2xl" />)}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const profile = useQuery(api.iam.dashboard.getMyDashboardProfile, {});
  // getERPStats requires the coarse admin/manager/agent role and throws
  // FORBIDDEN for every IAM-profile account (shareholder, board, auditor,
  // external_restricted, etc). Those accounts render through ProfileDashboard
  // below instead, so skip this query until we know `profile` is explicitly
  // null (legacy account, no IAM assignment). Calling it eagerly for a
  // restricted account throws inside the hook and blanks the whole page.
  const stats = useQuery(api.admin.getERPStats, profile === undefined || profile ? "skip" : {});

  // Only accounts with an explicit IAM role assignment (via Users & Roles →
  // Assignments) render through the dynamic dashboard engine. Everyone else
  // keeps seeing the original operational ERP dashboard below, unchanged —
  // this preserves existing behavior for every account that hasn't opted
  // into the new organisation model yet.
  if (profile === undefined) return <DashboardSkeleton />;

  if (profile) {
    return <ProfileDashboard />;
  }

  if (!stats) return <DashboardSkeleton />;

  const txnFunnelData = [
    { stage: "Reserved",     count: stats.recentTransactions.filter((t) => t.status === "reserved").length + stats.activeTransactions },
    { stage: "KYC",          count: stats.pendingKyc },
    { stage: "Finance",      count: stats.pendingFinance },
    { stage: "Payment",      count: stats.pendingPayments },
    { stage: "Completed",    count: stats.completedTransactions },
  ];

  const complianceData = [
    { name: "KYC Approved",    value: stats.approvedKyc,   color: "#10b981" },
    { name: "KYC Pending",     value: stats.pendingKyc,    color: "#f59e0b" },
    { name: "Finance Approved",value: stats.approvedFinance,color: "#3b82f6" },
    { name: "Finance Pending", value: stats.pendingFinance, color: "#8b5cf6" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            ERP Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")} · Live overview across all modules
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          All Systems Operational
        </div>
      </div>

      {/* ── Row 1: Property KPIs ── */}
      <div>
        <SectionHeader title="Properties & Portfolio" href="/admin/properties" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Properties" value={stats.totalProperties} icon={Building2} color="var(--brand)"
            sub={`${stats.totalEstates} estates`} href="/admin/properties" delay={0} />
          <KpiCard label="Available" value={stats.availableProperties} icon={CheckCircle2} color="#22c55e"
            sub="Ready to sell" href="/admin/properties" delay={0.05} />
          <KpiCard label="Sold" value={stats.soldProperties} icon={TrendingUp} color="#3b82f6"
            sub={`${stats.reservedProperties} reserved`} href="/admin/properties" delay={0.1} />
          <KpiCard label="Clients & CRM" value={stats.totalClients} icon={Users} color="#8b5cf6"
            sub={`${stats.newInquiries} new inquiries`} href="/admin/clients" delay={0.15} />
        </div>
      </div>

      {/* ── Row 2: Sales & Finance KPIs ── */}
      <div>
        <SectionHeader title="Sales, Finance & Payments" href="/admin/transactions" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Transactions" value={stats.totalTransactions} icon={ArrowLeftRight} color="#6366f1"
            sub={`${stats.activeTransactions} active`} href="/admin/transactions" delay={0.2} />
          <KpiCard label="Portfolio Value" value={fmt(stats.totalTransactionValue)} icon={Wallet} color="#10b981"
            sub={`${stats.completedTransactions} completed`} href="/admin/transactions" delay={0.25} />
          <KpiCard label="Total Payments In" value={fmt(stats.totalPaymentsReceived)} icon={Receipt} color="#06b6d4"
            sub={`${fmt(stats.paymentsThisMonth)} this month`} href="/admin/payments" delay={0.3} />
          <KpiCard label="Finance Pipeline" value={stats.pendingFinance} icon={Landmark} color="#f59e0b"
            sub={`${stats.approvedFinance} approved`} href="/admin/finance" delay={0.35} />
        </div>
      </div>

      {/* ── Row 3: Compliance & Ops KPIs ── */}
      <div>
        <SectionHeader title="Compliance, Tasks & Alerts" href="/admin/tasks" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="KYC Pending" value={stats.pendingKyc} icon={ShieldCheck}
            color={stats.pendingKyc > 0 ? "#f59e0b" : "#10b981"}
            sub={`${stats.approvedKyc} approved`} href="/admin/kyc" delay={0.4}
            alert={stats.pendingKyc > 5} />
          <KpiCard label="Pending Approvals" value={stats.pendingApprovals} icon={FileCheck}
            color={stats.urgentApprovals > 0 ? "#ef4444" : "#8b5cf6"}
            sub={stats.urgentApprovals > 0 ? `${stats.urgentApprovals} urgent!` : "In queue"}
            href="/admin/tasks" delay={0.45} alert={stats.urgentApprovals > 0} />
          <KpiCard label="Open Tasks" value={stats.openTasks} icon={CheckSquare} color="#6366f1"
            sub={stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : "On track"}
            href="/admin/tasks" delay={0.5} alert={stats.overdueTasks > 0} />
          <KpiCard label="Staff Users" value={stats.totalStaff} icon={Users} color="#64748b"
            sub={`${stats.totalUsers} total users`} href="/admin/users" delay={0.55} />
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Properties by Status */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Properties by Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.propertiesByStatus} dataKey="count" nameKey="status"
                cx="50%" cy="50%" outerRadius={70} innerRadius={35}
                label={({ name, percent }) => `${String(name)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}>
                {stats.propertiesByStatus.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.status] ?? TYPE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
              <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction funnel */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Transaction Funnel</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={txnFunnelData} layout="vertical" barSize={18}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {txnFunnelData.map((_, i) => (
                  <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* KYC & Finance compliance */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">KYC & Finance Status</h3>
          {complianceData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-gray-300 flex-col gap-2">
              <ShieldCheck size={36} />
              <span className="text-xs">No compliance data yet</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={complianceData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {complianceData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Properties by type + Recent transactions + Action items ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Properties by type */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 text-sm">Properties by Type</h3>
            <Link to="/admin/properties" className="text-xs text-[var(--brand)] hover:underline">View</Link>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.propertiesByType} barSize={28}>
              <XAxis dataKey="type" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stats.propertiesByType.map((_, i) => (
                  <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Recent Transactions</h3>
            <Link to="/admin/transactions" className="text-xs text-[var(--brand)] hover:underline flex items-center gap-0.5">
              All <ChevronRight size={11} />
            </Link>
          </div>
          {stats.recentTransactions.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">No transactions yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.recentTransactions.map((txn) => {
                const color = TXN_STATUS_COLORS[txn.status] ?? "#6b7280";
                return (
                  <Link to="/admin/transactions" key={txn._id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: color + "20" }}>
                      <ArrowLeftRight size={13} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 truncate">{txn.clientName}</div>
                      <div className="text-[10px] font-mono text-[var(--brand)]">{txn.transactionRef}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-gray-700">{fmt(txn.purchasePrice)}</div>
                      <span className="text-[10px] capitalize px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: color + "20", color }}>
                        {txn.status.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Action items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm">Action Required</h3>
          </div>
          <div className="p-4 space-y-2.5">
            {[
              {
                label: "KYC submissions to review",
                value: stats.pendingKyc,
                href: "/admin/kyc",
                icon: ShieldCheck,
                color: "#f59e0b",
                urgent: stats.pendingKyc > 5,
              },
              {
                label: "Pending approvals",
                value: stats.pendingApprovals,
                href: "/admin/tasks",
                icon: FileCheck,
                color: "#8b5cf6",
                urgent: stats.urgentApprovals > 0,
              },
              {
                label: "Overdue tasks",
                value: stats.overdueTasks,
                href: "/admin/tasks",
                icon: AlertTriangle,
                color: "#ef4444",
                urgent: stats.overdueTasks > 0,
              },
              {
                label: "Pending payments",
                value: stats.pendingPayments,
                href: "/admin/payments",
                icon: Receipt,
                color: "#06b6d4",
                urgent: false,
              },
              {
                label: "Finance applications",
                value: stats.pendingFinance,
                href: "/admin/finance",
                icon: Landmark,
                color: "#3b82f6",
                urgent: false,
              },
              {
                label: "New inquiries",
                value: stats.newInquiries,
                href: "/admin/inquiries",
                icon: MessageSquare,
                color: "#10b981",
                urgent: false,
              },
            ].map(({ label, value, href, icon: Icon, color, urgent }) => (
              <Link key={label} to={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer",
                  urgent ? "bg-red-50 hover:bg-red-100" : "bg-gray-50 hover:bg-blue-50"
                )}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: color + "20" }}>
                  <Icon size={13} style={{ color }} />
                </div>
                <span className={cn("text-xs flex-1", urgent ? "text-red-700 font-semibold" : "text-gray-700 font-medium")}>
                  {label}
                </span>
                <span className={cn(
                  "text-sm font-bold rounded-lg px-2 py-0.5 min-w-[28px] text-center",
                  urgent ? "bg-red-600 text-white" : value > 0 ? "bg-gray-200 text-gray-700" : "bg-gray-100 text-gray-400"
                )}>{value}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
