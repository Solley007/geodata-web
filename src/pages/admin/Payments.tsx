import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import {
  Receipt, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Circle,
  Clock, Plus, Search, Filter, Eye, FileText, ChevronRight,
  Banknote, ArrowLeftRight, CreditCard, Mail, Download,
  CheckSquare, X, Pencil, BarChart3, Calendar, Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { GATEWAY_CATALOG } from "@/lib/gateway-catalog.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

const RECEIPTS_PAGE_SIZE = 10;
const BATCHES_PAGE_SIZE = 8;

// ── Types ─────────────────────────────────────────────────────────────────────

type ReceiptRow = {
  _id: string;
  receiptRef: string;
  paymentId: string;
  clientId: string;
  transactionId?: string;
  amountDisplay: number;
  currency: string;
  paidAt: string;
  gatewayKey: string;
  txnType: string;
  description?: string;
  generatedAt: string;
  generatedByName?: string;
  pdfUrl?: string;
  emailedAt?: string;
  emailedTo?: string;
  notes?: string;
  clientName: string;
  clientEmail?: string;
  _creationTime: number;
};

type BatchRow = {
  _id: string;
  batchRef: string;
  title: string;
  description?: string;
  periodStart: string;
  periodEnd: string;
  gatewayKey?: string;
  status: string;
  totalItems: number;
  matchedCount: number;
  unmatchedCount: number;
  disputedCount: number;
  totalAmount: number;
  createdByName?: string;
  completedAt?: string;
  notes?: string;
  _creationTime: number;
};

type ItemRow = {
  _id: string;
  batchId: string;
  paymentId: string;
  clientId: string;
  transactionId?: string;
  expectedAmount?: number;
  actualAmount: number;
  currency: string;
  matchStatus: string;
  discrepancy?: number;
  notes?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  actionTaken?: string;
  paymentRef: string;
  gatewayKey: string;
  clientName: string;
  txnType: string;
  paidAt?: string;
  _creationTime: number;
};

// ── Status configs ─────────────────────────────────────────────────────────────

const MATCH_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:    { label: "Pending",    color: "text-gray-600",   bg: "bg-gray-100",    icon: Clock        },
  matched:    { label: "Matched",    color: "text-green-700",  bg: "bg-green-100",   icon: CheckCircle2 },
  unmatched:  { label: "Unmatched",  color: "text-red-700",    bg: "bg-red-100",     icon: XCircle      },
  disputed:   { label: "Disputed",   color: "text-yellow-700", bg: "bg-yellow-100",  icon: AlertTriangle},
  overpaid:   { label: "Overpaid",   color: "text-blue-700",   bg: "bg-blue-100",    icon: ArrowLeftRight},
  underpaid:  { label: "Underpaid",  color: "text-orange-700", bg: "bg-orange-100",  icon: ArrowLeftRight},
};

const BATCH_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft:       { label: "Draft",       color: "text-gray-600",  bg: "bg-gray-100"   },
  in_progress: { label: "In Progress", color: "text-blue-700",  bg: "bg-blue-100"   },
  completed:   { label: "Completed",   color: "text-green-700", bg: "bg-green-100"  },
  disputed:    { label: "Disputed",    color: "text-red-700",   bg: "bg-red-100"    },
};

const TXN_TYPES: Record<string, string> = {
  deposit: "Deposit", instalment: "Instalment", full_payment: "Full Payment",
  fee: "Fee", refund: "Refund", government: "Government",
};

