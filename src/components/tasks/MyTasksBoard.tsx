import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  CheckSquare, Search, X, MessageSquare, AlertTriangle, ListTodo,
  RefreshCw, XCircle, CheckCircle2, Send,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

// ══════════════════════════════════════════════════════════════════════════
// Self-service "My Tasks" board — shared by the Staff Portal (/staff/tasks)
// and any /admin viewer whose dashboard profile is limited to their own
// assignments (Board, Auditor, External/Restricted). Always backed by the
// `*MyTask*` queries in convex/taskboard.ts, which scope strictly to
// `assignedTo === caller`, regardless of the caller's coarse role — safe to
// expose to any authenticated user, unlike the full admin Tasks & Approvals
// page which requires staff-level access for its org-wide queries.
// ══════════════════════════════════════════════════════════════════════════

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  low:    { label: "Low",    color: "text-gray-500",  bg: "bg-gray-100",   dot: "bg-gray-400"   },
  medium: { label: "Medium", color: "text-blue-600",  bg: "bg-blue-50",    dot: "bg-blue-500"   },
  high:   { label: "High",   color: "text-orange-600",bg: "bg-orange-50",  dot: "bg-orange-500" },
  urgent: { label: "Urgent", color: "text-red-600",   bg: "bg-red-50",     dot: "bg-red-500"    },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  todo:        { label: "To Do",       color: "text-gray-600",   bg: "bg-gray-100",   icon: ListTodo     },
  in_progress: { label: "In Progress", color: "text-blue-600",   bg: "bg-blue-50",    icon: RefreshCw    },
  blocked:     { label: "Blocked",     color: "text-red-600",    bg: "bg-red-50",     icon: XCircle      },
  done:        { label: "Done",        color: "text-green-700",  bg: "bg-green-100",  icon: CheckCircle2 },
  cancelled:   { label: "Cancelled",   color: "text-gray-400",   bg: "bg-gray-50",     icon: X            },
};

function Pill({ status, cfg }: { status: string; cfg: Record<string, { label: string; color: string; bg: string; icon?: React.ElementType }> }) {
  const c = cfg[status] ?? { label: status, color: "text-gray-500", bg: "bg-gray-100" };
  const Icon = "icon" in c ? c.icon : undefined;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", c.bg, c.color)}>
      {Icon && <Icon size={9} />}{c.label}
    </span>
  );
}

function MyTaskDetailPanel({ taskId, onClose }: { taskId: Id<"tasks">; onClose: () => void }) {
  const task = useQuery(api.taskboard.getMyTask, { id: taskId });
  const updateStatus = useMutation(api.taskboard.updateMyTaskStatus);
  const addComment = useMutation(api.taskboard.addMyTaskComment);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatus({ id: taskId, status });
      toast.success(`Task marked as ${STATUS_CFG[status]?.label}`);
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await addComment({ taskId, content: comment.trim() });
      setComment("");
      toast.success("Comment added");
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
    finally { setSubmitting(false); }
  };

  if (task === undefined) return <div className="p-4"><Skeleton className="h-48 w-full" /></div>;
  if (!task) return <div className="p-4 text-sm text-gray-400">Task not found</div>;

  const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && !["done", "cancelled"].includes(task.status);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 shrink-0">
        <h3 className="font-bold text-gray-800 text-sm">Task Detail</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="font-bold text-gray-900">{task.title}</p>
          <p className="text-xs font-mono text-[var(--brand)] mt-0.5">{task.taskRef}</p>
          {task.description && <p className="text-xs text-gray-500 mt-2">{task.description}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Pill status={task.status} cfg={STATUS_CFG} />
          <Pill status={task.priority} cfg={PRIORITY_CFG} />
          {isOverdue && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              <AlertTriangle size={9} /> Overdue
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Category",   value: task.category.replace("_", " ") },
            { label: "Due Date",   value: task.dueDate ? format(parseISO(task.dueDate + "T00:00:00"), "dd MMM yyyy") : "No due date" },
            { label: "Created By", value: task.creatorName },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-xs font-semibold text-gray-800 mt-0.5 capitalize">{value}</p>
            </div>
          ))}
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map((t) => (
              <span key={t} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-medium">{t}</span>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Update Status</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(STATUS_CFG).map((s) => (
              <button key={s} onClick={() => handleStatusChange(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                  task.status === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}>{STATUS_CFG[s].label}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Comments ({task.comments.length})
          </p>
          <div className="space-y-2 mb-3">
            {task.comments.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No comments yet</p>
            ) : (
              task.comments.map((c) => (
                <div key={c._id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-800">{c.authorName}</span>
                    <span className="text-[10px] text-gray-400">{format(parseISO(c.timestamp), "dd MMM HH:mm")}</span>
                  </div>
                  <p className="text-xs text-gray-600">{c.content}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add comment…" value={comment} onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              className="flex-1 text-sm" />
            <Button size="sm" onClick={handleComment} disabled={submitting || !comment.trim()}>
              <Send size={12} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyTasksBoard({ title, subtitle }: { title: string; subtitle: string }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Id<"tasks"> | null>(null);

  const {
    rows: tasks,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading: tasksLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.taskboard.listMyTasksPaginated,
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: debouncedSearch || undefined,
    },
    15,
  );
  const stats = useQuery(api.taskboard.getMyTaskStats, {});

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total",       value: stats.total,      color: "#6366f1" },
            { label: "To Do",       value: stats.todo,       color: "#64748b" },
            { label: "In Progress", value: stats.inProgress, color: "#3b82f6" },
            { label: "Done",        value: stats.done,       color: "#10b981" },
            { label: "Overdue",     value: stats.overdue,    color: "#ef4444" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] text-gray-400">{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-8" placeholder="Search my tasks…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List + detail */}
      <div className="flex gap-4">
        <div className={cn("flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden",
          selected && "hidden md:block md:w-[55%] md:flex-none")}>
          {tasksLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : tasks.length === 0 ? (
            <div className="py-10">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><CheckSquare /></EmptyMedia>
                  <EmptyTitle>No tasks assigned</EmptyTitle>
                  <EmptyDescription>Tasks assigned to you will appear here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {tasks.map((task) => {
                const pc = PRIORITY_CFG[task.priority];
                const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && !["done", "cancelled"].includes(task.status);
                return (
                  <div key={task._id}
                    onClick={() => setSelected(selected === task._id ? null : task._id)}
                    className={cn("p-4 cursor-pointer hover:bg-blue-50/30 transition-colors", selected === task._id && "bg-blue-50")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", pc.dot)} />
                          <p className="font-semibold text-gray-900 text-sm truncate">{task.title}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-gray-400">{task.taskRef}</span>
                          <Pill status={task.status} cfg={STATUS_CFG} />
                          <span className="text-[10px] text-gray-400 capitalize">{task.category.replace("_", " ")}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {task.dueDate && (
                          <p className={cn("text-[10px]", isOverdue ? "text-red-600 font-semibold" : "text-gray-400")}>
                            {isOverdue && <AlertTriangle size={9} className="inline mr-0.5" />}
                            {format(parseISO(task.dueDate + "T00:00:00"), "dd MMM")}
                          </p>
                        )}
                        {task.commentCount > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center justify-end gap-1">
                            <MessageSquare size={9} />{task.commentCount}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!tasksLoading && tasks.length > 0 && (
            <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
          )}
        </div>

        {selected && (
          <div className="w-full md:w-[44%] flex-none bg-white rounded-2xl border border-gray-100 shadow-sm">
            <MyTaskDetailPanel taskId={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
