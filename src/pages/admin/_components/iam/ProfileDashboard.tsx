import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { Sparkles, ChevronRight } from "lucide-react";

// ── Generic widget renderers ─────────────────────────────────────────────────
// The dynamic dashboard engine (convex/iam/dashboard.ts) returns a small,
// reusable widget vocabulary per profile. This component is the ONE renderer
// for all 8 profiles — profiles differ only in which widgets the backend
// decides to send, never in a separate page/component per profile.

type Stat = { label: string; value: string; sub?: string; alert?: boolean };
type ListItem = { label: string; value: string; sub?: string; href?: string };
type Widget =
  | { type: "stat_grid"; title: string; href?: string; stats: Stat[] }
  | { type: "list"; title: string; href?: string; emptyLabel: string; items: ListItem[] }
  | { type: "message"; title: string; body: string };

function StatGridWidget({ w }: { w: Extract<Widget, { type: "stat_grid" }> }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 text-sm">{w.title}</h3>
        {w.href && (
          <Link to={w.href} className="text-xs text-[var(--brand)] hover:underline flex items-center gap-0.5">
            View <ChevronRight size={11} />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {w.stats.map((s) => (
          <div key={s.label} className={cn("rounded-xl p-3", s.alert ? "bg-red-50" : "bg-gray-50")}>
            <div className="text-[11px] text-gray-500 font-medium">{s.label}</div>
            <div className={cn("text-lg font-bold mt-0.5", s.alert ? "text-red-600" : "text-gray-900")} style={{ fontFamily: "'Playfair Display', serif" }}>
              {s.value}
            </div>
            {s.sub && <div className="text-[10px] text-gray-400 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListWidget({ w }: { w: Extract<Widget, { type: "list" }> }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 text-sm">{w.title}</h3>
        {w.href && (
          <Link to={w.href} className="text-xs text-[var(--brand)] hover:underline flex items-center gap-0.5">
            All <ChevronRight size={11} />
          </Link>
        )}
      </div>
      {w.items.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400">{w.emptyLabel}</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {w.items.map((item, i) => {
            const inner = (
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 truncate">{item.label}</div>
                  {item.sub && <div className="text-[10px] text-gray-400 capitalize truncate">{item.sub}</div>}
                </div>
                <span className="text-[10px] capitalize px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 shrink-0">
                  {item.value}
                </span>
              </div>
            );
            return item.href ? <Link to={item.href} key={i}>{inner}</Link> : <div key={i}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}

function MessageWidget({ w }: { w: Extract<Widget, { type: "message" }> }) {
  return (
    <div className="bg-[var(--brand)]/5 border border-[var(--brand)]/15 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles size={14} className="text-[var(--brand)]" />
        <h3 className="font-semibold text-gray-800 text-sm">{w.title}</h3>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{w.body}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
      </div>
    </div>
  );
}

// ── Profile-aware dashboard shell ────────────────────────────────────────────
// Rendered for dashboard profiles that fall outside the legacy staff
// (super_admin/admin/manager/agent) experience — i.e. Shareholder, Board,
// Auditor, and External/Restricted, whose data needs are intentionally
// narrower than the full operational ERP dashboard.
export default function ProfileDashboard() {
  const data = useQuery(api.iam.dashboard.getMyDashboardWidgets, {});

  if (data === undefined) return <DashboardSkeleton />;
  if (data === null) return null;

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            {data.profileLabel} Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), "EEEE, d MMMM yyyy")} · Personalised for your access level</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {data.widgets.map((w, i) => {
          const widget = w as Widget;
          if (widget.type === "stat_grid") return <StatGridWidget key={i} w={widget} />;
          if (widget.type === "list") return <ListWidget key={i} w={widget} />;
          return <MessageWidget key={i} w={widget} />;
        })}
      </div>
    </div>
  );
}
