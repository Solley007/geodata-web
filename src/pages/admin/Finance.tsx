import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Landmark, Plus, Search, Filter, X, ArrowRight,
  CheckCircle2, XCircle, Clock, AlertTriangle, Circle, FileText,
  Eye, Trash2, ChevronDown, Building, CreditCard, Banknote,
  RefreshCw, Percent, Calendar, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  application_submitted: "Application Submitted",
  under_review: "Under Review",
  more_info_required: "More Info Required",
  approved: "Approved",
  rejected: "Rejected",
};

type SCfg = { color: string; bg: string; icon: React.ElementType };
const STATUS_CFG: Record<string, SCfg> = {
  not_started:           { color: "text-gray-500",   bg: "bg-gray-100 border-gray-200",     icon: Circle        },
  application_submitted: { color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",      icon: FileText      },
  under_review:          { color: "text-orange-700", bg: "bg-orange-50 border-orange-200",  icon: Clock         },
  more_info_required:    { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200",  icon: AlertTriangle },
  approved:              { color: "text-green-700",  bg: "bg-green-50 border-green-200",    icon: CheckCircle2  },
  rejected:              { color: "text-red-700",    bg: "bg-red-50 border-red-200",        icon: XCircle       },
};

const METHOD_LABELS: Record<string, string> = {
  outright:         "Outright Purchase",
  instalment:       "Instalment Plan",
  mortgage:         "Mortgage",
  external_finance: "External Finance",
};

const METHOD_CFG: Record<string, { color: string; bg: string }> = {
  outright:         { color: "text-emerald-700", bg: "bg-emerald-50" },
  instalment:       { color: "text-blue-700",    bg: "bg-blue-50"    },
  mortgage:         { color: "text-purple-700",  bg: "bg-purple-50"  },
  external_finance: { color: "text-orange-700",  bg: "bg-orange-50"  },
};

const MORTGAGE_STATUS_LABELS: Record<string, string> = {
  pending:           "Pending",
  conditional_offer: "Conditional Offer",
  formal_offer:      "Formal Offer",
  completed:         "Completed",
  declined:          "Declined",
};

const PRIORITY_CFG: Record<string, string> = {
  low:    "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function fmt(n: number | undefined) {
  if (n === undefined) return "—";
  return `₦${n.toLocaleString()}`;
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { color: "text-gray-600", bg: "bg-gray-100 border-gray-200", icon: Circle };
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", cfg.color, cfg.bg)}>
      <Icon size={11} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  const cfg = METHOD_CFG[method] ?? { color: "text-gray-600", bg: "bg-gray-50" };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", cfg.color, cfg.bg)}>
      {METHOD_LABELS[method] ?? method}
    </span>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar() {
  const stats = useQuery(api.finance.getStats, {});
  if (!stats) return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );

  const cards = [
    { label: "Total",       value: stats.total,               color: "text-gray-900" },
    { label: "Not Started", value: stats.notStarted,          color: "text-gray-500" },
    { label: "Submitted",   value: stats.applicationSubmitted, color: "text-blue-700" },
    { label: "Under Review",value: stats.underReview,          color: "text-orange-700" },
    { label: "More Info",   value: stats.moreInfoRequired,     color: "text-yellow-700" },
    { label: "Approved",    value: stats.approved,             color: "text-green-700" },
    { label: "Rejected",    value: stats.rejected,             color: "text-red-700" },
    { label: "Mortgages",   value: stats.mortgage,             color: "text-purple-700" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider leading-tight">{c.label}</p>
          <p className={cn("text-xl font-bold mt-0.5", c.color)}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Create Dialog ─────────────────────────────────────────────────────────────

type CreateForm = {
  clientId: string;
  transactionId: string;
  financeMethod: string;
  purchasePrice: string;
  amountRequested: string;
  initialDeposit: string;
  balanceOwed: string;
  instalmentCount: string;
  instalmentAmount: string;
  instalmentFrequency: string;
  externalLender: string;
  assignedReviewer: string;
  priority: string;
  notes: string;
  initialStatus: string;
  // Mortgage
  lenderName: string;
  loanAmount: string;
  tenureMonths: string;
  interestRate: string;
  monthlyRepayment: string;
  ltv: string;
  valuerName: string;
  valuationAmount: string;
};

const EMPTY: CreateForm = {
  clientId: "", transactionId: "", financeMethod: "outright",
  purchasePrice: "", amountRequested: "", initialDeposit: "", balanceOwed: "",
  instalmentCount: "", instalmentAmount: "", instalmentFrequency: "monthly",
  externalLender: "", assignedReviewer: "", priority: "medium",
  notes: "", initialStatus: "not_started",
  lenderName: "", loanAmount: "", tenureMonths: "", interestRate: "",
  monthlyRepayment: "", ltv: "", valuerName: "", valuationAmount: "",
};

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<CreateForm>(EMPTY);
  const [loading, setLoading] = useState(false);
  const clients = useQuery(api.clients.listClients, {});
  const transactions = useQuery(api.transactions.list, {});
  const staff = useQuery(api.users.listAll, {});
  const createApp = useMutation(api.finance.create);

  const set = (k: keyof CreateForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const num = (s: string) => s ? parseFloat(s) : undefined;
  const int = (s: string) => s ? parseInt(s, 10) : undefined;

  const filteredTxns = useMemo(() =>
    form.clientId ? (transactions ?? []).filter((t) => t.clientId === form.clientId) : [],
    [form.clientId, transactions]
  );

  const handleSubmit = async () => {
    if (!form.clientId) { toast.error("Select a client"); return; }
    setLoading(true);
    try {
      const ref = await createApp({
        clientId: form.clientId as Id<"clients">,
        transactionId: form.transactionId && form.transactionId !== "none" ? form.transactionId as Id<"transactions"> : undefined,
        financeMethod: form.financeMethod,
        purchasePrice: num(form.purchasePrice),
        amountRequested: num(form.amountRequested),
        initialDeposit: num(form.initialDeposit),
        balanceOwed: num(form.balanceOwed),
        instalmentCount: int(form.instalmentCount),
        instalmentAmount: num(form.instalmentAmount),
        instalmentFrequency: form.instalmentFrequency || undefined,
        externalLender: form.externalLender || undefined,
        assignedReviewer: form.assignedReviewer && form.assignedReviewer !== "none" ? form.assignedReviewer as Id<"users"> : undefined,
        priority: form.priority || undefined,
        notes: form.notes || undefined,
        initialStatus: form.initialStatus,
        mortgage: form.financeMethod === "mortgage" ? {
          lenderName: form.lenderName || undefined,
          loanAmount: num(form.loanAmount),
          tenureMonths: int(form.tenureMonths),
          interestRate: num(form.interestRate),
          monthlyRepayment: num(form.monthlyRepayment),
          ltv: num(form.ltv),
          valuerName: form.valuerName || undefined,
          valuationAmount: num(form.valuationAmount),
        } : undefined,
      });
      toast.success(`Finance application ${ref} created`);
      setForm(EMPTY);
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark size={17} /> New Finance Application
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          {/* Client */}
          <div className="col-span-2">
            <Label>Client <span className="text-red-500">*</span></Label>
            <Select value={form.clientId} onValueChange={(v) => { set("clientId", v); set("transactionId", ""); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select client…" /></SelectTrigger>
              <SelectContent>
                {(clients ?? []).map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.fullName} — {c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transaction */}
          <div className="col-span-2">
            <Label>Linked Transaction (optional)</Label>
            <Select value={form.transactionId} onValueChange={(v) => set("transactionId", v)} disabled={!form.clientId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select transaction…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {filteredTxns.map((t) => (
                  <SelectItem key={t._id} value={t._id}>{t.transactionRef} — {t.status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Finance method */}
          <div>
            <Label>Finance Method</Label>
            <Select value={form.financeMethod} onValueChange={(v) => set("financeMethod", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Initial status */}
          <div>
            <Label>Initial Status</Label>
            <Select value={form.initialStatus} onValueChange={(v) => set("initialStatus", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purchase price */}
          <div>
            <Label>Purchase Price (₦)</Label>
            <Input className="mt-1" type="number" placeholder="e.g. 5000000" value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} />
          </div>

          {/* Initial deposit */}
          <div>
            <Label>Initial Deposit (₦)</Label>
            <Input className="mt-1" type="number" placeholder="e.g. 1000000" value={form.initialDeposit} onChange={(e) => set("initialDeposit", e.target.value)} />
          </div>

          {/* Balance owed */}
          <div>
            <Label>Balance Owed (₦)</Label>
            <Input className="mt-1" type="number" placeholder="Purchase price minus deposit" value={form.balanceOwed} onChange={(e) => set("balanceOwed", e.target.value)} />
          </div>

          {/* Amount requested (mortgage/external) */}
          {(form.financeMethod === "mortgage" || form.financeMethod === "external_finance") && (
            <div>
              <Label>Amount Requested (₦)</Label>
              <Input className="mt-1" type="number" placeholder="Loan amount requested" value={form.amountRequested} onChange={(e) => set("amountRequested", e.target.value)} />
            </div>
          )}

          {/* Instalment fields */}
          {form.financeMethod === "instalment" && (
            <>
              <div>
                <Label>No. of Instalments</Label>
                <Input className="mt-1" type="number" placeholder="e.g. 12" value={form.instalmentCount} onChange={(e) => set("instalmentCount", e.target.value)} />
              </div>
              <div>
                <Label>Per-Instalment Amount (₦)</Label>
                <Input className="mt-1" type="number" placeholder="e.g. 250000" value={form.instalmentAmount} onChange={(e) => set("instalmentAmount", e.target.value)} />
              </div>
              <div>
                <Label>Instalment Frequency</Label>
                <Select value={form.instalmentFrequency} onValueChange={(v) => set("instalmentFrequency", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="bi_annual">Bi-Annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* External lender */}
          {form.financeMethod === "external_finance" && (
            <div>
              <Label>External Lender Name</Label>
              <Input className="mt-1" placeholder="e.g. Access Bank PLC" value={form.externalLender} onChange={(e) => set("externalLender", e.target.value)} />
            </div>
          )}

          {/* Mortgage specific fields */}
          {form.financeMethod === "mortgage" && (
            <>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 border-t pt-3">Mortgage Details</p>
              </div>
              <div>
                <Label>Lender / Bank</Label>
                <Input className="mt-1" placeholder="e.g. First Bank Mortgage" value={form.lenderName} onChange={(e) => set("lenderName", e.target.value)} />
              </div>
              <div>
                <Label>Loan Amount (₦)</Label>
                <Input className="mt-1" type="number" value={form.loanAmount} onChange={(e) => set("loanAmount", e.target.value)} />
              </div>
              <div>
                <Label>Tenure (months)</Label>
                <Input className="mt-1" type="number" placeholder="e.g. 120" value={form.tenureMonths} onChange={(e) => set("tenureMonths", e.target.value)} />
              </div>
              <div>
                <Label>Interest Rate (% p.a.)</Label>
                <Input className="mt-1" type="number" placeholder="e.g. 18.5" step="0.1" value={form.interestRate} onChange={(e) => set("interestRate", e.target.value)} />
              </div>
              <div>
                <Label>Monthly Repayment (₦)</Label>
                <Input className="mt-1" type="number" value={form.monthlyRepayment} onChange={(e) => set("monthlyRepayment", e.target.value)} />
              </div>
              <div>
                <Label>LTV (%)</Label>
                <Input className="mt-1" type="number" placeholder="e.g. 70" value={form.ltv} onChange={(e) => set("ltv", e.target.value)} />
              </div>
              <div>
                <Label>Valuer Name</Label>
                <Input className="mt-1" placeholder="Appointed valuer" value={form.valuerName} onChange={(e) => set("valuerName", e.target.value)} />
              </div>
              <div>
                <Label>Valuation Amount (₦)</Label>
                <Input className="mt-1" type="number" value={form.valuationAmount} onChange={(e) => set("valuationAmount", e.target.value)} />
              </div>
            </>
          )}

          {/* Reviewer */}
          <div>
            <Label>Assign Reviewer</Label>
            <Select value={form.assignedReviewer} onValueChange={(v) => set("assignedReviewer", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {(staff ?? []).filter((u) => u.role !== "client").map((u) => (
                  <SelectItem key={u._id} value={u._id}>{u.name ?? u.email}</SelectItem>
                ))}
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

          {/* Notes */}
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating…" : "Create Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Review Dialog ─────────────────────────────────────────────────────────────

function ReviewDialog({
  appId, currentStatus, appRef, onClose,
}: {
  appId: Id<"financeApplications">;
  currentStatus: string;
  appRef: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [moreInfoRequest, setMoreInfoRequest] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);
  const updateStatus = useMutation(api.finance.updateStatus);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateStatus({
        id: appId,
        status,
        note: note || undefined,
        reviewNotes: reviewNotes || undefined,
        moreInfoRequest: moreInfoRequest || undefined,
        rejectionReason: rejectionReason || undefined,
      });
      toast.success(`${appRef} — status updated to ${STATUS_LABELS[status]}`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  const canSave = !(
    (status === "rejected" && !rejectionReason) ||
    (status === "more_info_required" && !moreInfoRequest)
  );

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark size={16} /> Review — {appRef}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Decision / New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {status === "approved" && (
              <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
                <CheckCircle2 size={12} /> Human approval — this will update the linked transaction's finance status.
              </p>
            )}
          </div>

          {status === "rejected" && (
            <div>
              <Label>Rejection Reason <span className="text-red-500">*</span></Label>
              <Textarea className="mt-1" rows={2} placeholder="State the reason…"
                value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
            </div>
          )}

          {status === "more_info_required" && (
            <div>
              <Label>Information Required <span className="text-red-500">*</span></Label>
              <Textarea className="mt-1" rows={2} placeholder="Specify what is needed…"
                value={moreInfoRequest} onChange={(e) => setMoreInfoRequest(e.target.value)} />
            </div>
          )}

          <div>
            <Label>Internal Review Notes</Label>
            <Textarea className="mt-1" rows={3} placeholder="Internal notes…"
              value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
          </div>

          <div>
            <Label>Audit Note</Label>
            <Textarea className="mt-1" rows={2} placeholder="Short note for the audit trail…"
              value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={loading || !canSave}
            className={cn(
              status === "approved" ? "bg-green-600 hover:bg-green-700" :
              status === "rejected" ? "bg-red-600 hover:bg-red-700" : ""
            )}
          >
            {loading ? "Saving…" : status === "approved" ? "Approve" : status === "rejected" ? "Reject" : "Save Decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Mortgage Edit Dialog ──────────────────────────────────────────────────────

function MortgageDialog({
  appId, existing, onClose,
}: {
  appId: Id<"financeApplications">;
  existing: Record<string, unknown> | null;
  onClose: () => void;
}) {
  const [lenderName, setLenderName] = useState(String(existing?.lenderName ?? ""));
  const [loanAmount, setLoanAmount] = useState(String(existing?.loanAmount ?? ""));
  const [tenureMonths, setTenureMonths] = useState(String(existing?.tenureMonths ?? ""));
  const [interestRate, setInterestRate] = useState(String(existing?.interestRate ?? ""));
  const [monthlyRepayment, setMonthlyRepayment] = useState(String(existing?.monthlyRepayment ?? ""));
  const [ltv, setLtv] = useState(String(existing?.ltv ?? ""));
  const [offerLetterUrl, setOfferLetterUrl] = useState(String(existing?.offerLetterUrl ?? ""));
  const [approvalLetterUrl, setApprovalLetterUrl] = useState(String(existing?.approvalLetterUrl ?? ""));
  const [valuerName, setValuerName] = useState(String(existing?.valuerName ?? ""));
  const [valuationAmount, setValuationAmount] = useState(String(existing?.valuationAmount ?? ""));
  const [mortgageStatus, setMortgageStatus] = useState(String(existing?.mortgageStatus ?? "pending"));
  const [notes, setNotes] = useState(String(existing?.notes ?? ""));
  const [loading, setLoading] = useState(false);
  const upsert = useMutation(api.finance.upsertMortgage);

  const num = (s: string) => s ? parseFloat(s) : undefined;
  const int = (s: string) => s ? parseInt(s, 10) : undefined;

  const handleSave = async () => {
    setLoading(true);
    try {
      await upsert({
        applicationId: appId,
        lenderName: lenderName || undefined,
        loanAmount: num(loanAmount),
        tenureMonths: int(tenureMonths),
        interestRate: num(interestRate),
        monthlyRepayment: num(monthlyRepayment),
        ltv: num(ltv),
        offerLetterUrl: offerLetterUrl || undefined,
        approvalLetterUrl: approvalLetterUrl || undefined,
        valuerName: valuerName || undefined,
        valuationAmount: num(valuationAmount),
        mortgageStatus,
        notes: notes || undefined,
      });
      toast.success("Mortgage details saved");
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mortgage Details</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <Label>Mortgage Stage</Label>
            <Select value={mortgageStatus} onValueChange={setMortgageStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MORTGAGE_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Lender / Bank</Label>
            <Input className="mt-1" placeholder="e.g. First Bank Mortgage" value={lenderName} onChange={(e) => setLenderName(e.target.value)} />
          </div>
          <div>
            <Label>Loan Amount (₦)</Label>
            <Input className="mt-1" type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
          </div>
          <div>
            <Label>Tenure (months)</Label>
            <Input className="mt-1" type="number" placeholder="120" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} />
          </div>
          <div>
            <Label>Interest Rate (% p.a.)</Label>
            <Input className="mt-1" type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
          </div>
          <div>
            <Label>Monthly Repayment (₦)</Label>
            <Input className="mt-1" type="number" value={monthlyRepayment} onChange={(e) => setMonthlyRepayment(e.target.value)} />
          </div>
          <div>
            <Label>LTV (%)</Label>
            <Input className="mt-1" type="number" placeholder="70" value={ltv} onChange={(e) => setLtv(e.target.value)} />
          </div>
          <div>
            <Label>Valuer Name</Label>
            <Input className="mt-1" placeholder="Appointed valuer" value={valuerName} onChange={(e) => setValuerName(e.target.value)} />
          </div>
          <div>
            <Label>Valuation Amount (₦)</Label>
            <Input className="mt-1" type="number" value={valuationAmount} onChange={(e) => setValuationAmount(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Offer Letter URL</Label>
            <Input className="mt-1" placeholder="https://…" value={offerLetterUrl} onChange={(e) => setOfferLetterUrl(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Approval Letter URL</Label>
            <Input className="mt-1" placeholder="https://…" value={approvalLetterUrl} onChange={(e) => setApprovalLetterUrl(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-xs text-gray-500 w-40 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value ?? "—"}</span>
    </div>
  );
}

type FinanceEvent = {
  _id: string;
  fromStatus?: string;
  toStatus: string;
  changedByName?: string;
  note?: string;
  timestamp: string;
};

function EventTimeline({ events }: { events: FinanceEvent[] }) {
  return (
    <div className="space-y-3">
      {events.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No events yet</p>}
      {[...events].reverse().map((ev, i) => (
        <div key={ev._id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={cn("w-2.5 h-2.5 rounded-full mt-0.5 shrink-0", i === 0 ? "bg-[var(--brand)]" : "bg-gray-300")} />
            {i < events.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
          </div>
          <div className="pb-3">
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

type AppDetail = {
  _id: Id<"financeApplications">;
  applicationRef: string;
  financeMethod: string;
  status: string;
  priority?: string;
  purchasePrice?: number;
  amountRequested?: number;
  initialDeposit?: number;
  balanceOwed?: number;
  instalmentCount?: number;
  instalmentAmount?: number;
  instalmentFrequency?: string;
  externalLender?: string;
  notes?: string;
  reviewNotes?: string;
  moreInfoRequest?: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewStartedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  client: { fullName: string; email: string } | null;
  transaction: { transactionRef: string } | null;
  reviewer: { name?: string; email?: string } | null;
  mortgage: Record<string, unknown> | null;
  events: FinanceEvent[];
};

function DetailPanel({
  appId, onClose,
}: {
  appId: Id<"financeApplications">;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"details" | "mortgage" | "timeline">("details");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mortgageOpen, setMortgageOpen] = useState(false);
  const app = useQuery(api.finance.getById, { id: appId }) as AppDetail | null | undefined;

  if (!app) return (
    <div className="flex-1 p-6 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
    </div>
  );

  const isFinal = app.status === "approved" || app.status === "rejected";
  const isMortgage = app.financeMethod === "mortgage";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm font-mono">{app.applicationRef}</span>
            <MethodBadge method={app.financeMethod} />
            {app.priority && (
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", PRIORITY_CFG[app.priority])}>
                {app.priority}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{app.client?.fullName ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isFinal && (
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => setReviewOpen(true)}>
              <Landmark size={12} /> Review
            </Button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer"><X size={18} /></button>
        </div>
      </div>

      {/* Status */}
      <div className="px-5 pt-3">
        <StatusBadge status={app.status} />
        {app.status === "more_info_required" && app.moreInfoRequest && (
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-yellow-700">Information Required:</p>
            <p className="text-xs text-yellow-700 mt-0.5">{app.moreInfoRequest}</p>
          </div>
        )}
        {app.status === "rejected" && app.rejectionReason && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-red-700">Rejection Reason:</p>
            <p className="text-xs text-red-600 mt-0.5">{app.rejectionReason}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-3">
        {(["details", ...(isMortgage ? ["mortgage"] : []), "timeline"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t as typeof tab)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg font-medium capitalize cursor-pointer transition-colors",
              tab === t ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {tab === "details" && (
          <>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Finance Summary</h4>
              <div className="divide-y divide-gray-50">
                <DetailRow label="Finance Method" value={<MethodBadge method={app.financeMethod} />} />
                <DetailRow label="Purchase Price" value={fmt(app.purchasePrice)} />
                <DetailRow label="Initial Deposit" value={fmt(app.initialDeposit)} />
                <DetailRow label="Balance Owed" value={fmt(app.balanceOwed)} />
                {(app.financeMethod === "mortgage" || app.financeMethod === "external_finance") && (
                  <DetailRow label="Amount Requested" value={fmt(app.amountRequested)} />
                )}
                {app.financeMethod === "instalment" && (
                  <>
                    <DetailRow label="Instalments" value={app.instalmentCount ? `${app.instalmentCount} × ${fmt(app.instalmentAmount)}` : undefined} />
                    <DetailRow label="Frequency" value={app.instalmentFrequency?.replace("_", " ")} />
                  </>
                )}
                {app.financeMethod === "external_finance" && (
                  <DetailRow label="External Lender" value={app.externalLender} />
                )}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Review Info</h4>
              <div className="divide-y divide-gray-50">
                <DetailRow label="Reviewer" value={app.reviewer?.name ?? app.reviewer?.email} />
                <DetailRow label="Transaction" value={app.transaction?.transactionRef} />
                <DetailRow label="Submitted At" value={app.submittedAt ? format(parseISO(app.submittedAt), "dd MMM yyyy, HH:mm") : undefined} />
                <DetailRow label="Review Started" value={app.reviewStartedAt ? format(parseISO(app.reviewStartedAt), "dd MMM yyyy, HH:mm") : undefined} />
                <DetailRow label="Decided At" value={(app.approvedAt ?? app.rejectedAt) ? format(parseISO((app.approvedAt ?? app.rejectedAt)!), "dd MMM yyyy, HH:mm") : undefined} />
              </div>
            </div>
            {app.reviewNotes && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Internal Notes</h4>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{app.reviewNotes}</p>
              </div>
            )}
            {app.notes && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h4>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{app.notes}</p>
              </div>
            )}
          </>
        )}

        {tab === "mortgage" && isMortgage && (
          <>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mortgage Details</h4>
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setMortgageOpen(true)}>
                Edit
              </Button>
            </div>
            {app.mortgage ? (
              <div className="divide-y divide-gray-50">
                <DetailRow label="Mortgage Stage" value={MORTGAGE_STATUS_LABELS[app.mortgage.mortgageStatus as string] ?? String(app.mortgage.mortgageStatus)} />
                <DetailRow label="Lender" value={app.mortgage.lenderName as string} />
                <DetailRow label="Loan Amount" value={fmt(app.mortgage.loanAmount as number)} />
                <DetailRow label="Tenure" value={app.mortgage.tenureMonths ? `${app.mortgage.tenureMonths} months` : undefined} />
                <DetailRow label="Interest Rate" value={app.mortgage.interestRate ? `${app.mortgage.interestRate}% p.a.` : undefined} />
                <DetailRow label="Monthly Repayment" value={fmt(app.mortgage.monthlyRepayment as number)} />
                <DetailRow label="LTV" value={app.mortgage.ltv ? `${app.mortgage.ltv}%` : undefined} />
                <DetailRow label="Valuer" value={app.mortgage.valuerName as string} />
                <DetailRow label="Valuation" value={fmt(app.mortgage.valuationAmount as number)} />
                {(app.mortgage.offerLetterUrl as string | undefined) && (
                  <div className="py-1.5 flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-40 shrink-0">Offer Letter</span>
                    <a href={String(app.mortgage.offerLetterUrl)} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Eye size={11} /> View
                    </a>
                  </div>
                )}
                {(app.mortgage.approvalLetterUrl as string | undefined) && (
                  <div className="py-1.5 flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-40 shrink-0">Approval Letter</span>
                    <a href={String(app.mortgage.approvalLetterUrl)} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Eye size={11} /> View
                    </a>
                  </div>
                )}
                {(app.mortgage.notes as string | undefined) && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{String(app.mortgage.notes)}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Landmark size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No mortgage details yet.</p>
                <Button size="sm" className="mt-3" onClick={() => setMortgageOpen(true)}>Add Mortgage Details</Button>
              </div>
            )}
          </>
        )}

        {tab === "timeline" && (
          <>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Audit Trail</h4>
            <EventTimeline events={app.events} />
          </>
        )}
      </div>

      {reviewOpen && (
        <ReviewDialog appId={appId} currentStatus={app.status} appRef={app.applicationRef} onClose={() => setReviewOpen(false)} />
      )}
      {mortgageOpen && (
        <MortgageDialog appId={appId} existing={app.mortgage} onClose={() => setMortgageOpen(false)} />
      )}
    </div>
  );
}

// ── Delete Dialog ─────────────────────────────────────────────────────────────

function DeleteDialog({ id, appRef, onClose }: { id: Id<"financeApplications">; appRef: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const remove = useMutation(api.finance.remove);
  const handleDelete = async () => {
    setLoading(true);
    try {
      await remove({ id });
      toast.success(`${appRef} deleted`);
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
          <DialogTitle className="text-red-600">Delete Finance Application?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">Permanently delete <strong>{appRef}</strong> and all its mortgage details and audit events?</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>{loading ? "Deleting…" : "Delete"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── List Row ──────────────────────────────────────────────────────────────────

type ListRowData = {
  _id: Id<"financeApplications">;
  applicationRef: string;
  clientName: string;
  clientEmail?: string;
  financeMethod: string;
  status: string;
  purchasePrice?: number;
  priority?: string;
  reviewerName?: string;
  transactionRef?: string;
  _creationTime: number;
};

function ListRow({
  row, selected, onClick, onDelete,
}: {
  row: ListRowData; selected: boolean; onClick: () => void; onDelete: () => void;
}) {
  return (
    <tr
      className={cn("border-b border-gray-50 hover:bg-gray-50/70 transition-colors cursor-pointer", selected && "bg-blue-50/40")}
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-[var(--brand)]">{row.applicationRef}</span>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-gray-900 leading-tight">{row.clientName}</div>
        {row.clientEmail && <div className="text-[11px] text-gray-400">{row.clientEmail}</div>}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <MethodBadge method={row.financeMethod} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-sm text-gray-700">{fmt(row.purchasePrice)}</span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-gray-500">{row.reviewerName ?? "—"}</span>
      </td>
      <td className="px-4 py-3 hidden xl:table-cell">
        <span className="text-xs text-gray-400">{format(new Date(row._creationTime), "dd MMM yy")}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClick} className="p-1 rounded hover:bg-blue-100 text-blue-500 cursor-pointer" title="View">
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminFinance() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"financeApplications"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"financeApplications">; ref: string } | null>(null);

  const applications = useQuery(api.finance.list, {
    status: statusFilter !== "all" ? statusFilter : undefined,
    financeMethod: methodFilter !== "all" ? methodFilter : undefined,
    search: search || undefined,
  });

  const rows = useMemo(() => applications ?? [], [applications]);
  const hasDetail = selectedId !== null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finance & Mortgage</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage buyer finance applications, instalments, and mortgage deals</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> New Application
        </Button>
      </div>

      {/* Stats */}
      <StatsBar />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-9 h-9 bg-white text-sm" placeholder="Search by ref, client, transaction…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 h-9 bg-white">
            <Filter size={13} className="text-gray-400 mr-1" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-48 h-9 bg-white">
            <CreditCard size={13} className="text-gray-400 mr-1" />
            <SelectValue placeholder="All methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {Object.entries(METHOD_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Two-panel layout */}
      <div className={cn(
        "flex flex-1 min-h-0 rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden",
        hasDetail ? "flex-row" : "flex-col"
      )}>
        {/* List */}
        <div className={cn(
          "overflow-auto",
          hasDetail ? "w-full md:w-[55%] border-r border-gray-100 shrink-0" : "flex-1"
        )}>
          {applications === undefined ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <Landmark size={40} className="text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No finance applications found</p>
              <p className="text-sm text-gray-400 mt-1">Adjust filters or create a new application.</p>
              <Button className="mt-4 gap-2" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> New Application
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Ref</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Method</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Price</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Reviewer</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Created</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <ListRow
                    key={row._id}
                    row={row}
                    selected={selectedId === row._id}
                    onClick={() => setSelectedId(selectedId === row._id ? null : row._id)}
                    onDelete={() => setDeleteTarget({ id: row._id, ref: row.applicationRef })}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {hasDetail && (
          <div className="hidden md:flex flex-col flex-1 min-w-0 overflow-hidden">
            <DetailPanel appId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>

      {/* Mobile detail modal */}
      {hasDetail && (
        <Dialog open onOpenChange={(o) => { if (!o) setSelectedId(null); }}>
          <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0 md:hidden">
            <DetailPanel appId={selectedId} onClose={() => setSelectedId(null)} />
          </DialogContent>
        </Dialog>
      )}

      {showCreate && <CreateDialog open onClose={() => setShowCreate(false)} />}
      {deleteTarget && (
        <DeleteDialog id={deleteTarget.id} appRef={deleteTarget.ref} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
