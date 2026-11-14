import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { ConvexError } from "convex/values";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Users, CheckCircle2, XCircle, Clock, Eye, Search,
  TrendingUp, DollarSign, Handshake, UserCheck, Plus, Phone,
  Mail, Copy, Ban, RefreshCw, Pencil, ChevronRight,
  Banknote, MessageSquare, AlertTriangle, X, History,
  Receipt, Info, MoreHorizontal, BadgeCheck, ShieldOff,
  ExternalLink, FileText, Trash2, Megaphone, Globe2, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";
import ShowcaseReviewsPanel from "./_components/partners/ShowcaseReviewsPanel.tsx";
import ShowcaseListingsPanel from "./_components/partners/ShowcaseListingsPanel.tsx";
import PartnerShowcaseSection from "./_components/partners/PartnerShowcaseSection.tsx";
import PartnerContractSection from "./_components/partners/PartnerContractSection.tsx";
import ContractsPanel from "./_components/partners/ContractsPanel.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

const PARTNERS_PAGE_SIZE = 8;

// ── Types ─────────────────────────────────────────────────────────────────────

type Application = {
  _id: Id<"partnerApplications">;
  _creationTime: number;
  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  country?: string;
  motivation: string;
  experience?: string;
  howHeard?: string;
  status: string;
  reviewedAt?: string;
  reviewNotes?: string;
  commissionRate?: number;
  partnerId?: Id<"partners">;
  diasporaCampaignId?: Id<"diasporaCampaigns">;
  diasporaCampaignName?: string;
  partnerType?: "individual" | "company";
  companyName?: string;
  rcNumber?: string;
  companyWebsite?: string;
  contactRole?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
};

type Partner = {
  _id: Id<"partners">;
  _creationTime: number;
  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  referralCode: string;
  commissionRate: number;
  status: string;
  totalReferrals: number;
  totalCommissionEarned: number;
  approvedAt?: string;
  notes?: string;
  isStaff?: boolean;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  suspendReason?: string;
  address?: string;
  partnerType?: "individual" | "company";
  companyName?: string;
  rcNumber?: string;
  companyWebsite?: string;
  contactRole?: string;
};

/** Company partners lead with the company name; the person becomes the contact. */
function partnerTitle(p: { fullName: string; companyName?: string; partnerType?: string }) {
  return p.partnerType === "company" && p.companyName ? p.companyName : p.fullName;
}

function CompanyBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1"><Building2 size={10} /> Company</span>;
}

type Commission = {
  _id: Id<"partnerCommissions">;
  _creationTime: number;
  partnerId: Id<"partners">;
  description: string;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  notes?: string;
  paidAt?: string;
  voidReason?: string;
  partnerName?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    suspended: "bg-gray-100 text-gray-600 border-gray-200",
    paid: "bg-blue-100 text-blue-800 border-blue-200",
    voided: "bg-red-50 text-red-500 border-red-100 line-through",
  };
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize border", map[status] ?? "bg-gray-100 text-gray-600")}>
      {status}
    </span>
  );
}

const HOW_HEARD_LABELS: Record<string, string> = {
  social: "Social Media", referral: "Referred", website: "Website",
  event: "Event", other: "Other",
};

// ── Edit Partner Modal ────────────────────────────────────────────────────────

