import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";
import {
  FileText, Plus, Search, X, ExternalLink, Trash2, Edit2, Lock, Unlock,
  Folder, FolderOpen, Users, CheckCircle2, Clock, AlertTriangle, XCircle,
  ChevronRight, MoreHorizontal, Shield, Download, Eye, Send, RefreshCw,
  ArrowLeftRight, User, Tag, Building2, FilePlus, FolderPlus, FileCheck,
  History, UploadCloud, GitBranch, FileSignature, PenLine, Ban, Stamp, ShieldCheck,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";

// ── Status configs ─────────────────────────────────────────────────────────────

const AGR_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft:          { label: "Draft",          color: "text-gray-600",   bg: "bg-gray-100",   icon: FileText    },
  pending_review: { label: "Pending Review", color: "text-orange-600", bg: "bg-orange-50",  icon: Clock       },
  approved:       { label: "Approved",       color: "text-indigo-600", bg: "bg-indigo-50",  icon: CheckCircle2},
  sent:           { label: "Sent",           color: "text-blue-700",   bg: "bg-blue-50",    icon: Send        },
  viewed:         { label: "Viewed",         color: "text-blue-700",   bg: "bg-blue-100",   icon: Eye         },
  signed:         { label: "Signed",         color: "text-green-700",  bg: "bg-green-100",  icon: CheckCircle2},
  completed:      { label: "Completed",      color: "text-green-800",  bg: "bg-green-200",  icon: CheckCircle2},
  expired:        { label: "Expired",        color: "text-red-600",    bg: "bg-red-50",     icon: XCircle     },
  declined:       { label: "Declined",       color: "text-red-700",    bg: "bg-red-100",    icon: XCircle     },
};

const ROOM_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: "Active",   color: "text-green-700",  bg: "bg-green-100" },
  locked:   { label: "Locked",   color: "text-orange-600", bg: "bg-orange-100"},
  archived: { label: "Archived", color: "text-gray-500",   bg: "bg-gray-100"  },
};

const DOC_TYPES = [
  "kyc_doc", "id_doc", "offer_letter", "allocation_letter", "contract",
  "deed", "receipt", "invoice", "agreement", "finance_doc", "payment_proof",
  "legal_notice", "report", "other",
];

const AGR_TYPES = [
  "sale_contract", "deed_of_assignment", "offer_letter", "nda",
  "installment_plan", "mortgage_agreement", "lease", "other",
];

const AGR_STATUSES = Object.keys(AGR_STATUS_CFG);

const REVIEW_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  not_required:   { label: "Not Required",  color: "text-gray-500",   bg: "bg-gray-100",   icon: FileText     },
  pending_review: { label: "Pending Review", color: "text-orange-600", bg: "bg-orange-50",  icon: Clock        },
  approved:       { label: "Approved",      color: "text-green-700",  bg: "bg-green-100",  icon: CheckCircle2 },
  rejected:       { label: "Rejected",      color: "text-red-700",    bg: "bg-red-100",    icon: XCircle      },
};

const SIG_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  not_required: { label: "Signature Not Required", color: "text-gray-500",   bg: "bg-gray-100",   icon: FileText     },
  pending:      { label: "Pending",                color: "text-gray-600",   bg: "bg-gray-100",   icon: Clock        },
  sent:         { label: "Sent",                    color: "text-blue-700",   bg: "bg-blue-50",    icon: Send         },
  viewed:       { label: "Viewed",                  color: "text-blue-700",   bg: "bg-blue-100",   icon: Eye          },
  signed:       { label: "Fully Signed",            color: "text-green-700",  bg: "bg-green-100",  icon: CheckCircle2 },
  completed:    { label: "Completed",               color: "text-green-800",  bg: "bg-green-200",  icon: CheckCircle2 },
  declined:     { label: "Declined",                color: "text-red-700",    bg: "bg-red-100",    icon: XCircle      },
  expired:      { label: "Expired",                 color: "text-red-600",    bg: "bg-red-50",     icon: AlertTriangle},
  cancelled:    { label: "Cancelled",                color: "text-gray-500",   bg: "bg-gray-100",   icon: XCircle      },
};

const SIGNER_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:  { label: "Pending",  color: "text-gray-500",  bg: "bg-gray-100",  icon: Clock        },
  sent:     { label: "Sent",     color: "text-blue-700",  bg: "bg-blue-50",   icon: Send         },
  viewed:   { label: "Viewed",   color: "text-blue-700",  bg: "bg-blue-100",  icon: Eye          },
  signed:   { label: "Signed",   color: "text-green-700", bg: "bg-green-100", icon: CheckCircle2 },
  declined: { label: "Declined", color: "text-red-700",   bg: "bg-red-100",   icon: XCircle      },
  expired:  { label: "Expired",  color: "text-red-600",   bg: "bg-red-50",    icon: AlertTriangle},
};

const STAMP_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  applied:    { label: "Officially Stamped", color: "text-[var(--brand)]", bg: "bg-blue-50",   icon: Stamp     },
  revoked:    { label: "Stamp Revoked",       color: "text-red-700",        bg: "bg-red-100",   icon: XCircle   },
  superseded: { label: "Stamp Superseded",    color: "text-gray-500",       bg: "bg-gray-100",  icon: GitBranch },
  invalid:    { label: "Stamp Invalid",       color: "text-red-700",        bg: "bg-red-100",   icon: Ban       },
};