function MatchBadge({ status }: { status: string }) {
  const cfg = MATCH_STATUS_CFG[status] ?? { label: status, color: "text-gray-500", bg: "bg-gray-100", icon: Circle };
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

function BatchBadge({ status }: { status: string }) {
  const cfg = BATCH_STATUS_CFG[status] ?? { label: status, color: "text-gray-500", bg: "bg-gray-100" };
  return (
    <span className={cn("inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
      {cfg.label}
    </span>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function ReceiptStatsBar() {
  const stats = useQuery(api.payments.getReceiptStats, {});
  const batchStats = useQuery(api.payments.getBatchStats, {});

  const cards = [
    { label: "Total Receipts",    value: stats?.total ?? "—",         color: "text-gray-900" },
    { label: "Total Receipted",   value: stats ? `₦${stats.totalAmount.toLocaleString()}` : "—", color: "text-emerald-700" },
    { label: "With PDF",          value: stats?.withPdf ?? "—",        color: "text-blue-700" },
    { label: "Emailed",           value: stats?.emailed ?? "—",        color: "text-purple-700" },
    { label: "Batches",           value: batchStats?.total ?? "—",     color: "text-gray-900" },
    { label: "In Progress",       value: batchStats?.inProgress ?? "—",color: "text-blue-700" },
    { label: "Completed",         value: batchStats?.completed ?? "—", color: "text-green-700" },
    { label: "Disputed",          value: batchStats?.disputed ?? "—",  color: "text-red-700"  },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider leading-tight">{c.label}</p>
          <p className={cn("text-lg font-bold mt-0.5 truncate", c.color)}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Receipt detail dialog ─────────────────────────────────────────────────────

function ReceiptDetailDialog({ receipt, onClose }: { receipt: ReceiptRow; onClose: () => void }) {
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailTo, setEmailTo] = useState(receipt.clientEmail ?? "");
  const markEmailed = useMutation(api.payments.markReceiptEmailed);
  const meta = GATEWAY_CATALOG.find((g) => g.key === receipt.gatewayKey);

  const handleMarkEmailed = async () => {
    if (!emailTo) { toast.error("Enter email address"); return; }
    setEmailLoading(true);
    try {
      await markEmailed({ receiptRef: receipt.receiptRef, emailedTo: emailTo });
      toast.success("Receipt marked as emailed");
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt size={16} /> {receipt.receiptRef}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Receipt summary */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 text-center">
            <p className="text-[11px] text-green-600 uppercase tracking-widest font-semibold mb-1">Official Receipt</p>
            <p className="text-3xl font-bold text-gray-900">{receipt.currency} {receipt.amountDisplay.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">{receipt.clientName}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {TXN_TYPES[receipt.txnType] ?? receipt.txnType} via {meta?.displayName ?? receipt.gatewayKey}
            </p>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: "Receipt Ref", value: receipt.receiptRef },
              { label: "Payment Date", value: receipt.paidAt ? format(parseISO(receipt.paidAt), "dd MMM yyyy HH:mm") : "—" },
              { label: "Generated", value: format(parseISO(receipt.generatedAt), "dd MMM yyyy HH:mm") },
              { label: "Generated By", value: receipt.generatedByName ?? "System" },
              { label: "Description", value: receipt.description ?? "—" },
              { label: "Gateway Ref", value: receipt.gatewayKey + " / " + (receipt.paidAt?.slice(0, 10) ?? "—") },
              { label: "Emailed To", value: receipt.emailedAt ? `${receipt.emailedTo} (${format(parseISO(receipt.emailedAt), "dd MMM yy")})` : "Not yet emailed" },
              { label: "PDF", value: receipt.pdfUrl ? "Available" : "Not generated" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-xs font-medium text-gray-800 mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          {receipt.pdfUrl && (
            <a href={receipt.pdfUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <Download size={14} /> Download PDF Receipt
            </a>
          )}

          {/* Mark as emailed */}
          {!receipt.emailedAt && (
            <div className="border-t pt-4 space-y-2">
              <Label>Mark as Emailed</Label>
              <div className="flex gap-2">
                <Input placeholder="Email address" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} />
                <Button size="sm" onClick={handleMarkEmailed} disabled={emailLoading}>
                  <Mail size={13} className="mr-1" /> {emailLoading ? "…" : "Mark Sent"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create batch dialog ───────────────────────────────────────────────────────

function CreateBatchDialog({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const [title, setTitle] = useState(`Reconciliation ${format(now, "MMMM yyyy")}`);
  const [description, setDescription] = useState("");
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [gatewayKey, setGatewayKey] = useState("all");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const createBatch = useMutation(api.payments.createBatch);

  const handleSubmit = async () => {
    if (!title || !periodStart || !periodEnd) { toast.error("Title and period are required"); return; }
    setLoading(true);
    try {
      const ref = await createBatch({
        title,
        description: description || undefined,
        periodStart,
        periodEnd,
        gatewayKey: gatewayKey !== "all" ? gatewayKey : undefined,
        notes: notes || undefined,
      });
      toast.success(`Batch ${ref} created`);
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
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight size={16} /> New Reconciliation Batch
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Batch Title <span className="text-red-500">*</span></Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Period Start <span className="text-red-500">*</span></Label>
              <Input className="mt-1" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Period End <span className="text-red-500">*</span></Label>
              <Input className="mt-1" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Gateway Filter</Label>
            <Select value={gatewayKey} onValueChange={setGatewayKey}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gateways</SelectItem>
                {GATEWAY_CATALOG.map((g) => (
                  <SelectItem key={g.key} value={g.key}>{g.logo} {g.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
            All successful payments in the selected period will be added to this batch as <strong>Pending</strong> items.
            You can then review each item and mark them as Matched, Unmatched, Disputed, etc.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Creating…" : "Create Batch"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Review item dialog ────────────────────────────────────────────────────────

function ReviewItemDialog({ item, onClose }: { item: ItemRow; onClose: () => void }) {
  const [matchStatus, setMatchStatus] = useState(item.matchStatus);
  const [expectedAmount, setExpectedAmount] = useState(item.expectedAmount ? String(item.expectedAmount) : "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [actionTaken, setActionTaken] = useState(item.actionTaken ?? "");
  const [loading, setLoading] = useState(false);

  const reviewItem = useMutation(api.payments.reviewItem);

  const discrepancy = expectedAmount
    ? item.actualAmount - parseFloat(expectedAmount)
    : undefined;

  const handleSave = async () => {
    setLoading(true);
    try {
      await reviewItem({
        itemId: item._id as Parameters<typeof reviewItem>[0]["itemId"],
        matchStatus,
        expectedAmount: expectedAmount ? parseFloat(expectedAmount) : undefined,
        notes: notes || undefined,
        actionTaken: actionTaken || undefined,
      });
      toast.success("Item reviewed");
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
          <DialogTitle className="flex items-center gap-2">
            <Pencil size={15} /> Review Item — {item.paymentRef}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-xl p-3 text-sm grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Client</p>
              <p className="font-medium text-gray-800 text-xs">{item.clientName}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Actual Amount</p>
              <p className="font-bold text-gray-800 text-sm">{item.currency} {item.actualAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Gateway</p>
              <p className="font-medium text-gray-800 text-xs">{GATEWAY_CATALOG.find((g) => g.key === item.gatewayKey)?.displayName ?? item.gatewayKey}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Type</p>
              <p className="font-medium text-gray-800 text-xs">{TXN_TYPES[item.txnType] ?? item.txnType}</p>
            </div>
          </div>

          <div>
            <Label>Match Status <span className="text-red-500">*</span></Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(MATCH_STATUS_CFG).map(([k, v]) => (
                <button key={k} onClick={() => setMatchStatus(k)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors",
                    matchStatus === k ? `${v.bg} ${v.color} border-current` : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  )}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Expected Amount (optional)</Label>
            <Input className="mt-1" type="number" placeholder="Enter expected amount if different"
              value={expectedAmount} onChange={(e) => setExpectedAmount(e.target.value)} />
            {discrepancy !== undefined && (
              <p className={cn(
                "text-xs mt-1 font-medium",
                discrepancy === 0 ? "text-green-600" : discrepancy > 0 ? "text-blue-600" : "text-red-600"
              )}>
                Discrepancy: {discrepancy > 0 ? "+" : ""}{discrepancy.toLocaleString()} {item.currency}
                {discrepancy > 0 ? " (Overpaid)" : discrepancy < 0 ? " (Underpaid)" : " (Exact match)"}
              </p>
            )}
          </div>

          <div>
            <Label>Action Taken</Label>
            <Input className="mt-1" placeholder="e.g. Contacted client, Escalated to finance…"
              value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "Save Review"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Batch detail panel ────────────────────────────────────────────────────────

function BatchDetailPanel({ batch, onClose }: { batch: BatchRow; onClose: () => void }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewingItem, setReviewingItem] = useState<ItemRow | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [markCompleteLoading, setMarkCompleteLoading] = useState(false);

  const items = useQuery(api.payments.listBatchItems, { batchId: batch._id as Id<"reconciliationBatches">, matchStatus: undefined });
  const bulkMark = useMutation(api.payments.bulkMarkItems);
  const updateStatus = useMutation(api.payments.updateBatchStatus);

  const filteredItems = useMemo(() =>
    statusFilter === "all" ? (items ?? []) : (items ?? []).filter((i) => i.matchStatus === statusFilter),
    [items, statusFilter]
  );

  const handleBulkMark = async (toStatus: string) => {
    setBulkLoading(true);
    try {
      const count = await bulkMark({
        batchId: batch._id as Parameters<typeof bulkMark>[0]["batchId"],
        matchStatus: toStatus,
        fromStatus: "pending",
      });
      toast.success(`${count} items marked as ${toStatus}`);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    setMarkCompleteLoading(true);
    try {
      await updateStatus({
        batchId: batch._id as Parameters<typeof updateStatus>[0]["batchId"],
        status: "completed",
      });
      toast.success(`Batch ${batch.batchRef} marked as completed`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setMarkCompleteLoading(false);
    }
  };

  const progress = batch.totalItems > 0
    ? Math.round(((batch.matchedCount + batch.unmatchedCount + batch.disputedCount) / batch.totalItems) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full border-l border-gray-100 bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-[var(--brand)]">{batch.batchRef}</span>
            <BatchBadge status={batch.status} />
          </div>
          <h3 className="font-bold text-gray-900 text-base">{batch.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {batch.periodStart} → {batch.periodEnd}
            {batch.gatewayKey ? ` · ${GATEWAY_CATALOG.find((g) => g.key === batch.gatewayKey)?.displayName ?? batch.gatewayKey}` : " · All gateways"}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"><X size={16} /></button>
      </div>

      {/* Progress + counts */}
      <div className="p-5 border-b border-gray-50">
        <div className="grid grid-cols-4 gap-3 mb-3">
          {[
            { label: "Total", value: batch.totalItems, color: "text-gray-800" },
            { label: "Matched", value: batch.matchedCount, color: "text-green-700" },
            { label: "Unmatched", value: batch.unmatchedCount, color: "text-red-700" },
            { label: "Disputed", value: batch.disputedCount, color: "text-yellow-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
              <p className={cn("text-lg font-bold mt-0.5", color)}>{value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-gray-500 font-medium">{progress}% reviewed</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Total: ₦{batch.totalAmount.toLocaleString()}</p>
      </div>

      {/* Bulk actions */}
      {batch.status !== "completed" && (
        <div className="px-5 py-3 border-b border-gray-50 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400 font-medium">Bulk (pending):</span>
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => handleBulkMark("matched")} disabled={bulkLoading}>
            <CheckCircle2 size={11} className="mr-1 text-green-600" /> Mark All Matched
          </Button>
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => handleBulkMark("unmatched")} disabled={bulkLoading}>
            <XCircle size={11} className="mr-1 text-red-600" /> Mark All Unmatched
          </Button>
          {batch.matchedCount + batch.unmatchedCount + batch.disputedCount >= batch.totalItems && batch.totalItems > 0 && (
            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white ml-auto" onClick={handleMarkComplete} disabled={markCompleteLoading}>
              <CheckSquare size={11} className="mr-1" /> Complete Batch
            </Button>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 px-5 py-2 border-b border-gray-50 flex-wrap">
        {[
          { value: "all", label: `All (${items?.length ?? 0})` },
          ...Object.entries(MATCH_STATUS_CFG).map(([k, v]) => ({
            value: k, label: `${v.label} (${(items ?? []).filter((i) => i.matchStatus === k).length})`
          }))
        ].map(({ value, label }) => (
          <button key={value} onClick={() => setStatusFilter(value)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors",
              statusFilter === value ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items === undefined ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No items in this filter</div>
        ) : filteredItems.map((item) => (
          <div key={item._id}
            className="bg-gray-50 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold text-gray-700">{item.paymentRef}</span>
                <MatchBadge status={item.matchStatus} />
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{item.clientName} · {TXN_TYPES[item.txnType] ?? item.txnType}</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">
                {item.currency} {item.actualAmount.toLocaleString()}
                {item.discrepancy !== undefined && item.discrepancy !== 0 && (
                  <span className={cn("text-xs font-normal ml-2", item.discrepancy > 0 ? "text-blue-600" : "text-red-600")}>
                    ({item.discrepancy > 0 ? "+" : ""}{item.discrepancy.toLocaleString()})
                  </span>
                )}
              </p>
              {item.reviewedAt && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Reviewed by {item.reviewedByName} · {format(parseISO(item.reviewedAt), "dd MMM yy HH:mm")}
                </p>
              )}
              {item.notes && <p className="text-[10px] text-gray-400 italic mt-0.5">{item.notes}</p>}
            </div>
            {batch.status !== "completed" && (
              <button
                onClick={() => setReviewingItem(item as ItemRow)}
                className="shrink-0 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-600 cursor-pointer">
                <Pencil size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {reviewingItem && (
        <ReviewItemDialog item={reviewingItem} onClose={() => setReviewingItem(null)} />
      )}
    </div>
  );
}

// ── Receipts tab ──────────────────────────────────────────────────────────────

function ReceiptsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRow | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const {
    rows: filteredReceipts,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.payments.listReceiptsPaginated,
    { search: debouncedSearch || undefined },
    RECEIPTS_PAGE_SIZE,
  );

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const payments = useQuery(api.gateway.listRecentPayments, { status: "successful" });
  const generateReceipt = useMutation(api.payments.generateReceipt);

  // Successful payments without a receipt (checked against the current page only, since we no longer load all receipts)
  const receiptPaymentIds = new Set(filteredReceipts.map((r) => r.paymentId));
  const pendingReceipts = (payments ?? []).filter((p) => !receiptPaymentIds.has(p._id));

  const handleGenerate = async (paymentId: string) => {
    setGeneratingId(paymentId);
    try {
      const ref = await generateReceipt({
        paymentId: paymentId as Parameters<typeof generateReceipt>[0]["paymentId"],
      });
      toast.success(`Receipt ${ref} generated`);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Pending receipt generation */}
      {pendingReceipts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            {pendingReceipts.length} successful payment{pendingReceipts.length > 1 ? "s" : ""} without receipts
          </p>
          <div className="space-y-2">
            {pendingReceipts.slice(0, 5).map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-2.5">
                <div>
                  <span className="font-mono text-xs font-semibold text-gray-700">{p.paymentRef}</span>
                  <span className="text-xs text-gray-500 ml-2">{p.clientName} · {p.currency} {p.amountDisplay.toLocaleString()}</span>
                </div>
                <Button size="sm" className="h-7 text-xs" onClick={() => handleGenerate(p._id)} disabled={generatingId === p._id}>
                  <Receipt size={11} className="mr-1" />
                  {generatingId === p._id ? "…" : "Generate"}
                </Button>
              </div>
            ))}
            {pendingReceipts.length > 5 && (
              <p className="text-xs text-amber-600 pl-1">+{pendingReceipts.length - 5} more…</p>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9 bg-white" placeholder="Search receipts by ref, client or email…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Receipts table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filteredReceipts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center px-6">
            <Receipt size={36} className="text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">No receipts found</p>
            <p className="text-sm text-gray-400 mt-1">Receipts are generated when a payment is marked successful.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {["Ref", "Client", "Amount", "Type", "Paid At", "Generated", "PDF", "Emailed", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((r) => (
                <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/70 cursor-pointer transition-colors"
                  onClick={() => setSelectedReceipt(r as ReceiptRow)}>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs font-semibold text-[var(--brand)]">{r.receiptRef}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-medium text-gray-800">{r.clientName}</p>
                    {r.clientEmail && <p className="text-[10px] text-gray-400">{r.clientEmail}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-bold text-gray-800">{r.currency} {r.amountDisplay.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <span className="text-xs text-gray-500 capitalize">{TXN_TYPES[r.txnType] ?? r.txnType}</span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <span className="text-xs text-gray-500">{r.paidAt ? format(parseISO(r.paidAt), "dd MMM yy") : "—"}</span>
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    <span className="text-xs text-gray-500">{format(parseISO(r.generatedAt), "dd MMM yy")}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.pdfUrl ? (
                      <span className="text-[11px] text-green-600 font-medium flex items-center gap-1"><Download size={10} /> PDF</span>
                    ) : (
                      <span className="text-[11px] text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.emailedAt ? (
                      <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1"><Mail size={10} /> Sent</span>
                    ) : (
                      <span className="text-[11px] text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <ChevronRight size={13} className="text-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && filteredReceipts.length > 0 && (
          <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
        )}
      </div>

      {selectedReceipt && (
        <ReceiptDetailDialog receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
}

// ── Reconciliation tab ────────────────────────────────────────────────────────

function ReconciliationTab() {
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState<BatchRow | null>(null);

  const {
    rows: batches,
    pageIndex: batchPageIndex,
    hasNextPage: batchHasNext,
    hasPrevPage: batchHasPrev,
    isLoading: batchLoading,
    nextPage: batchNextPage,
    prevPage: batchPrevPage,
    reset: resetBatchPage,
  } = useCursorPagination(
    api.payments.listBatchesPaginated,
    { status: statusFilter !== "all" ? statusFilter : undefined },
    BATCHES_PAGE_SIZE,
  );

  useEffect(() => {
    resetBatchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Left: batch list */}
      <div className={cn("flex flex-col min-w-0", selectedBatch ? "hidden xl:flex xl:w-80 shrink-0" : "flex-1")}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">Reconciliation Batches</h3>
          <Button size="sm" className="gap-1 h-8 text-xs" onClick={() => setShowCreateBatch(true)}>
            <Plus size={13} /> New Batch
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {[
            { value: "all", label: "All" },
            ...Object.entries(BATCH_STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label }))
          ].map(({ value, label }) => (
            <button key={value} onClick={() => setStatusFilter(value)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                statusFilter === value ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
              )}>
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-2 overflow-y-auto flex-1">
          {batchLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : batches.length === 0 ? (
            <div className="text-center py-16">
              <Inbox size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium text-sm">No batches yet</p>
              <p className="text-xs text-gray-400 mt-1">Create a reconciliation batch to match payments against expected amounts.</p>
            </div>
          ) : (batches as BatchRow[]).map((batch) => {
            const progress = batch.totalItems > 0
              ? Math.round(((batch.matchedCount + batch.unmatchedCount + batch.disputedCount) / batch.totalItems) * 100)
              : 0;
            return (
              <div key={batch._id}
                onClick={() => setSelectedBatch(batch)}
                className={cn(
                  "bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 cursor-pointer hover:border-blue-200 transition-all",
                  selectedBatch?._id === batch._id && "border-blue-400 ring-1 ring-blue-300"
                )}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-[var(--brand)]">{batch.batchRef}</span>
                  <BatchBadge status={batch.status} />
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">{batch.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {batch.periodStart} → {batch.periodEnd} · ₦{batch.totalAmount.toLocaleString()}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400">{progress}%</span>
                  <span className="text-[10px] text-gray-400">{batch.totalItems} items</span>
                </div>
              </div>
            );
          })}
        </div>
        {!batchLoading && batches.length > 0 && (batchHasNext || batchHasPrev) && (
          <div className="flex items-center justify-center gap-2 pt-3">
            <Button size="sm" variant="secondary" className="h-8 px-2.5 text-xs gap-1" disabled={!batchHasPrev} onClick={batchPrevPage}>Prev</Button>
            <span className="h-8 min-w-8 px-2 flex items-center justify-center rounded-md bg-[var(--brand)] text-white text-xs font-semibold">{batchPageIndex + 1}</span>
            <Button size="sm" variant="secondary" className="h-8 px-2.5 text-xs gap-1" disabled={!batchHasNext} onClick={batchNextPage}>Next</Button>
          </div>
        )}
      </div>

      {/* Right: batch detail */}
      {selectedBatch && (
        <div className="flex-1 min-w-0 h-full rounded-xl overflow-hidden border border-gray-100 shadow-sm">
          <BatchDetailPanel batch={selectedBatch} onClose={() => setSelectedBatch(null)} />
        </div>
      )}

      {showCreateBatch && <CreateBatchDialog onClose={() => setShowCreateBatch(false)} />}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPayments() {
  const [tab, setTab] = useState<"receipts" | "reconciliation">("receipts");

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payments, Reconciliation &amp; Receipts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage payment receipts and reconcile payment batches against expected amounts
          </p>
        </div>
      </div>

      {/* Stats */}
      <ReceiptStatsBar />

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {(["receipts", "reconciliation"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors capitalize",
              tab === t ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
            )}>
            {t === "receipts" ? "Receipts" : "Reconciliation Batches"}
          </button>
        ))}
      </div>

      {tab === "receipts" && <ReceiptsTab />}
      {tab === "reconciliation" && <ReconciliationTab />}
    </div>
  );
}
