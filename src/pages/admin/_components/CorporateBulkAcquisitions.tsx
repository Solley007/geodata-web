import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import {
  ArrowLeft, Building, Plus, Settings2, ChevronRight, PackageCheck, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { AcquisitionLineItemsSection } from "./CorporateAcquisitionLineItems.tsx";
import { CommercialTermsSection } from "./CorporateCommercialTerms.tsx";
import { PaymentScheduleSection } from "./CorporatePaymentSchedule.tsx";
import { AllocationBatchesSection } from "./CorporateAllocationBatches.tsx";
import { AcquisitionHoldBanner, ExceptionsRegisterSection, CancelAcquisitionButton } from "./CorporateExceptionsHolds.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

/**
 * Institutional / Bulk Acquisition Management — enhancement to the existing
 * Corporate Marketing & Bulk Sales feature. Operational fulfilment layer
 * sitting below a corporateOpportunity once it reaches Commitment. This
 * file covers the foundations milestone: list + create + status/detail
 * view. Line-item linkage, pricing history, commercial terms, payment
 * schedules, allocation batches, exceptions, and transaction conversion are
 * added in later milestones — reusing this same acquisition record, never a
 * parallel one.
 */

const ACQUISITION_TYPES = [
  { value: "staff_housing", label: "Staff Housing Scheme" },
  { value: "investment_portfolio", label: "Investment Portfolio" },
  { value: "off_take", label: "Off-Take Agreement" },
  { value: "cooperative", label: "Cooperative Purchase" },
  { value: "institutional", label: "Institutional Acquisition" },
  { value: "other", label: "Other" },
];

const STATUS_BADGE_FALLBACK = "bg-gray-100 text-gray-500";
function statusBadgeColor(key: string): string {
  if (key.includes("cancel")) return "bg-red-100 text-red-600";
  if (key.includes("dispute") || key.includes("hold")) return "bg-amber-100 text-amber-700";
  if (key.includes("fulfil") || key.includes("complet") || key.includes("fully")) return "bg-green-100 text-green-700";
  if (key === "draft") return "bg-gray-100 text-gray-500";
  return "bg-blue-100 text-blue-700";
}

// ─── List of bulk acquisitions for one opportunity ───────────────────────
export function BulkAcquisitionsSection({
  opportunityId,
  onSelect,
}: {
  opportunityId: Id<"corporateOpportunities">;
  onSelect: (id: Id<"corporateBulkAcquisitions">) => void;
}) {
  const acquisitions = useQuery(api.corporateMarketing.bulkAcquisitions.listBulkAcquisitions, { opportunityId });
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
          <Plus size={13} /> New Bulk Acquisition
        </Button>
      </div>

      {acquisitions === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : acquisitions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Building /></EmptyMedia>
            <EmptyTitle>No bulk acquisitions yet</EmptyTitle>
            <EmptyDescription>Once this opportunity reaches Commitment, create a Bulk Acquisition to manage fulfilment: line items, pricing, terms, payment schedule, allocation, and transaction conversion.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
              <Plus size={13} /> New Bulk Acquisition
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-2">
          {acquisitions.map((a) => (
            <button
              key={a._id}
              onClick={() => onSelect(a._id)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-[var(--brand)]/30 transition-colors cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                  <Badge className={cn("text-[10px] border-0 shrink-0", statusBadgeColor(a.statusKey))}>{a.statusLabel}</Badge>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{a.acquisitionRef}{a.acquisitionType ? ` · ${a.acquisitionType.replace(/_/g, " ")}` : ""}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </button>
          ))}
        </div>
      )}

      <CreateBulkAcquisitionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        opportunityId={opportunityId}
        onCreated={onSelect}
      />
    </div>
  );
}

