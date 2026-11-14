import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  ArrowRight, Plus, Search, Filter, RefreshCw, ChevronDown, X,
  Clock, CheckCircle2, XCircle, AlertTriangle, Circle, Banknote,
  User, Building2, MapPin, CalendarDays, FileText, TrendingUp,
  Tag, Pencil, Trash2, Eye, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { cn } from "@/lib/utils.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

const PAGE_SIZE = 12;

// ── Status helpers ────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  qualified: "Qualified",
  property_selected: "Property Selected",
  application_started: "Application Started",
  kyc_pending: "KYC Pending",
  kyc_review: "KYC Review",
  kyc_approved: "KYC Approved",
  finance_pending: "Finance Pending",
  finance_approved: "Finance Approved",
  payment_plan: "Payment Plan",
  payment_pending: "Payment Pending",
  partially_paid: "Partially Paid",
  fully_paid: "Fully Paid",
  agreement: "Agreement",
  e_signature: "E-Signature",
  allocation: "Allocation",
  completion_review: "Completion Review",
  completed: "Completed",
  more_info_required: "More Info Required",
  kyc_rejected: "KYC Rejected",
  finance_rejected: "Finance Rejected",
  payment_failed: "Payment Failed",
  payment_pending_verification: "Payment Verification",
  reservation_pending: "Reservation Pending",
  on_hold: "On Hold",
  cancelled: "Cancelled",
  signature_expired: "Signature Expired",
  transaction_exception: "Exception",
};

const LIFECYCLE_STATUSES = [
  "inquiry", "qualified", "property_selected", "application_started",
  "kyc_pending", "kyc_review", "kyc_approved",
  "finance_pending", "finance_approved",
  "payment_plan", "payment_pending", "partially_paid", "fully_paid",
  "agreement", "e_signature", "allocation", "completion_review", "completed",
];

const EXCEPTION_STATUSES = [
  "more_info_required", "kyc_rejected", "finance_rejected", "payment_failed",
  "payment_pending_verification", "reservation_pending", "on_hold", "cancelled",
  "signature_expired", "transaction_exception",
];

