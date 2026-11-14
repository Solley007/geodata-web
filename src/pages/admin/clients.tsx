import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.js";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Users, CheckCircle, Clock, FileText,
  DollarSign, Phone, Mail, MapPin, Search, ChevronDown, ChevronUp,
  BadgeCheck, AlertCircle, MessageSquare, Calendar, XCircle, ReceiptText,
  CreditCard, StickyNote, Folder, User, Video
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

const TABLE_PAGE_SIZE = 10;


// ─── Types ───────────────────────────────────────────────────────
type ClientDoc = Doc<"clients">;
type InvoiceDoc = Doc<"invoices">;
type PlanDoc = Doc<"paymentPlans">;

// ─── Constants ────────────────────────────────────────────────────
const KYC_COLOR: Record<string, string> = {
  verified: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-600",
};
const INV_STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-orange-100 text-orange-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-600",
};
const PLAN_STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  defaulted: "bg-red-100 text-red-600",
  cancelled: "bg-gray-100 text-gray-500",
};
const TICKET_PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-100 text-red-600",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-500",
};
const TICKET_STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};
const FOLLOWUP_STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-600",
};
const SOURCES = ["walk_in", "referral", "website", "agent", "social", "event"];
const DOC_TYPES = ["id_card", "passport", "utility_bill", "contract", "receipt", "other"];
const FOLLOWUP_TYPES = ["call", "email", "meeting", "site_visit"];

