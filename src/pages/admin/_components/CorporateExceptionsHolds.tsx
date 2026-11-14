import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { ShieldAlert, AlertTriangle, Ban, CheckCircle2, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

/**
 * Exceptions register, On Hold / Disputed banner, and controlled cancellation
 * for a Bulk Acquisition (Institutional / Bulk Acquisition Management
 * enhancement, milestone 78). Every exception here was already raised by
 * another module (commercial terms discount, allocation eligibility
 * override) which created its own approvals row — this only surfaces the
 * unified register. On Hold / Disputed and Cancellation never delete the
 * acquisition; they only record controlled, audited state changes.
 */

const EXCEPTION_TYPE_LABEL: Record<string, string> = {
  price: "Price",
  discount: "Discount",
  payment: "Payment",
  allocation: "Allocation",
  quantity: "Quantity",
  contract: "Contract",
  commercial_term: "Commercial Term",
};

const EXCEPTION_STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

// ─── On Hold / Disputed banner + raise/resolve flow ──────────────────────
export function AcquisitionHoldBanner({ acquisitionId }: { acquisitionId: Id<"corporateBulkAcquisitions"> }) {
  const holds = useQuery(api.corporateMarketing.exceptions.listHolds, { bulkAcquisitionId: acquisitionId });
  const resolveHold = useMutation(api.corporateMarketing.exceptions.resolveHold);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<Id<"corporateAcquisitionHolds"> | null>(null);
  const [resolutionAction, setResolutionAction] = useState("");
  const [resolving, setResolving] = useState(false);

  const activeHold = (holds ?? []).find((h) => !h.resolved);

  const handleResolve = async () => {
    if (!resolveTarget) return;
    if (!resolutionAction.trim()) { toast.error("Describe the resolution action"); return; }
    setResolving(true);
    try {
      await resolveHold({ id: resolveTarget, resolutionAction: resolutionAction.trim() });
      toast.success("Hold resolved — acquisition reverted to its prior status");
      setResolveTarget(null);
      setResolutionAction("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve hold");
    } finally {
      setResolving(false);
    }
  };

  return (
    <>
      {activeHold && (
        <div className={cn(
          "rounded-2xl border p-4 flex items-start justify-between gap-3 flex-wrap",
          activeHold.holdType === "disputed" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200",
        )}>
          <div className="flex items-start gap-3">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", activeHold.holdType === "disputed" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700")}>
              {activeHold.holdType === "disputed" ? <ShieldAlert size={16} /> : <PauseCircle size={16} />}
            </div>
            <div>
              <p className={cn("text-sm font-semibold", activeHold.holdType === "disputed" ? "text-red-700" : "text-amber-700")}>
                {activeHold.holdType === "disputed" ? "This acquisition is disputed" : "This acquisition is on hold"}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">{activeHold.reason}</p>
              <p className="text-[11px] text-gray-400 mt-1">Raised {new Date(activeHold.raisedAt).toLocaleDateString()}</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" className="cursor-pointer gap-1.5 shrink-0" onClick={() => setResolveTarget(activeHold._id)}>
            <CheckCircle2 size={13} /> Resolve
          </Button>
        </div>
      )}

      {!activeHold && (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" className="cursor-pointer gap-1.5 text-amber-700" onClick={() => setRaiseOpen(true)}>
            <PauseCircle size={13} /> Place On Hold / Dispute
          </Button>
        </div>
      )}

      <RaiseHoldDialog open={raiseOpen} onOpenChange={setRaiseOpen} acquisitionId={acquisitionId} />

      <Dialog open={!!resolveTarget} onOpenChange={(o) => { if (!o) { setResolveTarget(null); setResolutionAction(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Resolve Hold / Dispute</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Resolution Action *</Label>
              <Textarea value={resolutionAction} onChange={(e) => setResolutionAction(e.target.value)} rows={3} placeholder="Describe how this was resolved" />
            </div>
            <Button onClick={handleResolve} disabled={resolving} className="w-full cursor-pointer">
              {resolving ? "Resolving…" : "Mark Resolved"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RaiseHoldDialog({ open, onOpenChange, acquisitionId }: { open: boolean; onOpenChange: (open: boolean) => void; acquisitionId: Id<"corporateBulkAcquisitions"> }) {
  const raiseHold = useMutation(api.corporateMarketing.exceptions.raiseHold);
  const [holdType, setHoldType] = useState<"on_hold" | "disputed">("on_hold");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setHoldType("on_hold"); setReason(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { toast.error("A reason is required"); return; }
    setSaving(true);
    try {
      await raiseHold({ bulkAcquisitionId: acquisitionId, holdType, reason: reason.trim() });
      toast.success(holdType === "on_hold" ? "Acquisition placed on hold" : "Acquisition marked as disputed");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to raise hold");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Place On Hold / Dispute</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={holdType} onValueChange={(v) => setHoldType(v as typeof holdType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reason *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Saving…" : "Confirm"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Exceptions register tab ──────────────────────────────────────────────
export function ExceptionsRegisterSection({ acquisitionId }: { acquisitionId: Id<"corporateBulkAcquisitions"> }) {
  const exceptions = useQuery(api.corporateMarketing.exceptions.listExceptions, { bulkAcquisitionId: acquisitionId });

  if (exceptions === undefined) return <Skeleton className="h-24 w-full" />;

  if (exceptions.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia>
          <EmptyTitle>No exceptions raised</EmptyTitle>
          <EmptyDescription>Discount overages and allocation eligibility overrides raised elsewhere on this acquisition will appear here, alongside their approval decision.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-2">
      {exceptions.map((e) => (
        <div key={e._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="text-[10px] border-0 bg-gray-100 text-gray-600">{EXCEPTION_TYPE_LABEL[e.exceptionType] ?? e.exceptionType}</Badge>
                <Badge className={cn("text-[10px] border-0", EXCEPTION_STATUS_STYLE[e.status])}>{e.status}</Badge>
                {e.relatedRef && <span className="text-xs text-gray-400">{e.relatedRef}</span>}
              </div>
              <p className="text-sm text-gray-700 mt-1.5">{e.reason}</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Requested by {e.requestedByName ?? "Unknown"} · {new Date(e.requestedAt).toLocaleDateString()}
                {e.approvedAt ? ` · Decided ${new Date(e.approvedAt).toLocaleDateString()}` : ""}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Controlled cancellation ───────────────────────────────────────────────
export function CancelAcquisitionButton({ acquisitionId, statusKey }: { acquisitionId: Id<"corporateBulkAcquisitions">; statusKey: string }) {
  const cancelAcquisition = useMutation(api.corporateMarketing.exceptions.cancelBulkAcquisition);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [financialImpactNotes, setFinancialImpactNotes] = useState("");
  const [allocationImpactNotes, setAllocationImpactNotes] = useState("");
  const [refundStatus, setRefundStatus] = useState("");
  const [saving, setSaving] = useState(false);

  if (statusKey === "cancelled") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { toast.error("A cancellation reason is required"); return; }
    setSaving(true);
    try {
      await cancelAcquisition({
        id: acquisitionId,
        reason: reason.trim(),
        financialImpactNotes: financialImpactNotes || undefined,
        allocationImpactNotes: allocationImpactNotes || undefined,
        refundStatus: refundStatus || undefined,
      });
      toast.success("Bulk acquisition cancelled");
      setOpen(false);
      setReason(""); setFinancialImpactNotes(""); setAllocationImpactNotes(""); setRefundStatus("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel acquisition");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="secondary" className="cursor-pointer gap-1.5 text-red-600" onClick={() => setOpen(true)}>
        <Ban size={13} /> Cancel Acquisition
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Cancel Bulk Acquisition</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">This record is never deleted. Cancelling keeps its full history (line items, terms, schedule, payments, allocations) but flips its status to Cancelled.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Cancellation Reason *</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Financial Impact (optional)</Label>
              <Textarea value={financialImpactNotes} onChange={(e) => setFinancialImpactNotes(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Allocation Impact (optional)</Label>
              <Textarea value={allocationImpactNotes} onChange={(e) => setAllocationImpactNotes(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Refund Status (optional)</Label>
              <Input value={refundStatus} onChange={(e) => setRefundStatus(e.target.value)} placeholder="e.g. Refund processed, Not applicable" />
            </div>
            <Button type="submit" disabled={saving} className="w-full cursor-pointer">
              {saving ? "Cancelling…" : "Confirm Cancellation"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
