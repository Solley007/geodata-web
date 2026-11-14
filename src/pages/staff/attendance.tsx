import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import {
  Clock, Calendar as CalendarIcon, CheckCircle, XCircle, Plus, LogIn, LogOut,
  CalendarClock, AlarmClock, AlertCircle,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { ErrorState, ErrorStateHeader, ErrorStateMedia, ErrorStateTitle, ErrorStateDescription } from "@/components/ui/error-state.tsx";
import { cn } from "@/lib/utils.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

const ATT_STATUS_COLOR: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-600",
  late: "bg-yellow-100 text-yellow-700",
  half_day: "bg-orange-100 text-orange-700",
};

const LEAVE_STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

const LEAVE_TYPES = ["annual", "sick", "maternity", "emergency", "unpaid"];

const todayIso = () => new Date().toISOString().split("T")[0];
const nowHHMM = () => new Date().toTimeString().slice(0, 5);

type Tab = "attendance" | "leave";

// ── Clock in/out card ────────────────────────────────────────────────────

function ClockCard() {
  const today = todayIso();
  const todayRecord = useQuery(api.staffPortal.attendanceAndLeave.getMyAttendanceForDate, { date: today });
  const clockIn = useMutation(api.staffPortal.attendanceAndLeave.clockIn);
  const clockOut = useMutation(api.staffPortal.attendanceAndLeave.clockOut);
  const [busy, setBusy] = useState(false);

  const handleClockIn = async () => {
    setBusy(true);
    try { await clockIn({ date: today, time: nowHHMM() }); toast.success("Clocked in"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to clock in"); }
    finally { setBusy(false); }
  };

  const handleClockOut = async () => {
    setBusy(true);
    try { await clockOut({ date: today, time: nowHHMM() }); toast.success("Clocked out"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to clock out"); }
    finally { setBusy(false); }
  };

  if (todayRecord === undefined) return <Skeleton className="h-32 w-full rounded-2xl" />;

  return (
    <div className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] rounded-2xl p-5 text-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-white/70">Today · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <p className="text-lg font-bold mt-0.5">
            {todayRecord?.checkIn && todayRecord?.checkOut ? "Shift complete"
              : todayRecord?.checkIn ? "Clocked in — have a great day" : "Ready to start your day?"}
          </p>
        </div>
        <Clock size={28} className="text-white/70 shrink-0" />
      </div>
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5">
          <LogIn size={14} className="text-white/70" />
          <span className="text-white/70">In:</span>
          <span className="font-semibold">{todayRecord?.checkIn ?? "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LogOut size={14} className="text-white/70" />
          <span className="text-white/70">Out:</span>
          <span className="font-semibold">{todayRecord?.checkOut ?? "—"}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleClockIn}
          disabled={busy || !!todayRecord?.checkIn}
          className="flex-1 bg-white text-[var(--brand)] hover:bg-white/90 gap-2 h-10"
        >
          <LogIn size={15} /> Clock In
        </Button>
        <Button
          onClick={handleClockOut}
          disabled={busy || !todayRecord?.checkIn || !!todayRecord?.checkOut}
          className="flex-1 bg-white/15 hover:bg-white/25 text-white gap-2 h-10 border border-white/30"
        >
          <LogOut size={15} /> Clock Out
        </Button>
      </div>
    </div>
  );
}

// ── My Attendance tab ────────────────────────────────────────────────────

function MyAttendanceTab() {
  const stats = useQuery(api.staffPortal.attendanceAndLeave.getMyAttendanceStats, {});
  const {
    rows: records,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
  } = useCursorPagination(api.staffPortal.attendanceAndLeave.listMyAttendancePaginated, {}, 10);

  if (stats && !stats.hasProfile) {
    return (
      <ErrorState>
        <ErrorStateHeader>
          <ErrorStateMedia variant="icon"><AlertCircle /></ErrorStateMedia>
          <ErrorStateTitle>No staff profile linked</ErrorStateTitle>
          <ErrorStateDescription>Your account isn't linked to a staff record yet. Contact HR/Admin to get set up before you can clock in or request leave.</ErrorStateDescription>
        </ErrorStateHeader>
      </ErrorState>
    );
  }

  return (
    <div className="space-y-5">
      <ClockCard />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Present", value: stats.present, color: "#10b981", icon: CheckCircle },
            { label: "Late", value: stats.late, color: "#f59e0b", icon: AlarmClock },
            { label: "Half Day", value: stats.halfDay, color: "#f97316", icon: CalendarClock },
            { label: "Absent", value: stats.absent, color: "#ef4444", icon: XCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-gray-400">{label}</p>
                <Icon size={13} style={{ color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800 text-sm">Attendance History</h3>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : records.length === 0 ? (
          <div className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><CalendarIcon /></EmptyMedia>
                <EmptyTitle>No attendance records yet</EmptyTitle>
                <EmptyDescription>Clock in above to start building your attendance history.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">In</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Out</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((a) => (
                <tr key={a._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{a.date}</td>
                  <td className="px-4 py-3 text-gray-500">{a.checkIn ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{a.checkOut ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn("text-xs border-0 capitalize", ATT_STATUS_COLOR[a.status] ?? "bg-gray-100 text-gray-600")}>{a.status.replace("_", " ")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && records.length > 0 && (
          <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
        )}
      </div>
    </div>
  );
}

// ── My Leave tab ─────────────────────────────────────────────────────────

function MyLeaveTab() {
  const [status, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [cancelId, setCancelId] = useState<Id<"leaveRequests"> | null>(null);

  const stats = useQuery(api.staffPortal.attendanceAndLeave.getMyLeaveStats, {});
  const createLeave = useMutation(api.staffPortal.attendanceAndLeave.createMyLeaveRequest);
  const cancelLeave = useMutation(api.staffPortal.attendanceAndLeave.cancelMyLeaveRequest);

  const {
    rows: leaves,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(api.staffPortal.attendanceAndLeave.listMyLeaveRequestsPaginated, { status: status !== "all" ? status : undefined }, 10);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (stats && !stats.hasProfile) {
    return (
      <ErrorState>
        <ErrorStateHeader>
          <ErrorStateMedia variant="icon"><AlertCircle /></ErrorStateMedia>
          <ErrorStateTitle>No staff profile linked</ErrorStateTitle>
          <ErrorStateDescription>Your account isn't linked to a staff record yet. Contact HR/Admin to get set up before requesting leave.</ErrorStateDescription>
        </ErrorStateHeader>
      </ErrorState>
    );
  }

  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate || !form.reason.trim()) { toast.error("Fill in all fields"); return; }
    setSubmitting(true);
    try {
      await createLeave(form);
      toast.success("Leave request submitted");
      setShowForm(false);
      setForm({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to submit"); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try { await cancelLeave({ id: cancelId }); toast.success("Leave request cancelled"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to cancel"); }
    finally { setCancelId(null); }
  };

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",    value: stats.total,    color: "#6366f1" },
            { label: "Pending",  value: stats.pending,  color: "#f59e0b" },
            { label: "Approved", value: stats.approved, color: "#10b981" },
            { label: "Rejected", value: stats.rejected, color: "#ef4444" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] text-gray-400">{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowForm(true)} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 h-9 text-sm">
          <Plus size={14} /> Request Leave
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : leaves.length === 0 ? (
          <div className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><CalendarClock /></EmptyMedia>
                <EmptyTitle>No leave requests yet</EmptyTitle>
                <EmptyDescription>Submit a leave request and track its approval status here.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={() => setShowForm(true)}>Request Leave</Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Dates</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Reason</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leaves.map((l) => (
                <tr key={l._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800 capitalize">{l.leaveType}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{l.startDate} → {l.endDate}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell max-w-[220px] truncate">{l.reason}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn("text-xs border-0 capitalize", LEAVE_STATUS_COLOR[l.status] ?? "bg-gray-100 text-gray-500")}>{l.status}</Badge>
                    {l.notes && <p className="text-[10px] text-gray-400 mt-1 max-w-[160px] truncate">{l.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {l.status === "pending" && (
                      <Button size="sm" className="h-7 text-xs bg-red-50 hover:bg-red-100 text-red-600" onClick={() => setCancelId(l._id)}>Cancel</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && leaves.length > 0 && (
          <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
        )}
      </div>

      {/* Request Leave Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Request Leave</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Leave Type</Label>
              <Select value={form.leaveType} onValueChange={(v) => setForm((p) => ({ ...p, leaveType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs font-semibold mb-1 block">Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} /></div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} rows={3} className="resize-none text-sm" placeholder="Briefly describe the reason for your leave" />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" className="bg-gray-100 text-gray-700" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{submitting ? "Submitting..." : "Submit Request"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel Leave Request?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">This pending request will be removed.</p>
          <div className="flex justify-end gap-3 mt-3">
            <Button className="bg-gray-100 text-gray-700" onClick={() => setCancelId(null)}>Keep it</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCancel}>Cancel Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Page Root ──────────────────────────────────────────────────────────────

export default function StaffAttendanceLeave() {
  const [tab, setTab] = useState<Tab>("attendance");

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Attendance & Leave</h1>
        <p className="text-sm text-gray-500 mt-0.5">Clock in/out, view your history, and request time off</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1.5 w-fit overflow-x-auto">
        {([
          { key: "attendance" as Tab, label: "My Attendance", icon: Clock },
          { key: "leave" as Tab, label: "My Leave", icon: CalendarClock },
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

      {tab === "attendance" && <MyAttendanceTab />}
      {tab === "leave" && <MyLeaveTab />}
    </div>
  );
}