function EditPartnerModal({ partner, onClose }: { partner: Partner | null; onClose: () => void }) {
  const [fullName, setFullName] = useState(partner?.fullName ?? "");
  const [email, setEmail] = useState(partner?.email ?? "");
  const [phone, setPhone] = useState(partner?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(partner?.whatsapp ?? "");
  const [commissionRate, setCommissionRate] = useState(partner?.commissionRate ?? 5);
  const [bankName, setBankName] = useState(partner?.bankName ?? "");
  const [bankAccount, setBankAccount] = useState(partner?.bankAccount ?? "");
  const [bankAccountName, setBankAccountName] = useState(partner?.bankAccountName ?? "");
  const [notes, setNotes] = useState(partner?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const update = useMutation(api.partners.updatePartner);

  if (!partner) return null;

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      toast.error("Name, email, and phone are required");
      return;
    }
    setSaving(true);
    try {
      await update({
        partnerId: partner._id,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        commissionRate,
        bankName: bankName.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined,
        bankAccountName: bankAccountName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Partner updated successfully");
      onClose();
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!partner} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil size={18} className="text-[var(--brand)]" />
            Edit Partner — {partner.fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Personal info */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Personal Information</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+234 800 000 0000" />
              </div>
            </div>
          </div>

          {/* Commission rate */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Commission Rate</p>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={20}
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-28"
              />
              <span className="text-sm text-gray-500">%</span>
              <div className="flex gap-1">
                {[3, 5, 7, 10, 15].map((r) => (
                  <button
                    key={r}
                    onClick={() => setCommissionRate(r)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                      commissionRate === r ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "border-gray-200 text-gray-600 hover:border-[var(--brand)]"
                    )}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bank details */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Banknote size={13} /> Bank / Payment Details
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Access Bank" />
              </div>
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="10-digit account number" />
              </div>
              <div className="space-y-1.5">
                <Label>Account Name</Label>
                <Input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="Account holder name" />
              </div>
            </div>
          </div>

          {/* Internal notes */}
          <div className="space-y-1.5">
            <Label>Internal Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any internal notes about this partner..." />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white cursor-pointer">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="ghost" onClick={onClose} className="cursor-pointer">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Suspend / Reactivate Modal ────────────────────────────────────────────────

function SuspendModal({
  partner, action, onClose,
}: { partner: Partner | null; action: "suspend" | "reactivate"; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const update = useMutation(api.partners.updatePartner);

  if (!partner) return null;

  const handleConfirm = async () => {
    if (action === "suspend" && !reason.trim()) {
      toast.error("Please provide a reason for suspension");
      return;
    }
    try {
      await update({
        partnerId: partner._id,
        status: action === "suspend" ? "suspended" : "approved",
        suspendReason: action === "suspend" ? reason : undefined,
      });
      toast.success(action === "suspend" ? `${partner.fullName} has been suspended` : `${partner.fullName} has been reactivated`);
      onClose();
    } catch {
      toast.error("Action failed");
    }
  };

  const isSuspend = action === "suspend";

  return (
    <Dialog open={!!partner} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", isSuspend ? "text-red-600" : "text-green-600")}>
            {isSuspend ? <Ban size={18} /> : <BadgeCheck size={18} />}
            {isSuspend ? "Suspend Partner" : "Reactivate Partner"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className={cn("rounded-xl p-4", isSuspend ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200")}>
            <p className="text-sm font-semibold text-gray-900">{partner.fullName}</p>
            <p className="text-xs text-gray-500">{partner.email} · {partner.referralCode}</p>
          </div>
          {isSuspend && (
            <div className="space-y-1.5">
              <Label>Reason for Suspension *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain why this partner is being suspended..."
              />
            </div>
          )}
          {!isSuspend && partner.suspendReason && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-semibold mb-1">Previous suspension reason:</p>
              <p className="text-sm text-gray-700">{partner.suspendReason}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={handleConfirm}
              className={cn("flex-1 cursor-pointer text-white", isSuspend ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700")}
            >
              {isSuspend ? "Confirm Suspension" : "Reactivate Partner"}
            </Button>
            <Button variant="ghost" onClick={onClose} className="cursor-pointer">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Partner Modal ──────────────────────────────────────────────────────

function DeletePartnerModal({ partner, onClose }: { partner: Partner | null; onClose: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const deletePartner = useMutation(api.partners.deletePartner);

  if (!partner) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePartner({ partnerId: partner._id });
      toast.success(`${partner.fullName} has been deleted`);
      onClose();
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to delete";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={!!partner} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 size={18} /> Delete Partner
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900">{partner.fullName}</p>
            <p className="text-xs text-gray-500">{partner.email} · {partner.referralCode}</p>
          </div>
          <p className="text-sm text-gray-600">
            This will permanently delete this partner along with all their referrals and commissions. This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              <Trash2 size={14} className="mr-2" />
              {deleting ? "Deleting..." : "Delete Partner"}
            </Button>
            <Button variant="ghost" onClick={onClose} className="cursor-pointer">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



function ApplicationModal({ app, onClose }: { app: Application | null; onClose: () => void }) {
  const [tab, setTab] = useState<"review" | "reject">("review");
  const [commissionRate, setCommissionRate] = useState(5);
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const approve = useMutation(api.partners.approveApplication);
  const reject = useMutation(api.partners.rejectApplication);

  if (!app) return null;
  const isPending = app.status === "pending";

  const handleApprove = async () => {
    try {
      await approve({ applicationId: app._id, commissionRate, notes });
      toast.success(`${app.fullName} approved as a Partner!`);
      onClose();
    } catch (e) {
      const err = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed";
      toast.error(err);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error("Please provide a rejection reason"); return; }
    try {
      await reject({ applicationId: app._id, notes: rejectReason });
      toast.success("Application rejected");
      onClose();
    } catch { toast.error("Failed to reject"); }
  };

  return (
    <Dialog open={!!app} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Handshake size={20} className="text-[var(--brand)]" />
            Partner Application
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-[var(--brand)] text-white flex items-center justify-center text-lg font-bold shrink-0">
            {partnerTitle(app).charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900">{partnerTitle(app)}</h3>
              <CompanyBadge show={app.partnerType === "company"} />
              <StatusBadge status={app.status} />
              {app.diasporaCampaignName && (
                <Badge className="text-xs bg-violet-100 text-violet-700 gap-1"><Megaphone size={11} /> {app.diasporaCampaignName}</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><Mail size={12} />{app.email}</span>
              <span className="flex items-center gap-1"><Phone size={12} />{app.phone}</span>
              {app.country && <span className="flex items-center gap-1"><Globe2 size={12} />{app.country}</span>}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Applied {format(new Date(app._creationTime), "dd MMM yyyy, h:mm a")}
              {app.howHeard && ` · via ${HOW_HEARD_LABELS[app.howHeard] ?? app.howHeard}`}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {app.partnerType === "company" && (
            <>
              <div><p className="text-xs text-gray-500 mb-1">Contact Person</p><p className="text-sm font-medium">{app.fullName}{app.contactRole ? ` · ${app.contactRole}` : ""}</p></div>
              {app.rcNumber && <div><p className="text-xs text-gray-500 mb-1">CAC / RC Number</p><p className="text-sm font-medium">{app.rcNumber}</p></div>}
              {app.companyWebsite && (
                <div><p className="text-xs text-gray-500 mb-1">Website</p>
                  <a href={/^https?:\/\//.test(app.companyWebsite) ? app.companyWebsite : `https://${app.companyWebsite}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--brand)] hover:underline break-all">{app.companyWebsite}</a>
                </div>
              )}
            </>
          )}
          {app.bankAccount && (
            <div><p className="text-xs text-gray-500 mb-1">Payment Account</p><p className="text-sm font-medium">{[app.bankName, app.bankAccount, app.bankAccountName].filter(Boolean).join(" · ")}</p></div>
          )}
          {app.whatsapp && (
            <div><p className="text-xs text-gray-500 mb-1">WhatsApp</p><p className="text-sm font-medium">{app.whatsapp}</p></div>
          )}
          {app.address && (
            <div><p className="text-xs text-gray-500 mb-1">Address</p><p className="text-sm font-medium">{app.address}</p></div>
          )}
        </div>

        {app.experience && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Experience</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{app.experience}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Motivation</p>
          <p className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3 leading-relaxed">{app.motivation}</p>
        </div>

        {!isPending && app.reviewedAt && (
          <div className={cn("rounded-xl p-4 border", app.status === "approved" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
            <p className="text-sm font-semibold mb-1">
              {app.status === "approved" ? "✅ Approved" : "❌ Rejected"} on {format(new Date(app.reviewedAt), "dd MMM yyyy")}
            </p>
            {app.reviewNotes && <p className="text-sm text-gray-600">{app.reviewNotes}</p>}
            {app.commissionRate && <p className="text-sm text-gray-600">Commission Rate: <strong>{app.commissionRate}%</strong></p>}
          </div>
        )}

        {isPending && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setTab("review")} className={cn("flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer", tab === "review" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                ✅ Approve
              </button>
              <button onClick={() => setTab("reject")} className={cn("flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer", tab === "reject" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                ❌ Reject
              </button>
            </div>

            {tab === "review" && (
              <div className="space-y-4 p-4 bg-green-50 rounded-xl">
                <div className="space-y-1.5">
                  <Label>Commission Rate (%)</Label>
                  <div className="flex items-center gap-3">
                    <Input type="number" min={1} max={20} value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} className="w-28" />
                    <div className="flex gap-1">
                      {[3, 5, 7, 10].map((r) => (
                        <button key={r} onClick={() => setCommissionRate(r)} className={cn("px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer", commissionRate === r ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "border-gray-200 text-gray-600 hover:border-[var(--brand)]")}>
                          {r}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Internal Notes (optional)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any internal notes..." rows={2} />
                </div>
                <Button onClick={handleApprove} className="w-full bg-green-600 hover:bg-green-700 text-white cursor-pointer">
                  <CheckCircle2 size={16} className="mr-2" /> Approve & Generate Referral Code
                </Button>
              </div>
            )}

            {tab === "reject" && (
              <div className="space-y-4 p-4 bg-red-50 rounded-xl">
                <div className="space-y-1.5">
                  <Label>Rejection Reason *</Label>
                  <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejecting this application..." rows={3} />
                </div>
                <Button onClick={handleReject} variant="destructive" className="w-full cursor-pointer">
                  <XCircle size={16} className="mr-2" /> Confirm Rejection
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Add Commission Modal ──────────────────────────────────────────────────────

function AddCommissionModal({ partner, onClose }: { partner: Partner | null; onClose: () => void }) {
  const [description, setDescription] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [notes, setNotes] = useState("");
  const createCommission = useMutation(api.partners.createCommission);

  if (!partner) return null;

  const handleCreate = async () => {
    if (!description || !saleAmount) { toast.error("Fill all required fields"); return; }
    try {
      await createCommission({ partnerId: partner._id, description, saleAmount: Number(saleAmount), notes });
      toast.success("Commission created");
      onClose();
    } catch { toast.error("Failed to create commission"); }
  };

  const rate = partner.commissionRate;
  const amount = saleAmount ? ((Number(saleAmount) * rate) / 100) : 0;

  return (
    <Dialog open={!!partner} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Commission — {partner.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Sale of Plot A-012 at Southern Bridge" />
          </div>
          <div className="space-y-1.5">
            <Label>Sale Amount (₦) *</Label>
            <Input type="number" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} placeholder="e.g. 5000000" />
            {amount > 0 && (
              <p className="text-sm text-green-700 font-semibold bg-green-50 px-3 py-2 rounded-lg">
                Commission: ₦{amount.toLocaleString()} at {rate}%
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional internal notes..." />
          </div>
          <Button onClick={handleCreate} className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white cursor-pointer">
            Create Commission
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Partner Detail Drawer ─────────────────────────────────────────────────────

function PartnerDetailDrawer({
  partner,
  onClose,
  onEdit,
  onAddCommission,
  onSuspend,
}: {
  partner: Partner | null;
  onClose: () => void;
  onEdit: (p: Partner) => void;
  onAddCommission: (p: Partner) => void;
  onSuspend: (p: Partner, action: "suspend" | "reactivate") => void;
}) {
  const [drawerTab, setDrawerTab] = useState("overview");
  const [voidingId, setVoidingId] = useState<Id<"partnerCommissions"> | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const referrals = useQuery(
    api.partners.getPartnerReferrals,
    partner ? { partnerId: partner._id } : "skip"
  ) as Array<Record<string, unknown>> | undefined;

  const commissions = useQuery(
    api.partners.getPartnerCommissions,
    partner ? { partnerId: partner._id } : "skip"
  ) as Commission[] | undefined;

  const updateCommission = useMutation(api.partners.updateCommissionStatus);
  const voidCommission = useMutation(api.partners.voidCommission);

  if (!partner) return null;

  const handleVoid = async () => {
    if (!voidingId || !voidReason.trim()) { toast.error("Provide a reason"); return; }
    try {
      await voidCommission({ commissionId: voidingId, reason: voidReason });
      toast.success("Commission voided");
      setVoidingId(null);
      setVoidReason("");
    } catch { toast.error("Failed to void"); }
  };

  const isActive = partner.status === "approved";

  return (
    <AnimatePresence>
      {partner && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0", isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                  {partnerTitle(partner).charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-gray-900 truncate">{partnerTitle(partner)}</h2>
                    <StatusBadge status={partner.status} />
                    <CompanyBadge show={partner.partnerType === "company"} />
                    {partner.isStaff && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Staff</span>}
                  </div>
                  <button
                    onClick={() => { void navigator.clipboard.writeText(partner.referralCode); toast.success("Code copied!"); }}
                    className="flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[var(--brand)] transition-colors cursor-pointer mt-0.5"
                  >
                    <Copy size={11} /> {partner.referralCode}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => onEdit(partner)} className="cursor-pointer gap-1.5 text-xs">
                  <Pencil size={13} /> Edit
                </Button>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick actions bar */}
            <div className="flex items-center gap-2 px-6 py-3 border-b bg-gray-50 shrink-0 flex-wrap">
              <Button size="sm" onClick={() => onAddCommission(partner)} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white cursor-pointer gap-1.5 text-xs">
                <Plus size={13} /> Add Commission
              </Button>
              {isActive ? (
                <Button size="sm" onClick={() => onSuspend(partner, "suspend")} variant="ghost" className="text-red-600 hover:bg-red-50 cursor-pointer gap-1.5 text-xs border border-red-200">
                  <Ban size={13} /> Suspend
                </Button>
              ) : partner.status === "suspended" ? (
                <Button size="sm" onClick={() => onSuspend(partner, "reactivate")} variant="ghost" className="text-green-700 hover:bg-green-50 cursor-pointer gap-1.5 text-xs border border-green-200">
                  <RefreshCw size={13} /> Reactivate
                </Button>
              ) : null}
              <a href={`/properties?ref=${partner.referralCode}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[var(--brand)] transition-colors cursor-pointer">
                <ExternalLink size={12} /> Preview referral link
              </a>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-px bg-gray-100 border-b shrink-0">
              {[
                { label: "Referrals", value: partner.totalReferrals, color: "text-[var(--brand)]" },
                { label: "Comm. Rate", value: `${partner.commissionRate}%`, color: "text-orange-600" },
                { label: "Total Earned", value: `₦${(partner.totalCommissionEarned / 1000).toFixed(0)}k`, color: "text-green-700" },
              ].map((s) => (
                <div key={s.label} className="bg-white py-3 text-center">
                  <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex border-b shrink-0">
                {[
                  { id: "overview", label: "Overview", icon: Info },
                  { id: "referrals", label: `Referrals${referrals ? ` (${referrals.length})` : ""}`, icon: History },
                  { id: "commissions", label: `Commissions${commissions ? ` (${commissions.length})` : ""}`, icon: Receipt },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDrawerTab(t.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-semibold px-4 py-3 border-b-2 transition-colors cursor-pointer",
                      drawerTab === t.id ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <t.icon size={13} /> {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* Overview tab */}
                {drawerTab === "overview" && (
                  <div className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <InfoField label="Email" value={partner.email} icon={<Mail size={13} />} />
                      <InfoField label="Phone" value={partner.phone} icon={<Phone size={13} />} />
                      {partner.whatsapp && <InfoField label="WhatsApp" value={partner.whatsapp} icon={<MessageSquare size={13} />} />}
                      {partner.address && <InfoField label="Address" value={partner.address} icon={<FileText size={13} />} />}
                    </div>

                    {partner.approvedAt && (
                      <InfoField label="Approved On" value={format(new Date(partner.approvedAt), "dd MMM yyyy")} />
                    )}

                    {/* Bank details */}
                    {(partner.bankName || partner.bankAccount) && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 uppercase tracking-wide">
                          <Banknote size={13} /> Bank / Payment Details
                        </p>
                        <div className="grid sm:grid-cols-3 gap-3">
                          {partner.bankName && <InfoField label="Bank" value={partner.bankName} />}
                          {partner.bankAccount && <InfoField label="Account No." value={partner.bankAccount} />}
                          {partner.bankAccountName && <InfoField label="Account Name" value={partner.bankAccountName} />}
                        </div>
                      </div>
                    )}

                    {/* Suspension info */}
                    {partner.status === "suspended" && partner.suspendReason && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mb-1.5">
                          <ShieldOff size={13} /> Suspension Reason
                        </p>
                        <p className="text-sm text-gray-700">{partner.suspendReason}</p>
                      </div>
                    )}

                    {/* Internal notes */}
                    {partner.notes && (
                      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-yellow-700 mb-1.5">Internal Notes</p>
                        <p className="text-sm text-gray-700">{partner.notes}</p>
                      </div>
                    )}

                    <PartnerContractSection partnerId={partner._id} />
                    <PartnerShowcaseSection partnerId={partner._id} defaultName={partnerTitle(partner)} />
                  </div>
                )}

                {/* Referrals tab */}
                {drawerTab === "referrals" && (
                  <div className="space-y-2">
                    {!referrals ? (
                      Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
                    ) : referrals.length === 0 ? (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon"><TrendingUp /></EmptyMedia>
                          <EmptyTitle>No referrals yet</EmptyTitle>
                          <EmptyDescription>Referral clicks from this partner will appear here.</EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      referrals.map((r) => (
                        <div key={r._id as string} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{r.resourceTitle as string}</p>
                            <p className="text-xs text-gray-400">{r.resourceType as string} · {format(new Date(r._creationTime as number), "dd MMM yyyy, h:mm a")}</p>
                          </div>
                          <StatusBadge status={r.status as string} />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Commissions tab */}
                {drawerTab === "commissions" && (
                  <div className="space-y-3">
                    {!commissions ? (
                      Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
                    ) : commissions.length === 0 ? (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon"><DollarSign /></EmptyMedia>
                          <EmptyTitle>No commissions yet</EmptyTitle>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      commissions.map((c) => (
                        <div key={c._id} className={cn("bg-white border rounded-xl p-3 space-y-2", c.status === "voided" ? "opacity-50 border-red-100" : "border-gray-100")}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-800 truncate">{c.description}</p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(c._creationTime), "dd MMM yyyy")}
                                {c.paidAt && ` · Paid ${format(new Date(c.paidAt), "dd MMM yyyy")}`}
                              </p>
                            </div>
                            <StatusBadge status={c.status} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Sale: <span className="font-medium text-gray-700">₦{c.saleAmount.toLocaleString()}</span></span>
                              <span>Comm: <span className="font-semibold text-green-700">₦{c.commissionAmount.toLocaleString()}</span></span>
                              <span>{c.commissionRate}%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {c.status === "pending" && (
                                <button
                                  onClick={async () => { await updateCommission({ commissionId: c._id, status: "approved" }); toast.success("Commission approved"); }}
                                  className="text-xs text-green-700 font-semibold hover:underline cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                              {c.status === "approved" && (
                                <button
                                  onClick={async () => { await updateCommission({ commissionId: c._id, status: "paid" }); toast.success("Marked as paid"); }}
                                  className="text-xs text-blue-700 font-semibold hover:underline cursor-pointer"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {c.status !== "voided" && c.status !== "paid" && (
                                <button
                                  onClick={() => setVoidingId(c._id)}
                                  className="text-xs text-red-500 hover:underline cursor-pointer ml-2"
                                >
                                  Void
                                </button>
                              )}
                            </div>
                          </div>
                          {c.voidReason && (
                            <p className="text-xs text-red-500 bg-red-50 rounded px-2 py-1">Void: {c.voidReason}</p>
                          )}
                        </div>
                      ))
                    )}

                    {/* Void confirmation inline */}
                    {voidingId && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                          <AlertTriangle size={14} /> Void Commission
                        </p>
                        <Textarea
                          value={voidReason}
                          onChange={(e) => setVoidReason(e.target.value)}
                          placeholder="Reason for voiding this commission..."
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleVoid} variant="destructive" size="sm" className="cursor-pointer">Confirm Void</Button>
                          <Button variant="ghost" size="sm" onClick={() => { setVoidingId(null); setVoidReason(""); }} className="cursor-pointer">Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">{icon}{label}</p>
      <p className="text-sm font-medium text-gray-800 break-all">{value}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPartnersPage() {
  const [activeTab, setActiveTab] = useState("applications");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal/drawer state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [commissionPartner, setCommissionPartner] = useState<Partner | null>(null);
  const [suspendPartner, setSuspendPartner] = useState<{ partner: Partner; action: "suspend" | "reactivate" } | null>(null);
  const [detailPartner, setDetailPartner] = useState<Partner | null>(null);
  const [deletePartner, setDeletePartner] = useState<Partner | null>(null);

  const pendingCount = useQuery(api.partners.countPendingApplications, {});
  const showcasePendingCount = useQuery(api.partnerProfiles.countPendingReviews, {});
  const expiringCount = useQuery(api.partnerContracts.countExpiringSoon, {});
  const updateCommission = useMutation(api.partners.updateCommissionStatus);

  // Full unpaginated lookups — used for stats and cross-referencing partner names in commissions
  const allPartners = useQuery(api.partners.listPartners, {}) as Partner[] | undefined;
  const allApplications = useQuery(api.partners.listApplications, {}) as Application[] | undefined;
  const allCommissions = useQuery(api.partners.listAllCommissions, {}) as Commission[] | undefined;

  const {
    rows: applications,
    pageIndex: appsPageIndex,
    hasNextPage: appsHasNext,
    hasPrevPage: appsHasPrev,
    isLoading: appsLoading,
    nextPage: appsNextPage,
    prevPage: appsPrevPage,
    reset: resetAppsPage,
  } = useCursorPagination(
    api.partners.listApplicationsPaginated,
    { status: statusFilter !== "all" ? statusFilter : undefined, search: debouncedSearch || undefined },
    PARTNERS_PAGE_SIZE,
  );

  const {
    rows: partners,
    pageIndex: partnersPageIndex,
    hasNextPage: partnersHasNext,
    hasPrevPage: partnersHasPrev,
    isLoading: partnersLoading,
    nextPage: partnersNextPage,
    prevPage: partnersPrevPage,
    reset: resetPartnersPage,
  } = useCursorPagination(
    api.partners.listPartnersPaginated,
    { status: statusFilter !== "all" ? statusFilter : undefined, search: debouncedSearch || undefined },
    PARTNERS_PAGE_SIZE,
  );

  const {
    rows: commissions,
    pageIndex: commPageIndex,
    hasNextPage: commHasNext,
    hasPrevPage: commHasPrev,
    isLoading: commLoading,
    nextPage: commNextPage,
    prevPage: commPrevPage,
    reset: resetCommPage,
  } = useCursorPagination(
    api.partners.listAllCommissionsPaginated,
    { status: statusFilter !== "all" ? statusFilter : undefined },
    PARTNERS_PAGE_SIZE,
  );

  useEffect(() => {
    resetAppsPage();
    resetPartnersPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    resetCommPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const totalApps = allApplications?.length ?? 0;
  const pendingApps = allApplications?.filter((a) => a.status === "pending").length ?? 0;
  const activePartners = allPartners?.filter((p) => p.status === "approved").length ?? 0;
  const totalCommPaid = allCommissions?.filter((c) => c.status === "paid").reduce((s, c) => s + c.commissionAmount, 0) ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Partner Program
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage partner applications, profiles, commissions, and referrals</p>
        </div>
        <a href="/partner/apply" target="_blank" rel="noopener noreferrer">
          <Button className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white cursor-pointer">
            <Plus size={16} className="mr-1" /> Partner Application Page ↗
          </Button>
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Applications", value: totalApps, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Pending Review", value: pendingApps, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Active Partners", value: activePartners, icon: UserCheck, color: "text-green-600", bg: "bg-green-50" },
          { label: "Commissions Paid", value: `₦${(totalCommPaid / 1000).toFixed(0)}k`, icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.bg)}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="applications" className="relative cursor-pointer">
              Applications
              {(pendingCount ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="partners" className="cursor-pointer">Partners</TabsTrigger>
            <TabsTrigger value="commissions" className="cursor-pointer">Commissions</TabsTrigger>
            <TabsTrigger value="showcase" className="relative cursor-pointer">
              Showcase
              {(showcasePendingCount ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {showcasePendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="contracts" className="relative cursor-pointer">
              Contracts
              {(expiringCount ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {expiringCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8 w-48 h-8 text-sm" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Applications Tab ── */}
        <TabsContent value="applications" className="mt-4">
          {appsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
          ) : applications.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Handshake /></EmptyMedia>
                <EmptyTitle>No applications found</EmptyTitle>
                <EmptyDescription>Applications submitted via the partner page will appear here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <motion.div key={app._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center font-bold shrink-0 text-sm">
                      {partnerTitle(app).charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{partnerTitle(app)}</span>
                        <CompanyBadge show={app.partnerType === "company"} />
                        <StatusBadge status={app.status} />
                        {app.status === "pending" && (
                          <span className="flex items-center gap-1 text-yellow-600 text-xs font-medium"><Clock size={11} /> Awaiting Review</span>
                        )}
                        {app.diasporaCampaignName && (
                          <Badge className="text-xs bg-violet-100 text-violet-700 gap-1"><Megaphone size={10} /> {app.diasporaCampaignName}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                        <span>{app.email}</span>
                        <span>{app.phone}</span>
                        <span>{format(new Date(app._creationTime), "dd MMM yyyy")}</span>
                        {app.howHeard && <span>via {HOW_HEARD_LABELS[app.howHeard] ?? app.howHeard}</span>}
                        {app.country && <span>{app.country}</span>}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedApp(app)} className="shrink-0 cursor-pointer">
                    <Eye size={14} className="mr-1" /> Review
                  </Button>
                </motion.div>
              ))}
              <TablePager pageIndex={appsPageIndex} hasNextPage={appsHasNext} hasPrevPage={appsHasPrev} onNext={appsNextPage} onPrev={appsPrevPage} />
            </div>
          )}
        </TabsContent>

        {/* ── Partners Tab ── */}
        <TabsContent value="partners" className="mt-4">
          {partnersLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
          ) : partners.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><UserCheck /></EmptyMedia>
                <EmptyTitle>No partners found</EmptyTitle>
                <EmptyDescription>Approved partner applications will appear here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {partners.map((p) => (
                <motion.div key={p._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer p-4",
                    p.status === "suspended" ? "border-red-100 bg-red-50/30" : "border-gray-100"
                  )}
                  onClick={() => setDetailPartner(p)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 text-sm", p.status === "approved" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500")}>
                        {partnerTitle(p).charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">{partnerTitle(p)}</span>
                          <StatusBadge status={p.status} />
                          <CompanyBadge show={p.partnerType === "company"} />
                          {p.isStaff && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Staff</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                          <span>{p.email}</span>
                          <span>{p.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-center">
                      <div>
                        <p className="text-base font-bold text-gray-800">{p.totalReferrals}</p>
                        <p className="text-xs text-gray-400">Referrals</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-green-700">₦{(p.totalCommissionEarned / 1000).toFixed(0)}k</p>
                        <p className="text-xs text-gray-400">Earned</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-[var(--brand)]">{p.commissionRate}%</p>
                        <p className="text-xs text-gray-400">Rate</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { void navigator.clipboard.writeText(p.referralCode); toast.success("Code copied!"); }}
                        className="flex items-center gap-1.5 text-xs font-mono bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Copy size={12} /> {p.referralCode}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="cursor-pointer px-2">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailPartner(p)} className="cursor-pointer">
                            <Eye size={14} className="mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingPartner(p)} className="cursor-pointer">
                            <Pencil size={14} className="mr-2" /> Edit Partner
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setCommissionPartner(p)} className="cursor-pointer">
                            <Plus size={14} className="mr-2" /> Add Commission
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {p.status === "approved" ? (
                            <DropdownMenuItem onClick={() => setSuspendPartner({ partner: p, action: "suspend" })} className="text-red-600 cursor-pointer">
                              <Ban size={14} className="mr-2" /> Suspend Partner
                            </DropdownMenuItem>
                          ) : p.status === "suspended" ? (
                            <DropdownMenuItem onClick={() => setSuspendPartner({ partner: p, action: "reactivate" })} className="text-green-600 cursor-pointer">
                              <RefreshCw size={14} className="mr-2" /> Reactivate Partner
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeletePartner(p)} className="text-red-700 cursor-pointer font-semibold">
                            <Trash2 size={14} className="mr-2" /> Delete Partner
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {p.status === "suspended" && p.suspendReason && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
                      <Ban size={11} /> Suspended: {p.suspendReason}
                    </div>
                  )}
                </motion.div>
              ))}
              <TablePager pageIndex={partnersPageIndex} hasNextPage={partnersHasNext} hasPrevPage={partnersHasPrev} onNext={partnersNextPage} onPrev={partnersPrevPage} />
            </div>
          )}
        </TabsContent>

        {/* ── Commissions Tab ── */}
        <TabsContent value="commissions" className="mt-4">
          {commLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : commissions.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><DollarSign /></EmptyMedia>
                <EmptyTitle>No commissions found</EmptyTitle>
                <EmptyDescription>Add commissions from the Partners tab or from a partner&apos;s detail panel.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Partner</th>
                      <th className="text-left px-4 py-3">Description</th>
                      <th className="text-right px-4 py-3">Sale Amount</th>
                      <th className="text-right px-4 py-3">Commission</th>
                      <th className="text-center px-4 py-3">Status</th>
                      <th className="text-center px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {commissions.map((c) => {
                      const partnerName = c.partnerName ?? "—";
                      return (
                        <tr key={c._id} className={cn("hover:bg-gray-50 transition-colors", c.status === "voided" && "opacity-50")}>
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                            <button
                              onClick={() => { const p = allPartners?.find((x) => x._id === c.partnerId); if (p) setDetailPartner(p); }}
                              className="hover:text-[var(--brand)] hover:underline cursor-pointer text-left"
                            >
                              {partnerName}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.description}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">₦{c.saleAmount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-700 whitespace-nowrap">₦{c.commissionAmount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center"><StatusBadge status={c.status} /></td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {c.status === "pending" && (
                                <button onClick={async () => { await updateCommission({ commissionId: c._id, status: "approved" }); toast.success("Approved"); }} className="text-xs text-green-700 font-semibold hover:underline cursor-pointer">Approve</button>
                              )}
                              {c.status === "approved" && (
                                <button onClick={async () => { await updateCommission({ commissionId: c._id, status: "paid" }); toast.success("Marked paid"); }} className="text-xs text-blue-700 font-semibold hover:underline cursor-pointer">Mark Paid</button>
                              )}
                              {c.status === "paid" && <span className="text-xs text-gray-400">Paid ✓</span>}
                              {c.status === "voided" && c.voidReason && (
                                <span className="text-xs text-red-400" title={c.voidReason}>Voided</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <TablePager pageIndex={commPageIndex} hasNextPage={commHasNext} hasPrevPage={commHasPrev} onNext={commNextPage} onPrev={commPrevPage} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="showcase" className="mt-4">
          <Tabs defaultValue="reviews">
            <TabsList className="bg-gray-100">
              <TabsTrigger value="reviews" className="cursor-pointer">Awaiting review</TabsTrigger>
              <TabsTrigger value="listings" className="cursor-pointer">Listings &amp; placement</TabsTrigger>
            </TabsList>
            <TabsContent value="reviews" className="mt-4"><ShowcaseReviewsPanel /></TabsContent>
            <TabsContent value="listings" className="mt-4"><ShowcaseListingsPanel /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <ContractsPanel
            onOpenPartner={(id) => {
              const p = allPartners?.find((x) => x._id === id);
              if (p) setDetailPartner(p);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <DeletePartnerModal partner={deletePartner} onClose={() => setDeletePartner(null)} />
      <ApplicationModal app={selectedApp} onClose={() => setSelectedApp(null)} />
      <EditPartnerModal partner={editingPartner} onClose={() => setEditingPartner(null)} />
      <AddCommissionModal partner={commissionPartner} onClose={() => setCommissionPartner(null)} />
      <SuspendModal
        partner={suspendPartner?.partner ?? null}
        action={suspendPartner?.action ?? "suspend"}
        onClose={() => setSuspendPartner(null)}
      />
      <PartnerDetailDrawer
        partner={detailPartner}
        onClose={() => setDetailPartner(null)}
        onEdit={(p) => { setDetailPartner(null); setEditingPartner(p); }}
        onAddCommission={(p) => { setCommissionPartner(p); }}
        onSuspend={(p, action) => { setSuspendPartner({ partner: p, action }); }}
      />
    </div>
  );
}
