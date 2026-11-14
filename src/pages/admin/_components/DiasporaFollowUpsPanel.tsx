import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { FollowUpRow } from "@/convex/diaspora/followUps.ts";
import { toast } from "sonner";
import { format, formatDistanceToNowStrict } from "date-fns";
import { AlarmClock, Globe2, Inbox, Megaphone, Phone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

/**
 * 48-hour follow-up desk — the online version of the "Geodata use only" box
 * on the printed lead form (owner, date received, follow-up due, status/notes).
 * Works directly on the existing sales pipeline leads.
 */

type StageTab = "new" | "contacted";
type Stage = "new" | "contacted" | "qualified" | "lost";

const STAGE_OPTIONS: Array<{ value: Stage; label: string }> = [
  { value: "new", label: "New — not yet contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "lost", label: "Not proceeding" },
];

const SOON_MS = 12 * 60 * 60 * 1000;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError) return (err.data as { message?: string }).message ?? fallback;
  return fallback;
}

function DueBadge({ dueAt, stage }: { dueAt: number; stage: string }) {
  if (stage !== "new") return <Badge className="text-xs bg-green-100 text-green-700">Contacted</Badge>;
  const remaining = dueAt - Date.now();
  if (remaining < 0) return <Badge className="text-xs bg-red-100 text-red-700">Overdue by {formatDistanceToNowStrict(dueAt)}</Badge>;
  if (remaining < SOON_MS) return <Badge className="text-xs bg-amber-100 text-amber-700">Due in {formatDistanceToNowStrict(dueAt)}</Badge>;
  return <Badge className="text-xs bg-gray-100 text-gray-600">Due in {formatDistanceToNowStrict(dueAt)}</Badge>;
}

export default function DiasporaFollowUpsPanel() {
  const [tab, setTab] = useState<StageTab>("new");
  const rows = useQuery(api.diaspora.followUps.listFollowUps, { stage: tab });
  const [selectedId, setSelectedId] = useState<Id<"leads"> | null>(null);
  const selected = rows?.find((r) => r._id === selectedId) ?? null;
  const overdue = tab === "new" && rows ? rows.filter((r) => r.dueAt < Date.now()).length : 0;

  return (
    <div className="space-y-4">
      <ForumOptionToggle />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><AlarmClock size={16} className="text-[var(--brand)]" /> 48-hour follow-up</h2>
          <p className="text-sm text-gray-500 mt-0.5">Every Diaspora enquiry should be contacted within 48 hours of being received.</p>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v === "contacted" ? "contacted" : "new")}>
          <TabsList>
            <TabsTrigger value="new" className="cursor-pointer">Awaiting contact</TabsTrigger>
            <TabsTrigger value="contacted" className="cursor-pointer">Contacted</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {overdue > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {overdue} {overdue === 1 ? "enquiry is" : "enquiries are"} past the 48-hour follow-up window.
        </div>
      )}

      {rows === undefined ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Inbox /></EmptyMedia>
            <EmptyTitle>{tab === "new" ? "All caught up" : "No contacted enquiries yet"}</EmptyTitle>
            <EmptyDescription>{tab === "new" ? "No Diaspora enquiries are waiting for first contact." : "Enquiries you mark as contacted will appear here."}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {rows.map((r) => (
            <button key={r._id} onClick={() => setSelectedId(r._id)} className="w-full text-left p-4 sm:p-5 hover:bg-gray-50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 truncate">{r.name}</p>
                  <DueBadge dueAt={r.dueAt} stage={r.stage} />
                  {r.source === "qr_code" && <Badge className="text-xs bg-violet-100 text-violet-700">QR / campaign</Badge>}
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-3 flex-wrap">
                  <span>Received {format(r.receivedAt, "d MMM, HH:mm")}</span>
                  {r.country && <span className="flex items-center gap-1"><Globe2 size={11} /> {r.country}</span>}
                  {r.campaignName && <span className="flex items-center gap-1"><Megaphone size={11} /> {r.campaignName}</span>}
                </p>
              </div>
              <span className={cn("text-xs flex items-center gap-1 shrink-0", r.ownerName ? "text-gray-600" : "text-amber-600 font-medium")}>
                <User size={12} /> {r.ownerName ?? "No owner yet"}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && <FollowUpDialog row={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function ForumOptionToggle() {
  const settings = useQuery(api.diaspora.followUps.getEnquirySettings, {});
  const setVisible = useMutation(api.diaspora.followUps.setForumOptionVisible);
  const [saving, setSaving] = useState(false);

  const handleChange = async (visible: boolean) => {
    setSaving(true);
    try {
      await setVisible({ visible });
      toast.success(visible ? "Forum option is now shown on the enquiry form" : "Forum option is now hidden from the enquiry form");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update this setting"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
      <div>
        <p className="font-medium text-sm text-gray-800">Show "Meet at the forum (28–29 October)"</p>
        <p className="text-xs text-gray-400 mt-0.5">Turn off after the forum so visitors no longer see it as a next step.</p>
      </div>
      {settings === undefined
        ? <Skeleton className="h-5 w-9 rounded-full" />
        : <Switch checked={settings.forumOptionVisible} onCheckedChange={handleChange} disabled={saving} className="cursor-pointer" />}
    </div>
  );
}

function FollowUpDialog({ row, onClose }: { row: FollowUpRow; onClose: () => void }) {
  const staff = useQuery(api.users.listAll);
  const updateFollowUp = useMutation(api.diaspora.followUps.updateFollowUp);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const staffOptions = (staff ?? []).filter((u) => u.role === "admin" || u.role === "manager" || u.role === "agent" || u.role === "super_admin");

  const save = async (args: { assignedTo?: Id<"users"> | null; stage?: Stage; note?: string }, success: string) => {
    setSaving(true);
    try {
      await updateFollowUp({ id: row._id, ...args });
      toast.success(success);
      if (args.note) setNote("");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update this enquiry"));
    } finally {
      setSaving(false);
    }
  };

  const currentStage = STAGE_OPTIONS.some((s) => s.value === row.stage) ? row.stage : "new";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>{row.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-500 space-y-0.5">
            {row.email && <p>{row.email}</p>}
            <p className="flex items-center gap-1"><Phone size={12} /> {row.phone}</p>
            {row.country && <p className="flex items-center gap-1"><Globe2 size={12} /> {row.country}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-gray-400">Date received</p>
              <p className="font-medium text-gray-800 mt-0.5">{format(row.receivedAt, "d MMM yyyy, HH:mm")}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-gray-400">48-hour follow-up due</p>
              <p className="font-medium text-gray-800 mt-0.5">{format(row.dueAt, "d MMM yyyy, HH:mm")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><User size={13} /> Lead owner</Label>
              <Select value={row.assignedTo ?? "none"} onValueChange={(v) => save({ assignedTo: v === "none" ? null : (v as Id<"users">) }, "Lead owner updated")} disabled={saving}>
                <SelectTrigger className="w-full cursor-pointer"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No owner</SelectItem>
                  {staffOptions.map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email ?? "Staff"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={currentStage} onValueChange={(v) => save({ stage: v as Stage }, "Status updated")} disabled={saving}>
                <SelectTrigger className="w-full cursor-pointer"><SelectValue /></SelectTrigger>
                <SelectContent>{STAGE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {row.notes && (
            <div className="space-y-1.5">
              <Label>Enquiry answers and notes</Label>
              <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-line">{row.notes}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Add a follow-up note</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Spoke on WhatsApp, sending price schedule today" />
          </div>
          <Button onClick={() => save({ note }, "Note added")} disabled={saving || !note.trim()} className="w-full cursor-pointer">Add note</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
