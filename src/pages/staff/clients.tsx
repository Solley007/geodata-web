import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import {
  Search, Contact, MessageSquare, Mail, Phone, X, Plus,
  AlertCircle, Clock, Check, CalendarClock,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

// ── Config ─────────────────────────────────────────────────────────────────

const KYC_CFG: Record<string, { label: string; color: string }> = {
  pending:  { label: "Pending",  color: "bg-orange-100 text-orange-600" },
  verified: { label: "Verified", color: "bg-green-100 text-green-700"   },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-600"       },
};

const INQUIRY_STATUS_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new:       { label: "New",       color: "bg-red-100 text-red-600",     icon: AlertCircle },
  contacted: { label: "Contacted", color: "bg-yellow-100 text-yellow-600", icon: Clock     },
  resolved:  { label: "Resolved",  color: "bg-green-100 text-green-600",  icon: Check       },
};

type Tab = "clients" | "inquiries";

// ── My Clients ────────────────────────────────────────────────────────────

function AddFollowUpDialog({ clientId, onClose }: { clientId: Id<"clients">; onClose: () => void }) {
  const createFollowUp = useMutation(api.staffPortal.clientsAndInquiries.createMyClientFollowUp);
  const [form, setForm] = useState({ dueDate: "", type: "call", description: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.dueDate || !form.description) { toast.error("Due date and description required"); return; }
    setLoading(true);
    try {
      await createFollowUp({ clientId, dueDate: form.dueDate, type: form.type, description: form.description });
      toast.success("Follow-up added");
      onClose();
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Follow-up</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Due Date</Label>
            <Input className="mt-1" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["call", "email", "meeting", "site_visit"].map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Adding…" : "Add Follow-up"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MyClientDetailPanel({ clientId, onClose }: { clientId: Id<"clients">; onClose: () => void }) {
  const client = useQuery(api.staffPortal.clientsAndInquiries.getMyClient, { id: clientId });
  const notes = useQuery(api.staffPortal.clientsAndInquiries.listMyClientNotes, { clientId });
  const followUps = useQuery(api.staffPortal.clientsAndInquiries.listMyClientFollowUps, { clientId });
  const addNote = useMutation(api.staffPortal.clientsAndInquiries.addMyClientNote);
  const updateFollowUpStatus = useMutation(api.staffPortal.clientsAndInquiries.updateMyFollowUpStatus);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await addNote({ clientId, note: note.trim() });
      setNote("");
      toast.success("Note added");
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
    finally { setSubmitting(false); }
  };

  if (client === undefined) return <div className="p-4"><Skeleton className="h-48 w-full" /></div>;
  if (!client) return <div className="p-4 text-sm text-gray-400">Client not found</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 shrink-0">
        <h3 className="font-bold text-gray-800 text-sm">Client Detail</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="font-bold text-gray-900">{client.fullName}</p>
          <Badge className={cn("text-[10px] border-0 mt-1", KYC_CFG[client.kycStatus]?.color ?? "bg-gray-100 text-gray-500")}>
            {KYC_CFG[client.kycStatus]?.label ?? client.kycStatus}
          </Badge>
        </div>
        <div className="space-y-2 text-sm">
          <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-gray-600 hover:text-[var(--brand)]"><Mail size={14} />{client.email}</a>
          <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-[var(--brand)]"><Phone size={14} />{client.phone}</a>
        </div>
        {(client.state || client.lga) && (
          <div className="bg-gray-50 rounded-xl p-2.5 text-xs text-gray-600">
            {[client.lga, client.state].filter(Boolean).join(", ")}
          </div>
        )}
        {client.tags && client.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {client.tags.map((t) => <span key={t} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-medium">{t}</span>)}
          </div>
        )}

        {/* Follow-ups */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Follow-ups</p>
            <button onClick={() => setShowFollowUp(true)} className="text-[var(--brand)] text-xs font-medium flex items-center gap-1 cursor-pointer">
              <Plus size={12} /> Add
            </button>
          </div>
          {followUps === undefined ? (
            <Skeleton className="h-10 w-full" />
          ) : followUps.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No follow-ups scheduled</p>
          ) : (
            <div className="space-y-1.5">
              {followUps.map((f) => (
                <div key={f._id} className="flex items-center justify-between bg-gray-50 rounded-xl p-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarClock size={13} className="text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate capitalize">{f.type.replace("_", " ")}: {f.description}</p>
                      <p className="text-[10px] text-gray-400">{format(parseISO(f.dueDate + "T00:00:00"), "dd MMM yyyy")}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateFollowUpStatus({ id: f._id, status: f.status === "done" ? "pending" : "done" })}
                    className={cn(
                      "text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0 cursor-pointer",
                      f.status === "done" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    )}>
                    {f.status === "done" ? "Done" : "Mark Done"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Notes ({notes?.length ?? 0})
          </p>
          <div className="space-y-2 mb-3">
            {notes === undefined ? (
              <Skeleton className="h-10 w-full" />
            ) : notes.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No notes yet</p>
            ) : (
              notes.map((n) => (
                <div key={n._id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-800">{n.authorName}</span>
                    <span className="text-[10px] text-gray-400">{formatDistanceToNow(n._creationTime, { addSuffix: true })}</span>
                  </div>
                  <p className="text-xs text-gray-600">{n.note}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add note…" value={note} onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
              className="flex-1 text-sm" />
            <Button size="sm" onClick={handleAddNote} disabled={submitting || !note.trim()}>Add</Button>
          </div>
        </div>
      </div>
      {showFollowUp && <AddFollowUpDialog clientId={clientId} onClose={() => setShowFollowUp(false)} />}
    </div>
  );
}

function MyClientsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [kycFilter, setKycFilter] = useState("all");
  const [selected, setSelected] = useState<Id<"clients"> | null>(null);

  const {
    rows: clients,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.staffPortal.clientsAndInquiries.listMyClientsPaginated,
    { kycStatus: kycFilter !== "all" ? kycFilter : undefined, search: debouncedSearch || undefined },
    15,
  );
  const stats = useQuery(api.staffPortal.clientsAndInquiries.getMyClientStats, {});

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, kycFilter]);

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",    value: stats.total,    color: "#6366f1" },
            { label: "Verified", value: stats.verified, color: "#10b981" },
            { label: "Pending",  value: stats.pending,  color: "#f59e0b" },
            { label: "Rejected", value: stats.rejected, color: "#ef4444" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] text-gray-400">{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-8" placeholder="Search my clients…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={kycFilter} onValueChange={setKycFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All KYC" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All KYC Status</SelectItem>
            {Object.entries(KYC_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4">
        <div className={cn("flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden",
          selected && "hidden md:block md:w-[55%] md:flex-none")}>
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : clients.length === 0 ? (
            <div className="py-10">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Contact /></EmptyMedia>
                  <EmptyTitle>No clients assigned</EmptyTitle>
                  <EmptyDescription>Clients assigned to you will appear here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {clients.map((c) => (
                <div key={c._id}
                  onClick={() => setSelected(selected === c._id ? null : c._id)}
                  className={cn("p-4 cursor-pointer hover:bg-blue-50/30 transition-colors flex items-center gap-3", selected === c._id && "bg-blue-50")}>
                  <div className="w-9 h-9 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] font-bold text-sm shrink-0">
                    {c.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{c.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">{c.email}</p>
                  </div>
                  <Badge className={cn("text-[10px] border-0 shrink-0", KYC_CFG[c.kycStatus]?.color ?? "bg-gray-100 text-gray-500")}>
                    {KYC_CFG[c.kycStatus]?.label ?? c.kycStatus}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {!isLoading && clients.length > 0 && (
            <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
          )}
        </div>

        {selected && (
          <div className="w-full md:w-[44%] flex-none bg-white rounded-2xl border border-gray-100 shadow-sm">
            <MyClientDetailPanel clientId={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── My Inquiries ──────────────────────────────────────────────────────────

function MyInquiriesTab() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<{ id: Id<"inquiries">; status: string; notes: string } | null>(null);

  const inquiries = useQuery(api.staffPortal.clientsAndInquiries.listMyInquiriesAssigned, {
    status: filterStatus !== "all" ? filterStatus : undefined,
  });
  const stats = useQuery(api.staffPortal.clientsAndInquiries.getMyInquiryStats, {});
  const updateStatus = useMutation(api.staffPortal.clientsAndInquiries.updateMyInquiryStatus);

  const selectedInquiry = inquiries?.find((i) => i._id === selected);

  const handleStatusUpdate = async () => {
    if (!statusUpdate) return;
    try {
      await updateStatus({ id: statusUpdate.id, status: statusUpdate.status, notes: statusUpdate.notes });
      toast.success("Status updated");
      setStatusUpdate(null);
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
  };

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",     value: stats.total,     color: "#6366f1" },
            { label: "New",       value: stats.new,       color: "#ef4444" },
            { label: "Contacted", value: stats.contacted, color: "#f59e0b" },
            { label: "Resolved",  value: stats.resolved,  color: "#10b981" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] text-gray-400">{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="contacted">Contacted</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
        </SelectContent>
      </Select>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {!inquiries ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : inquiries.length === 0 ? (
            <div className="py-10">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><MessageSquare /></EmptyMedia>
                  <EmptyTitle>No inquiries assigned</EmptyTitle>
                  <EmptyDescription>Inquiries routed to you will appear here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {inquiries.map((inq) => {
                const info = INQUIRY_STATUS_CFG[inq.status] ?? INQUIRY_STATUS_CFG.new;
                return (
                  <div key={inq._id}
                    onClick={() => setSelected(inq._id === selected ? null : inq._id)}
                    className={cn("px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors", selected === inq._id && "bg-blue-50 border-l-2 border-[var(--brand)]")}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] font-bold text-sm shrink-0">
                        {inq.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{inq.name}</span>
                          <Badge className={cn("text-[10px] border-0 capitalize", info.color)}>{info.label}</Badge>
                        </div>
                        <div className="text-xs text-gray-400 truncate capitalize">{inq.type} · {inq.email}</div>
                      </div>
                      <span className="text-[10px] text-gray-400 hidden sm:block shrink-0">{formatDistanceToNow(inq._creationTime, { addSuffix: true })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          {!selectedInquiry ? (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center text-gray-400">
              <MessageSquare size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Select an inquiry to view details</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{selectedInquiry.name}</h3>
                <Badge className={cn("text-xs border-0 capitalize mt-1", INQUIRY_STATUS_CFG[selectedInquiry.status]?.color ?? "bg-gray-100 text-gray-500")}>
                  {selectedInquiry.status}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <a href={`mailto:${selectedInquiry.email}`} className="flex items-center gap-2 text-gray-600 hover:text-[var(--brand)]"><Mail size={14} />{selectedInquiry.email}</a>
                <a href={`tel:${selectedInquiry.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-[var(--brand)]"><Phone size={14} />{selectedInquiry.phone}</a>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Message</div>
                <p className="text-sm text-gray-700">{selectedInquiry.message}</p>
              </div>
              {selectedInquiry.notes && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="text-xs text-[var(--brand)] mb-1 uppercase tracking-wide">My Notes</div>
                  <p className="text-sm text-gray-700">{selectedInquiry.notes}</p>
                </div>
              )}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-500">Update Status</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {["new", "contacted", "resolved"].map((s) => (
                    <button key={s} onClick={() => setStatusUpdate({ id: selectedInquiry._id, status: s, notes: selectedInquiry.notes ?? "" })}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize cursor-pointer",
                        selectedInquiry.status === s ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[var(--brand)]/50"
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
                <Button className="w-full h-8 text-xs bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white mt-1"
                  onClick={() => setStatusUpdate({ id: selectedInquiry._id, status: selectedInquiry.status, notes: selectedInquiry.notes ?? "" })}>
                  Add Note & Update
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!statusUpdate} onOpenChange={() => setStatusUpdate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Inquiry</DialogTitle></DialogHeader>
          {statusUpdate && (
            <div className="space-y-3">
              <Select value={statusUpdate.status} onValueChange={(v) => setStatusUpdate({ ...statusUpdate, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Add a note..." rows={3} value={statusUpdate.notes} onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })} className="resize-none text-sm" />
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setStatusUpdate(null)}>Cancel</Button>
                <Button className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white" onClick={handleStatusUpdate}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Page Root ──────────────────────────────────────────────────────────────

export default function StaffMyClients() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(location.pathname.endsWith("/inquiries") ? "inquiries" : "clients");

  useEffect(() => {
    setTab(location.pathname.endsWith("/inquiries") ? "inquiries" : "clients");
  }, [location.pathname]);

  const changeTab = (t: Tab) => {
    setTab(t);
    navigate(t === "inquiries" ? "/staff/inquiries" : "/staff/clients", { replace: true });
  };

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>My Clients & Inquiries</h1>
        <p className="text-sm text-gray-500 mt-0.5">Only clients and inquiries assigned to you</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1.5 w-fit">
        {([
          { key: "clients" as Tab, label: "My Clients", icon: Contact },
          { key: "inquiries" as Tab, label: "My Inquiries", icon: MessageSquare },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => changeTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all",
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "clients" && <MyClientsTab />}
      {tab === "inquiries" && <MyInquiriesTab />}
    </div>
  );
}