// ─── StatCard ────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + "20" }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Client Detail Dialog ─────────────────────────────────────────
function ClientDetail({ client, users, onClose }: { client: ClientDoc; users: Doc<"users">[] | undefined; onClose: () => void }) {
  const [innerTab, setInnerTab] = useState<"profile" | "docs" | "notes" | "followups">("profile");
  const [docForm, setDocForm] = useState({ name: "", docType: "id_card", url: "", status: "pending" });
  const [noteText, setNoteText] = useState("");
  const [followUpForm, setFollowUpForm] = useState({ dueDate: "", type: "call", description: "" });

  const docs = useQuery(api.clients.listDocuments, { clientId: client._id });
  const notes = useQuery(api.clients.listNotes, { clientId: client._id });
  const followUps = useQuery(api.clients.listFollowUps, { clientId: client._id });

  const addDoc = useMutation(api.clients.addDocument);
  const updateDocStatus = useMutation(api.clients.updateDocumentStatus);
  const deleteDoc = useMutation(api.clients.deleteDocument);
  const addNote = useMutation(api.clients.addNote);
  const deleteNote = useMutation(api.clients.deleteNote);
  const createFollowUp = useMutation(api.clients.createFollowUp);
  const updateFollowUp = useMutation(api.clients.updateFollowUpStatus);
  const deleteFollowUp = useMutation(api.clients.deleteFollowUp);
  const updateClient = useMutation(api.clients.updateClient);

  const agent = users?.find((u) => u._id === client.assignedAgent);
  const initials = client.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.name || !docForm.url) { toast.error("Name and URL required"); return; }
    try { await addDoc({ clientId: client._id, ...docForm }); toast.success("Document added"); setDocForm({ name: "", docType: "id_card", url: "", status: "pending" }); }
    catch { toast.error("Failed"); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try { await addNote({ clientId: client._id, note: noteText, authorName: "Admin" }); toast.success("Note added"); setNoteText(""); }
    catch { toast.error("Failed"); }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpForm.dueDate || !followUpForm.description) { toast.error("Fill required fields"); return; }
    try { await createFollowUp({ clientId: client._id, ...followUpForm }); toast.success("Follow-up added"); setFollowUpForm({ dueDate: "", type: "call", description: "" }); }
    catch { toast.error("Failed"); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-[var(--brand)] p-6 rounded-t-xl">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>{client.fullName}</h2>
              <div className="flex flex-wrap gap-3 mt-1 text-blue-100 text-xs">
                <span className="flex items-center gap-1"><Phone size={11} />{client.phone}</span>
                <span className="flex items-center gap-1"><Mail size={11} />{client.email}</span>
                {client.address && <span className="flex items-center gap-1"><MapPin size={11} />{client.address}</span>}
              </div>
              <div className="flex gap-2 mt-2">
                <Badge className={`text-xs border-0 capitalize ${KYC_COLOR[client.kycStatus]}`}>{client.kycStatus} KYC</Badge>
                <Badge className="text-xs border-0 bg-white/20 text-white capitalize">{client.source.replace("_", " ")}</Badge>
                {agent && <Badge className="text-xs border-0 bg-white/20 text-white">Agent: {agent.name ?? agent.email}</Badge>}
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={client.kycStatus} onValueChange={(v) => updateClient({ id: client._id, kycStatus: v }).catch(() => toast.error("Failed"))}>
                <SelectTrigger className="h-8 text-xs bg-white/10 border-white/20 text-white w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending KYC</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Inner tabs */}
        <div className="flex gap-0.5 border-b border-gray-100 px-4 bg-gray-50">
          {([["profile", "Profile", User], ["docs", "Documents", Folder], ["notes", "Notes", StickyNote], ["followups", "Follow-Ups", Calendar]] as [string, string, React.ElementType][]).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setInnerTab(id as typeof innerTab)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${innerTab === id ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Profile */}
          {innerTab === "profile" && (
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {[
                ["Full Name", client.fullName],
                ["Email", client.email],
                ["Phone", client.phone],
                ["Address", client.address],
                ["State", client.state],
                ["LGA", client.lga],
                ["Occupation", client.occupation],
                ["NIN", client.nin],
                ["BVN", client.bvn],
                ["Source", client.source?.replace("_", " ")],
              ].map(([label, value]) => value ? (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                  <div className="font-medium text-gray-800 capitalize">{value}</div>
                </div>
              ) : null)}
            </div>
          )}

          {/* Documents */}
          {innerTab === "docs" && (
            <div className="space-y-4">
              <form onSubmit={handleAddDoc} className="bg-gray-50 rounded-2xl p-4 grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Add Document</div>
                <div><Label className="text-xs font-semibold mb-1 block">Document Name</Label><Input value={docForm.name} onChange={(e) => setDocForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. National ID" /></div>
                <div><Label className="text-xs font-semibold mb-1 block">Type</Label>
                  <Select value={docForm.docType} onValueChange={(v) => setDocForm((p) => ({ ...p, docType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d} value={d} className="capitalize">{d.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2"><Label className="text-xs font-semibold mb-1 block">Document URL</Label><Input value={docForm.url} onChange={(e) => setDocForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." /></div>
                <Button type="submit" className="bg-[var(--brand)] text-white h-8 text-xs gap-1"><Plus size={12} /> Add</Button>
              </form>
              {!docs ? <Skeleton className="h-20 w-full" /> : docs.length === 0 ? <p className="text-center text-gray-400 text-sm py-6">No documents yet</p> : (
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <div key={doc._id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                      <FileText size={15} className="text-[var(--brand)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">{doc.name}</div>
                        <div className="text-xs text-gray-400 capitalize">{doc.docType.replace("_", " ")}</div>
                      </div>
                      <Badge className={`text-xs border-0 capitalize shrink-0 ${doc.status === "approved" ? "bg-green-100 text-green-700" : doc.status === "rejected" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>{doc.status}</Badge>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--brand)] hover:underline shrink-0">View</a>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => updateDocStatus({ id: doc._id, status: "approved" })} className="text-green-600 hover:text-green-700 cursor-pointer"><BadgeCheck size={14} /></button>
                        <button onClick={() => updateDocStatus({ id: doc._id, status: "rejected" })} className="text-red-500 hover:text-red-600 cursor-pointer"><XCircle size={14} /></button>
                        <button onClick={() => deleteDoc({ id: doc._id })} className="text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {innerTab === "notes" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} placeholder="Add a note..." className="resize-none text-sm flex-1" />
                <Button onClick={handleAddNote} className="bg-[var(--brand)] text-white h-auto self-stretch px-4">Save</Button>
              </div>
              {!notes ? <Skeleton className="h-20 w-full" /> : notes.length === 0 ? <p className="text-center text-gray-400 text-sm py-6">No notes yet</p> : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note._id} className="bg-gray-50 rounded-xl p-3 flex gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{note.note}</p>
                        <div className="text-xs text-gray-400 mt-1">{note.authorName} · {formatDistanceToNow(note._creationTime, { addSuffix: true })}</div>
                      </div>
                      <button onClick={() => deleteNote({ id: note._id })} className="text-gray-300 hover:text-red-400 cursor-pointer shrink-0"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Follow-Ups */}
          {innerTab === "followups" && (
            <div className="space-y-4">
              <form onSubmit={handleAddFollowUp} className="bg-gray-50 rounded-2xl p-4 grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Add Follow-Up</div>
                <div><Label className="text-xs font-semibold mb-1 block">Due Date *</Label><Input type="date" value={followUpForm.dueDate} onChange={(e) => setFollowUpForm((p) => ({ ...p, dueDate: e.target.value }))} /></div>
                <div><Label className="text-xs font-semibold mb-1 block">Type</Label>
                  <Select value={followUpForm.type} onValueChange={(v) => setFollowUpForm((p) => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FOLLOWUP_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2"><Label className="text-xs font-semibold mb-1 block">Description *</Label><Input value={followUpForm.description} onChange={(e) => setFollowUpForm((p) => ({ ...p, description: e.target.value }))} placeholder="What needs to be done?" /></div>
                <Button type="submit" className="bg-[var(--brand)] text-white h-8 text-xs gap-1"><Plus size={12} /> Add</Button>
              </form>
              {!followUps ? <Skeleton className="h-20 w-full" /> : followUps.length === 0 ? <p className="text-center text-gray-400 text-sm py-6">No follow-ups yet</p> : (
                <div className="space-y-2">
                  {followUps.map((fu) => (
                    <div key={fu._id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900">{fu.description}</div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-gray-400 capitalize">{fu.type.replace("_", " ")} · {fu.dueDate}</span>
                        </div>
                      </div>
                      <Badge className={`text-xs border-0 capitalize shrink-0 ${FOLLOWUP_STATUS_COLOR[fu.status]}`}>{fu.status}</Badge>
                      {fu.status === "pending" && (
                        <button onClick={() => updateFollowUp({ id: fu._id, status: "done" })} className="text-green-600 hover:text-green-700 cursor-pointer shrink-0"><CheckCircle size={15} /></button>
                      )}
                      <button onClick={() => deleteFollowUp({ id: fu._id })} className="text-gray-300 hover:text-red-400 cursor-pointer shrink-0"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Installments sub-dialog ─────────────────────────────────────
function InstallmentsDialog({ plan, clients, onClose }: { plan: PlanDoc; clients: ClientDoc[] | undefined; onClose: () => void }) {
  const [refInput, setRefInput] = useState<Record<string, string>>({});
  const installments = useQuery(api.clients.listInstallments, { paymentPlanId: plan._id });
  const markPaid = useMutation(api.clients.markInstallmentPaid);
  const client = clients?.find((c) => c._id === plan.clientId);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Payment Plan – {plan.title}</DialogTitle>
        </DialogHeader>
        <div className="bg-gray-50 rounded-xl p-3 text-sm mb-3">
          <div className="flex justify-between"><span className="text-gray-500">Client</span><span className="font-medium">{client?.fullName}</span></div>
          <div className="flex justify-between mt-1"><span className="text-gray-500">Total</span><span className="font-medium">₦{plan.totalAmount.toLocaleString()}</span></div>
          <div className="flex justify-between mt-1"><span className="text-gray-500">Deposit</span><span className="font-medium">₦{plan.initialDeposit.toLocaleString()}</span></div>
          <div className="flex justify-between mt-1"><span className="text-gray-500">Balance</span><span className="font-semibold text-[var(--brand)]">₦{plan.balance.toLocaleString()}</span></div>
        </div>
        {!installments ? <Skeleton className="h-32 w-full" /> : (
          <div className="space-y-2">
            {installments.map((inst) => (
              <div key={inst._id} className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">₦{inst.amount.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">Due: {inst.dueDate}{inst.paidDate ? ` · Paid: ${inst.paidDate}` : ""}</div>
                  </div>
                  <Badge className={`text-xs border-0 capitalize ${inst.status === "paid" ? "bg-green-100 text-green-700" : inst.status === "overdue" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>{inst.status}</Badge>
                </div>
                {inst.status !== "paid" && (
                  <div className="flex gap-2 mt-2">
                    <Input placeholder="Reference (optional)" className="h-7 text-xs" value={refInput[inst._id] ?? ""} onChange={(e) => setRefInput((p) => ({ ...p, [inst._id]: e.target.value }))} />
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white shrink-0"
                      onClick={() => markPaid({ id: inst._id, reference: refInput[inst._id] || undefined }).then(() => toast.success("Marked paid")).catch(() => toast.error("Failed"))}>
                      Mark Paid
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
type ClientForm = { fullName: string; email: string; phone: string; address: string; state: string; lga: string; occupation: string; nin: string; bvn: string; kycStatus: string; source: string; notes: string };
const emptyClient: ClientForm = { fullName: "", email: "", phone: "", address: "", state: "", lga: "", occupation: "", nin: "", bvn: "", kycStatus: "pending", source: "walk_in", notes: "" };

type InvoiceForm = { clientId: string; invoiceNumber: string; amount: string; dueDate: string; items: { description: string; amount: string }[]; notes: string };
const emptyInvoice: InvoiceForm = { clientId: "", invoiceNumber: `INV-${Date.now().toString().slice(-6)}`, amount: "", dueDate: "", items: [{ description: "", amount: "" }], notes: "" };

type PlanForm = { clientId: string; title: string; totalAmount: string; initialDeposit: string; durationMonths: string; startDate: string };
const emptyPlan: PlanForm = { clientId: "", title: "", totalAmount: "", initialDeposit: "", durationMonths: "12", startDate: new Date().toISOString().split("T")[0] };

export default function AdminClients() {
  const navigate = useNavigate();
  const liveInspectionStatus = useQuery(api.liveInspections.getFeatureStatus, {});
  const liveInspectionEnabled = liveInspectionStatus?.enabled === true;
  const [tab, setTab] = useState<"clients" | "transactions" | "followups" | "tickets">("clients");
  const [txTab, setTxTab] = useState<"invoices" | "plans">("invoices");
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const [ticketFilter, setTicketFilter] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState("all");

  // Client CRUD
  const [showClientForm, setShowClientForm] = useState(false);
  const [editClientId, setEditClientId] = useState<Id<"clients"> | null>(null);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClient);
  const [viewClient, setViewClient] = useState<ClientDoc | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<Id<"clients"> | null>(null);

  // Invoice
  const [showInvForm, setShowInvForm] = useState(false);
  const [invForm, setInvForm] = useState<InvoiceForm>(emptyInvoice);
  const [payDialog, setPayDialog] = useState<{ id: Id<"invoices">; amount: number; paid: number } | null>(null);
  const [payAmount, setPayAmount] = useState("");

  // Payment plan
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlan);
  const [viewPlan, setViewPlan] = useState<PlanDoc | null>(null);

  // Ticket
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({ clientId: "", subject: "", message: "", priority: "medium" });
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [ticketResponse, setTicketResponse] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);

  const [debouncedSearch] = useDebounce(search, 350);

  // Full client list for cross-referencing names/selects across tabs (lightweight lookups)
  const allClients = useQuery(api.clients.listClients, {});

  // Paginated clients for the Clients tab grid
  const {
    rows: clients,
    pageIndex: clientsPageIndex,
    hasNextPage: clientsHasNext,
    hasPrevPage: clientsHasPrev,
    isLoading: clientsLoading,
    nextPage: clientsNextPage,
    prevPage: clientsPrevPage,
    reset: resetClientsPage,
  } = useCursorPagination(
    api.clients.listClientsPaginated,
    { kycStatus: kycFilter !== "all" ? kycFilter : undefined, search: debouncedSearch || undefined },
    TABLE_PAGE_SIZE,
  );

  useEffect(() => {
    resetClientsPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, kycFilter]);

  const stats = useQuery(api.clients.getClientStats);

  const {
    rows: invoices,
    pageIndex: invPageIndex,
    hasNextPage: invHasNext,
    hasPrevPage: invHasPrev,
    isLoading: invLoading,
    nextPage: invNextPage,
    prevPage: invPrevPage,
  } = useCursorPagination(api.clients.listInvoicesPaginated, {}, TABLE_PAGE_SIZE);

  const {
    rows: plans,
    pageIndex: planPageIndex,
    hasNextPage: planHasNext,
    hasPrevPage: planHasPrev,
    isLoading: planLoading,
    nextPage: planNextPage,
    prevPage: planPrevPage,
  } = useCursorPagination(api.clients.listPaymentPlansPaginated, {}, 6);

  const {
    rows: followUps,
    pageIndex: fuPageIndex,
    hasNextPage: fuHasNext,
    hasPrevPage: fuHasPrev,
    isLoading: fuLoading,
    nextPage: fuNextPage,
    prevPage: fuPrevPage,
    reset: resetFuPage,
  } = useCursorPagination(
    api.clients.listFollowUpsPaginated,
    { status: followUpFilter !== "all" ? followUpFilter : undefined },
    TABLE_PAGE_SIZE,
  );

  useEffect(() => {
    resetFuPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUpFilter]);

  const {
    rows: tickets,
    pageIndex: ticketPageIndex,
    hasNextPage: ticketHasNext,
    hasPrevPage: ticketHasPrev,
    isLoading: ticketLoading,
    nextPage: ticketNextPage,
    prevPage: ticketPrevPage,
    reset: resetTicketPage,
  } = useCursorPagination(
    api.clients.listTicketsPaginated,
    { status: ticketFilter !== "all" ? ticketFilter : undefined },
    6,
  );

  useEffect(() => {
    resetTicketPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketFilter]);

  const users = useQuery(api.users.listAll);


  // Mutations
  const createClient = useMutation(api.clients.createClient);
  const updateClient = useMutation(api.clients.updateClient);
  const deleteClient = useMutation(api.clients.deleteClient);
  const createInvoice = useMutation(api.clients.createInvoice);
  const updateInvoice = useMutation(api.clients.updateInvoice);
  const deleteInvoice = useMutation(api.clients.deleteInvoice);
  const createPlan = useMutation(api.clients.createPaymentPlan);
  const updateFollowUp = useMutation(api.clients.updateFollowUpStatus);
  const createTicket = useMutation(api.clients.createTicket);
  const updateTicket = useMutation(api.clients.updateTicket);

  const cf = (k: keyof ClientForm, v: string) => setClientForm((p) => ({ ...p, [k]: v }));

  const openEditClient = (c: ClientDoc) => {
    setClientForm({ fullName: c.fullName, email: c.email, phone: c.phone, address: c.address ?? "", state: c.state ?? "", lga: c.lga ?? "", occupation: c.occupation ?? "", nin: c.nin ?? "", bvn: c.bvn ?? "", kycStatus: c.kycStatus, source: c.source, notes: c.notes ?? "" });
    setEditClientId(c._id);
    setShowClientForm(true);
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.fullName || !clientForm.email || !clientForm.phone) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      const p = { ...clientForm, address: clientForm.address || undefined, state: clientForm.state || undefined, lga: clientForm.lga || undefined, occupation: clientForm.occupation || undefined, nin: clientForm.nin || undefined, bvn: clientForm.bvn || undefined, notes: clientForm.notes || undefined };
      if (editClientId) await updateClient({ id: editClientId, ...p });
      else await createClient(p);
      toast.success(editClientId ? "Client updated!" : "Client added!");
      setShowClientForm(false); setEditClientId(null);
    } catch { toast.error("Failed to save"); }
    finally { setLoading(false); }
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.clientId || !invForm.amount || !invForm.dueDate) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      const items = invForm.items.filter((i) => i.description && i.amount).map((i) => ({ description: i.description, amount: Number(i.amount) }));
      await createInvoice({ clientId: invForm.clientId as Id<"clients">, invoiceNumber: invForm.invoiceNumber, amount: Number(invForm.amount), dueDate: invForm.dueDate, items, notes: invForm.notes || undefined });
      toast.success("Invoice created!"); setShowInvForm(false); setInvForm({ ...emptyInvoice, invoiceNumber: `INV-${Date.now().toString().slice(-6)}` });
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  const handleRecordPayment = async () => {
    if (!payDialog || !payAmount) return;
    const newPaid = payDialog.paid + Number(payAmount);
    const newBalance = payDialog.amount - newPaid;
    const status = newBalance <= 0 ? "paid" : "partial";
    try {
      await updateInvoice({ id: payDialog.id, paid: newPaid, balance: Math.max(0, newBalance), status });
      toast.success("Payment recorded!"); setPayDialog(null); setPayAmount("");
    } catch { toast.error("Failed"); }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.clientId || !planForm.title || !planForm.totalAmount) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      await createPlan({ clientId: planForm.clientId as Id<"clients">, title: planForm.title, totalAmount: Number(planForm.totalAmount), initialDeposit: Number(planForm.initialDeposit), durationMonths: Number(planForm.durationMonths), startDate: planForm.startDate });
      toast.success("Payment plan created with installments!"); setShowPlanForm(false); setPlanForm(emptyPlan);
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Clients & CRM</h1>
          <p className="text-sm text-gray-500">Client profiles, KYC, transactions & support</p>
        </div>
        <Button onClick={() => { setClientForm(emptyClient); setEditClientId(null); setShowClientForm(true); }} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 h-9 text-sm">
          <Plus size={14} /> Add Client
        </Button>
      </div>

      {/* Stats */}
      {!stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Clients" value={stats.totalClients} icon={Users} color="var(--brand)" sub={`${stats.verifiedKyc} KYC verified`} />
          <StatCard label="Total Invoiced" value={`₦${(stats.totalInvoiced / 1_000_000).toFixed(1)}M`} icon={ReceiptText} color="#22c55e" sub={`₦${(stats.totalPaid / 1_000_000).toFixed(1)}M paid`} />
          <StatCard label="Open Tickets" value={stats.openTickets} icon={MessageSquare} color="#ef4444" sub={`${stats.pendingFollowUps} follow-ups due`} />
          <StatCard label="Pending KYC" value={stats.pendingKyc} icon={AlertCircle} color="#f59e0b" sub="awaiting verification" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {[["clients", "Clients"], ["transactions", "Transactions"], ["followups", "Follow-Ups"], ["tickets", "Support Tickets"]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v as typeof tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === v ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
        ))}
      </div>

      {/* ── CLIENTS TAB ── */}
      {tab === "clients" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." className="pl-8 h-9 text-sm" />
            </div>
            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {clientsLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : clients.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">No clients found. Add your first client to get started.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Contact</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">KYC</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Source</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Agent</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Joined</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clients.map((c, i) => {
                      const agent = users?.find((u) => u._id === c.assignedAgent);
                      const initials = c.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <motion.tr key={c._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                          className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewClient(c)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full bg-[var(--brand)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">{c.fullName}</div>
                                <div className="text-xs text-gray-400 truncate sm:hidden">{c.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-xs text-gray-500"><Mail size={10} className="text-gray-300 shrink-0" />{c.email}</div>
                              <div className="flex items-center gap-1 text-xs text-gray-400"><Phone size={10} className="text-gray-300 shrink-0" />{c.phone}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-xs border-0 capitalize ${KYC_COLOR[c.kycStatus]}`}>{c.kycStatus}</Badge>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <Badge className="text-xs border-0 bg-gray-100 text-gray-500 capitalize">{c.source.replace("_", " ")}</Badge>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{agent ? (agent.name ?? agent.email) : "—"}</td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{formatDistanceToNow(c._creationTime, { addSuffix: true })}</td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => openEditClient(c)}
                                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-[var(--brand)] flex items-center justify-center transition-colors cursor-pointer" title="Edit client">
                                <Pencil size={12} />
                              </button>
                              {liveInspectionEnabled && (
                                <button onClick={() => navigate(`/admin/live-inspections?clientId=${c._id}&action=schedule`)}
                                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer" title="Schedule live inspection">
                                  <Video size={12} />
                                </button>
                              )}
                              <button onClick={() => setDeleteClientId(c._id)}
                                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer" title="Delete client">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!clientsLoading && clients.length > 0 && (
              <TablePager pageIndex={clientsPageIndex} hasNextPage={clientsHasNext} hasPrevPage={clientsHasPrev} onNext={clientsNextPage} onPrev={clientsPrevPage} />
            )}
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {tab === "transactions" && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {[["invoices", "Invoices"], ["plans", "Payment Plans"]].map(([v, l]) => (
              <button key={v} onClick={() => setTxTab(v as typeof txTab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${txTab === v ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
            ))}
          </div>

          {/* Invoices */}
          {txTab === "invoices" && (
            <div className="space-y-3">
              <Button onClick={() => setShowInvForm(true)} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 h-9 text-sm"><Plus size={14} />Create Invoice</Button>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {invLoading ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  : invoices.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm">No invoices yet</div>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Client</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Paid</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Balance</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {invoices.map((inv) => {
                            const client = allClients?.find((c) => c._id === inv.clientId);
                            return (
                              <tr key={inv._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900 text-xs">{inv.invoiceNumber}</div>
                                  <div className="text-[10px] text-gray-400">Due: {inv.dueDate}</div>
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell text-sm text-gray-700">{client?.fullName ?? "—"}</td>
                                <td className="px-4 py-3 font-semibold text-gray-900">₦{inv.amount.toLocaleString()}</td>
                                <td className="px-4 py-3 hidden md:table-cell text-sm text-green-700">₦{inv.paid.toLocaleString()}</td>
                                <td className="px-4 py-3 hidden md:table-cell text-sm text-red-600">₦{inv.balance.toLocaleString()}</td>
                                <td className="px-4 py-3">
                                  <Badge className={`text-xs border-0 capitalize ${INV_STATUS_COLOR[inv.status]}`}>{inv.status}</Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {inv.status !== "paid" && (
                                      <Button size="sm" className="h-7 text-xs bg-green-50 hover:bg-green-100 text-green-700 gap-1" onClick={() => { setPayDialog({ id: inv._id, amount: inv.amount, paid: inv.paid }); setPayAmount(""); }}>
                                        <DollarSign size={11} />Pay
                                      </Button>
                                    )}
                                    <Button size="sm" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 text-red-600" onClick={() => deleteInvoice({ id: inv._id }).then(() => toast.success("Deleted"))}><Trash2 size={12} /></Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                {!invLoading && invoices.length > 0 && (
                  <TablePager pageIndex={invPageIndex} hasNextPage={invHasNext} hasPrevPage={invHasPrev} onNext={invNextPage} onPrev={invPrevPage} />
                )}
              </div>
            </div>
          )}

          {/* Payment Plans */}
          {txTab === "plans" && (
            <div className="space-y-3">
              <Button onClick={() => setShowPlanForm(true)} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 h-9 text-sm"><Plus size={14} />Create Payment Plan</Button>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {planLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />) : plans.length === 0 ? (
                  <div className="col-span-3 bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm">No payment plans yet</div>
                ) : plans.map((plan, i) => {
                  const client = allClients?.find((c) => c._id === plan.clientId);
                  const progress = Math.round(((plan.totalAmount - plan.balance) / plan.totalAmount) * 100);
                  return (
                    <motion.div key={plan._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{plan.title}</div>
                          <div className="text-xs text-gray-500">{client?.fullName}</div>
                        </div>
                        <Badge className={`text-xs border-0 capitalize ${PLAN_STATUS_COLOR[plan.status]}`}>{plan.status}</Badge>
                      </div>
                      <div className="mb-3 text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between"><span>Total</span><span className="font-semibold text-gray-900">₦{plan.totalAmount.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Balance</span><span className="font-semibold text-red-600">₦{plan.balance.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Duration</span><span>{plan.durationMonths} months</span></div>
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Progress</span><span>{progress}%</span></div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--brand)] rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <Button size="sm" className="w-full h-7 text-xs bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/20" onClick={() => setViewPlan(plan)}>
                        <CreditCard size={11} className="mr-1" /> View Installments
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
              {!planLoading && plans.length > 0 && (planHasNext || planHasPrev) && (
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" className="h-8 px-2.5 text-xs gap-1" disabled={!planHasPrev} onClick={planPrevPage}>Prev</Button>
                  <span className="h-8 min-w-8 px-2 flex items-center justify-center rounded-md bg-[var(--brand)] text-white text-xs font-semibold">{planPageIndex + 1}</span>
                  <Button size="sm" variant="secondary" className="h-8 px-2.5 text-xs gap-1" disabled={!planHasNext} onClick={planNextPage}>Next</Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── FOLLOW-UPS TAB ── */}
      {tab === "followups" && (
        <div className="space-y-4">
          <Select value={followUpFilter} onValueChange={setFollowUpFilter}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {fuLoading ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              : followUps.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm">No follow-ups found</div>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Client</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Type</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Description</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Due</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {followUps.map((fu) => {
                        const client = allClients?.find((c) => c._id === fu.clientId);
                        return (
                          <tr key={fu._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900 text-sm">{client?.fullName ?? "—"}</td>
                            <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500 capitalize">{fu.type.replace("_", " ")}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{fu.description}</td>
                            <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-400">{fu.dueDate}</td>
                            <td className="px-4 py-3">
                              <Badge className={`text-xs border-0 capitalize ${FOLLOWUP_STATUS_COLOR[fu.status]}`}>{fu.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {fu.status === "pending" && (
                                <Button size="sm" className="h-7 text-xs bg-green-50 hover:bg-green-100 text-green-700 gap-1"
                                  onClick={() => updateFollowUp({ id: fu._id, status: "done" }).then(() => toast.success("Marked done"))}>
                                  <CheckCircle size={11} />Done
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            {!fuLoading && followUps.length > 0 && (
              <TablePager pageIndex={fuPageIndex} hasNextPage={fuHasNext} hasPrevPage={fuHasPrev} onNext={fuNextPage} onPrev={fuPrevPage} />
            )}
          </div>
        </div>
      )}

      {/* ── TICKETS TAB ── */}
      {tab === "tickets" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={ticketFilter} onValueChange={setTicketFilter}>
              <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowTicketForm(true)} className="bg-[var(--brand)] text-white gap-2 h-8 text-xs"><Plus size={12} />New Ticket</Button>
          </div>
          <div className="space-y-3">
            {ticketLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />) : tickets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm">No tickets found</div>
            ) : tickets.map((t) => {
              const client = allClients?.find((c) => c._id === t.clientId);
              const isExpanded = expandedTicket === t._id;
              return (
                <div key={t._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpandedTicket(isExpanded ? null : t._id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">{t.subject}</span>
                        <Badge className={`text-[10px] border-0 capitalize ${TICKET_PRIORITY_COLOR[t.priority]}`}>{t.priority}</Badge>
                      </div>
                      <div className="text-xs text-gray-400">{client?.fullName ?? "Unknown"} · {formatDistanceToNow(t._creationTime, { addSuffix: true })}</div>
                    </div>
                    <Badge className={`text-xs border-0 capitalize shrink-0 ${TICKET_STATUS_COLOR[t.status]}`}>{t.status.replace("_", " ")}</Badge>
                    {isExpanded ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">{t.message}</div>
                          {t.response && <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800"><span className="font-semibold">Response: </span>{t.response}</div>}
                          <div className="flex gap-2">
                            <Textarea placeholder="Add response..." rows={2} className="resize-none text-sm flex-1"
                              value={ticketResponse[t._id] ?? ""}
                              onChange={(e) => setTicketResponse((p) => ({ ...p, [t._id]: e.target.value }))} />
                            <div className="flex flex-col gap-1.5">
                              <Button size="sm" className="h-8 text-xs bg-[var(--brand)] text-white"
                                onClick={() => updateTicket({ id: t._id, response: ticketResponse[t._id] || undefined, status: "resolved" }).then(() => toast.success("Responded!")).catch(() => toast.error("Failed"))}>
                                Respond
                              </Button>
                              <Select value={t.status} onValueChange={(v) => updateTicket({ id: t._id, status: v }).catch(() => toast.error("Failed"))}>
                                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {!ticketLoading && tickets.length > 0 && (ticketHasNext || ticketHasPrev) && (
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" className="h-8 px-2.5 text-xs gap-1" disabled={!ticketHasPrev} onClick={ticketPrevPage}>Prev</Button>
                <span className="h-8 min-w-8 px-2 flex items-center justify-center rounded-md bg-[var(--brand)] text-white text-xs font-semibold">{ticketPageIndex + 1}</span>
                <Button size="sm" variant="secondary" className="h-8 px-2.5 text-xs gap-1" disabled={!ticketHasNext} onClick={ticketNextPage}>Next</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CLIENT DETAIL DIALOG ── */}
      {viewClient && <ClientDetail client={viewClient} users={users} onClose={() => setViewClient(null)} />}

      {/* ── INSTALLMENTS DIALOG ── */}
      {viewPlan && <InstallmentsDialog plan={viewPlan} clients={allClients} onClose={() => setViewPlan(null)} />}

      {/* ── CLIENT FORM ── */}
      <Dialog open={showClientForm} onOpenChange={setShowClientForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>{editClientId ? "Edit Client" : "Add New Client"}</DialogTitle></DialogHeader>
          <form onSubmit={handleClientSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label className="text-xs font-semibold mb-1 block">Full Name *</Label><Input value={clientForm.fullName} onChange={(e) => cf("fullName", e.target.value)} placeholder="Chukwuemeka Obi" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Email *</Label><Input type="email" value={clientForm.email} onChange={(e) => cf("email", e.target.value)} placeholder="client@email.com" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Phone *</Label><Input value={clientForm.phone} onChange={(e) => cf("phone", e.target.value)} placeholder="+234..." /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Occupation</Label><Input value={clientForm.occupation} onChange={(e) => cf("occupation", e.target.value)} placeholder="Engineer" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Source</Label>
                <Select value={clientForm.source} onValueChange={(v) => cf("source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold mb-1 block">KYC Status</Label>
                <Select value={clientForm.kycStatus} onValueChange={(v) => cf("kycStatus", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold mb-1 block">State</Label><Input value={clientForm.state} onChange={(e) => cf("state", e.target.value)} placeholder="Lagos" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">LGA</Label><Input value={clientForm.lga} onChange={(e) => cf("lga", e.target.value)} placeholder="Ikeja" /></div>
              <div className="sm:col-span-2"><Label className="text-xs font-semibold mb-1 block">Address</Label><Input value={clientForm.address} onChange={(e) => cf("address", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">NIN</Label><Input value={clientForm.nin} onChange={(e) => cf("nin", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">BVN</Label><Input value={clientForm.bvn} onChange={(e) => cf("bvn", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label className="text-xs font-semibold mb-1 block">Notes</Label><Textarea value={clientForm.notes} onChange={(e) => cf("notes", e.target.value)} rows={2} className="resize-none text-sm" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowClientForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{loading ? "Saving..." : editClientId ? "Update" : "Add Client"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── INVOICE FORM ── */}
      <Dialog open={showInvForm} onOpenChange={setShowInvForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <form onSubmit={handleInvoiceSubmit} className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Client *</Label>
              <Select value={invForm.clientId} onValueChange={(v) => setInvForm((p) => ({ ...p, clientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>{allClients?.map((c) => <SelectItem key={c._id} value={c._id}>{c.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Invoice # *</Label><Input value={invForm.invoiceNumber} onChange={(e) => setInvForm((p) => ({ ...p, invoiceNumber: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Due Date *</Label><Input type="date" value={invForm.dueDate} onChange={(e) => setInvForm((p) => ({ ...p, dueDate: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Total Amount (₦) *</Label><Input type="number" value={invForm.amount} onChange={(e) => setInvForm((p) => ({ ...p, amount: e.target.value }))} /></div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Line Items</Label>
              {invForm.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-1.5">
                  <Input className="flex-1 text-sm h-8" placeholder="Description" value={item.description} onChange={(e) => setInvForm((p) => { const items = [...p.items]; items[idx] = { ...items[idx], description: e.target.value }; return { ...p, items }; })} />
                  <Input className="w-28 text-sm h-8" type="number" placeholder="₦" value={item.amount} onChange={(e) => setInvForm((p) => { const items = [...p.items]; items[idx] = { ...items[idx], amount: e.target.value }; return { ...p, items }; })} />
                  {invForm.items.length > 1 && <button type="button" onClick={() => setInvForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="text-red-400 hover:text-red-600 cursor-pointer"><XCircle size={15} /></button>}
                </div>
              ))}
              <button type="button" onClick={() => setInvForm((p) => ({ ...p, items: [...p.items, { description: "", amount: "" }] }))} className="text-xs text-[var(--brand)] hover:underline cursor-pointer">+ Add line item</button>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Notes</Label><Textarea value={invForm.notes} onChange={(e) => setInvForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="resize-none text-sm" /></div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowInvForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-[var(--brand)] text-white">{loading ? "Saving..." : "Create Invoice"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── PAYMENT PLAN FORM ── */}
      <Dialog open={showPlanForm} onOpenChange={setShowPlanForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Payment Plan</DialogTitle></DialogHeader>
          <form onSubmit={handlePlanSubmit} className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Client *</Label>
              <Select value={planForm.clientId} onValueChange={(v) => setPlanForm((p) => ({ ...p, clientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>{allClients?.map((c) => <SelectItem key={c._id} value={c._id}>{c.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Plan Title *</Label><Input value={planForm.title} onChange={(e) => setPlanForm((p) => ({ ...p, title: e.target.value }))} placeholder="Royal Gardens Plot 12 Payment Plan" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Total Amount (₦) *</Label><Input type="number" value={planForm.totalAmount} onChange={(e) => setPlanForm((p) => ({ ...p, totalAmount: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Initial Deposit (₦)</Label><Input type="number" value={planForm.initialDeposit} onChange={(e) => setPlanForm((p) => ({ ...p, initialDeposit: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Duration (months)</Label><Input type="number" value={planForm.durationMonths} onChange={(e) => setPlanForm((p) => ({ ...p, durationMonths: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Start Date</Label><Input type="date" value={planForm.startDate} onChange={(e) => setPlanForm((p) => ({ ...p, startDate: e.target.value }))} /></div>
            </div>
            {planForm.totalAmount && planForm.initialDeposit && planForm.durationMonths && (
              <div className="bg-[var(--brand)]/8 rounded-xl p-3 text-sm text-[var(--brand)]">
                Monthly installment: <strong>₦{Math.round((Number(planForm.totalAmount) - Number(planForm.initialDeposit)) / Number(planForm.durationMonths)).toLocaleString()}</strong>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowPlanForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-[var(--brand)] text-white">{loading ? "Saving..." : "Create Plan"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── RECORD PAYMENT DIALOG ── */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {payDialog && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total</span><span>₦{payDialog.amount.toLocaleString()}</span></div>
                <div className="flex justify-between mt-1"><span className="text-gray-500">Already Paid</span><span className="text-green-700">₦{payDialog.paid.toLocaleString()}</span></div>
                <div className="flex justify-between mt-1"><span className="text-gray-500">Outstanding</span><span className="font-semibold text-red-600">₦{(payDialog.amount - payDialog.paid).toLocaleString()}</span></div>
              </div>
              <div><Label className="text-xs font-semibold mb-1 block">Amount Being Paid (₦)</Label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Enter amount..." /></div>
              <div className="flex justify-end gap-3">
                <Button className="bg-gray-100 text-gray-700" onClick={() => setPayDialog(null)}>Cancel</Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleRecordPayment}>Record Payment</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── TICKET FORM ── */}
      <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Client</Label>
              <Select value={ticketForm.clientId} onValueChange={(v) => setTicketForm((p) => ({ ...p, clientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>{allClients?.map((c) => <SelectItem key={c._id} value={c._id}>{c.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Subject</Label><Input value={ticketForm.subject} onChange={(e) => setTicketForm((p) => ({ ...p, subject: e.target.value }))} /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Priority</Label>
              <Select value={ticketForm.priority} onValueChange={(v) => setTicketForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Message</Label><Textarea value={ticketForm.message} onChange={(e) => setTicketForm((p) => ({ ...p, message: e.target.value }))} rows={3} className="resize-none text-sm" /></div>
            <div className="flex justify-end gap-3">
              <Button className="bg-gray-100 text-gray-700" onClick={() => setShowTicketForm(false)}>Cancel</Button>
              <Button className="bg-[var(--brand)] text-white" onClick={async () => {
                if (!ticketForm.clientId || !ticketForm.subject || !ticketForm.message) { toast.error("Fill all fields"); return; }
                await createTicket({ clientId: ticketForm.clientId as Id<"clients">, subject: ticketForm.subject, message: ticketForm.message, priority: ticketForm.priority });
                toast.success("Ticket created!"); setShowTicketForm(false); setTicketForm({ clientId: "", subject: "", message: "", priority: "medium" });
              }}>Create Ticket</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ── */}
      <Dialog open={!!deleteClientId} onOpenChange={() => setDeleteClientId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Client?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">This client record will be permanently removed.</p>
          <div className="flex justify-end gap-3 mt-3">
            <Button className="bg-gray-100 text-gray-700" onClick={() => setDeleteClientId(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={async () => {
              if (deleteClientId) { await deleteClient({ id: deleteClientId }); setDeleteClientId(null); toast.success("Client deleted"); }
            }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
