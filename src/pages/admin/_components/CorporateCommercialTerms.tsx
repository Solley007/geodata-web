import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { FileText, Plus, ShieldAlert, CheckCircle2, X, History } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

/**
 * Commercial Terms & Discount Approvals for a Bulk Acquisition (Institutional
 * / Bulk Acquisition Management enhancement, milestone 75). Each proposal is
 * a brand-new version — never edited in place — so the full negotiation
 * history stays visible. A discount above the configured threshold must be
 * decided through the EXISTING approvals engine (Tasks & Approvals) by
 * someone other than the requesting officer — never auto-approved.
 */

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  pending_approval: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  superseded: "bg-gray-100 text-gray-400",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  active: "Active",
  rejected: "Rejected",
  superseded: "Superseded",
};

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannually", label: "Biannually" },
  { value: "annually", label: "Annually" },
  { value: "custom", label: "Custom" },
];

export function CommercialTermsSection({ acquisitionId }: { acquisitionId: Id<"corporateBulkAcquisitions"> }) {
  const versions = useQuery(api.corporateMarketing.commercialTerms.listCommercialTerms, { bulkAcquisitionId: acquisitionId });
  const threshold = useQuery(api.corporateMarketing.commercialTerms.getDiscountApprovalThreshold, {});
  const activateTerms = useMutation(api.corporateMarketing.commercialTerms.activateCommercialTerms);
  const decideTerms = useMutation(api.corporateMarketing.commercialTerms.decideCommercialTermsApproval);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  const handleActivate = async (id: Id<"corporateCommercialTerms">) => {
    try {
      await activateTerms({ id });
      toast.success("Commercial terms activated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate terms");
    }
  };

  const handleDecide = async (id: Id<"corporateCommercialTerms">, decision: "approved" | "rejected") => {
    try {
      await decideTerms({ id, decision, decisionNote: decisionNotes[id] || undefined });
      toast.success(decision === "approved" ? "Discount approved and terms activated" : "Discount rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record decision");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-400">
          {threshold !== undefined && threshold > 0
            ? `Discounts above ${threshold}% require approval before terms can go active.`
            : "Any discount currently requires approval before terms can go active."}
        </p>
        <Button size="sm" onClick={() => setProposeOpen(true)} className="gap-2 cursor-pointer shrink-0">
          <Plus size={13} /> Propose New Terms
        </Button>
      </div>

      {versions === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : versions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileText /></EmptyMedia>
            <EmptyTitle>No commercial terms proposed yet</EmptyTitle>
            <EmptyDescription>Propose pricing, deposit, instalment structure and special terms for this acquisition. Every version is kept — nothing is overwritten.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setProposeOpen(true)} className="gap-2 cursor-pointer">
              <Plus size={13} /> Propose New Terms
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-3">
          {versions.map((v) => (
            <div key={v._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <History size={14} className="text-gray-300" />
                  <p className="text-sm font-semibold text-gray-900">Version {v.version}</p>
                  <Badge className={cn("text-[10px] border-0", STATUS_STYLE[v.status] ?? STATUS_STYLE.draft)}>{STATUS_LABEL[v.status] ?? v.status}</Badge>
                  {v.approvalRequired && <Badge className="text-[10px] border-0 bg-orange-100 text-orange-700 gap-1"><ShieldAlert size={10} /> Discount approval required</Badge>}
                </div>
                <p className="text-[11px] text-gray-400">Proposed {new Date(v.proposedAt).toLocaleDateString()}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                {v.totalUnits !== undefined && <Field label="Total Units" value={String(v.totalUnits)} />}
                {v.totalPlots !== undefined && <Field label="Total Plots" value={String(v.totalPlots)} />}
                {v.pricePerUnit !== undefined && <Field label="Price/Unit" value={`₦${v.pricePerUnit.toLocaleString()}`} />}
                {v.totalContractValue !== undefined && <Field label="Contract Value" value={`₦${v.totalContractValue.toLocaleString()}`} />}
                {v.discountPercent !== undefined && <Field label="Discount" value={`${v.discountPercent}%`} />}
                {v.discountAmount !== undefined && <Field label="Discount Amount" value={`₦${v.discountAmount.toLocaleString()}`} />}
                {v.depositPercent !== undefined && <Field label="Deposit" value={`${v.depositPercent}%`} />}
                {v.depositAmount !== undefined && <Field label="Deposit Amount" value={`₦${v.depositAmount.toLocaleString()}`} />}
                {v.instalmentFrequency && <Field label="Instalment Frequency" value={v.instalmentFrequency} />}
                {v.instalmentDurationMonths !== undefined && <Field label="Duration (months)" value={String(v.instalmentDurationMonths)} />}
                {v.gracePeriodDays !== undefined && <Field label="Grace Period (days)" value={`${v.gracePeriodDays} days`} />}
              </div>

              {v.instalmentStructure && <p className="text-xs text-gray-500 mt-2">Instalment structure: {v.instalmentStructure}</p>}
              {v.discountJustification && <p className="text-xs text-gray-500 mt-1">Discount justification: {v.discountJustification}</p>}
              {v.allocationConditions && <p className="text-xs text-gray-500 mt-1">Allocation conditions: {v.allocationConditions}</p>}
              {v.completionConditions && <p className="text-xs text-gray-500 mt-1">Completion conditions: {v.completionConditions}</p>}
              {v.offTakeTerms && <p className="text-xs text-gray-500 mt-1">Off-take terms: {v.offTakeTerms}</p>}
              {v.agreementConditions && <p className="text-xs text-gray-500 mt-1">Agreement conditions: {v.agreementConditions}</p>}
              {v.specialTerms && <p className="text-xs text-gray-500 mt-1">Special terms: {v.specialTerms}</p>}
              {v.decisionNote && <p className="text-xs text-gray-500 mt-1 border-t border-gray-50 pt-2">Decision note: {v.decisionNote}</p>}

              {v.status === "draft" && (
                <Button size="sm" onClick={() => handleActivate(v._id)} className="mt-3 gap-1.5 cursor-pointer">
                  <CheckCircle2 size={13} /> Activate
                </Button>
              )}

              {v.status === "pending_approval" && (
                <div className="space-y-2 rounded-xl bg-amber-50 p-3 mt-3">
                  <p className="text-xs font-medium text-amber-700">Awaiting discount approval — the requesting officer cannot decide this themselves.</p>
                  <Textarea
                    value={decisionNotes[v._id] ?? ""}
                    onChange={(e) => setDecisionNotes({ ...decisionNotes, [v._id]: e.target.value })}
                    rows={2}
                    placeholder="Decision note (optional)"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 gap-1.5 cursor-pointer" onClick={() => handleDecide(v._id, "approved")}>
                      <CheckCircle2 size={13} /> Approve
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1 gap-1.5 cursor-pointer text-red-600" onClick={() => handleDecide(v._id, "rejected")}>
                      <X size={13} /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ProposeCommercialTermsDialog open={proposeOpen} onOpenChange={setProposeOpen} acquisitionId={acquisitionId} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className="font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function ProposeCommercialTermsDialog({
  open,
  onOpenChange,
  acquisitionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acquisitionId: Id<"corporateBulkAcquisitions">;
}) {
  const proposeTerms = useMutation(api.corporateMarketing.commercialTerms.proposeCommercialTerms);
  const threshold = useQuery(api.corporateMarketing.commercialTerms.getDiscountApprovalThreshold, open ? {} : "skip");
  const emptyForm = {
    totalUnits: "", totalPlots: "", pricePerUnit: "", totalContractValue: "",
    discountPercent: "", discountAmount: "", discountJustification: "",
    depositPercent: "", depositAmount: "", instalmentStructure: "", instalmentFrequency: "",
    instalmentDurationMonths: "", gracePeriodDays: "",
    allocationConditions: "", completionConditions: "", offTakeTerms: "", agreementConditions: "", specialTerms: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const discountPercent = form.discountPercent ? parseFloat(form.discountPercent) : 0;
  const willRequireApproval = threshold !== undefined && discountPercent > threshold;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await proposeTerms({
        bulkAcquisitionId: acquisitionId,
        totalUnits: form.totalUnits ? parseInt(form.totalUnits, 10) : undefined,
        totalPlots: form.totalPlots ? parseInt(form.totalPlots, 10) : undefined,
        pricePerUnit: form.pricePerUnit ? parseFloat(form.pricePerUnit) : undefined,
        totalContractValue: form.totalContractValue ? parseFloat(form.totalContractValue) : undefined,
        discountPercent: form.discountPercent ? parseFloat(form.discountPercent) : undefined,
        discountAmount: form.discountAmount ? parseFloat(form.discountAmount) : undefined,
        discountJustification: form.discountJustification || undefined,
        depositPercent: form.depositPercent ? parseFloat(form.depositPercent) : undefined,
        depositAmount: form.depositAmount ? parseFloat(form.depositAmount) : undefined,
        instalmentStructure: form.instalmentStructure || undefined,
        instalmentFrequency: (form.instalmentFrequency || undefined) as "monthly" | "quarterly" | "biannually" | "annually" | "custom" | undefined,
        instalmentDurationMonths: form.instalmentDurationMonths ? parseInt(form.instalmentDurationMonths, 10) : undefined,
        gracePeriodDays: form.gracePeriodDays ? parseInt(form.gracePeriodDays, 10) : undefined,
        allocationConditions: form.allocationConditions || undefined,
        completionConditions: form.completionConditions || undefined,
        offTakeTerms: form.offTakeTerms || undefined,
        agreementConditions: form.agreementConditions || undefined,
        specialTerms: form.specialTerms || undefined,
      });
      toast.success(willRequireApproval ? "Terms proposed — routed for discount approval" : "Terms proposed");
      setForm(emptyForm);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to propose terms");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Propose New Commercial Terms</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Total Units</Label>
              <Input type="number" min={0} value={form.totalUnits} onChange={(e) => setForm({ ...form, totalUnits: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Total Plots</Label>
              <Input type="number" min={0} value={form.totalPlots} onChange={(e) => setForm({ ...form, totalPlots: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price per Unit (₦)</Label>
              <Input type="number" min={0} value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Total Contract Value (₦)</Label>
              <Input type="number" min={0} value={form.totalContractValue} onChange={(e) => setForm({ ...form, totalContractValue: e.target.value })} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-3">
            <p className="text-xs font-medium text-gray-500">Discount (routes through approval if beyond threshold)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Discount %</Label>
                <Input type="number" min={0} max={100} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discount Amount (₦)</Label>
                <Input type="number" min={0} value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} />
              </div>
            </div>
            {willRequireApproval && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5"><ShieldAlert size={13} /> This discount exceeds the configured threshold and will require formal approval before terms go active.</p>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Discount Justification</Label>
              <Textarea rows={2} value={form.discountJustification} onChange={(e) => setForm({ ...form, discountJustification: e.target.value })} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-3">
            <p className="text-xs font-medium text-gray-500">Deposit &amp; instalments</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Deposit %</Label>
                <Input type="number" min={0} max={100} value={form.depositPercent} onChange={(e) => setForm({ ...form, depositPercent: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deposit Amount (₦)</Label>
                <Input type="number" min={0} value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Instalment Frequency</Label>
                <Select value={form.instalmentFrequency} onValueChange={(v) => setForm({ ...form, instalmentFrequency: v })}>
                  <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (months)</Label>
                <Input type="number" min={0} value={form.instalmentDurationMonths} onChange={(e) => setForm({ ...form, instalmentDurationMonths: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Grace Period (days)</Label>
                <Input type="number" min={0} value={form.gracePeriodDays} onChange={(e) => setForm({ ...form, gracePeriodDays: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Instalment Structure</Label>
              <Textarea rows={2} placeholder="e.g. Quarterly instalments over 18 months" value={form.instalmentStructure} onChange={(e) => setForm({ ...form, instalmentStructure: e.target.value })} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-3">
            <p className="text-xs font-medium text-gray-500">Conditions &amp; special terms</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Allocation Conditions</Label>
              <Textarea rows={2} value={form.allocationConditions} onChange={(e) => setForm({ ...form, allocationConditions: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Completion Conditions</Label>
              <Textarea rows={2} value={form.completionConditions} onChange={(e) => setForm({ ...form, completionConditions: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Off-Take Terms</Label>
              <Textarea rows={2} value={form.offTakeTerms} onChange={(e) => setForm({ ...form, offTakeTerms: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Agreement Conditions</Label>
              <Textarea rows={2} value={form.agreementConditions} onChange={(e) => setForm({ ...form, agreementConditions: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Special Terms</Label>
              <Textarea rows={2} value={form.specialTerms} onChange={(e) => setForm({ ...form, specialTerms: e.target.value })} />
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Submitting…" : "Propose Terms"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
