import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.js";
import {
  FileText, StickyNote, CalendarClock, User, Plus, Trash2,
  Check, X, Phone, Mail, MapPin, Briefcase, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const KYC_COLOR: Record<string, string> = {
  verified: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-600",
};

const DOC_TYPES = [
  { id: "id_card", label: "ID Card" },
  { id: "passport", label: "Passport" },
  { id: "utility_bill", label: "Utility Bill" },
  { id: "contract", label: "Contract" },
  { id: "receipt", label: "Receipt" },
  { id: "other", label: "Other" },
];

const FOLLOWUP_TYPES = [
  { id: "call", label: "Call" },
  { id: "email", label: "Email" },
  { id: "meeting", label: "Meeting" },
  { id: "site_visit", label: "Site Visit" },
];

const DOC_STATUS_COLOR: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-600",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function ProfileTab({ client, agentName }: { client: Doc<"clients">; agentName: string }) {
  const rows: Array<{ label: string; value: string; icon: React.ElementType }> = [
    { label: "Email", value: client.email, icon: Mail },
    { label: "Phone", value: client.phone, icon: Phone },
    { label: "Address", value: client.address ?? "—", icon: MapPin },
    { label: "State / LGA", value: [client.state, client.lga].filter(Boolean).join(" / ") || "—", icon: MapPin },
    { label: "Occupation", value: client.occupation ?? "—", icon: Briefcase },
    { label: "NIN", value: client.nin ?? "—", icon: ShieldCheck },
    { label: "BVN", value: client.bvn ?? "—", icon: ShieldCheck },
    { label: "Assigned Agent", value: agentName, icon: User },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {rows.map((r) => (
        <div key={r.label} className="bg-gray-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">
            <r.icon size={11} /> {r.label}
          </div>
          <div className="text-sm text-gray-800 break-words">{r.value}</div>
        </div>
      ))}
      {client.notes && (
        <div className="sm:col-span-2 bg-gray-50 rounded-xl p-3">
          <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Notes</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{client.notes}</div>
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ clientId }: { clientId: Id<"clients"> }) {
  const docs = useQuery(api.clients.listDocuments, { clientId });
  const addDoc = useMutation(api.clients.addDocument);
  const updateStatus = useMutation(api.clients.updateDocumentStatus);
  const deleteDoc = useMutation(api.clients.deleteDocument);
  const [form, setForm] = useState({ name: "", docType: "id_card", url: "", status: "pending" });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.url) { toast.error("Name and URL are required"); return; }
    try {
      await addDoc({ clientId, ...form });
      toast.success("Document added");
      setForm({ name: "", docType: "id_card", url: "", status: "pending" });
    } catch { toast.error("Failed to add document"); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-2">
        <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Document Name</Label><Input className="h-8" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="National ID" /></div>
        <div><Label className="text-xs font-semibold mb-1 block">Type</Label>
          <Select value={form.docType} onValueChange={(v) => setForm((p) => ({ ...p, docType: v }))}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs font-semibold mb-1 block">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">File URL</Label><Input className="h-8" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." /></div>
        <div className="col-span-2 flex justify-end"><Button type="submit" size="sm" className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-1.5 h-8"><Plus size={13} /> Add Document</Button></div>
      </form>

      {!docs ? <Skeleton className="h-16 w-full" />
        : docs.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No documents uploaded yet</p>
        : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc._id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><FileText size={16} className="text-[var(--brand)]" /></div>
                <div className="min-w-0 flex-1">
                  <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-800 hover:text-[var(--brand)] truncate block">{doc.name}</a>
                  <div className="text-[11px] text-gray-400 capitalize">{doc.docType.replace("_", " ")}</div>
                </div>
                <Badge className={`text-[10px] border-0 capitalize ${DOC_STATUS_COLOR[doc.status] ?? "bg-gray-100 text-gray-500"}`}>{doc.status}</Badge>
                <div className="flex items-center gap-1">
                  <Button size="sm" className="h-7 w-7 p-0 bg-green-50 hover:bg-green-100 text-green-600" title="Approve" onClick={() => updateStatus({ id: doc._id, status: "approved" })}><Check size={12} /></Button>
                  <Button size="sm" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 text-red-600" title="Reject" onClick={() => updateStatus({ id: doc._id, status: "rejected" })}><X size={12} /></Button>
                  <Button size="sm" className="h-7 w-7 p-0 bg-gray-100 hover:bg-gray-200 text-gray-500" title="Delete" onClick={() => deleteDoc({ id: doc._id })}><Trash2 size={12} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function NotesTab({ clientId, authorName }: { clientId: Id<"clients">; authorName: string }) {
  const notes = useQuery(api.clients.listNotes, { clientId });
  const addNote = useMutation(api.clients.addNote);
  const deleteNote = useMutation(api.clients.deleteNote);
  const [text, setText] = useState("");

  const handleAdd = async () => {
    if (!text.trim()) { toast.error("Note cannot be empty"); return; }
    try {
      await addNote({ clientId, note: text.trim(), authorName });
      setText("");
      toast.success("Note added");
    } catch { toast.error("Failed to add note"); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="resize-none text-sm bg-white" placeholder="Add a note about this client..." />
        <div className="flex justify-end"><Button size="sm" onClick={handleAdd} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-1.5 h-8"><Plus size={13} /> Add Note</Button></div>
      </div>
      {!notes ? <Skeleton className="h-16 w-full" />
        : notes.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No notes yet</p>
        : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n._id} className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{n.note}</p>
                  <Button size="sm" className="h-6 w-6 p-0 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-600 shrink-0" onClick={() => deleteNote({ id: n._id })}><Trash2 size={11} /></Button>
                </div>
                <div className="text-[11px] text-gray-400 mt-1.5">{n.authorName} · {formatDistanceToNow(n._creationTime, { addSuffix: true })}</div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

const FU_STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-600",
};

function FollowUpsTab({ clientId }: { clientId: Id<"clients"> }) {
  const followUps = useQuery(api.clients.listFollowUps, { clientId });
  const createFollowUp = useMutation(api.clients.createFollowUp);
  const updateStatus = useMutation(api.clients.updateFollowUpStatus);
  const deleteFollowUp = useMutation(api.clients.deleteFollowUp);
  const [form, setForm] = useState({ dueDate: "", type: "call", description: "" });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dueDate || !form.description) { toast.error("Due date and description required"); return; }
    try {
      await createFollowUp({ clientId, ...form });
      setForm({ dueDate: "", type: "call", description: "" });
      toast.success("Follow-up scheduled");
    } catch { toast.error("Failed to schedule"); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-2">
        <div><Label className="text-xs font-semibold mb-1 block">Due Date</Label><Input type="date" className="h-8" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} /></div>
        <div><Label className="text-xs font-semibold mb-1 block">Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{FOLLOWUP_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Description</Label><Input className="h-8" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Call to discuss payment plan" /></div>
        <div className="col-span-2 flex justify-end"><Button type="submit" size="sm" className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-1.5 h-8"><Plus size={13} /> Schedule</Button></div>
      </form>
      {!followUps ? <Skeleton className="h-16 w-full" />
        : followUps.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No follow-ups scheduled</p>
        : (
          <div className="space-y-2">
            {followUps.map((f) => (
              <div key={f._id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800">{f.description}</div>
                  <div className="text-[11px] text-gray-400 capitalize">{f.type.replace("_", " ")} · Due {f.dueDate}</div>
                </div>
                <Badge className={`text-[10px] border-0 capitalize ${FU_STATUS_COLOR[f.status] ?? "bg-gray-100 text-gray-500"}`}>{f.status}</Badge>
                {f.status !== "done" && <Button size="sm" className="h-7 w-7 p-0 bg-green-50 hover:bg-green-100 text-green-600" title="Mark done" onClick={() => updateStatus({ id: f._id, status: "done" })}><Check size={12} /></Button>}
                <Button size="sm" className="h-7 w-7 p-0 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-600" onClick={() => deleteFollowUp({ id: f._id })}><Trash2 size={12} /></Button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

export default function ClientDetailDialog({
  clientId, open, onClose, agentName, currentUserName,
}: {
  clientId: Id<"clients"> | null;
  open: boolean;
  onClose: () => void;
  agentName: string;
  currentUserName: string;
}) {
  const client = useQuery(api.clients.getClient, clientId ? { id: clientId } : "skip");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {!client ? (
          <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /></div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">Client details</DialogTitle>
            </DialogHeader>
            {/* Profile header */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--brand)] text-white flex items-center justify-center text-lg font-bold shrink-0" style={{ fontFamily: "'Playfair Display', serif" }}>
                {initials(client.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-gray-900 truncate" style={{ fontFamily: "'Playfair Display', serif" }}>{client.fullName}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-0.5">
                  <span className="flex items-center gap-1"><Mail size={11} /> {client.email}</span>
                  <span className="flex items-center gap-1"><Phone size={11} /> {client.phone}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge className={`text-[10px] border-0 capitalize ${KYC_COLOR[client.kycStatus] ?? "bg-gray-100 text-gray-500"}`}>KYC: {client.kycStatus}</Badge>
                  <Badge className="text-[10px] border-0 bg-gray-100 text-gray-600 capitalize">{client.source.replace("_", " ")}</Badge>
                  <Badge className="text-[10px] border-0 bg-blue-50 text-[var(--brand)]">{agentName}</Badge>
                </div>
              </div>
            </div>

            <Tabs defaultValue="profile" className="mt-2">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="profile" className="gap-1.5 text-xs"><User size={13} /> Profile</TabsTrigger>
                <TabsTrigger value="documents" className="gap-1.5 text-xs"><FileText size={13} /> Documents</TabsTrigger>
                <TabsTrigger value="notes" className="gap-1.5 text-xs"><StickyNote size={13} /> Notes</TabsTrigger>
                <TabsTrigger value="followups" className="gap-1.5 text-xs"><CalendarClock size={13} /> Follow-ups</TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="mt-4"><ProfileTab client={client} agentName={agentName} /></TabsContent>
              <TabsContent value="documents" className="mt-4"><DocumentsTab clientId={client._id} /></TabsContent>
              <TabsContent value="notes" className="mt-4"><NotesTab clientId={client._id} authorName={currentUserName} /></TabsContent>
              <TabsContent value="followups" className="mt-4"><FollowUpsTab clientId={client._id} /></TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