type StatusConfig = { color: string; bg: string; icon: React.ElementType };
const STATUS_CONFIG: Record<string, StatusConfig> = {
  inquiry: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Circle },
  qualified: { color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: TrendingUp },
  property_selected: { color: "text-violet-700", bg: "bg-violet-50 border-violet-200", icon: Building2 },
  application_started: { color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: FileText },
  kyc_pending: { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: Clock },
  kyc_review: { color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: Clock },
  kyc_approved: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  finance_pending: { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: Clock },
  finance_approved: { color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
  payment_plan: { color: "text-teal-700", bg: "bg-teal-50 border-teal-200", icon: CalendarDays },
  payment_pending: { color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: Clock },
  partially_paid: { color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200", icon: Banknote },
  fully_paid: { color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
  agreement: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: FileText },
  e_signature: { color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: Pencil },
  allocation: { color: "text-violet-700", bg: "bg-violet-50 border-violet-200", icon: MapPin },
  completion_review: { color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Clock },
  completed: { color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
  // Exceptions
  more_info_required: { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: AlertTriangle },
  kyc_rejected: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
  finance_rejected: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
  payment_failed: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
  payment_pending_verification: { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: Clock },
  reservation_pending: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Clock },
  on_hold: { color: "text-gray-700", bg: "bg-gray-50 border-gray-200", icon: AlertTriangle },
  cancelled: { color: "text-gray-600", bg: "bg-gray-100 border-gray-300", icon: XCircle },
  signature_expired: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
  transaction_exception: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: AlertTriangle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { color: "text-gray-600", bg: "bg-gray-100 border-gray-200", icon: Circle };
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", cfg.color, cfg.bg)}>
      <Icon size={11} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatNaira(n: number | undefined) {
  if (!n) return "—";
  return `₦${n.toLocaleString()}`;
}

// ── Create / Edit Dialog ─────────────────────────────────────────────────

type CreateForm = {
  clientId: string;
  propertyId: string;
  estateId: string;
  purchasePrice: string;
  discount: string;
  financeMethod: string;
  priority: string;
  assignedStaff: string;
  salesOfficer: string;
  notes: string;
  initialStatus: string;
};

const EMPTY_FORM: CreateForm = {
  clientId: "", propertyId: "", estateId: "",
  purchasePrice: "", discount: "", financeMethod: "outright",
  priority: "medium", assignedStaff: "", salesOfficer: "",
  notes: "", initialStatus: "inquiry",
};

function CreateTransactionDialog({
  open, onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const clients = useQuery(api.clients.listClients, {});
  const properties = useQuery(api.admin.listProperties, {});
  const estates = useQuery(api.admin.listEstates, {});
  const staff = useQuery(api.users.listAll, {});
  const createTxn = useMutation(api.transactions.create);

  const set = (k: keyof CreateForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.clientId) { toast.error("Please select a client"); return; }
    setLoading(true);
    try {
      const id = await createTxn({
        clientId: form.clientId as Id<"clients">,
        propertyId: form.propertyId ? (form.propertyId as Id<"properties">) : undefined,
        estateId: form.estateId ? (form.estateId as Id<"estates">) : undefined,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        discount: form.discount ? parseFloat(form.discount) : undefined,
        financeMethod: form.financeMethod || undefined,
        priority: form.priority || undefined,
        assignedStaff: form.assignedStaff ? (form.assignedStaff as Id<"users">) : undefined,
        salesOfficer: form.salesOfficer ? (form.salesOfficer as Id<"users">) : undefined,
        notes: form.notes || undefined,
        initialStatus: form.initialStatus || undefined,
      });
      toast.success(`Transaction created (${id.slice(-6)})`);
      setForm(EMPTY_FORM);
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus size={18} />
            New Transaction
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          {/* Client */}
          <div className="col-span-2">
            <Label>Client <span className="text-red-500">*</span></Label>
            <Select value={form.clientId} onValueChange={(v) => set("clientId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select client…" /></SelectTrigger>
              <SelectContent>
                {(clients ?? []).map((c: { _id: string; fullName: string; email: string }) => (
                  <SelectItem key={c._id} value={c._id}>{c.fullName} — {c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Property */}
          <div>
            <Label>Property (optional)</Label>
            <Select value={form.propertyId} onValueChange={(v) => set("propertyId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select property…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(properties ?? []).map((p) => (
                  <SelectItem key={p._id} value={p._id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estate */}
          <div>
            <Label>Estate (optional)</Label>
            <Select value={form.estateId} onValueChange={(v) => set("estateId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select estate…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(estates ?? []).map((e) => (
                  <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purchase Price */}
          <div>
            <Label>Purchase Price (₦)</Label>
            <Input className="mt-1" type="number" placeholder="e.g. 5000000"
              value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} />
          </div>

          {/* Discount */}
          <div>
            <Label>Discount (₦)</Label>
            <Input className="mt-1" type="number" placeholder="0"
              value={form.discount} onChange={(e) => set("discount", e.target.value)} />
          </div>

          {/* Finance Method */}
          <div>
            <Label>Finance Method</Label>
            <Select value={form.financeMethod} onValueChange={(v) => set("financeMethod", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="outright">Outright Payment</SelectItem>
                <SelectItem value="installment">Instalment Plan</SelectItem>
                <SelectItem value="mortgage">Mortgage</SelectItem>
                <SelectItem value="external_finance">External Finance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Initial Status */}
          <div>
            <Label>Initial Status</Label>
            <Select value={form.initialStatus} onValueChange={(v) => set("initialStatus", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIFECYCLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assigned Staff */}
          <div>
            <Label>Assigned Staff</Label>
            <Select value={form.assignedStaff} onValueChange={(v) => set("assignedStaff", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select staff…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {(staff ?? []).filter((u) => u.role !== "client").map((u) => (
                  <SelectItem key={u._id} value={u._id}>{u.name ?? u.email ?? u._id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sales Officer */}
          <div>
            <Label>Sales Officer</Label>
            <Select value={form.salesOfficer} onValueChange={(v) => set("salesOfficer", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select officer…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(staff ?? []).filter((u) => u.role !== "client").map((u) => (
                  <SelectItem key={u._id} value={u._id}>{u.name ?? u.email ?? u._id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={3} placeholder="Internal notes…"
              value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating…" : "Create Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Update Status Dialog ─────────────────────────────────────────────────

function UpdateStatusDialog({
  txnId, currentStatus, onClose,
}: {
  txnId: Id<"transactions">;
  currentStatus: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const updateStatus = useMutation(api.transactions.updateStatus);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateStatus({ id: txnId, status, note: note || undefined });
      toast.success("Status updated");
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Lifecycle</div>
                {LIFECYCLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
                <Separator className="my-1" />
                <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Exceptions</div>
                {EXCEPTION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea className="mt-1" rows={3} placeholder="Reason for status change…"
              value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || status === currentStatus}>
            {loading ? "Saving…" : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Transaction Detail Panel ─────────────────────────────────────────────

type TxnDetail = NonNullable<ReturnType<typeof useQuery<typeof api.transactions.getById>>>;

function PriorityBadge({ p }: { p: string | undefined }) {
  if (!p) return null;
  const map: Record<string, string> = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", map[p] ?? "bg-gray-100 text-gray-600")}>
      {p}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value ?? "—"}</span>
    </div>
  );
}

function SubStatusRow({ label, status }: { label: string; status: string }) {
  const done = ["approved", "fully_paid", "completed", "signed"].includes(status);
  const bad = ["rejected", "failed", "expired", "declined"].includes(status);
  const neutral = status === "not_started";
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={cn(
        "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
        done ? "bg-green-100 text-green-700" :
        bad ? "bg-red-100 text-red-700" :
        neutral ? "bg-gray-100 text-gray-500" :
        "bg-yellow-100 text-yellow-700"
      )}>
        {status.replace(/_/g, " ")}
      </span>
    </div>
  );
}

function EventTimeline({ events }: { events: TxnDetail["events"] }) {
  return (
    <div className="space-y-3">
      {events.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No events yet</p>}
      {[...events].reverse().map((ev, i) => (
        <div key={ev._id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full mt-0.5 shrink-0",
              i === 0 ? "bg-[var(--brand)]" : "bg-gray-300"
            )} />
            {i < events.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
          </div>
          <div className="pb-3 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {ev.fromStatus && (
                <>
                  <StatusBadge status={ev.fromStatus} />
                  <ArrowRight size={12} className="text-gray-400" />
                </>
              )}
              <StatusBadge status={ev.toStatus} />
            </div>
            {ev.note && <p className="text-xs text-gray-600 mt-1 italic">{ev.note}</p>}
            <p className="text-[11px] text-gray-400 mt-1">
              {ev.changedByName ?? "System"} · {format(parseISO(ev.timestamp), "dd MMM yyyy, HH:mm")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionDetailPanel({
  txnId, onClose,
}: {
  txnId: Id<"transactions">;
  onClose: () => void;
}) {
  const [statusDialog, setStatusDialog] = useState(false);
  const txn = useQuery(api.transactions.getById, { id: txnId });

  if (!txn) return (
    <div className="flex-1 p-6 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">{txn.transactionRef}</span>
            <PriorityBadge p={txn.priority} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{txn.client?.fullName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setStatusDialog(true)} className="h-7 text-xs gap-1">
            <RefreshCw size={12} /> Update Status
          </Button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Current status */}
        <div>
          <StatusBadge status={txn.status} />
        </div>

        {/* Core Details */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Transaction Details</h4>
          <div className="divide-y divide-gray-50">
            <DetailRow label="Client" value={txn.client?.fullName} />
            <DetailRow label="Email" value={txn.client?.email} />
            <DetailRow label="Phone" value={txn.client?.phone} />
            {txn.property && <DetailRow label="Property" value={txn.property.title} />}
            {txn.estate && <DetailRow label="Estate" value={txn.estate.name} />}
            {txn.plot && <DetailRow label="Plot" value={txn.plot.plotNumber} />}
            <DetailRow label="Purchase Price" value={formatNaira(txn.purchasePrice)} />
            <DetailRow label="Discount" value={formatNaira(txn.discount)} />
            <DetailRow label="Amount Paid" value={formatNaira(txn.amountPaid)} />
            <DetailRow label="Outstanding" value={formatNaira(txn.outstandingBalance)} />
            <DetailRow label="Finance Method" value={txn.financeMethod?.replace(/_/g, " ")} />
            <DetailRow label="Assigned Staff" value={txn.assignedStaffUser?.name} />
            <DetailRow label="Sales Officer" value={txn.salesOfficerUser?.name} />
            <DetailRow label="Created" value={format(new Date(txn._creationTime), "dd MMM yyyy")} />
          </div>
        </div>

        {/* Sub-statuses */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Process Statuses</h4>
          <div className="bg-gray-50 rounded-xl px-4 py-2">
            <SubStatusRow label="KYC" status={txn.kycStatus} />
            <SubStatusRow label="Finance" status={txn.financeStatus} />
            <SubStatusRow label="Payment" status={txn.paymentStatus} />
            <SubStatusRow label="Agreement" status={txn.agreementStatus} />
            <SubStatusRow label="E-Signature" status={txn.signatureStatus} />
          </div>
        </div>

        {/* Notes */}
        {txn.notes && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h4>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{txn.notes}</p>
          </div>
        )}

        {/* Timeline */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Activity Timeline</h4>
          <EventTimeline events={txn.events} />
        </div>
      </div>

      {/* Status dialog */}
      {statusDialog && (
        <UpdateStatusDialog
          txnId={txnId}
          currentStatus={txn.status}
          onClose={() => setStatusDialog(false)}
        />
      )}
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────

function StatsBar() {
  const stats = useQuery(api.transactions.getStats, {});

  if (!stats) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );

  const cards = [
    { label: "Total", value: stats.total, color: "text-gray-900" },
    { label: "Active", value: stats.active, color: "text-blue-700" },
    { label: "Completed", value: stats.completed, color: "text-green-700" },
    { label: "On Hold", value: stats.onHold, color: "text-yellow-700" },
    { label: "Cancelled", value: stats.cancelled, color: "text-red-700" },
    { label: "Total Value", value: formatNaira(stats.totalValue), color: "text-[var(--brand)]" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider">{c.label}</p>
          <p className={cn("text-xl font-bold mt-0.5", c.color)}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Transaction List Row ─────────────────────────────────────────────────

type TxnRow = {
  _id: Id<"transactions">;
  transactionRef: string;
  clientName: string;
  clientEmail?: string;
  propertyTitle?: string;
  purchasePrice?: number;
  amountPaid?: number;
  status: string;
  priority?: string;
  _creationTime: number;
};

function TxnListRow({
  txn, selected, onClick, onDelete,
}: {
  txn: TxnRow;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <tr
      className={cn(
        "border-b border-gray-50 hover:bg-gray-50/70 transition-colors cursor-pointer",
        selected && "bg-blue-50/40"
      )}
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-[var(--brand)]">{txn.transactionRef}</span>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-gray-900 leading-tight">{txn.clientName}</div>
        {txn.clientEmail && <div className="text-[11px] text-gray-400">{txn.clientEmail}</div>}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-sm text-gray-700">{txn.propertyTitle ?? "—"}</span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-sm text-gray-800">{formatNaira(txn.purchasePrice)}</span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={txn.status} />
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <PriorityBadge p={txn.priority} />
      </td>
      <td className="px-4 py-3 hidden xl:table-cell">
        <span className="text-xs text-gray-400">{format(new Date(txn._creationTime), "dd MMM yy")}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClick} className="p-1 rounded hover:bg-blue-100 text-blue-500 cursor-pointer" title="View details">
            <Eye size={14} />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-100 text-red-400 cursor-pointer" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Delete Confirmation ──────────────────────────────────────────────────

function DeleteDialog({
  txnId, ref: txnRef, onClose,
}: {
  txnId: Id<"transactions">;
  ref: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const remove = useMutation(api.transactions.remove);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await remove({ id: txnId });
      toast.success(`${txnRef} deleted`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Transaction?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Are you sure you want to permanently delete <strong>{txnRef}</strong>? This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function AdminTransactions() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"transactions"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"transactions">; ref: string } | null>(null);

  const {
    rows: filtered,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.transactions.listPaginated,
    { status: statusFilter !== "all" ? statusFilter : undefined, search: debouncedSearch || undefined },
    PAGE_SIZE,
  );

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter]);

  const hasDetail = selectedId !== null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transaction Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Full lifecycle from inquiry to completion</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setShowCreate(true)}>
          <Plus size={15} />
          New Transaction
        </Button>
      </div>

      {/* Stats */}
      <StatsBar />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9 h-9 bg-white text-sm"
            placeholder="Search by ref, client, property…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52 h-9 bg-white">
            <Filter size={13} className="text-gray-400 mr-1" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Lifecycle</div>
            {LIFECYCLE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
            <Separator className="my-1" />
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Exceptions</div>
            {EXCEPTION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Two-panel layout: list + detail */}
      <div className={cn(
        "flex flex-1 min-h-0 rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden",
        hasDetail ? "flex-row" : "flex-col"
      )}>
        {/* List */}
        <div className={cn(
          "overflow-auto",
          hasDetail ? "w-full md:w-[58%] border-r border-gray-100 shrink-0" : "flex-1"
        )}>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <TrendingUp size={40} className="text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No transactions found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or create a new transaction.</p>
              <Button className="mt-4 gap-2" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> New Transaction
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Ref</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Property/Estate</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Price</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Priority</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Created</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((txn) => (
                  <TxnListRow
                    key={txn._id}
                    txn={txn}
                    selected={selectedId === txn._id}
                    onClick={() => setSelectedId(selectedId === txn._id ? null : txn._id)}
                    onDelete={() => setDeleteTarget({ id: txn._id, ref: txn.transactionRef })}
                  />
                ))}
              </tbody>
            </table>
          )}
          {!isLoading && filtered.length > 0 && (
            <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
          )}
        </div>

        {/* Detail panel */}
        {hasDetail && (
          <div className="hidden md:flex flex-col flex-1 min-w-0 overflow-hidden">
            <TransactionDetailPanel txnId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>

      {/* Mobile detail modal */}
      {hasDetail && (
        <Dialog open onOpenChange={(o) => { if (!o) setSelectedId(null); }}>
          <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0 md:hidden">
            <TransactionDetailPanel txnId={selectedId} onClose={() => setSelectedId(null)} />
          </DialogContent>
        </Dialog>
      )}

      {showCreate && <CreateTransactionDialog open onClose={() => setShowCreate(false)} />}
      {deleteTarget && (
        <DeleteDialog
          txnId={deleteTarget.id}
          ref={deleteTarget.ref}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