function StatusPill({ status, cfg }: { status: string; cfg: Record<string, { label: string; color: string; bg: string; icon?: React.ElementType }> }) {
  const c = cfg[status] ?? { label: status, color: "text-gray-500", bg: "bg-gray-100" };
  const Icon = "icon" in c ? c.icon : undefined;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", c.bg, c.color)}>
      {Icon && <Icon size={9} />}{c.label}
    </span>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

type Tab = "documents" | "datarooms" | "agreements";

// ── Add Document Dialog ────────────────────────────────────────────────────────

function AddDocumentDialog({ onClose }: { onClose: () => void }) {
  const clients = useQuery(api.clients.listClients, {});
  const createDoc = useMutation(api.docvault.createDocument);
  const [form, setForm] = useState({
    title: "", description: "", docType: "other",
    fileUrl: "", fileName: "",
    clientId: "" as string,
    isConfidential: false,
    tags: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.fileUrl || !form.fileName) {
      toast.error("Title, File URL, and File Name are required"); return;
    }
    setLoading(true);
    try {
      await createDoc({
        title: form.title,
        description: form.description || undefined,
        docType: form.docType,
        fileUrl: form.fileUrl,
        fileName: form.fileName,
        clientId: form.clientId ? form.clientId as Id<"clients"> : undefined,
        isConfidential: form.isConfidential,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      });
      toast.success("Document uploaded to vault");
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FilePlus size={16} /> Add to Vault</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input className="mt-1" placeholder="e.g. Plot 12 Offer Letter" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Document Type</Label>
              <Select value={form.docType} onValueChange={(v) => set("docType", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Linked Client</Label>
              <Select value={form.clientId} onValueChange={(v) => set("clientId", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>File URL (CDN) <span className="text-red-500">*</span></Label>
            <Input className="mt-1" placeholder="https://hercules-cdn.com/file_..." value={form.fileUrl} onChange={(e) => set("fileUrl", e.target.value)} />
          </div>
          <div>
            <Label>File Name <span className="text-red-500">*</span></Label>
            <Input className="mt-1" placeholder="offer-letter-plot12.pdf" value={form.fileName} onChange={(e) => set("fileName", e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input className="mt-1" placeholder="plot, legal, 2024" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="confidential" checked={form.isConfidential} onChange={(e) => set("isConfidential", e.target.checked)} className="cursor-pointer" />
            <Label htmlFor="confidential" className="text-sm cursor-pointer flex items-center gap-1.5">
              <Lock size={12} /> Mark as confidential
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Saving…" : "Add to Vault"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── New Version Dialog — Enhanced Document Management ───────────────────────
// Uploads a new version of an existing document. Never overwrites the
// existing file/row — creates a new vaultDocuments row chained via
// parentDocId and marks the previous one superseded (see
// convex/enhancedDocuments.ts createDocumentVersion).

function NewVersionDialog({ doc, onClose }: { doc: { _id: Id<"vaultDocuments">; title: string; docRef: string; version: number }; onClose: () => void }) {
  const createVersion = useMutation(api.enhancedDocuments.createDocumentVersion);
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fileUrl || !fileName) { toast.error("File URL and File Name are required"); return; }
    setLoading(true);
    try {
      await createVersion({ vaultDocumentId: doc._id, fileUrl, fileName, changeNote: changeNote || undefined });
      toast.success(`Version ${doc.version + 1} uploaded — the previous version is preserved`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to upload new version");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UploadCloud size={16} /> Upload New Version</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-gray-500">
            Uploading a new version of <strong>{doc.title}</strong> ({doc.docRef}). The current version (v{doc.version}) will be preserved and marked as superseded — never deleted.
          </p>
          <div>
            <Label>File URL (CDN) <span className="text-red-500">*</span></Label>
            <Input className="mt-1" placeholder="https://hercules-cdn.com/file_..." value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
          </div>
          <div>
            <Label>File Name <span className="text-red-500">*</span></Label>
            <Input className="mt-1" placeholder="offer-letter-plot12-v2.pdf" value={fileName} onChange={(e) => setFileName(e.target.value)} />
          </div>
          <div>
            <Label>Change note (optional)</Label>
            <Textarea className="mt-1" rows={2} placeholder="What changed in this version?" value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Uploading…" : `Upload as v${doc.version + 1}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Version History Panel — Enhanced Document Management ────────────────────

function VersionHistoryPanel({ docRef }: { docRef: string }) {
  const versions = useQuery(api.enhancedDocuments.getVersionHistory, { docRef });

  if (versions === undefined) return <Skeleton className="h-16 w-full" />;
  if (versions.length <= 1) return <p className="text-xs text-gray-400 italic">Only one version on record.</p>;

  return (
    <div className="space-y-1.5">
      {versions.slice().reverse().map((v) => (
        <div key={v._id} className={cn("flex items-center justify-between rounded-xl px-3 py-2", v.isLatestVersion === false ? "bg-gray-50 opacity-70" : "bg-blue-50")}>
          <div className="flex items-center gap-2">
            <GitBranch size={11} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-700">
                v{v.version} {v.isLatestVersion === false ? <span className="text-gray-400 font-normal">(superseded)</span> : <span className="text-blue-600 font-normal">(current)</span>}
              </p>
              <p className="text-[10px] text-gray-400">{v.fileName} · {v.uploaderName ?? "Unknown"} · {format(parseISO(v.uploadedAt), "dd MMM yyyy")}</p>
            </div>
          </div>
          <a href={v.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"><ExternalLink size={11} /></a>
        </div>
      ))}
    </div>
  );
}

// ── Request Signature Dialog — E-Signature ──────────────────────────────────

type SignerForm = { signerType: "internal" | "external"; name: string; email: string; role: string };

function RequestSignatureDialog({ doc, onClose }: { doc: { _id: Id<"vaultDocuments">; title: string; docRef: string }; onClose: () => void }) {
  const createRequest = useMutation(api.esignature.createSignatureRequest);
  const [signers, setSigners] = useState<SignerForm[]>([{ signerType: "external", name: "", email: "", role: "" }]);
  const [loading, setLoading] = useState(false);

  const updateSigner = (i: number, patch: Partial<SignerForm>) => {
    setSigners((s) => s.map((sg, idx) => (idx === i ? { ...sg, ...patch } : sg)));
  };
  const addSigner = () => setSigners((s) => [...s, { signerType: "external", name: "", email: "", role: "" }]);
  const removeSigner = (i: number) => setSigners((s) => s.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (signers.some((s) => !s.name.trim() || !s.email.trim())) {
      toast.error("Every signer needs a name and email");
      return;
    }
    setLoading(true);
    try {
      await createRequest({
        vaultDocumentId: doc._id,
        signers: signers.map((s) => ({ signerType: s.signerType, name: s.name.trim(), email: s.email.trim(), role: s.role || undefined })),
      });
      toast.success("Signature request created — send it when ready");
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to create signature request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSignature size={16} /> Request Signature</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-gray-500">
            Requesting signature on <strong>{doc.title}</strong> ({doc.docRef}). Signers sign in the order listed below.
          </p>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {signers.map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Signer {i + 1}</span>
                  {signers.length > 1 && (
                    <button onClick={() => removeSigner(i)} className="text-gray-400 hover:text-red-500 cursor-pointer"><X size={12} /></button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Full name" value={s.name} onChange={(e) => updateSigner(i, { name: e.target.value })} />
                  <Input placeholder="Email" value={s.email} onChange={(e) => updateSigner(i, { email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Role (e.g. Client, Witness)" value={s.role} onChange={(e) => updateSigner(i, { role: e.target.value })} />
                  <Select value={s.signerType} onValueChange={(v) => updateSigner(i, { signerType: v as SignerForm["signerType"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="external">External Signer</SelectItem>
                      <SelectItem value="internal">Internal Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addSigner} className="text-xs font-medium text-[var(--brand)] hover:underline cursor-pointer flex items-center gap-1">
            <Plus size={12} /> Add another signer
          </button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Creating…" : "Create Request"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Signature Request Panel — E-Signature ───────────────────────────────────

function SignatureRequestPanel({ docRef, canSign }: { docRef: string; canSign: boolean }) {
  const requests = useQuery(api.esignature.listSignatureRequestsForDocument, { docRef });
  const sendRequest = useMutation(api.esignature.sendSignatureRequest);
  const recordSignature = useMutation(api.esignature.recordSignature);
  const declineRequest = useMutation(api.esignature.declineSignatureRequest);
  const cancelRequest = useMutation(api.esignature.cancelSignatureRequest);

  if (requests === undefined) return <Skeleton className="h-16 w-full" />;
  if (requests.length === 0) return <p className="text-xs text-gray-400 italic">No signature requests yet.</p>;

  const handleSend = async (id: Id<"signatureRequests">) => {
    try { await sendRequest({ id }); toast.success("Signature request sent"); }
    catch (e) { toast.error((e as Error).message ?? "Failed to send"); }
  };
  const handleSign = async (id: Id<"signatureRequests">, signerId: Id<"signatureSigners">) => {
    try { await recordSignature({ id, signerId }); toast.success("Signature recorded"); }
    catch (e) { toast.error((e as Error).message ?? "Failed to record signature"); }
  };
  const handleDecline = async (id: Id<"signatureRequests">, signerId: Id<"signatureSigners">) => {
    const reason = prompt("Reason for declining (optional):") ?? undefined;
    try { await declineRequest({ id, signerId, reason }); toast.success("Marked as declined"); }
    catch (e) { toast.error((e as Error).message ?? "Failed to decline"); }
  };
  const handleCancel = async (id: Id<"signatureRequests">) => {
    if (!confirm("Cancel this signature request?")) return;
    try { await cancelRequest({ id }); toast.success("Signature request cancelled"); }
    catch (e) { toast.error((e as Error).message ?? "Failed to cancel"); }
  };

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r._id} className="bg-gray-50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-[var(--brand)]">{r.requestRef}</p>
              <p className="text-[10px] text-gray-400">Requested {format(parseISO(r.requestedAt), "dd MMM yyyy")}</p>
            </div>
            <StatusPill status={r.status} cfg={SIG_STATUS_CFG} />
          </div>
          <div className="space-y-1">
            {r.signers.map((s) => (
              <div key={s._id} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-bold text-gray-400 shrink-0">#{s.signingOrder}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">{s.name}{s.role ? ` · ${s.role}` : ""}</p>
                    <p className="text-[10px] text-gray-400 truncate">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusPill status={s.status} cfg={SIGNER_STATUS_CFG} />
                  {canSign && (s.status === "sent" || s.status === "viewed") && (
                    <>
                      <button onClick={() => handleSign(r._id, s._id)} title="Record signature"
                        className="p-1 rounded-md text-green-600 hover:bg-green-50 cursor-pointer"><PenLine size={12} /></button>
                      <button onClick={() => handleDecline(r._id, s._id)} title="Decline"
                        className="p-1 rounded-md text-red-500 hover:bg-red-50 cursor-pointer"><Ban size={12} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {r.status === "pending" && (
              <button onClick={() => handleSend(r._id)}
                className="flex-1 flex items-center gap-1.5 justify-center bg-blue-50 text-blue-700 text-xs font-medium rounded-lg py-1.5 hover:bg-blue-100 transition-colors cursor-pointer">
                <Send size={11} /> Send to Signers
              </button>
            )}
            {!["completed", "cancelled", "declined", "expired"].includes(r.status) && (
              <button onClick={() => handleCancel(r._id)}
                className="flex-1 flex items-center gap-1.5 justify-center bg-gray-100 text-gray-600 text-xs font-medium rounded-lg py-1.5 hover:bg-gray-200 transition-colors cursor-pointer">
                <Ban size={11} /> Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── E-Stamp Panel — Official Corporate E-Stamp ──────────────────────────────

function EStampPanel({ doc, canApply, canRevoke }: { doc: { _id: Id<"vaultDocuments">; docRef: string; isLatestVersion?: boolean }; canApply: boolean; canRevoke: boolean }) {
  const stamps = useQuery(api.estamp.listStampsForDocument, { docRef: doc.docRef });
  const applyStamp = useMutation(api.estamp.applyStamp);
  const revokeStamp = useMutation(api.estamp.revokeStamp);
  const [applying, setApplying] = useState(false);

  if (stamps === undefined) return <Skeleton className="h-16 w-full" />;

  const activeStamp = stamps.find((s) => s.status === "applied");
  const canApplyNow = canApply && doc.isLatestVersion !== false && !activeStamp;

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyStamp({ vaultDocumentId: doc._id });
      toast.success("Official Geodata e-stamp applied");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to apply e-stamp");
    } finally {
      setApplying(false);
    }
  };

  const handleRevoke = async (id: Id<"eStamps">) => {
    const reason = prompt("Reason for revoking this e-stamp (required):");
    if (!reason || !reason.trim()) return;
    try {
      await revokeStamp({ id, reason: reason.trim() });
      toast.success("E-stamp revoked");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to revoke e-stamp");
    }
  };

  return (
    <div className="space-y-2">
      {stamps.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No official e-stamp has been applied.</p>
      ) : (
        stamps.map((s) => (
          <div key={s._id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-mono text-[var(--brand)]">{s.stampRef}</p>
              <p className="text-[10px] text-gray-400">
                Applied by {s.appliedByName} · {format(parseISO(s.appliedAt), "dd MMM yyyy, HH:mm")}
              </p>
              {s.status === "revoked" && s.revokedAt && (
                <p className="text-[10px] text-red-500 mt-0.5">
                  Revoked by {s.revokedByName ?? "Unknown"} · {format(parseISO(s.revokedAt), "dd MMM yyyy")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusPill status={s.status} cfg={STAMP_STATUS_CFG} />
              {canRevoke && s.status === "applied" && (
                <button onClick={() => handleRevoke(s._id)} title="Revoke e-stamp"
                  className="p-1 rounded-md text-red-500 hover:bg-red-50 cursor-pointer"><Ban size={12} /></button>
              )}
            </div>
          </div>
        ))
      )}
      {canApplyNow && (
        <button onClick={handleApply} disabled={applying}
          className="w-full flex items-center gap-1.5 justify-center bg-[var(--brand)] text-white text-xs font-medium rounded-xl py-2 hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-50">
          <Stamp size={12} /> {applying ? "Applying…" : "Apply Official Geodata E-Stamp"}
        </button>
      )}
    </div>
  );
}

// ── Documents Tab ──────────────────────────────────────────────────────────────

function DocumentsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Id<"vaultDocuments"> | null>(null);
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [showRequestSignature, setShowRequestSignature] = useState(false);

  const {
    rows: docs,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading: docsLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.docvault.listDocumentsPaginated,
    { docType: typeFilter !== "all" ? typeFilter : undefined, search: debouncedSearch || undefined },
    20,
  );
  const stats = useQuery(api.docvault.getDocumentStats, {});
  const deleteDoc = useMutation(api.docvault.deleteDocument);
  const enhancedAccess = useQuery(api.enhancedDocuments.getEnhancedDocumentsAccess, {});
  const submitForReview = useMutation(api.enhancedDocuments.submitDocumentForReview);
  const esigAccess = useQuery(api.esignature.getMyESignatureAccess, {});
  const estampAccess = useQuery(api.estamp.getMyEStampAccess, {});

  const selectedDoc = useQuery(api.docvault.getDocumentById, selected ? { id: selected } : "skip");
  const enhancedEnabled = enhancedAccess?.featureEnabled ?? false;
  const esigEnabled = esigAccess?.featureEnabled ?? false;
  const canSign = esigAccess?.canSign ?? false;
  const estampEnabled = estampAccess?.featureEnabled ?? false;
  const canApplyStamp = estampAccess?.canApply ?? false;
  const canRevokeStamp = estampAccess?.canRevoke ?? false;
  const canViewStamp = estampAccess?.canView ?? false;

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, typeFilter]);

  const handleDelete = async (id: Id<"vaultDocuments">, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await deleteDoc({ id });
      toast.success("Document deleted");
      if (selected === id) setSelected(null);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    }
  };

  const handleSubmitForReview = async (id: Id<"vaultDocuments">) => {
    try {
      await submitForReview({ vaultDocumentId: id });
      toast.success("Submitted for review — track it under Tasks & Approvals");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to submit for review");
    }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Documents", value: stats.total, icon: FileText, color: "#3b82f6" },
            { label: "Confidential", value: stats.confidential, icon: Lock, color: "#ef4444" },
            { label: "Types Indexed", value: Object.keys(stats.byType).length, icon: Tag, color: "#8b5cf6" },
            { label: "Public", value: stats.total - stats.confidential, icon: Unlock, color: "#10b981" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">{label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + "15" }}>
                  <Icon size={14} style={{ color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-8" placeholder="Search by title or ref…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Document
        </Button>
      </div>

      {/* Table + Detail Panel */}
      <div className="flex gap-4">
        {/* List */}
        <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1 min-w-0", selected && "hidden md:block md:w-[55%] md:flex-none")}>
          {docsLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : docs.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No documents found</p>
              <p className="text-xs text-gray-400 mt-1">Upload documents to the vault to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ref / Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Uploaded</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {docs.map((doc) => (
                    <tr key={doc._id}
                      onClick={() => setSelected(selected === doc._id ? null : doc._id)}
                      className={cn("hover:bg-blue-50/30 cursor-pointer transition-colors", selected === doc._id && "bg-blue-50")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {doc.isConfidential && <Lock size={11} className="text-red-400 shrink-0" />}
                          <div>
                            <p className="font-semibold text-gray-900 text-xs leading-tight truncate max-w-[160px]">{doc.title}</p>
                            <p className="text-[10px] font-mono text-[var(--brand)] mt-0.5">{doc.docRef}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-gray-500 capitalize">{doc.docType.replace("_", " ")}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-600">{doc.clientName ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-[11px] text-gray-400">
                          {doc.uploadedAt ? format(parseISO(doc.uploadedAt), "dd MMM yy") : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer">
                            <ExternalLink size={13} />
                          </a>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(doc._id, doc.title); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-full md:w-[44%] bg-white rounded-2xl border border-gray-100 shadow-sm flex-none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <h3 className="font-bold text-gray-800 text-sm">Document Detail</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
            </div>
            {selectedDoc === undefined ? (
              <div className="p-4"><Skeleton className="h-40 w-full" /></div>
            ) : selectedDoc && (
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-start gap-2 mb-2">
                    {selectedDoc.isConfidential && (
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                        <Lock size={9} /> Confidential
                      </span>
                    )}
                    {enhancedEnabled && selectedDoc.reviewStatus && (
                      <StatusPill status={selectedDoc.reviewStatus} cfg={REVIEW_STATUS_CFG} />
                    )}
                    {esigEnabled && selectedDoc.signatureStatus && (
                      <StatusPill status={selectedDoc.signatureStatus} cfg={SIG_STATUS_CFG} />
                    )}
                    {estampEnabled && selectedDoc.eStampStatus && (
                      <StatusPill status={selectedDoc.eStampStatus} cfg={STAMP_STATUS_CFG} />
                    )}
                  </div>
                  <p className="font-bold text-gray-900">{selectedDoc.title}</p>
                  <p className="text-xs font-mono text-[var(--brand)] mt-0.5">{selectedDoc.docRef}</p>
                  {selectedDoc.description && <p className="text-xs text-gray-500 mt-2">{selectedDoc.description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Type", value: selectedDoc.docType.replace("_", " ") },
                    { label: "Version", value: `v${selectedDoc.version}` },
                    { label: "Client", value: selectedDoc.clientName ?? "—" },
                    { label: "Transaction", value: selectedDoc.transactionRef ?? "—" },
                    { label: "Uploaded", value: selectedDoc.uploadedAt ? format(parseISO(selectedDoc.uploadedAt), "dd MMM yyyy") : "—" },
                    { label: "Uploader", value: selectedDoc.uploaderName ?? "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5 capitalize">{value}</p>
                    </div>
                  ))}
                </div>

                {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDoc.tags.map((t) => (
                      <span key={t} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-medium">{t}</span>
                    ))}
                  </div>
                )}

                <a href={selectedDoc.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 justify-center bg-[var(--brand)] text-white text-sm font-medium rounded-xl py-2.5 hover:bg-blue-800 transition-colors">
                  <ExternalLink size={14} /> View / Download
                </a>

                {enhancedEnabled && (
                  <>
                    <div className="flex gap-2">
                      <button onClick={() => setShowNewVersion(true)}
                        className="flex-1 flex items-center gap-1.5 justify-center bg-gray-50 text-gray-700 text-xs font-medium rounded-xl py-2 hover:bg-gray-100 transition-colors cursor-pointer">
                        <UploadCloud size={12} /> New Version
                      </button>
                      <button
                        onClick={() => handleSubmitForReview(selectedDoc._id)}
                        disabled={selectedDoc.reviewStatus === "pending_review"}
                        className="flex-1 flex items-center gap-1.5 justify-center bg-orange-50 text-orange-700 text-xs font-medium rounded-xl py-2 hover:bg-orange-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <Send size={12} /> {selectedDoc.reviewStatus === "pending_review" ? "Awaiting Review" : "Submit for Review"}
                      </button>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <History size={11} /> Version History
                      </p>
                      <VersionHistoryPanel docRef={selectedDoc.docRef} />
                    </div>
                  </>
                )}

                {esigEnabled && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <FileSignature size={11} /> E-Signature
                      </p>
                      {selectedDoc.isLatestVersion !== false && (
                        <button onClick={() => setShowRequestSignature(true)}
                          className="text-[10px] font-medium text-[var(--brand)] hover:underline cursor-pointer flex items-center gap-1">
                          <Plus size={10} /> Request Signature
                        </button>
                      )}
                    </div>
                    <SignatureRequestPanel docRef={selectedDoc.docRef} canSign={canSign} />
                  </div>
                )}

                {estampEnabled && canViewStamp && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldCheck size={11} /> Official Geodata E-Stamp
                    </p>
                    <EStampPanel doc={selectedDoc} canApply={canApplyStamp} canRevoke={canRevokeStamp} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd && <AddDocumentDialog onClose={() => setShowAdd(false)} />}
      {showNewVersion && selectedDoc && (
        <NewVersionDialog doc={selectedDoc} onClose={() => setShowNewVersion(false)} />
      )}
      {showRequestSignature && selectedDoc && (
        <RequestSignatureDialog doc={selectedDoc} onClose={() => setShowRequestSignature(false)} />
      )}
    </div>
  );
}

// ── Create Data Room Dialog ────────────────────────────────────────────────────

function CreateRoomDialog({ onClose }: { onClose: () => void }) {
  const clients = useQuery(api.clients.listClients, {});
  const createRoom = useMutation(api.docvault.createDataRoom);
  const [form, setForm] = useState({ name: "", description: "", clientId: "", allowDownload: true, requireNDA: false, expiresAt: "" });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    setLoading(true);
    try {
      await createRoom({
        name: form.name,
        description: form.description || undefined,
        clientId: form.clientId && form.clientId !== "none" ? form.clientId as Id<"clients"> : undefined,
        allowDownload: form.allowDownload,
        requireNDA: form.requireNDA,
        expiresAt: form.expiresAt || undefined,
      });
      toast.success("Data room created");
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
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FolderPlus size={16} /> New Data Room</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Name <span className="text-red-500">*</span></Label>
            <Input className="mt-1" placeholder="e.g. Transaction GWS-TXN-0012 Due Diligence" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>Client</Label>
            <Select value={form.clientId} onValueChange={(v) => set("clientId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {clients?.map((c) => <SelectItem key={c._id} value={c._id}>{c.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <Label>Expires At (optional)</Label>
            <Input className="mt-1" type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.allowDownload} onChange={(e) => set("allowDownload", e.target.checked)} className="cursor-pointer" />
              Allow Downloads
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.requireNDA} onChange={(e) => set("requireNDA", e.target.checked)} className="cursor-pointer" />
              Require NDA
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Creating…" : "Create Room"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Grant Access Dialog ────────────────────────────────────────────────────────

function GrantAccessDialog({ roomId, onClose }: { roomId: Id<"dataRooms">; onClose: () => void }) {
  const clients = useQuery(api.clients.listClients, {});
  const grantAccess = useMutation(api.docvault.grantRoomAccess);
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!clientId || clientId === "none") { toast.error("Select a client"); return; }
    setLoading(true);
    try {
      await grantAccess({ dataRoomId: roomId, clientId: clientId as Id<"clients"> });
      toast.success("Access granted");
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
        <DialogHeader><DialogTitle>Grant Access</DialogTitle></DialogHeader>
        <div className="py-2">
          <Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select…</SelectItem>
              {clients?.map((c) => <SelectItem key={c._id} value={c._id}>{c.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Granting…" : "Grant Access"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Doc to Room Dialog ─────────────────────────────────────────────────────

function AddDocToRoomDialog({ roomId, onClose }: { roomId: Id<"dataRooms">; onClose: () => void }) {
  const docs = useQuery(api.docvault.listDocuments, {});
  const addDoc = useMutation(api.docvault.addDocToRoom);
  const [docId, setDocId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!docId) { toast.error("Select a document"); return; }
    setLoading(true);
    try {
      await addDoc({ dataRoomId: roomId, vaultDocumentId: docId as Id<"vaultDocuments"> });
      toast.success("Document added to room");
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
        <DialogHeader><DialogTitle>Add Document to Room</DialogTitle></DialogHeader>
        <div className="py-2">
          <Label>Document</Label>
          <Select value={docId} onValueChange={setDocId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select document" /></SelectTrigger>
            <SelectContent>
              {docs?.map((d) => <SelectItem key={d._id} value={d._id}>{d.title} ({d.docRef})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Adding…" : "Add Document"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Data Rooms Tab ─────────────────────────────────────────────────────────────

function DataRoomsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Id<"dataRooms"> | null>(null);
  const [showGrant, setShowGrant] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);

  const {
    rows: rooms,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading: roomsLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(api.docvault.listDataRoomsPaginated, { search: debouncedSearch || undefined }, 20);
  const roomDetail = useQuery(api.docvault.getDataRoom, selectedRoom ? { id: selectedRoom } : "skip");
  const updateRoom = useMutation(api.docvault.updateDataRoom);
  const revokeAccess = useMutation(api.docvault.revokeRoomAccess);
  const removeDoc = useMutation(api.docvault.removeDocFromRoom);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleStatusChange = async (id: Id<"dataRooms">, status: string) => {
    try {
      await updateRoom({ id, status });
      toast.success(`Room ${status}`);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">Controlled document sharing with clients, per transaction or client scope.</p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <FolderPlus size={14} /> New Room
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input className="pl-8" placeholder="Search rooms…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-4">
        {/* Rooms list */}
        <div className={cn("flex-1 min-w-0 space-y-3", selectedRoom && "hidden md:block md:w-[45%] md:flex-none")}>
          {roomsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
          ) : rooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 text-center">
              <FolderOpen size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No data rooms yet</p>
            </div>
          ) : (
            rooms.map((room) => {
              const sc = ROOM_STATUS_CFG[room.status] ?? ROOM_STATUS_CFG.active;
              return (
                <div key={room._id}
                  onClick={() => setSelectedRoom(selectedRoom === room._id ? null : room._id)}
                  className={cn(
                    "bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all",
                    selectedRoom === room._id && "border-blue-300 shadow-md ring-1 ring-blue-200"
                  )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                        <Folder size={18} className="text-[var(--brand)]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-sm">{room.name}</p>
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", sc.bg, sc.color)}>{sc.label}</span>
                        </div>
                        <p className="text-xs font-mono text-[var(--brand)] mt-0.5">{room.roomRef}</p>
                        {room.clientName && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><User size={9} /> {room.clientName}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">{room.docCount} docs</p>
                      <p className="text-xs text-gray-400">{room.accessCount} with access</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {room.allowDownload && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Download size={8} /> Downloads</span>}
                    {room.requireNDA && <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Shield size={8} /> NDA Required</span>}
                    {room.expiresAt && <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">Expires {format(parseISO(room.expiresAt), "dd MMM yy")}</span>}
                  </div>
                </div>
              );
            })
          )}
          {!roomsLoading && rooms.length > 0 && (
            <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} className="border-t-0 bg-white rounded-2xl border border-gray-100 shadow-sm" />
          )}
        </div>

        {/* Room Detail */}
        {selectedRoom && roomDetail !== undefined && (
          <div className="w-full md:w-[54%] flex-none space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <h3 className="font-bold text-gray-800 text-sm">{roomDetail?.name ?? "Room Detail"}</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowAddDoc(true)}
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium cursor-pointer flex items-center gap-1">
                    <Plus size={11} /> Add Doc
                  </button>
                  <button onClick={() => setShowGrant(true)}
                    className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 font-medium cursor-pointer flex items-center gap-1">
                    <Users size={11} /> Grant Access
                  </button>
                  <button onClick={() => setSelectedRoom(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
                </div>
              </div>
              {roomDetail === null ? (
                <p className="p-4 text-sm text-gray-400">Room not found</p>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Status controls */}
                  <div className="flex gap-2">
                    {["active", "locked", "archived"].map((s) => (
                      <button key={s} onClick={() => handleStatusChange(selectedRoom, s)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors capitalize",
                          roomDetail.status === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}>{s}</button>
                    ))}
                  </div>

                  {/* Documents */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Documents ({roomDetail.docs.length})</p>
                    {roomDetail.docs.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No documents added yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {roomDetail.docs.map((doc) => doc && (
                          <div key={doc._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2">
                              <FileText size={12} className="text-gray-400 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-gray-700">{doc.title}</p>
                                <p className="text-[10px] font-mono text-gray-400">{doc.docRef}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"><ExternalLink size={11} /></a>
                              <button onClick={() => removeDoc({ dataRoomId: selectedRoom, vaultDocumentId: doc._id })}
                                className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"><X size={11} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Access */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Access ({roomDetail.access.filter((a) => !a.revokedAt).length})</p>
                    {roomDetail.access.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No access granted yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {roomDetail.access.map((a) => (
                          <div key={a._id} className={cn(
                            "flex items-center justify-between rounded-xl px-3 py-2",
                            a.revokedAt ? "bg-red-50 opacity-60" : "bg-gray-50"
                          )}>
                            <div>
                              <p className="text-xs font-semibold text-gray-700">{a.clientName ?? "Unknown"}</p>
                              <p className="text-[10px] text-gray-400">
                                {a.revokedAt ? "Revoked" : `Views: ${a.viewCount} · Downloads: ${a.downloadCount}`}
                                {a.ndaSigned && " · NDA Signed"}
                              </p>
                            </div>
                            {!a.revokedAt && (
                              <button onClick={() => revokeAccess({ accessId: a._id })}
                                className="text-xs text-red-500 hover:text-red-700 cursor-pointer">Revoke</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateRoomDialog onClose={() => setShowCreate(false)} />}
      {showGrant && selectedRoom && <GrantAccessDialog roomId={selectedRoom} onClose={() => setShowGrant(false)} />}
      {showAddDoc && selectedRoom && <AddDocToRoomDialog roomId={selectedRoom} onClose={() => setShowAddDoc(false)} />}
    </div>
  );
}

// ── Create Agreement Dialog ────────────────────────────────────────────────────

function CreateAgreementDialog({ onClose }: { onClose: () => void }) {
  const clients = useQuery(api.clients.listClients, {});
  const transactions = useQuery(api.transactions.list, {});
  const createAgreement = useMutation(api.docvault.createAgreement);
  const [form, setForm] = useState({
    title: "", agreementType: "sale_contract",
    clientId: "", transactionId: "",
    pdfUrl: "", expiresAt: "", notes: "",
    sigName: "", sigEmail: "", sigRole: "client",
    sig2Name: "", sig2Email: "", sig2Role: "vendor",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.clientId || form.clientId === "none") {
      toast.error("Title and Client are required"); return;
    }
    setLoading(true);
    try {
      const signatories = [
        { name: form.sigName || "Client", email: form.sigEmail || "", role: form.sigRole },
        ...(form.sig2Name ? [{ name: form.sig2Name, email: form.sig2Email, role: form.sig2Role }] : []),
      ];
      await createAgreement({
        title: form.title,
        agreementType: form.agreementType,
        clientId: form.clientId as Id<"clients">,
        transactionId: form.transactionId && form.transactionId !== "none" ? form.transactionId as Id<"transactions"> : undefined,
        pdfUrl: form.pdfUrl || undefined,
        expiresAt: form.expiresAt || undefined,
        notes: form.notes || undefined,
        signatories,
      });
      toast.success("Agreement created");
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileCheck size={16} /> New Agreement</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input className="mt-1" placeholder="e.g. Sale Contract — Plot 12 Sunrise Estate" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.agreementType} onValueChange={(v) => set("agreementType", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGR_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Client <span className="text-red-500">*</span></Label>
              <Select value={form.clientId} onValueChange={(v) => set("clientId", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select…</SelectItem>
                  {clients?.map((c) => <SelectItem key={c._id} value={c._id}>{c.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Linked Transaction</Label>
            <Select value={form.transactionId} onValueChange={(v) => set("transactionId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {transactions?.map((t) => <SelectItem key={t._id} value={t._id}>{t.transactionRef}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>PDF URL (optional — can add later)</Label>
            <Input className="mt-1" placeholder="https://hercules-cdn.com/file_..." value={form.pdfUrl} onChange={(e) => set("pdfUrl", e.target.value)} />
          </div>
          <div>
            <Label>Expires At</Label>
            <Input className="mt-1" type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Signatories</p>
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Signatory 1</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Name" value={form.sigName} onChange={(e) => set("sigName", e.target.value)} />
              <Input placeholder="Email" value={form.sigEmail} onChange={(e) => set("sigEmail", e.target.value)} />
            </div>
            <Select value={form.sigRole} onValueChange={(v) => set("sigRole", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["client","vendor","witness","legal_officer"].map((r) => <SelectItem key={r} value={r}>{r.replace("_"," ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Signatory 2 (optional)</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Name" value={form.sig2Name} onChange={(e) => set("sig2Name", e.target.value)} />
              <Input placeholder="Email" value={form.sig2Email} onChange={(e) => set("sig2Email", e.target.value)} />
            </div>
            <Select value={form.sig2Role} onValueChange={(v) => set("sig2Role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["client","vendor","witness","legal_officer"].map((r) => <SelectItem key={r} value={r}>{r.replace("_"," ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Creating…" : "Create Agreement"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Agreement Status Dialog ────────────────────────────────────────────────────

function AgreementStatusDialog({ agreementId, current, onClose }: { agreementId: Id<"agreements">; current: string; onClose: () => void }) {
  const updateStatus = useMutation(api.docvault.updateAgreementStatus);
  const [status, setStatus] = useState(current);
  const [note, setNote] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateStatus({
        id: agreementId,
        status,
        note: note || undefined,
        pdfUrl: pdfUrl || undefined,
        declineReason: declineReason || undefined,
      });
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
        <DialogHeader><DialogTitle>Update Agreement Status</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGR_STATUSES.map((s) => <SelectItem key={s} value={s}>{AGR_STATUS_CFG[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(status === "sent" || status === "approved") && (
            <div>
              <Label>PDF URL (optional)</Label>
              <Input className="mt-1" placeholder="https://hercules-cdn.com/file_..." value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} />
            </div>
          )}
          {status === "declined" && (
            <div>
              <Label>Reason for decline</Label>
              <Textarea className="mt-1" rows={2} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Note (optional)</Label>
            <Input className="mt-1" placeholder="Internal note…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Updating…" : "Update Status"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Agreements Tab ─────────────────────────────────────────────────────────────

function AgreementsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Id<"agreements"> | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const {
    rows: agreements,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading: agreementsLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.docvault.listAgreementsPaginated,
    { status: statusFilter !== "all" ? statusFilter : undefined, search: debouncedSearch || undefined },
    20,
  );
  const stats = useQuery(api.docvault.getAgreementStats, {});
  const agreementDetail = useQuery(api.docvault.getAgreement, selected ? { id: selected } : "skip");
  const deleteAgreement = useMutation(api.docvault.deleteAgreement);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter]);

  const handleDelete = async (id: Id<"agreements">, title: string) => {
    if (!confirm(`Delete agreement "${title}"?`)) return;
    try {
      await deleteAgreement({ id });
      toast.success("Agreement deleted");
      if (selected === id) setSelected(null);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",    value: stats.total,   icon: FileText,    color: "#3b82f6" },
            { label: "Signed",   value: stats.signed,  icon: CheckCircle2,color: "#10b981" },
            { label: "Pending",  value: stats.pending, icon: Clock,       color: "#f59e0b" },
            { label: "Draft",    value: stats.draft,   icon: Edit2,       color: "#8b5cf6" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">{label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + "15" }}>
                  <Icon size={14} style={{ color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-8" placeholder="Search by title or ref…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {AGR_STATUSES.map((s) => <SelectItem key={s} value={s}>{AGR_STATUS_CFG[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Agreement
        </Button>
      </div>

      {/* List + detail */}
      <div className="flex gap-4">
        <div className={cn("flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden", selected && "hidden md:block md:w-[50%] md:flex-none")}>
          {agreementsLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : agreements.length === 0 ? (
            <div className="py-14 text-center">
              <FileCheck size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No agreements found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ref / Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {agreements.map((agr) => (
                    <tr key={agr._id}
                      onClick={() => setSelected(selected === agr._id ? null : agr._id)}
                      className={cn("hover:bg-blue-50/30 cursor-pointer transition-colors", selected === agr._id && "bg-blue-50")}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-xs truncate max-w-[160px]">{agr.title}</p>
                        <p className="text-[10px] font-mono text-[var(--brand)] mt-0.5">{agr.agreementRef}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-xs text-gray-600">{agr.clientName ?? "—"}</p>
                        {agr.transactionRef && <p className="text-[10px] font-mono text-gray-400">{agr.transactionRef}</p>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-500 capitalize">{agr.agreementType.replace("_", " ")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={agr.status} cfg={AGR_STATUS_CFG} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {agr.pdfUrl && (
                            <a href={agr.pdfUrl} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer">
                              <ExternalLink size={13} />
                            </a>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(agr._id, agr.title); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
            </div>
          )}
        </div>

        {/* Agreement Detail */}
        {selected && (
          <div className="w-full md:w-[49%] flex-none">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <h3 className="font-bold text-gray-800 text-sm">Agreement Detail</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowStatusDialog(true)}
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium cursor-pointer flex items-center gap-1">
                    <RefreshCw size={11} /> Update Status
                  </button>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
                </div>
              </div>

              {agreementDetail === undefined ? (
                <div className="p-4"><Skeleton className="h-48 w-full" /></div>
              ) : agreementDetail === null ? (
                <p className="p-4 text-sm text-gray-400">Not found</p>
              ) : (
                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <p className="font-bold text-gray-900">{agreementDetail.title}</p>
                    <p className="text-xs font-mono text-[var(--brand)] mt-0.5">{agreementDetail.agreementRef}</p>
                    <div className="mt-2">
                      <StatusPill status={agreementDetail.status} cfg={AGR_STATUS_CFG} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Type", value: agreementDetail.agreementType.replace("_", " ") },
                      { label: "Client", value: agreementDetail.clientName ?? "—" },
                      { label: "Transaction", value: agreementDetail.transactionRef ?? "—" },
                      { label: "Drafted", value: agreementDetail.draftedAt ? format(parseISO(agreementDetail.draftedAt), "dd MMM yyyy") : "—" },
                      { label: "Sent", value: agreementDetail.sentAt ? format(parseISO(agreementDetail.sentAt), "dd MMM yyyy") : "—" },
                      { label: "Signed", value: agreementDetail.signedAt ? format(parseISO(agreementDetail.signedAt), "dd MMM yyyy") : "—" },
                      { label: "Expires", value: agreementDetail.expiresAt ? format(parseISO(agreementDetail.expiresAt), "dd MMM yyyy") : "—" },
                      { label: "Completed", value: agreementDetail.completedAt ? format(parseISO(agreementDetail.completedAt), "dd MMM yyyy") : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-2.5">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                        <p className="text-xs font-semibold text-gray-800 mt-0.5 capitalize">{value}</p>
                      </div>
                    ))}
                  </div>

                  {agreementDetail.declineReason && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">
                      <strong>Declined:</strong> {agreementDetail.declineReason}
                    </div>
                  )}

                  {agreementDetail.notes && (
                    <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                      <strong>Notes:</strong> {agreementDetail.notes}
                    </div>
                  )}

                  {/* Signatories */}
                  {agreementDetail.signatories.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Signatories</p>
                      <div className="space-y-2">
                        {agreementDetail.signatories.map((sig, i) => (
                          <div key={i} className={cn(
                            "flex items-center justify-between rounded-xl px-3 py-2.5",
                            sig.signedAt ? "bg-green-50" : "bg-gray-50"
                          )}>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{sig.name}</p>
                              <p className="text-[10px] text-gray-400 capitalize">{sig.role.replace("_", " ")} · {sig.email}</p>
                            </div>
                            {sig.signedAt ? (
                              <div className="text-right">
                                <p className="text-[10px] text-green-700 font-semibold flex items-center gap-1"><CheckCircle2 size={10} /> Signed</p>
                                <p className="text-[10px] text-gray-400">{format(parseISO(sig.signedAt), "dd MMM yyyy")}</p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-orange-600 font-semibold flex items-center gap-1"><Clock size={10} /> Awaiting</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PDF */}
                  {agreementDetail.pdfUrl && (
                    <a href={agreementDetail.pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 justify-center bg-[var(--brand)] text-white text-sm font-medium rounded-xl py-2.5 hover:bg-blue-800 transition-colors">
                      <ExternalLink size={14} /> View Agreement PDF
                    </a>
                  )}

                  {/* Timeline */}
                  {agreementDetail.events.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Timeline</p>
                      <div className="space-y-2">
                        {agreementDetail.events.map((ev) => (
                          <div key={ev._id} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                            <div>
                              <p className="text-xs text-gray-700">
                                {ev.fromStatus ? `${ev.fromStatus.replace("_", " ")} → ` : ""}{ev.toStatus.replace("_", " ")}
                                {ev.changedByName && <span className="text-gray-400"> by {ev.changedByName}</span>}
                              </p>
                              {ev.note && <p className="text-[10px] text-gray-500 italic">{ev.note}</p>}
                              <p className="text-[10px] text-gray-400 mt-0.5">{format(parseISO(ev.timestamp), "dd MMM yyyy HH:mm")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateAgreementDialog onClose={() => setShowCreate(false)} />}
      {showStatusDialog && selected && agreementDetail && (
        <AgreementStatusDialog
          agreementId={selected}
          current={agreementDetail.status}
          onClose={() => setShowStatusDialog(false)}
        />
      )}
    </div>
  );
}

// ── Page Root ──────────────────────────────────────────────────────────────────

export default function AdminDocuments() {
  const [tab, setTab] = useState<Tab>("documents");

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "documents",  label: "Document Vault",   icon: FileText  },
    { key: "datarooms",  label: "Data Rooms",        icon: Folder    },
    { key: "agreements", label: "Agreements",        icon: FileCheck },
  ];

  return (
    <div className="space-y-5 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Documents, Data Room & Agreements</h1>
          <p className="text-sm text-gray-500 mt-0.5">Centralised document vault, controlled data rooms, and agreement lifecycle management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1.5 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all",
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "documents"  && <DocumentsTab />}
      {tab === "datarooms"  && <DataRoomsTab />}
      {tab === "agreements" && <AgreementsTab />}
    </div>
  );
}
