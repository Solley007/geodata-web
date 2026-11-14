import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { CalendarClock, Plus, Wallet, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

/**
 * Payment Schedule & Partial Payment Tracking for a Bulk Acquisition
 * (Institutional / Bulk Acquisition Management enhancement, milestone 76).
 * Schedule lines (deposit/instalment N/final) are a due-date plan only —
 * every actual payment still goes through the EXISTING geoPayments table
 * via commitments.recordBulkPayment, now extended with an optional
 * scheduleId link so partial payments roll up against the right line.
 */

const SCHEDULE_TYPE_LABEL: Record<string, string> = { deposit: "Deposit", instalment: "Instalment", final: "Final" };
const STATUS_STYLE: Record<string, string> = {
  upcoming: "bg-gray-100 text-gray-500",
  partially_paid: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
};
const STATUS_LABEL: Record<string, string> = { upcoming: "Upcoming", partially_paid: "Partially Paid", paid: "Paid" };

export function PaymentScheduleSection({
  acquisitionId,
  opportunityId,
}: {
  acquisitionId: Id<"corporateBulkAcquisitions">;
  opportunityId: Id<"corporateOpportunities">;
}) {
  const schedules = useQuery(api.corporateMarketing.paymentSchedules.listPaymentSchedules, { bulkAcquisitionId: acquisitionId });
  const generateFromTerms = useMutation(api.corporateMarketing.paymentSchedules.generateScheduleFromTerms);
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payTargetSchedule, setPayTargetSchedule] = useState<Id<"corporatePaymentSchedules"> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const totals = (schedules ?? []).reduce(
    (acc, s) => ({ due: acc.due + s.amountDue, paid: acc.paid + s.amountPaid, balance: acc.balance + s.balance }),
    { due: 0, paid: 0, balance: 0 },
  );
  const percentPaid = totals.due > 0 ? Math.min(100, Math.round((totals.paid / totals.due) * 100)) : 0;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateFromTerms({ bulkAcquisitionId: acquisitionId, startDate });
      toast.success(`Generated ${result.created} schedule line(s) from active commercial terms`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate schedule");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          {schedules !== undefined && schedules.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>₦{totals.paid.toLocaleString()} paid of ₦{totals.due.toLocaleString()}</span>
                <span>{percentPaid}%</span>
              </div>
              <Progress value={percentPaid} className="h-2" />
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={() => setAddLineOpen(true)} className="gap-1.5 cursor-pointer">
            <Plus size={13} /> Add Line
          </Button>
          <Button size="sm" onClick={() => { setPayTargetSchedule(null); setPayDialogOpen(true); }} className="gap-1.5 cursor-pointer">
            <Wallet size={13} /> Record Payment
          </Button>
        </div>
      </div>

      {schedules === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : schedules.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarClock /></EmptyMedia>
            <EmptyTitle>No payment schedule yet</EmptyTitle>
            <EmptyDescription>Generate a schedule from the active commercial terms, or add deposit/instalment/final lines manually.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
                <Button size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5 cursor-pointer">
                  <Sparkles size={13} /> {generating ? "Generating…" : "Generate from Terms"}
                </Button>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setAddLineOpen(true)} className="gap-2 cursor-pointer">
                <Plus size={13} /> Add Line Manually
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-2">
          {schedules.map((s) => (
            <div key={s._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                  <CalendarClock size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                    <Badge className="text-[10px] border-0 bg-gray-50 text-gray-400">{SCHEDULE_TYPE_LABEL[s.scheduleType]}</Badge>
                    <Badge className={cn("text-[10px] border-0", STATUS_STYLE[s.status])}>{STATUS_LABEL[s.status]}</Badge>
                    {s.isOverdue && <Badge className="text-[10px] border-0 bg-red-100 text-red-600 gap-1"><AlertTriangle size={10} /> Overdue</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Due {new Date(s.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs shrink-0">
                <div className="text-right">
                  <p className="text-gray-400">Due</p>
                  <p className="font-semibold text-gray-800">₦{s.amountDue.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">Paid</p>
                  <p className="font-semibold text-green-700">₦{s.amountPaid.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">Balance</p>
                  <p className="font-semibold text-gray-800">₦{s.balance.toLocaleString()}</p>
                </div>
                {s.status !== "paid" && (
                  <Button size="sm" onClick={() => { setPayTargetSchedule(s._id); setPayDialogOpen(true); }} className="gap-1.5 cursor-pointer">
                    <Wallet size={13} /> Pay
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddScheduleLineDialog open={addLineOpen} onOpenChange={setAddLineOpen} acquisitionId={acquisitionId} />
      <RecordSchedulePaymentDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        opportunityId={opportunityId}
        acquisitionId={acquisitionId}
        initialScheduleId={payTargetSchedule}
      />
    </div>
  );
}

function AddScheduleLineDialog({
  open,
  onOpenChange,
  acquisitionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acquisitionId: Id<"corporateBulkAcquisitions">;
}) {
  const createSchedule = useMutation(api.corporateMarketing.paymentSchedules.createPaymentSchedule);
  const [label, setLabel] = useState("");
  const [scheduleType, setScheduleType] = useState<"deposit" | "instalment" | "final">("instalment");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountDue, setAmountDue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setLabel(""); setScheduleType("instalment"); setAmountDue(""); setNotes(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(amountDue);
    if (!label.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a label and a valid amount due");
      return;
    }
    setSaving(true);
    try {
      await createSchedule({ bulkAcquisitionId: acquisitionId, label: label.trim(), scheduleType, dueDate, amountDue: amount, notes: notes || undefined });
      toast.success("Schedule line added");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add schedule line");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Payment Schedule Line</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Instalment 2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as typeof scheduleType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="instalment">Instalment</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Amount Due (₦)</Label>
            <Input type="number" min={0} value={amountDue} onChange={(e) => setAmountDue(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Adding…" : "Add Line"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecordSchedulePaymentDialog({
  open,
  onOpenChange,
  opportunityId,
  acquisitionId,
  initialScheduleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: Id<"corporateOpportunities">;
  acquisitionId: Id<"corporateBulkAcquisitions">;
  initialScheduleId: Id<"corporatePaymentSchedules"> | null;
}) {
  const schedules = useQuery(api.corporateMarketing.paymentSchedules.listPaymentSchedules, open ? { bulkAcquisitionId: acquisitionId } : "skip");
  const lineItems = useQuery(api.corporateMarketing.lineItems.listLineItemsForAcquisition, open ? { acquisitionId } : "skip");
  const recordBulkPayment = useMutation(api.corporateMarketing.commitments.recordBulkPayment);

  const [scheduleId, setScheduleId] = useState<string>("none");
  const [lineItemId, setLineItemId] = useState<string>("none");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [txnType, setTxnType] = useState<"deposit" | "instalment" | "full_payment">("instalment");
  const [gatewayRef, setGatewayRef] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const key = open ? (initialScheduleId ?? "open") : "closed";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setScheduleId(initialScheduleId ?? "none");
  }

  const unpaidSchedules = (schedules ?? []).filter((s) => s.status !== "paid");
  const selectedSchedule = unpaidSchedules.find((s) => s._id === scheduleId);

  const reset = () => { setScheduleId("none"); setLineItemId("none"); setAmountDisplay(""); setTxnType("instalment"); setGatewayRef(""); setNotes(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(amountDisplay);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (selectedSchedule && amount > selectedSchedule.balance) {
      toast.error(`Amount exceeds outstanding balance of ₦${selectedSchedule.balance.toLocaleString()}`);
      return;
    }
    setSaving(true);
    try {
      const result = await recordBulkPayment({
        opportunityId,
        lineItemId: lineItemId !== "none" ? (lineItemId as Id<"corporateOpportunityLineItems">) : undefined,
        scheduleId: scheduleId !== "none" ? (scheduleId as Id<"corporatePaymentSchedules">) : undefined,
        amountDisplay: amount,
        currency: "NGN",
        txnType,
        gatewayRef: gatewayRef || undefined,
        notes: notes || undefined,
      });
      toast.success(`Payment ${result.paymentRef} recorded`);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Record Payment Against Schedule</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Schedule Line (optional)</Label>
            <Select value={scheduleId} onValueChange={setScheduleId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Not tied to a schedule line" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not tied to a schedule line</SelectItem>
                {unpaidSchedules.map((s) => (
                  <SelectItem key={s._id} value={s._id}>{s.label} — Balance ₦{s.balance.toLocaleString()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSchedule && <p className="text-xs text-gray-400">Outstanding balance: ₦{selectedSchedule.balance.toLocaleString()}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Line Item (optional)</Label>
            <Select value={lineItemId} onValueChange={setLineItemId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Whole acquisition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Whole acquisition</SelectItem>
                {(lineItems ?? []).map((li) => <SelectItem key={li._id} value={li._id}>{li.propertyType ?? "Line item"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₦)</Label>
              <Input type="number" min={0} value={amountDisplay} onChange={(e) => setAmountDisplay(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Type</Label>
              <Select value={txnType} onValueChange={(v) => setTxnType(v as typeof txnType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="instalment">Instalment</SelectItem>
                  <SelectItem value="full_payment">Full Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bank/Gateway Reference (optional)</Label>
            <Input value={gatewayRef} onChange={(e) => setGatewayRef(e.target.value)} placeholder="e.g. bank transfer reference" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Recording…" : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
