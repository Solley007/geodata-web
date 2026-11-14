import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { PackageCheck, Plus, ShieldAlert, CheckCircle2, X, Ban, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

/**
 * Allocation Batches, Eligibility Rules & Availability Checks for a Bulk
 * Acquisition (Institutional / Bulk Acquisition Management enhancement,
 * milestone 77). A batch is a controlled envelope for a tranche of
 * allocations — the actual allocation still happens through the EXISTING
 * Plot Allocation system via commitments.recordBulkAllocation, now extended
 * with an optional batchId. Requesting beyond the acquisition's configured
 * eligibility rule requires flagging the batch as a management exception,
 * which then routes through the EXISTING approvals table and can never be
 * decided by the officer who requested it.
 */

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending Exception Approval",
  approved: "Approved",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const RULE_LABEL: Record<string, string> = {
  full_payment: "Full payment required",
  min_percentage: "Minimum % paid",
  management_exception_only: "Management exception only",
};

export function AllocationBatchesSection({
  acquisitionId,
  opportunityId,
}: {
  acquisitionId: Id<"corporateBulkAcquisitions">;
  opportunityId: Id<"corporateOpportunities">;
}) {
  const batches = useQuery(api.corporateMarketing.allocationBatches.listAllocationBatches, { bulkAcquisitionId: acquisitionId });
  const eligibility = useQuery(api.corporateMarketing.allocationBatches.checkAllocationEligibility, { bulkAcquisitionId: acquisitionId });
  const decideException = useMutation(api.corporateMarketing.allocationBatches.decideAllocationBatchException);
  const cancelBatch = useMutation(api.corporateMarketing.allocationBatches.cancelAllocationBatch);
  const [createOpen, setCreateOpen] = useState(false);
  const [allocateBatchId, setAllocateBatchId] = useState<Id<"corporateAllocationBatches"> | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  const handleDecide = async (id: Id<"corporateAllocationBatches">, decision: "approved" | "rejected") => {
    try {
      await decideException({ id, decision, decisionNote: decisionNotes[id] || undefined });
      toast.success(decision === "approved" ? "Exception approved — batch is now ready for allocation" : "Exception rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record decision");
    }
  };

  const handleCancel = async (id: Id<"corporateAllocationBatches">) => {
    try {
      await cancelBatch({ id });
      toast.success("Batch cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel batch");
    }
  };

  return (
    <div className="space-y-4">
      {eligibility && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-medium text-gray-500">Allocation Eligibility Rule</p>
              <p className="text-sm font-semibold text-gray-900">
                {RULE_LABEL[eligibility.rule] ?? eligibility.rule}{eligibility.rule === "min_percentage" && eligibility.percent ? ` (${eligibility.percent}% of committed value paid)` : ""}
              </p>
            </div>
            <div className="flex gap-4 text-xs">
              <Stat label="Committed" value={eligibility.totals.committed} />
              <Stat label="Paid" value={eligibility.totals.paid} />
              <Stat label="Allocated" value={eligibility.totals.allocated} />
              <Stat label="Eligible Now" value={eligibility.totals.eligible} highlight />
              <Stat label="Remaining Eligible" value={eligibility.totals.remainingEligible} highlight />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
          <Plus size={13} /> New Allocation Batch
        </Button>
      </div>

      {batches === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : batches.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><PackageCheck /></EmptyMedia>
            <EmptyTitle>No allocation batches yet</EmptyTitle>
            <EmptyDescription>Create a batch to allocate plots in a controlled tranche, checked against real eligibility and inventory availability.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
              <Plus size={13} /> New Allocation Batch
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-3">
          {batches.map((b) => {
            const progressPct = b.requestedQuantity > 0 ? Math.min(100, Math.round((b.allocatedCount / b.requestedQuantity) * 100)) : 0;
            return (
              <div key={b._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{b.batchRef}</p>
                      <Badge className={cn("text-[10px] border-0", STATUS_STYLE[b.status])}>{STATUS_LABEL[b.status]}</Badge>
                      {b.isException && <Badge className="text-[10px] border-0 bg-orange-100 text-orange-700 gap-1"><ShieldAlert size={10} /> Exception</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{b.lineItemLabel} · Batch date {new Date(b.batchDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <p className="text-gray-400">Allocated</p>
                    <p className="font-semibold text-gray-800">{b.allocatedCount} / {b.requestedQuantity}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <Progress value={progressPct} className="h-2" />
                </div>

                {b.exceptionReason && <p className="text-xs text-gray-500 mt-2">Exception reason: {b.exceptionReason}</p>}
                {b.notes && <p className="text-xs text-gray-500 mt-1">{b.notes}</p>}

                {b.status === "pending_approval" && (
                  <div className="space-y-2 rounded-xl bg-amber-50 p-3 mt-3">
                    <p className="text-xs font-medium text-amber-700">Awaiting exception approval — the requesting officer cannot decide this themselves.</p>
                    <Textarea
                      value={decisionNotes[b._id] ?? ""}
                      onChange={(e) => setDecisionNotes({ ...decisionNotes, [b._id]: e.target.value })}
                      rows={2}
                      placeholder="Decision note (optional)"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 gap-1.5 cursor-pointer" onClick={() => handleDecide(b._id, "approved")}>
                        <CheckCircle2 size={13} /> Approve
                      </Button>
                      <Button size="sm" variant="secondary" className="flex-1 gap-1.5 cursor-pointer text-red-600" onClick={() => handleDecide(b._id, "rejected")}>
                        <X size={13} /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                {(b.status === "approved" || b.status === "in_progress") && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => setAllocateBatchId(b._id)} className="gap-1.5 cursor-pointer">
                      <MapPinned size={13} /> Allocate Plot
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleCancel(b._id)} className="gap-1.5 cursor-pointer text-red-600">
                      <Ban size={13} /> Cancel Batch
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateAllocationBatchDialog open={createOpen} onOpenChange={setCreateOpen} acquisitionId={acquisitionId} />
      <AllocatePlotInBatchDialog
        batchId={allocateBatchId}
        open={!!allocateBatchId}
        onOpenChange={(open) => { if (!open) setAllocateBatchId(null); }}
        opportunityId={opportunityId}
        acquisitionId={acquisitionId}
      />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="text-right">
      <p className="text-gray-400">{label}</p>
      <p className={cn("font-semibold", highlight ? "text-[var(--brand)]" : "text-gray-800")}>{value}</p>
    </div>
  );
}

function CreateAllocationBatchDialog({
  open,
  onOpenChange,
  acquisitionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acquisitionId: Id<"corporateBulkAcquisitions">;
}) {
  const lineItems = useQuery(api.corporateMarketing.lineItems.listLineItemsForAcquisition, open ? { acquisitionId } : "skip");
  const createBatch = useMutation(api.corporateMarketing.allocationBatches.createAllocationBatch);
  const [lineItemId, setLineItemId] = useState<string>("all");
  const [batchDate, setBatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [requestedQuantity, setRequestedQuantity] = useState("");
  const [isException, setIsException] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setLineItemId("all"); setRequestedQuantity(""); setIsException(false); setExceptionReason(""); setNotes(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(requestedQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid requested quantity");
      return;
    }
    if (isException && !exceptionReason.trim()) {
      toast.error("Provide a reason for the eligibility exception");
      return;
    }
    setSaving(true);
    try {
      await createBatch({
        bulkAcquisitionId: acquisitionId,
        lineItemId: lineItemId !== "all" ? (lineItemId as Id<"corporateOpportunityLineItems">) : undefined,
        batchDate,
        requestedQuantity: qty,
        isException: isException || undefined,
        exceptionReason: isException ? exceptionReason.trim() : undefined,
        notes: notes || undefined,
      });
      toast.success(isException ? "Batch created — pending exception approval" : "Allocation batch created");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create batch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Allocation Batch</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Line Item (optional)</Label>
            <Select value={lineItemId} onValueChange={setLineItemId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Any eligible line item" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any eligible line item</SelectItem>
                {(lineItems ?? []).map((li) => <SelectItem key={li._id} value={li._id}>{li.propertyType ?? "Line item"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Batch Date</Label>
              <Input type="date" value={batchDate} onChange={(e) => setBatchDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Requested Quantity</Label>
              <Input type="number" min={1} value={requestedQuantity} onChange={(e) => setRequestedQuantity(e.target.value)} />
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-gray-50 p-3">
            <Checkbox id="isException" checked={isException} onCheckedChange={(c) => setIsException(c === true)} className="mt-0.5 cursor-pointer" />
            <label htmlFor="isException" className="text-xs text-gray-600 cursor-pointer">
              Request a management exception (allocate beyond the acquisition's configured eligibility rule). This requires approval before allocation can proceed.
            </label>
          </div>
          {isException && (
            <div className="space-y-1.5">
              <Label>Exception Reason *</Label>
              <Textarea value={exceptionReason} onChange={(e) => setExceptionReason(e.target.value)} rows={2} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Creating…" : "Create Batch"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AllocatePlotInBatchDialog({
  batchId,
  open,
  onOpenChange,
  opportunityId,
  acquisitionId,
}: {
  batchId: Id<"corporateAllocationBatches"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: Id<"corporateOpportunities">;
  acquisitionId: Id<"corporateBulkAcquisitions">;
}) {
  const batch = useQuery(api.corporateMarketing.allocationBatches.getAllocationBatch, batchId ? { id: batchId } : "skip");
  const lineItems = useQuery(api.corporateMarketing.lineItems.listLineItemsForAcquisition, open ? { acquisitionId } : "skip");
  const estates = useQuery(api.admin.listEstates, open ? {} : "skip");
  const recordBulkAllocation = useMutation(api.corporateMarketing.commitments.recordBulkAllocation);

  const [lineItemId, setLineItemId] = useState<string>("");
  const [estateId, setEstateId] = useState<string>("");
  const [plotId, setPlotId] = useState<string>("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [paymentType, setPaymentType] = useState<"outright" | "installment">("outright");
  const [allocatedDate, setAllocatedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const plots = useQuery(
    api.allocations.listPlots,
    open && estateId ? { estateId: estateId as Id<"estates">, status: "available" } : "skip",
  );

  const key = batchId ?? "none";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setLineItemId(batch?.lineItemId ?? "");
    setEstateId(""); setPlotId(""); setPurchasePrice(""); setPaymentType("outright");
    setAllocatedDate(new Date().toISOString().split("T")[0]);
  }

  const availableLineItems = batch?.lineItemId ? (lineItems ?? []).filter((li) => li._id === batch.lineItemId) : (lineItems ?? []);

  if (!batchId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(purchasePrice);
    if (!lineItemId || !estateId || !plotId) {
      toast.error("Select a line item, estate, and plot");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid purchase price");
      return;
    }
    setSaving(true);
    try {
      await recordBulkAllocation({
        lineItemId: lineItemId as Id<"corporateOpportunityLineItems">,
        plotId: plotId as Id<"plots">,
        estateId: estateId as Id<"estates">,
        allocatedDate,
        purchasePrice: price,
        paymentType,
        batchId,
      });
      toast.success("Plot allocated under batch");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to allocate plot");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Allocate Plot — Batch {batch?.batchRef ?? ""}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Line Item</Label>
            <Select value={lineItemId} onValueChange={setLineItemId} disabled={!!batch?.lineItemId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select line item" /></SelectTrigger>
              <SelectContent>
                {availableLineItems.map((li) => <SelectItem key={li._id} value={li._id}>{li.propertyType ?? "Line item"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estate</Label>
            <Select value={estateId} onValueChange={(v) => { setEstateId(v); setPlotId(""); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select estate" /></SelectTrigger>
              <SelectContent>
                {(estates ?? []).map((e) => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Available Plot</Label>
            <Select value={plotId} onValueChange={setPlotId} disabled={!estateId}>
              <SelectTrigger className="w-full"><SelectValue placeholder={estateId ? "Select plot" : "Select an estate first"} /></SelectTrigger>
              <SelectContent>
                {(plots ?? []).map((p) => <SelectItem key={p._id} value={p._id}>Plot {p.plotNumber} ({p.size})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Purchase Price (₦)</Label>
              <Input type="number" min={0} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Type</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as typeof paymentType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outright">Outright</SelectItem>
                  <SelectItem value="installment">Installment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Allocation Date</Label>
            <Input type="date" value={allocatedDate} onChange={(e) => setAllocatedDate(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Allocating…" : "Allocate Plot"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
