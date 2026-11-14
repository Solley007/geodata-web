import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { format, parseISO } from "date-fns";
import {
  Shield, Search, RefreshCw, User, Tag, Filter,
  CheckCircle2, Edit2, Trash2, Eye, LogIn, Download,
  XCircle, ArrowRight, AlertTriangle,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

const AUDIT_PAGE_SIZE = 15;

// ── Action config ──────────────────────────────────────────────────────────────

const ACTION_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  create:        { label: "Created",      color: "text-green-700",  bg: "bg-green-50",  icon: CheckCircle2 },
  update:        { label: "Updated",      color: "text-blue-600",   bg: "bg-blue-50",   icon: Edit2        },
  delete:        { label: "Deleted",      color: "text-red-600",    bg: "bg-red-50",    icon: Trash2       },
  status_change: { label: "Status",       color: "text-purple-600", bg: "bg-purple-50", icon: RefreshCw    },
  login:         { label: "Login",        color: "text-gray-600",   bg: "bg-gray-100",  icon: LogIn        },
  export:        { label: "Exported",     color: "text-orange-600", bg: "bg-orange-50", icon: Download     },
  view:          { label: "Viewed",       color: "text-gray-500",   bg: "bg-gray-50",   icon: Eye          },
  approve:       { label: "Approved",     color: "text-green-700",  bg: "bg-green-100", icon: CheckCircle2 },
  reject:        { label: "Rejected",     color: "text-red-700",    bg: "bg-red-100",   icon: XCircle      },
  enable:        { label: "Enabled",      color: "text-green-700",  bg: "bg-green-100", icon: CheckCircle2 },
  disable:       { label: "Disabled",     color: "text-gray-600",   bg: "bg-gray-100",  icon: XCircle      },
  sign:          { label: "Signed",       color: "text-green-700",  bg: "bg-green-100", icon: CheckCircle2 },
  send:          { label: "Sent",         color: "text-blue-600",   bg: "bg-blue-50",   icon: ArrowRight   },
  decline:       { label: "Declined",     color: "text-red-700",    bg: "bg-red-100",   icon: XCircle      },
  cancel:        { label: "Cancelled",    color: "text-gray-600",   bg: "bg-gray-100",  icon: XCircle      },
  revoke:        { label: "Revoked",      color: "text-red-700",    bg: "bg-red-100",   icon: XCircle      },
};

const ENTITY_OPTIONS = [
  "tasks","approvals","transactions","kyc","finance","payments","agreements","vaultDocuments","dataRooms","clients","users",
  "feature_toggle","document_type","signatureRequests","eStamps","conversations","conversationMessages","announcements",
  "report_definitions","report_runs","report_subscriptions",
];
const ACTION_OPTIONS = Object.keys(ACTION_CFG);

// ── Audit Entry Row ────────────────────────────────────────────────────────────

function AuditRow({ entry }: { entry: {
  _id: Id<"auditLog">;
  action: string;
  entity: string;
  entityRef?: string;
  userId?: Id<"users">;
  userName?: string;
  userRole?: string;
  description: string;
  timestamp: string;
  before?: string;
  after?: string;
  metadata?: string;
} }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ACTION_CFG[entry.action] ?? { label: entry.action, color: "text-gray-500", bg: "bg-gray-100", icon: AlertTriangle };
  const Icon = cfg.icon;

  return (
    <div className={cn("border-b border-gray-50 last:border-none transition-colors", expanded && "bg-blue-50/30")}>
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50/20"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Action pill */}
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 mt-0.5", cfg.bg, cfg.color)}>
          <Icon size={9} />{cfg.label}
        </span>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-medium leading-snug">{entry.description}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-gray-400 capitalize bg-gray-50 px-1.5 py-0.5 rounded font-medium">{entry.entity}</span>
            {entry.entityRef && <span className="text-[10px] font-mono text-[var(--brand)]">{entry.entityRef}</span>}
            {entry.userName && (
              <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                <User size={8} /> {entry.userName}
                {entry.userRole && <span className="text-gray-400 ml-1 capitalize">({entry.userRole.replace("_", " ")})</span>}
              </span>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-right shrink-0">
          <p className="text-[11px] text-gray-500">{format(parseISO(entry.timestamp), "dd MMM yyyy")}</p>
          <p className="text-[10px] text-gray-400">{format(parseISO(entry.timestamp), "HH:mm:ss")}</p>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (entry.before || entry.after || entry.metadata) && (
        <div className="px-4 pb-3 space-y-2">
          {entry.before && (
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1">Before</p>
              <pre className="text-[10px] text-red-700 whitespace-pre-wrap font-mono overflow-x-auto">{entry.before}</pre>
            </div>
          )}
          {entry.after && (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-1">After</p>
              <pre className="text-[10px] text-green-700 whitespace-pre-wrap font-mono overflow-x-auto">{entry.after}</pre>
            </div>
          )}
          {entry.metadata && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Metadata</p>
              <pre className="text-[10px] text-gray-600 whitespace-pre-wrap font-mono overflow-x-auto">{entry.metadata}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminAudit() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const {
    rows: entries,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.taskboard.listAuditLogPaginated,
    {
      entity: entityFilter !== "all" ? entityFilter : undefined,
      action: actionFilter !== "all" ? actionFilter : undefined,
      search: debouncedSearch || undefined,
    },
    AUDIT_PAGE_SIZE,
  );

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, entityFilter, actionFilter]);

  const stats = useQuery(api.taskboard.getAuditStats, {});

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete immutable trail of all actions performed across the ERP — who, what, when, and before/after values</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Events",  value: stats.total, icon: Shield, color: "#6366f1" },
            { label: "Creates",       value: stats.actions["create"] ?? 0, icon: CheckCircle2, color: "#10b981" },
            { label: "Updates",       value: stats.actions["update"] ?? 0, icon: Edit2, color: "#3b82f6" },
            { label: "Status Changes",value: stats.actions["status_change"] ?? 0, icon: RefreshCw, color: "#8b5cf6" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">{label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + "15" }}>
                  <Icon size={14} style={{ color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Top entities mini chart */}
      {stats && Object.keys(stats.entities).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Events by Module</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.entities)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 12)
              .map(([entity, count]) => (
                <div key={entity} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => setEntityFilter(entity === entityFilter ? "all" : entity)}>
                  <span className={cn("text-xs font-medium capitalize", entityFilter === entity ? "text-[var(--brand)]" : "text-gray-600")}>
                    {entity}
                  </span>
                  <span className={cn("text-[10px] font-bold", entityFilter === entity ? "text-[var(--brand)]" : "text-gray-400")}>
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-8" placeholder="Search by description, ref, or user…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {ENTITY_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ACTION_OPTIONS.map((a) => <SelectItem key={a} value={a}>{ACTION_CFG[a].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Log entries */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center">
            <Shield size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No audit log entries found</p>
            <p className="text-xs text-gray-400 mt-1">All ERP actions will appear here once logged</p>
          </div>
        ) : (
          <div>
            <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-100">
              <p className="text-xs text-gray-500 font-medium">Page {pageIndex + 1} (newest first)</p>
            </div>
            {entries.map((entry) => (
              <AuditRow key={entry._id} entry={entry} />
            ))}
          </div>
        )}
        {!isLoading && entries.length > 0 && (
          <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
        )}
      </div>
    </div>
  );
}
