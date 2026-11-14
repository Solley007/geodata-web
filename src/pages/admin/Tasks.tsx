import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { format, parseISO, isAfter } from "date-fns";
import {
  CheckSquare, Plus, Search, X, Trash2, Edit2, MessageSquare,
  Clock, AlertTriangle, CheckCircle2, XCircle, Tag, User,
  ArrowRight, ChevronDown, ChevronRight, RefreshCw, Send,
  Shield, Flag, ListTodo, Layers, ShieldCheck,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";
import MyTasksBoard from "@/components/tasks/MyTasksBoard.tsx";

// Dashboard profiles limited to their own assignments only — never the
// org-wide "Tasks & Approvals" view, whose queries require staff-level
// access. These render the same self-service board used by the Staff
// Portal instead, so the sidebar's "Tasks & Approvals" link never dead-ends
// on a blank screen for them.
const SELF_SERVICE_ONLY_PROFILES = new Set(["board", "auditor", "external_restricted"]);

// ── Config ─────────────────────────────────────────────────────────────────────

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
  cancelled:   { label: "Cancelled",   color: "text-gray-400",   bg: "bg-gray-50",    icon: X            },
};

const APR_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pending",   color: "text-orange-600", bg: "bg-orange-50"  },
  approved:  { label: "Approved",  color: "text-green-700",  bg: "bg-green-100"  },
  rejected:  { label: "Rejected",  color: "text-red-600",    bg: "bg-red-50"     },
  escalated: { label: "Escalated", color: "text-purple-600", bg: "bg-purple-50"  },
  withdrawn: { label: "Withdrawn", color: "text-gray-400",   bg: "bg-gray-100"   },
};

const TASK_CATEGORIES = [
  "kyc","finance","transaction","payment","legal","admin","construction","other"
];
const APPROVAL_TYPES = [
  "kyc","finance","payment_exception","reservation","allocation","refund","transaction_completion","other"
];

type Tab = "tasks" | "approvals";

// ── Reusable pill ──────────────────────────────────────────────────────────────

function Pill({ status, cfg }: { status: string; cfg: Record<string, { label: string; color: string; bg: string; icon?: React.ElementType }> }) {
  const c = cfg[status] ?? { label: status, color: "text-gray-500", bg: "bg-gray-100" };
  const Icon = "icon" in c ? c.icon : undefined;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", c.bg, c.color)}>
      {Icon && <Icon size={9} />}{c.label}
    </span>
  );
}

// ── Create Task Dialog ─────────────────────────────────────────────────────────

