import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { format, parseISO, isToday } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty.tsx";
import {
  Inbox, MessageSquarePlus, Send, Users, Megaphone, Plus, Hash,
  ChevronLeft, CheckCircle2, AlertTriangle, Trash2, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";

// ══════════════════════════════════════════════════════════════════════════
// Enhanced Internal Communications — Inbox, Messages, Channels & Groups,
// Announcements. Rendered only when `feature_enhanced_communications` is
// enabled (checked by the parent). Staff-to-staff only, entirely distinct
// from the public ticker/pop tabs in the same Communications Centre.
// ══════════════════════════════════════════════════════════════════════════

type CommsAccess = {
  featureEnabled: boolean;
  isStaff: boolean;
  canManageChannels: boolean;
  canAnnounce: boolean;
  canManageSettings: boolean;
};

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: "Normal", color: "text-gray-600", bg: "bg-gray-100" },
  important: { label: "Important", color: "text-amber-700", bg: "bg-amber-100" },
  urgent: { label: "Urgent", color: "text-red-700", bg: "bg-red-100" },
};

// ── New Conversation Dialog ──────────────────────────────────────────────

function NewConversationDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: Id<"conversations">) => void }) {
  const directory = useQuery(api.internalComms.listStaffDirectory, {});
  const createConversation = useMutation(api.internalComms.createConversation);
  const [kind, setKind] = useState<"direct" | "group">("direct");
  const [selected, setSelected] = useState<Id<"users">[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (id: Id<"users">) => setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : kind === "direct" ? [id] : [...prev, id]));

  const handleCreate = async () => {
    if (selected.length === 0) { toast.error("Select at least one colleague"); return; }
    if (kind === "group" && !name.trim()) { toast.error("Group name is required"); return; }
    setSaving(true);
    try {
      const id = await createConversation({ kind, participantUserIds: selected, name: kind === "group" ? name.trim() : undefined });
      toast.success(kind === "direct" ? "Conversation started" : "Group channel created");
      onCreated(id);
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to start conversation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant={kind === "direct" ? "default" : "secondary"} onClick={() => { setKind("direct"); setSelected([]); }}>Direct Message</Button>
            <Button size="sm" variant={kind === "group" ? "default" : "secondary"} onClick={() => { setKind("group"); setSelected([]); }}>Group Channel</Button>
          </div>
          {kind === "group" && (
            <div>
              <Label>Group Name</Label>
              <Input className="mt-1" placeholder="e.g. Sales Coordination" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div>
            <Label>{kind === "direct" ? "Select colleague" : "Select colleagues"}</Label>
            <div className="mt-1 max-h-56 overflow-y-auto border rounded-xl divide-y">
              {directory === undefined ? (
                <div className="p-3"><Skeleton className="h-8 w-full" /></div>
              ) : directory.length === 0 ? (
                <p className="p-3 text-xs text-gray-400">No other staff members found.</p>
              ) : (
                directory.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => toggle(u._id)}
                    className={cn("w-full flex items-center justify-between px-3 py-2 text-sm text-left cursor-pointer hover:bg-gray-50", selected.includes(u._id) && "bg-blue-50")}
                  >
                    <span>{u.name}<span className="text-gray-400 ml-1.5 text-xs">{u.role}</span></span>
                    {selected.includes(u._id) && <CheckCircle2 size={14} className="text-[var(--brand)]" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating…" : "Start Conversation"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── New Org Channel Dialog ───────────────────────────────────────────────

function NewOrgChannelDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: Id<"conversations">) => void }) {
  const scopes = useQuery(api.internalComms.listOrgScopesForChannels, open ? {} : "skip");
  const createOrgConversation = useMutation(api.internalComms.createOrgConversation);
  const [name, setName] = useState("");
  const [scopeType, setScopeType] = useState<"directorate" | "department" | "unit">("department");
  const [scopeId, setScopeId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const options = scopeType === "directorate" ? scopes?.directorates : scopeType === "department" ? scopes?.departments : scopes?.units;

  const handleCreate = async () => {
    if (!name.trim() || !scopeId) { toast.error("Name and organisational scope are required"); return; }
    setSaving(true);
    try {
      const id = await createOrgConversation({
        name: name.trim(),
        directorateId: scopeType === "directorate" ? (scopeId as Id<"directorates">) : undefined,
        departmentId: scopeType === "department" ? (scopeId as Id<"departments">) : undefined,
        unitId: scopeType === "unit" ? (scopeId as Id<"units">) : undefined,
      });
      toast.success("Org-wide channel created");
      onCreated(id);
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to create channel");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Org-Wide Channel</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Channel Name</Label>
            <Input className="mt-1" placeholder="e.g. Finance Directorate" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Scope</Label>
            <Select value={scopeType} onValueChange={(v) => { setScopeType(v as typeof scopeType); setScopeId(""); }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="directorate">Directorate</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="unit">Unit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{scopeType.charAt(0).toUpperCase() + scopeType.slice(1)}</Label>
            <Select value={scopeId} onValueChange={setScopeId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {options?.map((o) => <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>)}
                {options?.length === 0 && <SelectItem value="none" disabled>No options available</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-gray-400">Everyone currently assigned to this {scopeType} automatically becomes a member.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating…" : "Create Channel"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Conversation Thread ──────────────────────────────────────────────────

function ConversationThread({ conversationId, onBack }: { conversationId: Id<"conversations">; onBack: () => void }) {
  const conversation = useQuery(api.internalComms.getConversation, { id: conversationId });
  const { results: messages, isLoading } = usePaginatedQuery(api.internalComms.listConversationMessages, { conversationId }, { initialNumItems: 30 });
  const sendMessage = useMutation(api.internalComms.sendMessage);
  const markRead = useMutation(api.internalComms.markConversationRead);
  const deleteMessage = useMutation(api.internalComms.deleteMessage);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useMemo(() => { markRead({ conversationId }).catch(() => {}); }, [conversationId, markRead]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendMessage({ conversationId, body: draft.trim() });
      setDraft("");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const title = conversation?.kind === "group" || conversation?.kind === "org" ? conversation?.name : conversation?.participants.find(() => true)?.name;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b px-4 py-3 shrink-0">
        <button onClick={onBack} className="md:hidden text-gray-400 cursor-pointer"><ChevronLeft size={18} /></button>
        <div className="w-8 h-8 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] shrink-0">
          {conversation?.kind === "direct" ? <Send size={13} /> : conversation?.kind === "org" ? <Hash size={13} /> : <Users size={13} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{title ?? "Conversation"}</p>
          {conversation && <p className="text-[11px] text-gray-400">{conversation.participants.length} member{conversation.participants.length !== 1 ? "s" : ""}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col-reverse">
        {isLoading && messages.length === 0 ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-2/3" />)}</div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No messages yet. Say hello!</p>
        ) : (
          [...messages].reverse().map((m) => (
            <div key={m._id} className="group flex items-start gap-2">
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-gray-800">{m.senderName}</span>
                  <span className="text-[10px] text-gray-400">{isToday(parseISO(m._creationTime ? new Date(m._creationTime).toISOString() : new Date().toISOString())) ? format(new Date(m._creationTime), "HH:mm") : format(new Date(m._creationTime), "dd MMM, HH:mm")}</span>
                </div>
                <p className={cn("text-sm mt-0.5", m.deletedAt ? "text-gray-400 italic" : "text-gray-700")}>{m.deletedAt ? "Message removed" : m.body}</p>
              </div>
              {!m.deletedAt && (
                <button onClick={() => deleteMessage({ id: m._id })} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 cursor-pointer transition-opacity">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t p-3 flex items-center gap-2 shrink-0">
        <Input
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !draft.trim()}><Send size={14} /></Button>
      </div>
    </div>
  );
}

// ── Inbox Tab ─────────────────────────────────────────────────────────────

function InboxTab({ access }: { access: CommsAccess }) {
  const conversations = useQuery(api.internalComms.listMyConversations, {});
  const [selected, setSelected] = useState<Id<"conversations"> | null>(null);
  const [showNewDm, setShowNewDm] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);

  if (conversations === undefined) return <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;

  return (
    <div className="flex h-[560px] rounded-xl border overflow-hidden">
      <div className={cn("w-full md:w-72 border-r flex flex-col shrink-0", selected && "hidden md:flex")}>
        <div className="p-3 border-b flex items-center gap-2 shrink-0">
          <Button size="sm" className="flex-1 gap-1.5" onClick={() => setShowNewDm(true)}><MessageSquarePlus size={13} /> New</Button>
          {access.canManageChannels && (
            <Button size="sm" variant="secondary" onClick={() => setShowNewChannel(true)}><Hash size={13} /></Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <Inbox size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">No conversations yet</p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelected(c._id)}
                className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer hover:bg-gray-50 border-b border-gray-50", selected === c._id && "bg-blue-50")}
              >
                <div className="w-8 h-8 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] shrink-0">
                  {c.kind === "direct" ? <Send size={12} /> : c.kind === "org" ? <Hash size={12} /> : <Users size={12} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm truncate", c.unread ? "font-bold text-gray-900" : "font-medium text-gray-700")}>{c.name ?? "Direct Message"}</p>
                  <p className="text-[11px] text-gray-400 truncate">{c.lastMessagePreview ?? "No messages yet"}</p>
                </div>
                {c.unread && <span className="w-2 h-2 rounded-full bg-[var(--brand)] shrink-0" />}
              </button>
            ))
          )}
        </div>
      </div>
      <div className={cn("flex-1", !selected && "hidden md:flex md:items-center md:justify-center")}>
        {selected ? (
          <ConversationThread conversationId={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="text-center text-gray-300">
            <Inbox size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Select a conversation</p>
          </div>
        )}
      </div>
      <NewConversationDialog open={showNewDm} onClose={() => setShowNewDm(false)} onCreated={setSelected} />
      <NewOrgChannelDialog open={showNewChannel} onClose={() => setShowNewChannel(false)} onCreated={setSelected} />
    </div>
  );
}

// ── Channels & Groups Tab (management overview) ──────────────────────────

function ChannelsTab({ access }: { access: CommsAccess }) {
  const conversations = useQuery(api.internalComms.listMyConversations, {});
  const [showNewChannel, setShowNewChannel] = useState(false);

  if (conversations === undefined) return <Skeleton className="h-40 w-full" />;
  const channels = conversations.filter((c) => c.kind !== "direct");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Group channels and org-wide channels you belong to.</p>
        {access.canManageChannels && <Button size="sm" className="gap-1.5" onClick={() => setShowNewChannel(true)}><Plus size={13} /> New Org Channel</Button>}
      </div>
      {channels.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Hash /></EmptyMedia>
            <EmptyTitle>No channels yet</EmptyTitle>
            <EmptyDescription>Group and org-wide channels will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {channels.map((c) => (
            <div key={c._id} className="rounded-xl border p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] shrink-0">
                {c.kind === "org" ? <Hash size={15} /> : <Users size={15} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                <p className="text-[11px] text-gray-400">{c.memberCount} member{c.memberCount !== 1 ? "s" : ""} · {c.kind === "org" ? "Org-wide" : "Group"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <NewOrgChannelDialog open={showNewChannel} onClose={() => setShowNewChannel(false)} onCreated={() => setShowNewChannel(false)} />
    </div>
  );
}

// ── New Announcement Dialog ───────────────────────────────────────────────

function NewAnnouncementDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const scopes = useQuery(api.internalComms.listOrgScopesForChannels, open ? {} : "skip");
  const createAnnouncement = useMutation(api.internalComms.createAnnouncement);
  const [form, setForm] = useState({
    title: "", body: "", priority: "normal" as "normal" | "important" | "urgent",
    audienceType: "all_staff" as "all_staff" | "directorate" | "department" | "unit",
    audienceId: "", requiresAcknowledgement: false, expiresAt: "",
  });
  const [saving, setSaving] = useState(false);
  const set = useCallback(<K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm((f) => ({ ...f, [k]: v })), []);

  const options = form.audienceType === "directorate" ? scopes?.directorates : form.audienceType === "department" ? scopes?.departments : form.audienceType === "unit" ? scopes?.units : undefined;

  const handleSave = async (publishNow: boolean) => {
    if (!form.title.trim() || !form.body.trim()) { toast.error("Title and message are required"); return; }
    if (form.audienceType !== "all_staff" && !form.audienceId) { toast.error("Select the audience scope"); return; }
    setSaving(true);
    try {
      await createAnnouncement({
        title: form.title.trim(),
        body: form.body.trim(),
        priority: form.priority,
        audienceType: form.audienceType,
        audienceDirectorateId: form.audienceType === "directorate" ? (form.audienceId as Id<"directorates">) : undefined,
        audienceDepartmentId: form.audienceType === "department" ? (form.audienceId as Id<"departments">) : undefined,
        audienceUnitId: form.audienceType === "unit" ? (form.audienceId as Id<"units">) : undefined,
        requiresAcknowledgement: form.requiresAcknowledgement,
        expiresAt: form.expiresAt || undefined,
        publishNow,
      });
      toast.success(publishNow ? "Announcement published" : "Draft saved");
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input className="mt-1" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Office closed for public holiday" /></div>
          <div><Label>Message</Label><Textarea className="mt-1" rows={4} value={form.body} onChange={(e) => set("body", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v as typeof form.priority)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expires (optional)</Label>
              <Input type="datetime-local" className="mt-1" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Audience</Label>
            <Select value={form.audienceType} onValueChange={(v) => set("audienceType", v as typeof form.audienceType)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_staff">All Staff</SelectItem>
                <SelectItem value="directorate">Directorate</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="unit">Unit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.audienceType !== "all_staff" && (
            <div>
              <Label>{form.audienceType.charAt(0).toUpperCase() + form.audienceType.slice(1)}</Label>
              <Select value={form.audienceId} onValueChange={(v) => set("audienceId", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{options?.map((o) => <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={form.requiresAcknowledgement} onCheckedChange={(v) => set("requiresAcknowledgement", v)} id="ack" />
            <Label htmlFor="ack" className="cursor-pointer">Require acknowledgement</Label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" disabled={saving} onClick={() => handleSave(false)}>Save Draft</Button>
          <Button disabled={saving} onClick={() => handleSave(true)}>{saving ? "Publishing…" : "Publish Now"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Announcements Tab ─────────────────────────────────────────────────────

function AnnouncementsTab({ access }: { access: CommsAccess }) {
  const feed = useQuery(api.internalComms.listAnnouncementsForMe, {});
  const managed = useQuery(api.internalComms.listAllAnnouncements, access.canAnnounce ? {} : "skip");
  const acknowledge = useMutation(api.internalComms.acknowledgeAnnouncement);
  const cancelAnnouncement = useMutation(api.internalComms.cancelAnnouncement);
  const publishAnnouncement = useMutation(api.internalComms.publishAnnouncement);
  const [showNew, setShowNew] = useState(false);

  if (feed === undefined) return <Skeleton className="h-40 w-full" />;

  const handleAck = async (id: Id<"announcements">) => {
    try {
      await acknowledge({ announcementId: id });
      toast.success("Acknowledged");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to acknowledge");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Company-wide and department announcements for your assigned audience.</p>
        {access.canAnnounce && <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}><Megaphone size={13} /> New Announcement</Button>}
      </div>

      {feed.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Megaphone /></EmptyMedia>
            <EmptyTitle>No announcements right now</EmptyTitle>
            <EmptyDescription>Published announcements for you will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {feed.map((a) => {
            const p = PRIORITY_CFG[a.priority];
            return (
              <div key={a._id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", p.bg, p.color)}>{p.label}</span>
                      <span className="text-[10px] text-gray-400">{format(parseISO(a.createdAt), "dd MMM yyyy, HH:mm")}</span>
                    </div>
                    <p className="font-semibold text-sm text-gray-900">{a.title}</p>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.body}</p>
                  </div>
                </div>
                {a.requiresAcknowledgement && (
                  a.myAck?.acknowledgedAt ? (
                    <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-green-600"><CheckCircle2 size={12} /> Acknowledged</span>
                  ) : (
                    <Button size="sm" className="mt-3 gap-1.5" onClick={() => handleAck(a._id)}><CheckCircle2 size={12} /> Acknowledge</Button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {access.canAnnounce && managed && managed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">All Announcements (Management)</p>
          <div className="space-y-2">
            {managed.map((a) => (
              <div key={a._id} className="flex items-center justify-between rounded-xl border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                  <p className="text-[11px] text-gray-400">{a.audienceType.replace("_", " ")} · {a.status}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={a.status === "published" ? "default" : "secondary"} className="text-[11px]">{a.status}</Badge>
                  {a.status === "draft" && (
                    <Button size="sm" variant="secondary" onClick={() => publishAnnouncement({ id: a._id })}>Publish</Button>
                  )}
                  {a.status === "published" && (
                    <Button size="sm" variant="secondary" onClick={() => cancelAnnouncement({ id: a._id })}>Cancel</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <NewAnnouncementDialog open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

// ── Communication Settings Tab ────────────────────────────────────────────

function CommsSettingsTab({ access }: { access: CommsAccess }) {
  if (!access.canManageSettings) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Lock /></EmptyMedia>
          <EmptyTitle>Restricted</EmptyTitle>
          <EmptyDescription>You do not have permission to manage communication settings.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-1">Feature control</p>
          <p>Enhanced Internal Communications is turned on or off from the <strong>Features</strong> tab under Settings, alongside the other controlled enhancements. Turning it off never deletes any messages, channels, or announcements — it only hides the Inbox, Channels, and Announcements sub-tabs from staff until re-enabled.</p>
        </div>
      </div>
      <div className="rounded-xl border p-4">
        <p className="font-medium text-gray-800 mb-1 text-sm">Who can broadcast</p>
        <p className="text-xs text-gray-500">
          Creating org-wide channels and publishing announcements requires the explicit <code className="bg-gray-100 px-1 rounded">communications.channel_manage</code> and <code className="bg-gray-100 px-1 rounded">communications.announce</code> permissions, granted from Access Control. Regular direct/group messaging is available to all staff.
        </p>
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────

type InternalTab = "inbox" | "channels" | "announcements" | "settings";

const INTERNAL_TABS: { id: InternalTab; label: string; icon: React.ElementType }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "channels", label: "Channels & Groups", icon: Hash },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "settings", label: "Settings", icon: Lock },
];

export default function InternalCommsPanel({ access }: { access: CommsAccess }) {
  const [tab, setTab] = useState<InternalTab>("inbox");

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {INTERNAL_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
              tab === t.id ? "bg-[var(--brand)] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>
      {tab === "inbox" && <InboxTab access={access} />}
      {tab === "channels" && <ChannelsTab access={access} />}
      {tab === "announcements" && <AnnouncementsTab access={access} />}
      {tab === "settings" && <CommsSettingsTab access={access} />}
    </div>
  );
}