function CreateBulkAcquisitionDialog({
  open,
  onOpenChange,
  opportunityId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: Id<"corporateOpportunities">;
  onCreated: (id: Id<"corporateBulkAcquisitions">) => void;
}) {
  const createAcquisition = useMutation(api.corporateMarketing.bulkAcquisitions.createBulkAcquisition);
  const [form, setForm] = useState({ name: "", acquisitionType: "", originalEstimatedValue: "", requiredQuantity: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Acquisition name is required"); return; }
    setSaving(true);
    try {
      const id = await createAcquisition({
        opportunityId,
        name: form.name.trim(),
        acquisitionType: form.acquisitionType || undefined,
        originalEstimatedValue: form.originalEstimatedValue ? Number(form.originalEstimatedValue) : undefined,
        requiredQuantity: form.requiredQuantity ? Number(form.requiredQuantity) : undefined,
        notes: form.notes || undefined,
      });
      toast.success("Bulk acquisition created");
      setForm({ name: "", acquisitionType: "", originalEstimatedValue: "", requiredQuantity: "", notes: "" });
      onOpenChange(false);
      onCreated(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bulk acquisition");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Bulk Acquisition</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Acquisition Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Southern Bridge City — Staff Housing Programme" />
          </div>
          <div className="space-y-1.5">
            <Label>Acquisition Type</Label>
            <Select value={form.acquisitionType} onValueChange={(v) => setForm({ ...form, acquisitionType: v })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {ACQUISITION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Total Required Quantity</Label>
              <Input type="number" min={0} value={form.requiredQuantity} onChange={(e) => setForm({ ...form, requiredQuantity: e.target.value })} placeholder="100" />
            </div>
            <div className="space-y-1.5">
              <Label>Original Estimated Value (₦)</Label>
              <Input type="number" min={0} value={form.originalEstimatedValue} onChange={(e) => setForm({ ...form, originalEstimatedValue: e.target.value })} placeholder="10000000000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Creating…" : "Create Bulk Acquisition"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk acquisition detail: overview, status, fulfilment progress, and
//     linked line items with quantity control / pricing history ──────────
export function BulkAcquisitionDetail({ acquisitionId, onBack }: { acquisitionId: Id<"corporateBulkAcquisitions">; onBack: () => void }) {
  const acq = useQuery(api.corporateMarketing.bulkAcquisitions.getBulkAcquisition, { id: acquisitionId });
  const statuses = useQuery(api.corporateMarketing.config.listAcquisitionStatuses, {});
  const updateAcquisition = useMutation(api.corporateMarketing.bulkAcquisitions.updateBulkAcquisition);

  if (acq === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const activeStatuses = (statuses ?? []).filter((s) => s.status === "active").sort((a, b) => a.order - b.order);

  const handleStatusChange = async (statusKey: string) => {
    try {
      await updateAcquisition({ id: acquisitionId, statusKey });
      toast.success("Status updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const required = acq.requiredQuantity ?? 0;
  const paidPct = required > 0 ? Math.min(100, Math.round(((acq.paidQuantity ?? 0) / required) * 100)) : 0;
  const allocatedPct = required > 0 ? Math.min(100, Math.round(((acq.allocatedQuantity ?? 0) / required) * 100)) : 0;
  const fulfilmentPct = acq.fulfilmentPercent;

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2 cursor-pointer text-gray-500">
        <ArrowLeft size={14} /> Back to {acq.opportunityName}
      </Button>

      <AcquisitionHoldBanner acquisitionId={acquisitionId} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
              <Building size={20} className="text-[var(--brand)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{acq.name}</h1>
              <p className="text-xs text-gray-400 mt-0.5">{acq.acquisitionRef} · {acq.organisationName}{acq.acquisitionType ? ` · ${acq.acquisitionType.replace(/_/g, " ")}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-[10px] border-0", statusBadgeColor(acq.statusKey))}>{acq.statusLabel}</Badge>
            <CancelAcquisitionButton acquisitionId={acquisitionId} statusKey={acq.statusKey} />
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label className="text-xs text-gray-500">Acquisition Status</Label>
          <Select value={acq.statusKey} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              {activeStatuses.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
          <div className="text-gray-600">Line Items Linked: <span className="font-medium">{acq.lineItemCount}</span></div>
          {required > 0 && <div className="text-gray-600">Required Quantity: <span className="font-medium">{required}</span></div>}
          {acq.originalEstimatedValue !== undefined && <div className="text-gray-600">Estimated Value: <span className="font-medium">₦{acq.originalEstimatedValue.toLocaleString()}</span></div>}
          {acq.expectedCompletionDate && <div className="text-gray-600">Expected Completion: <span className="font-medium">{new Date(acq.expectedCompletionDate).toLocaleDateString()}</span></div>}
        </div>

        {required > 0 && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4 border-t border-gray-50 pt-4">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Payment progress</span>
                <span>{acq.paidQuantity ?? 0} / {required} paid ({paidPct}%)</span>
              </div>
              <Progress value={paidPct} />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Allocation progress</span>
                <span>{acq.allocatedQuantity ?? 0} / {required} allocated ({allocatedPct}%)</span>
              </div>
              <Progress value={allocatedPct} />
            </div>
            <div className="sm:col-span-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span className="font-medium text-gray-500">Overall fulfilment</span>
                <span>{fulfilmentPct}%</span>
              </div>
              <Progress value={fulfilmentPct} />
            </div>
          </div>
        )}

        {acq.notes && <p className="text-sm text-gray-500 mt-3 border-t border-gray-50 pt-3">{acq.notes}</p>}
      </div>

      <AcquisitionTransactionCard acquisitionId={acquisitionId} transactionId={acq.transactionId} />

      <div>
        <Tabs defaultValue="lineItems">
          <TabsList>
            <TabsTrigger value="lineItems" className="cursor-pointer">Line Items</TabsTrigger>
            <TabsTrigger value="commercialTerms" className="cursor-pointer">Commercial Terms</TabsTrigger>
            <TabsTrigger value="paymentSchedule" className="cursor-pointer">Payment Schedule</TabsTrigger>
            <TabsTrigger value="allocationBatches" className="cursor-pointer">Allocation Batches</TabsTrigger>
            <TabsTrigger value="exceptions" className="cursor-pointer">Exceptions</TabsTrigger>
          </TabsList>
          <TabsContent value="lineItems" className="mt-3">
            <AcquisitionLineItemsSection acquisitionId={acquisitionId} opportunityId={acq.opportunityId} />
          </TabsContent>
          <TabsContent value="commercialTerms" className="mt-3">
            <CommercialTermsSection acquisitionId={acquisitionId} />
          </TabsContent>
          <TabsContent value="paymentSchedule" className="mt-3">
            <PaymentScheduleSection acquisitionId={acquisitionId} opportunityId={acq.opportunityId} />
          </TabsContent>
          <TabsContent value="allocationBatches" className="mt-3">
            <AllocationBatchesSection acquisitionId={acquisitionId} opportunityId={acq.opportunityId} />
          </TabsContent>
          <TabsContent value="exceptions" className="mt-3">
            <ExceptionsRegisterSection acquisitionId={acquisitionId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Transaction conversion card — converts this bulk acquisition into its
//     own EXISTING transactions row, mirroring the opportunity-level
//     ConversionSection in corporate.tsx. ─────────────────────────────────
function AcquisitionTransactionCard({ acquisitionId, transactionId }: { acquisitionId: Id<"corporateBulkAcquisitions">; transactionId?: Id<"transactions"> }) {
  const convert = useMutation(api.corporateMarketing.bulkAcquisitions.convertAcquisitionToTransaction);
  const [converting, setConverting] = useState(false);

  const handleConvert = async () => {
    setConverting(true);
    try {
      const result = await convert({ id: acquisitionId });
      toast.success(`Converted to transaction ${result.transactionRef}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to convert to transaction");
    } finally {
      setConverting(false);
    }
  };

  if (transactionId) {
    return (
      <div className="bg-green-50 rounded-2xl border border-green-100 p-4 flex items-center gap-3">
        <CheckCircle2 size={18} className="text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Converted to a transaction</p>
          <p className="text-xs text-green-700/80 mt-0.5">Continue tracking KYC, finance, agreement and completion from the Transactions module — Closed Won once completed there.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <p className="text-sm font-semibold text-gray-900">Convert to Transaction</p>
        <p className="text-xs text-gray-400 mt-0.5">Once at least one line item on this acquisition has a recorded commitment, convert it into a transaction to continue through KYC, finance, agreement and completion — leading to Closed Won.</p>
      </div>
      <Button size="sm" disabled={converting} onClick={handleConvert} className="gap-2 cursor-pointer shrink-0">
        <PackageCheck size={13} /> {converting ? "Converting…" : "Convert to Transaction"}
      </Button>
    </div>
  );
}

// ─── Acquisition status configuration (admin) ────────────────────────────
export function AcquisitionStatusManager({ onBack }: { onBack: () => void }) {
  const statuses = useQuery(api.corporateMarketing.config.listAcquisitionStatuses, {});
  const seedStatuses = useMutation(api.corporateMarketing.config.seedDefaultAcquisitionStatuses);
  const updateStatus = useMutation(api.corporateMarketing.config.updateAcquisitionStatus);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedStatuses({});
      toast.success(res.inserted > 0 ? `Seeded ${res.inserted} acquisition statuses` : "Already seeded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed");
    } finally {
      setSeeding(false);
    }
  };

  const toggleStatus = async (id: Id<"corporateAcquisitionStatuses">, status: "active" | "inactive") => {
    try {
      await updateStatus({ id, status: status === "active" ? "inactive" : "active" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2 cursor-pointer text-gray-500">
        <ArrowLeft size={14} /> Back to organisations
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Bulk Acquisition Statuses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configurable lifecycle statuses used across Institutional / Bulk Acquisition Management.</p>
        </div>
        {statuses !== undefined && statuses.length === 0 && (
          <Button onClick={handleSeed} disabled={seeding} variant="secondary" className="cursor-pointer shrink-0">
            {seeding ? "Seeding…" : "Seed Defaults"}
          </Button>
        )}
      </div>

      {statuses === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : statuses.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Settings2 /></EmptyMedia>
            <EmptyTitle>No acquisition statuses configured</EmptyTitle>
            <EmptyDescription>Seed the defaults above to get started.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {statuses.sort((a, b) => a.order - b.order).map((s) => (
            <div key={s._id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={cn("text-sm", s.status === "inactive" && "text-gray-400 line-through")}>{s.label}</span>
                {s.isFulfilled && <Badge className={cn("text-[10px] border-0", STATUS_BADGE_FALLBACK)}>fulfilled</Badge>}
                {s.isCancelled && <Badge className="text-[10px] border-0 bg-red-100 text-red-600">cancelled</Badge>}
                {s.isOnHold && <Badge className="text-[10px] border-0 bg-amber-100 text-amber-700">on hold</Badge>}
                {s.isDisputed && <Badge className="text-[10px] border-0 bg-amber-100 text-amber-700">disputed</Badge>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => toggleStatus(s._id, s.status)} className="cursor-pointer text-xs">
                {s.status === "active" ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