function CreateTaskDialog({ onClose }: { onClose: () => void }) {
  const staff = useQuery(api.users.listAll, {});
  const clients = useQuery(api.clients.listClients, {});
  const createTask = useMutation(api.taskboard.createTask);
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium", category: "admin",
    assignedTo: "", dueDate: "", clientId: "", tags: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    setLoading(true);
    try {
      await createTask({
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        category: form.category,
        assignedTo: form.assignedTo && form.assignedTo !== "none" ? form.assignedTo as Id<"users"> : undefined,
        dueDate: form.dueDate || undefined,
        clientId: form.clientId && form.clientId !== "none" ? form.clientId as Id<"clients"> : undefined,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      });
      toast.success("Task created");
      onClose();
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus size={16} /> New Task</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input className="mt-1" placeholder="e.g. Review KYC for Adaeze Okafor" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assign To</Label>
              <Select value={form.assignedTo} onValueChange={(v) => set("assignedTo", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                {staff?.filter((s) => s.role && ["super_admin","admin","manager","agent"].includes(s.role)).map((s) => <SelectItem key={s._id} value={s._id}>{s.name ?? s.email ?? s._id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input className="mt-1" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Client (optional)</Label>
            <Select value={form.clientId} onValueChange={(v) => set("clientId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {clients?.map((c) => <SelectItem key={c._id} value={c._id}>{c.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input className="mt-1" placeholder="kyc, urgent, q3" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Creating…" : "Create Task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Task Detail Panel ──────────────────────────────────────────────────────────

function TaskDetailPanel({ taskId, onClose }: { taskId: Id<"tasks">; onClose: () => void }) {
  const task = useQuery(api.taskboard.getTask, { id: taskId });
  const updateStatus = useMutation(api.taskboard.updateTaskStatus);
  const addComment = useMutation(api.taskboard.addTaskComment);
  const deleteTask = useMutation(api.taskboard.deleteTask);
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

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask({ id: taskId });
      onClose();
      toast.success("Task deleted");
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
  };

  if (task === undefined) return <div className="p-4"><Skeleton className="h-48 w-full" /></div>;
  if (!task) return <div className="p-4 text-sm text-gray-400">Task not found</div>;

  const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && !["done","cancelled"].includes(task.status);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 shrink-0">
        <h3 className="font-bold text-gray-800 text-sm">Task Detail</h3>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete} className="text-gray-400 hover:text-red-600 cursor-pointer p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
        </div>
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
            { label: "Assigned To", value: task.assigneeName },
            { label: "Category",    value: task.category.replace("_", " ") },
            { label: "Due Date",    value: task.dueDate ? format(parseISO(task.dueDate + "T00:00:00"), "dd MMM yyyy") : "No due date" },
            { label: "Created By",  value: task.creatorName },
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

        {/* Status controls */}
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

        {/* Comments */}
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

// ── Tasks Tab ──────────────────────────────────────────────────────────────────

function TasksTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
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
    api.taskboard.listTasksPaginated,
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      priority: priorityFilter !== "all" ? priorityFilter : undefined,
      search: debouncedSearch || undefined,
    },
    15,
  );
  const stats = useQuery(api.taskboard.getTaskStats, {});

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, priorityFilter]);

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total",       value: stats.total,      color: "#6366f1" },
            { label: "To Do",       value: stats.todo,       color: "#64748b" },
            { label: "In Progress", value: stats.inProgress, color: "#3b82f6" },
            { label: "Done",        value: stats.done,       color: "#10b981" },
            { label: "Overdue",     value: stats.overdue,    color: "#ef4444" },
            { label: "Urgent",      value: stats.urgent,     color: "#f97316" },
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
          <Input className="pl-8" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Priorities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {Object.entries(PRIORITY_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Task
        </Button>
      </div>

      {/* List + detail */}
      <div className="flex gap-4">
        <div className={cn("flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden",
          selected && "hidden md:block md:w-[55%] md:flex-none")}>
          {tasksLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : tasks.length === 0 ? (
            <div className="py-16 text-center">
              <CheckSquare size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No tasks found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {tasks.map((task) => {
                const pc = PRIORITY_CFG[task.priority];
                const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && !["done","cancelled"].includes(task.status);
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
                        <p className="text-xs text-gray-600">{task.assigneeName}</p>
                        {task.dueDate && (
                          <p className={cn("text-[10px] mt-0.5", isOverdue ? "text-red-600 font-semibold" : "text-gray-400")}>
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
            <TaskDetailPanel taskId={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>

      {showCreate && <CreateTaskDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}

// ── Create Approval Dialog ─────────────────────────────────────────────────────

function CreateApprovalDialog({ onClose }: { onClose: () => void }) {
  const staff = useQuery(api.users.listAll, {});
  const clients = useQuery(api.clients.listClients, {});
  const createApproval = useMutation(api.taskboard.createApproval);
  const [form, setForm] = useState({
    approvalType: "kyc", priority: "medium", summary: "", requestNote: "",
    clientId: "", relatedRef: "", assignedTo: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.summary) { toast.error("Summary required"); return; }
    setLoading(true);
    try {
      await createApproval({
        approvalType: form.approvalType,
        priority: form.priority,
        summary: form.summary,
        requestNote: form.requestNote || undefined,
        clientId: form.clientId && form.clientId !== "none" ? form.clientId as Id<"clients"> : undefined,
        relatedRef: form.relatedRef || undefined,
        assignedTo: form.assignedTo && form.assignedTo !== "none" ? form.assignedTo as Id<"users"> : undefined,
      });
      toast.success("Approval request submitted");
      onClose();
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck size={16} /> Request Approval</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.approvalType} onValueChange={(v) => set("approvalType", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPROVAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Summary <span className="text-red-500">*</span></Label>
            <Textarea className="mt-1" rows={2} placeholder="Describe what needs approval…" value={form.summary} onChange={(e) => set("summary", e.target.value)} />
          </div>
          <div>
            <Label>Client</Label>
            <Select value={form.clientId} onValueChange={(v) => set("clientId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {clients?.map((c) => <SelectItem key={c._id} value={c._id}>{c.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Related Ref (optional)</Label>
            <Input className="mt-1" placeholder="e.g. GWS-TXN-0014" value={form.relatedRef} onChange={(e) => set("relatedRef", e.target.value)} />
          </div>
          <div>
            <Label>Assign Reviewer</Label>
            <Select value={form.assignedTo} onValueChange={(v) => set("assignedTo", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {staff?.filter((s) => s.role && ["super_admin","admin","manager","agent"].includes(s.role)).map((s) => <SelectItem key={s._id} value={s._id}>{s.name ?? s.email ?? s._id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Request Note</Label>
            <Textarea className="mt-1" rows={2} value={form.requestNote} onChange={(e) => set("requestNote", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Submitting…" : "Submit Request"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Decide Approval Dialog ─────────────────────────────────────────────────────

function DecideApprovalDialog({
  approvalId, onClose
}: { approvalId: Id<"approvals">; onClose: () => void }) {
  const decide = useMutation(api.taskboard.decideApproval);
  const [decision, setDecision] = useState("approved");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await decide({ id: approvalId, decision, decisionNote: note || undefined });
      toast.success(`Approval ${decision}`);
      onClose();
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Make Decision</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-3">
            {["approved","rejected"].map((d) => (
              <button key={d} onClick={() => setDecision(d)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors capitalize",
                  decision === d
                    ? d === "approved" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}>{d}</button>
            ))}
          </div>
          <div>
            <Label>Decision Note</Label>
            <Textarea className="mt-1" rows={2} placeholder="Optional note…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}
            className={decision === "approved" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}>
            {loading ? "Saving…" : `Confirm ${decision}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Approvals Tab ──────────────────────────────────────────────────────────────

function ApprovalsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [decidingId, setDecidingId] = useState<Id<"approvals"> | null>(null);

  const {
    rows: approvals,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading: approvalsLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.taskboard.listApprovalsPaginated,
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      approvalType: typeFilter !== "all" ? typeFilter : undefined,
      search: debouncedSearch || undefined,
    },
    15,
  );
  const stats = useQuery(api.taskboard.getApprovalStats, {});
  const escalate = useMutation(api.taskboard.escalateApproval);
  const withdraw = useMutation(api.taskboard.withdrawApproval);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, typeFilter]);

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total",     value: stats.total,     color: "#6366f1" },
            { label: "Pending",   value: stats.pending,   color: "#f59e0b" },
            { label: "Approved",  value: stats.approved,  color: "#10b981" },
            { label: "Rejected",  value: stats.rejected,  color: "#ef4444" },
            { label: "Escalated", value: stats.escalated, color: "#8b5cf6" },
            { label: "Urgent",    value: stats.urgent,    color: "#f97316" },
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
          <Input className="pl-8" placeholder="Search approvals…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(APR_STATUS_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {APPROVAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Request
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {approvalsLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : approvals.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldCheck size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No approvals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ref / Summary</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Reviewer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {approvals.map((apr) => (
                  <tr key={apr._id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-xs truncate max-w-[180px]">{apr.summary}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-[var(--brand)]">{apr.approvalRef}</span>
                        {apr.relatedRef && <span className="text-[10px] font-mono text-gray-400">{apr.relatedRef}</span>}
                        <Pill status={apr.priority} cfg={PRIORITY_CFG} />
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-500 capitalize">{apr.approvalType.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-600">{apr.clientName ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-600">{apr.reviewerName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Pill status={apr.status} cfg={APR_STATUS_CFG} />
                    </td>
                    <td className="px-4 py-3">
                      {(apr.status === "pending" || apr.status === "escalated") && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setDecidingId(apr._id)}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium cursor-pointer">
                            Decide
                          </button>
                          <button onClick={() => withdraw({ id: apr._id })}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-200 font-medium cursor-pointer">
                            Withdraw
                          </button>
                        </div>
                      )}
                      {apr.status === "approved" || apr.status === "rejected" ? (
                        <div className="text-right">
                          {apr.decisionNote && (
                            <p className="text-[10px] text-gray-400 italic max-w-[120px] text-right truncate">{apr.decisionNote}</p>
                          )}
                          {apr.decisionAt && (
                            <p className="text-[10px] text-gray-400">{format(parseISO(apr.decisionAt), "dd MMM yyyy")}</p>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
          </div>
        )}
      </div>

      {showCreate && <CreateApprovalDialog onClose={() => setShowCreate(false)} />}
      {decidingId && <DecideApprovalDialog approvalId={decidingId} onClose={() => setDecidingId(null)} />}
    </div>
  );
}

// ── Page Root ──────────────────────────────────────────────────────────────────

export default function AdminTasks() {
  const [tab, setTab] = useState<Tab>("tasks");
  const dashboardProfile = useQuery(api.iam.dashboard.getMyDashboardProfile, {});

  // Restricted dashboard profiles never reach the org-wide queries below
  // (they require staff-level access) — show them their own self-service
  // "My Tasks" board instead, same as the Staff Portal.
  if (dashboardProfile === undefined) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (dashboardProfile && SELF_SERVICE_ONLY_PROFILES.has(dashboardProfile.profileKey)) {
    return <MyTasksBoard title="My Tasks" subtitle="Tasks assigned to you — update their status and leave comments" />;
  }

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tasks & Approvals</h1>
        <p className="text-sm text-gray-500 mt-0.5">Assign tasks to staff, manage approval queues, and track work across all ERP modules</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1.5 w-fit">
        {([
          { key: "tasks" as Tab, label: "Tasks", icon: CheckSquare },
          { key: "approvals" as Tab, label: "Approvals", icon: ShieldCheck },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all",
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "tasks" && <TasksTab />}
      {tab === "approvals" && <ApprovalsTab />}
    </div>
  );
}
