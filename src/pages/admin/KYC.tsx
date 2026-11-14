import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  ShieldCheck, Plus, Search, Filter, ArrowRight, X, RefreshCw,
  CheckCircle2, XCircle, Clock, AlertTriangle, Circle, FileText,
  Upload, Eye, Trash2, User, Building2, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { cn } from "@/lib/utils.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import TablePager from "@/components/ui/table-pager.tsx";

const PAGE_SIZE = 12;

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  pending_customer: "Pending Customer",
  submitted: "Submitted",
  under_review: "Under Review",
  more_info_required: "More Info Required",
  approved: "Approved",
  rejected: "Rejected",
};

type SCfg = { color: string; bg: string; icon: React.ElementType };
const STATUS_CFG: Record<string, SCfg> = {
  not_started:          { color: "text-gray-500",    bg: "bg-gray-100 border-gray-200",     icon: Circle        },
  pending_customer:     { color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",      icon: Clock         },
  submitted:            { color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-200",  icon: FileText      },
  under_review:         { color: "text-orange-700",  bg: "bg-orange-50 border-orange-200",  icon: Clock         },
  more_info_required:   { color: "text-yellow-700",  bg: "bg-yellow-50 border-yellow-200",  icon: AlertTriangle },
  approved:             { color: "text-green-700",   bg: "bg-green-50 border-green-200",    icon: CheckCircle2  },
  rejected:             { color: "text-red-700",     bg: "bg-red-50 border-red-200",        icon: XCircle       },
};

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

const DOC_TYPES: Record<string, string> = {
  nin_slip: "NIN Slip",
  passport: "International Passport",
  drivers_license: "Driver's License",
  utility_bill: "Utility Bill",
  bank_statement: "Bank Statement",
  photo: "Passport Photo",
  cac_document: "CAC Document",
  memorandum: "Memorandum of Association",
  board_resolution: "Board Resolution",
  other: "Other",
};

const RISK_CFG: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

const PRIORITY_CFG: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

// ── Stats Bar ───────────────────────────────────────────────────────────────

function StatsBar() {
  const stats = useQuery(api.kyc.getStats, {});
  if (!stats) return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );

  const cards = [
    { label: "Total",             value: stats.total,              color: "text-gray-900" },
    { label: "Not Started",       value: stats.notStarted,         color: "text-gray-500" },
    { label: "Pending Customer",  value: stats.pendingCustomer,    color: "text-blue-700" },
    { label: "Submitted",         value: stats.submitted,          color: "text-indigo-700" },
    { label: "Under Review",      value: stats.underReview,        color: "text-orange-700" },
    { label: "More Info Needed",  value: stats.moreInfoRequired,   color: "text-yellow-700" },
    { label: "Approved",          value: stats.approved,           color: "text-green-700" },
    { label: "Rejected",          value: stats.rejected,           color: "text-red-700" },
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

// ── Create KYC Dialog ───────────────────────────────────────────────────────

type CreateForm = {
  clientId: string;
  transactionId: string;
  kycType: string;
  legalName: string;
  dateOfBirth: string;
  nationality: string;
  nin: string;
  bvn: string;
  passportNumber: string;
  driversLicense: string;
  residentialAddress: string;
  stateOfResidence: string;
  occupation: string;
  employerName: string;
  sourceOfFunds: string;
  companyName: string;
  rcNumber: string;
  assignedReviewer: string;
  priority: string;
  initialStatus: string;
};

const EMPTY_FORM: CreateForm = {
  clientId: "", transactionId: "", kycType: "individual",
  legalName: "", dateOfBirth: "", nationality: "Nigerian",
  nin: "", bvn: "", passportNumber: "", driversLicense: "",
  residentialAddress: "", stateOfResidence: "", occupation: "",
  employerName: "", sourceOfFunds: "", companyName: "", rcNumber: "",
  assignedReviewer: "", priority: "medium", initialStatus: "not_started",
};

function CreateKYCDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const clients = useQuery(api.clients.listClients, {});
  const transactions = useQuery(api.transactions.list, {});
  const staff = useQuery(api.users.listAll, {});
  const createKYC = useMutation(api.kyc.create);

  const set = (k: keyof CreateForm, val: string) => setForm((f) => ({ ...f, [k]: val }));

  const filteredTxns = useMemo(() =>
    form.clientId ? (transactions ?? []).filter((t) => t.clientId === form.clientId) : [],
    [form.clientId, transactions]
  );

  const handleSubmit = async () => {
    if (!form.clientId) { toast.error("Please select a client"); return; }
    setLoading(true);
    try {
      const ref = await createKYC({
        clientId: form.clientId as Id<"clients">,
        transactionId: form.transactionId ? (form.transactionId as Id<"transactions">) : undefined,
        kycType: form.kycType,
        legalName: form.legalName || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        nationality: form.nationality || undefined,
        nin: form.nin || undefined,
        bvn: form.bvn || undefined,
        passportNumber: form.passportNumber || undefined,
        driversLicense: form.driversLicense || undefined,
        residentialAddress: form.residentialAddress || undefined,
        stateOfResidence: form.stateOfResidence || undefined,
        occupation: form.occupation || undefined,
        employerName: form.employerName || undefined,
        sourceOfFunds: form.sourceOfFunds || undefined,
        companyName: form.companyName || undefined,
        rcNumber: form.rcNumber || undefined,
        assignedReviewer: form.assignedReviewer ? (form.assignedReviewer as Id<"users">) : undefined,
        priority: form.priority || undefined,
        initialStatus: form.initialStatus || undefined,
      });
      toast.success(`KYC submission ${ref.slice(-6)} created`);
      setForm(EMPTY_FORM);
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to create KYC submission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={18} />
            New KYC Submission
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

          {/* KYC type */}
          <div>
            <Label>KYC Type</Label>
            <Select value={form.kycType} onValueChange={(v) => set("kycType", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Initial Status */}
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

          {/* Legal Name */}
          <div>
            <Label>Legal Full Name</Label>
            <Input className="mt-1" placeholder="As on official ID" value={form.legalName} onChange={(e) => set("legalName", e.target.value)} />
          </div>

          {/* Date of Birth */}
          <div>
            <Label>Date of Birth</Label>
            <Input className="mt-1" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
          </div>

          {/* Nationality */}
          <div>
            <Label>Nationality</Label>
            <Input className="mt-1" placeholder="e.g. Nigerian" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
          </div>

          {/* NIN */}
          <div>
            <Label>NIN</Label>
            <Input className="mt-1" placeholder="11-digit NIN" maxLength={11} value={form.nin} onChange={(e) => set("nin", e.target.value)} />
          </div>

          {/* BVN */}
          <div>
            <Label>BVN</Label>
            <Input className="mt-1" placeholder="11-digit BVN" maxLength={11} value={form.bvn} onChange={(e) => set("bvn", e.target.value)} />
          </div>

          {/* Address */}
          <div className="col-span-2">
            <Label>Residential Address</Label>
            <Textarea className="mt-1" rows={2} placeholder="Full address" value={form.residentialAddress} onChange={(e) => set("residentialAddress", e.target.value)} />
          </div>

          {/* State */}
          <div>
            <Label>State of Residence</Label>
            <Input className="mt-1" placeholder="e.g. Lagos" value={form.stateOfResidence} onChange={(e) => set("stateOfResidence", e.target.value)} />
          </div>

          {/* Occupation */}
          <div>
            <Label>Occupation</Label>
            <Input className="mt-1" placeholder="e.g. Engineer" value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
          </div>

          {/* Source of Funds */}
          <div>
            <Label>Source of Funds</Label>
            <Select value={form.sourceOfFunds} onValueChange={(v) => set("sourceOfFunds", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="salary">Salary / Employment</SelectItem>
                <SelectItem value="business">Business Income</SelectItem>
                <SelectItem value="savings">Personal Savings</SelectItem>
                <SelectItem value="investment">Investment Returns</SelectItem>
                <SelectItem value="inheritance">Inheritance / Gift</SelectItem>
                <SelectItem value="loan">Bank Loan</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Corporate fields */}
          {form.kycType === "corporate" && (
            <>
              <div>
                <Label>Company Name</Label>
                <Input className="mt-1" placeholder="Registered company name" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
              </div>
              <div>
                <Label>RC Number</Label>
                <Input className="mt-1" placeholder="CAC RC number" value={form.rcNumber} onChange={(e) => set("rcNumber", e.target.value)} />
              </div>
            </>
          )}

          {/* Assigned Reviewer */}
          <div>
            <Label>Assign Reviewer</Label>
            <Select value={form.assignedReviewer} onValueChange={(v) => set("assignedReviewer", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select staff…" /></SelectTrigger>
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
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating…" : "Create KYC Submission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Review Actions Dialog ───────────────────────────────────────────────────

function ReviewDialog({
  submissionId, currentStatus, submissionRef, onClose,
}: {
  submissionId: Id<"kycSubmissions">;
  currentStatus: string;
  submissionRef: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [moreInfoRequest, setMoreInfoRequest] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const updateStatus = useMutation(api.kyc.updateStatus);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateStatus({
        id: submissionId,
        status,
        note: note || undefined,
        reviewNotes: reviewNotes || undefined,
        moreInfoRequest: moreInfoRequest || undefined,
        rejectionReason: rejectionReason || undefined,
        riskLevel: riskLevel || undefined,
      });
      toast.success(`${submissionRef} — status updated to ${STATUS_LABELS[status]}`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={16} />
            Review — {submissionRef}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Action */}
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
                <CheckCircle2 size={12} /> Human approval — this action is final. The client will be marked as KYC verified.
              </p>
            )}
            {status === "rejected" && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <XCircle size={12} /> This will mark the client as KYC rejected. You must provide a reason.
              </p>
            )}
          </div>

          {/* Risk level */}
          <div>
            <Label>Risk Assessment</Label>
            <Select value={riskLevel} onValueChange={setRiskLevel}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select risk level…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rejection reason */}
          {status === "rejected" && (
            <div>
              <Label>Rejection Reason <span className="text-red-500">*</span></Label>
              <Textarea className="mt-1" rows={2} placeholder="State the specific reason(s) for rejection…"
                value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
            </div>
          )}

          {/* More info request */}
          {status === "more_info_required" && (
            <div>
              <Label>Information Requested <span className="text-red-500">*</span></Label>
              <Textarea className="mt-1" rows={2} placeholder="Specify exactly what the customer needs to provide…"
                value={moreInfoRequest} onChange={(e) => setMoreInfoRequest(e.target.value)} />
            </div>
          )}

          {/* Review notes */}
          <div>
            <Label>Internal Review Notes</Label>
            <Textarea className="mt-1" rows={3} placeholder="Internal notes for the compliance team…"
              value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
          </div>

          {/* Audit note */}
          <div>
            <Label>Audit Trail Note</Label>
            <Textarea className="mt-1" rows={2} placeholder="Short note to appear in the event timeline…"
              value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={loading || (status === "rejected" && !rejectionReason) || (status === "more_info_required" && !moreInfoRequest)}
            className={cn(
              status === "approved" ? "bg-green-600 hover:bg-green-700" :
              status === "rejected" ? "bg-red-600 hover:bg-red-700" : ""
            )}
          >
            {loading ? "Saving…" : status === "approved" ? "Approve KYC" : status === "rejected" ? "Reject KYC" : "Save Decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Document Dialog ─────────────────────────────────────────────────────

function AddDocumentDialog({
  submissionId, clientId, onClose,
}: {
  submissionId: Id<"kycSubmissions">;
  clientId: Id<"clients">;
  onClose: () => void;
}) {
  const [docType, setDocType] = useState("nin_slip");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const addDoc = useMutation(api.kyc.addDocument);

  const handleAdd = async () => {
    if (!url) { toast.error("Please provide a document URL"); return; }
    setLoading(true);
    try {
      await addDoc({
        kycSubmissionId: submissionId,
        clientId,
        docType,
        name: name || (DOC_TYPES[docType] ?? docType),
        url,
      });
      toast.success("Document added");
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
          <DialogTitle>Add KYC Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DOC_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Document Name (optional)</Label>
            <Input className="mt-1" placeholder={DOC_TYPES[docType]} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Document URL <span className="text-red-500">*</span></Label>
            <Input className="mt-1" placeholder="https://example.com/document.pdf" value={url} onChange={(e) => setUrl(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Upload the file via Files & Media and paste the CDN URL here.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleAdd} disabled={loading || !url}>{loading ? "Adding…" : "Add Document"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Documents Panel ─────────────────────────────────────────────────────────

type KycDoc = {
  _id: Id<"kycDocuments">;
  docType: string;
  name: string;
  url: string;
  status: string;
  rejectionReason?: string;
  verifierName?: string;
  verifiedAt?: string;
};

function DocumentsSection({
  docs,
  submissionId,
  clientId,
}: {
  docs: KycDoc[];
  submissionId: Id<"kycSubmissions">;
  clientId: Id<"clients">;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const verifyDoc = useMutation(api.kyc.verifyDocument);
  const removeDoc = useMutation(api.kyc.removeDocument);

  const handleVerify = async (id: Id<"kycDocuments">, status: string) => {
    try {
      await verifyDoc({ id, status });
      toast.success(`Document ${status}`);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    }
  };

  const handleRemove = async (id: Id<"kycDocuments">) => {
    try {
      await removeDoc({ id });
      toast.success("Document removed");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documents ({docs.length})</h4>
        <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => setAddOpen(true)}>
          <Upload size={12} /> Add Document
        </Button>
      </div>

      {docs.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No documents uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d._id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
              <FileText size={16} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800 truncate">{d.name}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-medium",
                    d.status === "verified" ? "bg-green-100 text-green-700" :
                    d.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  )}>
                    {d.status}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">{DOC_TYPES[d.docType] ?? d.docType}</p>
                {d.rejectionReason && <p className="text-[11px] text-red-500 mt-0.5">{d.rejectionReason}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={d.url} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded hover:bg-blue-100 text-blue-500" title="View document">
                  <Eye size={13} />
                </a>
                {d.status === "pending" && (
                  <>
                    <button onClick={() => handleVerify(d._id, "verified")}
                      className="p-1.5 rounded hover:bg-green-100 text-green-600 cursor-pointer" title="Verify">
                      <CheckCircle2 size={13} />
                    </button>
                    <button onClick={() => handleVerify(d._id, "rejected")}
                      className="p-1.5 rounded hover:bg-red-100 text-red-400 cursor-pointer" title="Reject">
                      <XCircle size={13} />
                    </button>
                  </>
                )}
                <button onClick={() => handleRemove(d._id)}
                  className="p-1.5 rounded hover:bg-red-100 text-red-400 cursor-pointer" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <AddDocumentDialog
          submissionId={submissionId}
          clientId={clientId}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}

// ── Event Timeline ──────────────────────────────────────────────────────────

type KycEvent = {
  _id: string;
  fromStatus?: string;
  toStatus: string;
  changedByName?: string;
  note?: string;
  timestamp: string;
};

function EventTimeline({ events }: { events: KycEvent[] }) {
  return (
    <div className="space-y-3">
      {events.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No events yet</p>}
      {[...events].reverse().map((ev, i) => (
        <div key={ev._id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={cn("w-2.5 h-2.5 rounded-full mt-0.5 shrink-0", i === 0 ? "bg-[var(--brand)]" : "bg-gray-300")} />
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

// ── Detail Panel ────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value ?? "—"}</span>
    </div>
  );
}

function KYCDetailPanel({
  submissionId, onClose,
}: {
  submissionId: Id<"kycSubmissions">;
  onClose: () => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [section, setSection] = useState<"details" | "documents" | "timeline">("details");
  const submission = useQuery(api.kyc.getById, { id: submissionId });

  if (!submission) return (
    <div className="flex-1 p-6 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
    </div>
  );

  const isFinal = submission.status === "approved" || submission.status === "rejected";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm font-mono">{submission.submissionRef}</span>
            {submission.priority && (
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", PRIORITY_CFG[submission.priority] ?? "bg-gray-100 text-gray-600")}>
                {submission.priority}
              </span>
            )}
            {submission.riskLevel && (
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", RISK_CFG[submission.riskLevel])}>
                {submission.riskLevel} risk
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{submission.client?.fullName}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isFinal && (
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => setReviewOpen(true)}>
              <ShieldCheck size={12} /> Review
            </Button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="px-5 pt-3">
        <StatusBadge status={submission.status} />
        {isFinal && (
          <p className="text-xs text-gray-400 mt-1">
            {submission.status === "approved"
              ? `Approved on ${submission.approvedAt ? format(parseISO(submission.approvedAt), "dd MMM yyyy, HH:mm") : "—"}`
              : `Rejected on ${submission.rejectedAt ? format(parseISO(submission.rejectedAt), "dd MMM yyyy, HH:mm") : "—"}`}
          </p>
        )}
        {submission.status === "more_info_required" && submission.moreInfoRequest && (
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-yellow-700">Information Requested:</p>
            <p className="text-xs text-yellow-700 mt-0.5">{submission.moreInfoRequest}</p>
          </div>
        )}
        {submission.status === "rejected" && submission.rejectionReason && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-red-700">Rejection Reason:</p>
            <p className="text-xs text-red-600 mt-0.5">{submission.rejectionReason}</p>
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 px-5 pt-3 pb-0">
        {(["details", "documents", "timeline"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSection(tab)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg font-medium capitalize cursor-pointer transition-colors",
              section === tab ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
            )}
          >
            {tab}{tab === "documents" ? ` (${submission.documents.length})` : ""}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {section === "details" && (
          <>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Personal Details</h4>
              <div className="divide-y divide-gray-50">
                <DetailRow label="KYC Type" value={submission.kycType === "individual" ? "Individual" : "Corporate"} />
                <DetailRow label="Legal Name" value={submission.legalName} />
                <DetailRow label="Date of Birth" value={submission.dateOfBirth} />
                <DetailRow label="Nationality" value={submission.nationality} />
                <DetailRow label="Place of Birth" value={submission.placeOfBirth} />
                <DetailRow label="Address" value={submission.residentialAddress} />
                <DetailRow label="State" value={submission.stateOfResidence} />
                <DetailRow label="Occupation" value={submission.occupation} />
                <DetailRow label="Employer" value={submission.employerName} />
                <DetailRow label="Source of Funds" value={submission.sourceOfFunds?.replace(/_/g, " ")} />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Identity Numbers</h4>
              <div className="divide-y divide-gray-50">
                <DetailRow label="NIN" value={submission.nin} />
                <DetailRow label="BVN" value={submission.bvn} />
                <DetailRow label="Passport No." value={submission.passportNumber} />
                <DetailRow label="Driver's License" value={submission.driversLicense} />
                {submission.kycType === "corporate" && (
                  <>
                    <DetailRow label="Company Name" value={submission.companyName} />
                    <DetailRow label="RC Number" value={submission.rcNumber} />
                  </>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Review Info</h4>
              <div className="divide-y divide-gray-50">
                <DetailRow label="Reviewer" value={submission.reviewer?.name ?? submission.reviewer?.email} />
                <DetailRow label="Submitted At" value={submission.submittedAt ? format(parseISO(submission.submittedAt), "dd MMM yyyy, HH:mm") : undefined} />
                <DetailRow label="Review Started" value={submission.reviewStartedAt ? format(parseISO(submission.reviewStartedAt), "dd MMM yyyy, HH:mm") : undefined} />
                <DetailRow label="Transaction" value={submission.transaction?.transactionRef} />
              </div>
            </div>
            {submission.reviewNotes && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Internal Notes</h4>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{submission.reviewNotes}</p>
              </div>
            )}
          </>
        )}

        {section === "documents" && (
          <DocumentsSection
            docs={submission.documents}
            submissionId={submissionId}
            clientId={submission.clientId}
          />
        )}

        {section === "timeline" && (
          <>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Audit Trail</h4>
            <EventTimeline events={submission.events} />
          </>
        )}
      </div>

      {reviewOpen && (
        <ReviewDialog
          submissionId={submissionId}
          currentStatus={submission.status}
          submissionRef={submission.submissionRef}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </div>
  );
}

// ── Delete Dialog ───────────────────────────────────────────────────────────

function DeleteDialog({
  id, submissionRef, onClose,
}: {
  id: Id<"kycSubmissions">;
  submissionRef: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const remove = useMutation(api.kyc.remove);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await remove({ id });
      toast.success(`${submissionRef} deleted`);
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
          <DialogTitle className="text-red-600">Delete KYC Submission?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Permanently delete <strong>{submissionRef}</strong> and all its documents and audit events?
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

// ── List Row ────────────────────────────────────────────────────────────────

type SubmissionRow = {
  _id: Id<"kycSubmissions">;
  submissionRef: string;
  clientName: string;
  clientEmail?: string;
  kycType: string;
  status: string;
  priority?: string;
  riskLevel?: string;
  reviewerName?: string;
  _creationTime: number;
};

function ListRow({
  row, selected, onClick, onDelete,
}: {
  row: SubmissionRow;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <tr
      className={cn("border-b border-gray-50 hover:bg-gray-50/70 transition-colors cursor-pointer", selected && "bg-blue-50/40")}
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-[var(--brand)]">{row.submissionRef}</span>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-gray-900 leading-tight">{row.clientName}</div>
        {row.clientEmail && <div className="text-[11px] text-gray-400">{row.clientEmail}</div>}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className={cn("text-xs px-2 py-0.5 rounded-full", row.kycType === "corporate" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600")}>
          {row.kycType === "corporate" ? <Building2 size={10} className="inline mr-1" /> : <User size={10} className="inline mr-1" />}
          {row.kycType}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        {row.riskLevel && (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", RISK_CFG[row.riskLevel])}>
            {row.riskLevel}
          </span>
        )}
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

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AdminKYC() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"kycSubmissions"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"kycSubmissions">; ref: string } | null>(null);

  const {
    rows,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.kyc.listPaginated,
    { status: statusFilter !== "all" ? statusFilter : undefined, search: debouncedSearch || undefined },
    PAGE_SIZE,
  );

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter]);

  const hasDetail = selectedId !== null;
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">KYC & Compliance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Know Your Customer verification and compliance management</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setShowCreate(true)}>
          <Plus size={15} />
          New KYC Submission
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
            placeholder="Search by ref, client name…"
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
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
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
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <ShieldCheck size={40} className="text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No KYC submissions found</p>
              <p className="text-sm text-gray-400 mt-1">Adjust filters or create a new submission.</p>
              <Button className="mt-4 gap-2" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> New KYC Submission
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Ref</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Type</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Risk</th>
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
                    onDelete={() => setDeleteTarget({ id: row._id, ref: row.submissionRef })}
                  />
                ))}
              </tbody>
            </table>
          )}
          {!isLoading && rows.length > 0 && (
            <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
          )}
        </div>

        {/* Detail panel */}
        {hasDetail && !isMobile && (
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <KYCDetailPanel submissionId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>

      {/* Mobile detail modal */}
      {hasDetail && isMobile && (
        <Dialog open onOpenChange={(o) => { if (!o) setSelectedId(null); }}>
          <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0">
            <KYCDetailPanel submissionId={selectedId} onClose={() => setSelectedId(null)} />
          </DialogContent>
        </Dialog>
      )}

      {showCreate && <CreateKYCDialog open onClose={() => setShowCreate(false)} />}
      {deleteTarget && (
        <DeleteDialog
          id={deleteTarget.id}
          submissionRef={deleteTarget.ref}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
