import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { toast } from "sonner";
import {
  Radio, Megaphone, Plus, Pencil, Trash2, Eye, EyeOff,
  GripVertical, ChevronUp, ChevronDown, ExternalLink,
  Bell, Info, CheckCircle2, AlertTriangle, Zap, MoreVertical,
  MousePointerClick, Clock, MapPin, RefreshCw, MessagesSquare, Lock, FileBarChart,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import InternalCommsPanel from "./_components/InternalCommsPanel.tsx";
import ReportsPanel from "./_components/ReportsPanel.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Skeleton as CommsSkeleton } from "@/components/ui/skeleton.tsx";

// ─── Types ─────────────────────────────────────────────────────────────────

type TickerRow = {
  _id: Id<"tickerMessages">;
  _creationTime: number;
  text: string;
  link?: string;
  linkLabel?: string;
  bgColor?: string;
  textColor?: string;
  isActive: boolean;
  order: number;
};

type PopRow = {
  _id: Id<"popNotifications">;
  _creationTime: number;
  title: string;
  message: string;
  type: string;
  link?: string;
  linkLabel?: string;
  icon?: string;
  isActive: boolean;
  showOnce: boolean;
  delay: number;
  position: string;
  startAt?: string;
  endAt?: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const POP_TYPES = [
  { value: "info",    label: "Info",    icon: Info,           color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
  { value: "success", label: "Success", icon: CheckCircle2,   color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200" },
  { value: "warning", label: "Warning", icon: AlertTriangle,  color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200" },
  { value: "promo",   label: "Promo",   icon: Megaphone,      color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { value: "alert",   label: "Alert",   icon: Bell,           color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200" },
];

const POSITIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left",  label: "Bottom Left" },
  { value: "top-right",    label: "Top Right" },
  { value: "top-left",     label: "Top Left" },
];

function typeStyle(type: string) {
  return POP_TYPES.find((t) => t.value === type) ?? POP_TYPES[0];
}

// ─── Empty Ticker Form ─────────────────────────────────────────────────────

const EMPTY_TICKER = {
  text: "",
  link: "",
  linkLabel: "",
  bgColor: "",
  textColor: "",
  isActive: true,
  order: 0,
};

// ─── Ticker Dialog ──────────────────────────────────────────────────────────

function TickerDialog({
  open,
  onClose,
  initial,
  nextOrder,
}: {
  open: boolean;
  onClose: () => void;
  initial?: TickerRow | null;
  nextOrder: number;
}) {
  const createTicker = useMutation(api.communications.createTicker);
  const updateTicker = useMutation(api.communications.updateTicker);

  const [form, setForm] = useState(() =>
    initial
      ? { ...initial, link: initial.link ?? "", linkLabel: initial.linkLabel ?? "", bgColor: initial.bgColor ?? "", textColor: initial.textColor ?? "" }
      : { ...EMPTY_TICKER, order: nextOrder }
  );
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.text.trim()) { toast.error("Message text is required"); return; }
    setSaving(true);
    try {
      const payload = {
        text: form.text.trim(),
        link: form.link?.trim() || undefined,
        linkLabel: form.linkLabel?.trim() || undefined,
        bgColor: form.bgColor?.trim() || undefined,
        textColor: form.textColor?.trim() || undefined,
        isActive: form.isActive,
        order: form.order,
      };
      if (initial) {
        await updateTicker({ id: initial._id, ...payload });
        toast.success("Ticker message updated");
      } else {
        await createTicker(payload);
        toast.success("Ticker message created — live immediately!");
      }
      onClose();
    } catch {
      toast.error("Failed to save ticker message");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Ticker Message" : "New Ticker Message"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label>Message Text <span className="text-red-500">*</span></Label>
            <Textarea
              className="mt-1"
              rows={2}
              placeholder="e.g. New plots available in Abuja — book your inspection today!"
              value={form.text}
              onChange={(e) => set("text", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CTA Link (optional)</Label>
              <Input className="mt-1" placeholder="https://..." value={form.link} onChange={(e) => set("link", e.target.value)} />
            </div>
            <div>
              <Label>CTA Label</Label>
              <Input className="mt-1" placeholder="Learn more" value={form.linkLabel} onChange={(e) => set("linkLabel", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Background Colour</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.bgColor || "#1a3c7e"} onChange={(e) => set("bgColor", e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border border-gray-200" />
                <Input value={form.bgColor} placeholder="#1a3c7e" onChange={(e) => set("bgColor", e.target.value)} />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Leave blank for brand blue</p>
            </div>
            <div>
              <Label>Text Colour</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.textColor || "#ffffff"} onChange={(e) => set("textColor", e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border border-gray-200" />
                <Input value={form.textColor} placeholder="#ffffff" onChange={(e) => set("textColor", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Display Order</Label>
              <Input type="number" className="mt-1 w-20" value={form.order} onChange={(e) => set("order", Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2 mt-5">
              <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} id="ticker-active" />
              <Label htmlFor="ticker-active">{form.isActive ? "Active (live)" : "Inactive (hidden)"}</Label>
            </div>
          </div>
          {/* Live preview */}
          <div>
            <Label className="text-gray-500 text-xs">Preview</Label>
            <div
              className="mt-1 rounded-lg px-4 py-2 text-[13px] font-medium flex items-center gap-3"
              style={{ background: form.bgColor || "var(--brand)", color: form.textColor || "#fff" }}
            >
              <span className="flex-1 truncate">{form.text || "Your message will appear here…"}</span>
              {form.link && <span className="shrink-0 underline opacity-80 flex items-center gap-1">{form.linkLabel || "Learn more"} <ExternalLink size={11} /></span>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : initial ? "Save Changes" : "Create Message"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pop Notification Dialog ────────────────────────────────────────────────

const EMPTY_POP = {
  title: "",
  message: "",
  type: "info",
  link: "",
  linkLabel: "",
  icon: "",
  isActive: true,
  showOnce: false,
  delay: 2000,
  position: "bottom-right",
  startAt: "",
  endAt: "",
};

function PopDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: PopRow | null;
}) {
  const createPop = useMutation(api.communications.createPopNotification);
  const updatePop = useMutation(api.communications.updatePopNotification);

  const [form, setForm] = useState(() =>
    initial
      ? { ...initial, link: initial.link ?? "", linkLabel: initial.linkLabel ?? "", icon: initial.icon ?? "", startAt: initial.startAt ?? "", endAt: initial.endAt ?? "" }
      : { ...EMPTY_POP }
  );
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.message.trim()) { toast.error("Message is required"); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        link: form.link?.trim() || undefined,
        linkLabel: form.linkLabel?.trim() || undefined,
        icon: form.icon?.trim() || undefined,
        isActive: form.isActive,
        showOnce: form.showOnce,
        delay: Number(form.delay) || 0,
        position: form.position,
        startAt: form.startAt?.trim() || undefined,
        endAt: form.endAt?.trim() || undefined,
      };
      if (initial) {
        await updatePop({ id: initial._id, ...payload });
        toast.success("Notification updated");
      } else {
        await createPop(payload);
        toast.success("Notification created — will show when active!");
      }
      onClose();
    } catch {
      toast.error("Failed to save notification");
    } finally {
      setSaving(false);
    }
  };

  const ts = typeStyle(form.type);
  const TsIcon = ts.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Pop Notification" : "New Pop Notification"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {/* Type + Icon */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Notification Type <span className="text-red-500">*</span></Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <t.icon size={14} className={t.color} /> {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Custom Icon (emoji optional)</Label>
              <Input className="mt-1" placeholder="🎉 or leave blank" value={form.icon} onChange={(e) => set("icon", e.target.value)} />
            </div>
          </div>

          {/* Title + Message */}
          <div>
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input className="mt-1" placeholder="e.g. Special Offer Available!" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label>Message <span className="text-red-500">*</span></Label>
            <Textarea rows={2} className="mt-1" placeholder="Describe the notification in one or two lines…" value={form.message} onChange={(e) => set("message", e.target.value)} />
          </div>

          {/* Link */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CTA Link (optional)</Label>
              <Input className="mt-1" placeholder="https://..." value={form.link} onChange={(e) => set("link", e.target.value)} />
            </div>
            <div>
              <Label>CTA Label</Label>
              <Input className="mt-1" placeholder="View Deal" value={form.linkLabel} onChange={(e) => set("linkLabel", e.target.value)} />
            </div>
          </div>

          {/* Display options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Position on Screen</Label>
              <Select value={form.position} onValueChange={(v) => set("position", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delay Before Showing</Label>
              <Select value={String(form.delay)} onValueChange={(v) => set("delay", Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Immediate</SelectItem>
                  <SelectItem value="1000">1 second</SelectItem>
                  <SelectItem value="2000">2 seconds</SelectItem>
                  <SelectItem value="3000">3 seconds</SelectItem>
                  <SelectItem value="5000">5 seconds</SelectItem>
                  <SelectItem value="8000">8 seconds</SelectItem>
                  <SelectItem value="10000">10 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scheduling */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date/Time (optional)</Label>
              <Input type="datetime-local" className="mt-1" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} />
            </div>
            <div>
              <Label>End Date/Time (optional)</Label>
              <Input type="datetime-local" className="mt-1" value={form.endAt} onChange={(e) => set("endAt", e.target.value)} />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} id="pop-active" />
              <Label htmlFor="pop-active" className="cursor-pointer">{form.isActive ? "Active (live)" : "Inactive (hidden)"}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.showOnce} onCheckedChange={(v) => set("showOnce", v)} id="pop-once" />
              <Label htmlFor="pop-once" className="cursor-pointer">Show once per visitor</Label>
            </div>
          </div>

          {/* Live preview */}
          <div>
            <Label className="text-gray-500 text-xs">Preview</Label>
            <div className={cn("mt-1 rounded-2xl border p-4 shadow-md max-w-xs", ts.bg, ts.border)}>
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {form.icon ? <span className="text-xl">{form.icon}</span> : <TsIcon size={18} className={ts.color} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{form.title || "Title"}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{form.message || "Your message preview"}</p>
                  {form.link && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[var(--brand)]">
                      {form.linkLabel || "Learn more"} <ExternalLink size={10} />
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-gray-300"><span className="text-lg">×</span></div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : initial ? "Save Changes" : "Create Notification"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ticker Tab ─────────────────────────────────────────────────────────────

function TickerTab() {
  const messages = useQuery(api.communications.listAllTicker, {});
  const deleteTicker = useMutation(api.communications.deleteTicker);
  const updateTicker = useMutation(api.communications.updateTicker);
  const reorderTicker = useMutation(api.communications.reorderTicker);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TickerRow | null>(null);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (r: TickerRow) => { setEditing(r); setDialogOpen(true); };

  const handleDelete = async (id: Id<"tickerMessages">) => {
    if (!confirm("Delete this ticker message?")) return;
    await deleteTicker({ id });
    toast.success("Deleted");
  };

  const handleToggle = async (r: TickerRow) => {
    await updateTicker({ id: r._id, isActive: !r.isActive });
    toast.success(r.isActive ? "Message hidden" : "Message is now live");
  };

  const handleMove = async (r: TickerRow, dir: -1 | 1) => {
    if (!messages) return;
    const sorted = [...messages].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((m) => m._id === r._id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    // Swap orders
    const sibling = sorted[newIdx];
    await Promise.all([
      updateTicker({ id: r._id, order: sibling.order }),
      updateTicker({ id: sibling._id, order: r.order }),
    ]);
  };

  if (!messages) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>;

  const active = messages.filter((m) => m.isActive).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm text-gray-500">
            {messages.length} message{messages.length !== 1 ? "s" : ""} · <span className="text-green-600 font-medium">{active} live</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Messages cycle every 5 seconds. Changes are applied in real time.</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus size={14} /> Add Message
        </Button>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Radio size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No ticker messages yet</p>
          <p className="text-sm mt-1">Add your first message to get started</p>
          <Button size="sm" className="mt-4 gap-1" onClick={openCreate}><Plus size={14} /> Add Message</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {[...messages].sort((a, b) => a.order - b.order).map((msg, idx, arr) => (
            <div
              key={msg._id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-all",
                msg.isActive ? "bg-white border-gray-200 shadow-sm" : "bg-gray-50 border-gray-100 opacity-60"
              )}
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button
                  disabled={idx === 0}
                  onClick={() => handleMove(msg, -1)}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronUp size={13} />
                </button>
                <GripVertical size={13} className="text-gray-200" />
                <button
                  disabled={idx === arr.length - 1}
                  onClick={() => handleMove(msg, 1)}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronDown size={13} />
                </button>
              </div>

              {/* Colour swatch */}
              <div
                className="w-2 h-10 rounded-full shrink-0"
                style={{ background: msg.bgColor ?? "var(--brand)" }}
              />

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{msg.text}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {msg.link && (
                    <span className="text-[11px] text-blue-500 flex items-center gap-0.5 truncate">
                      <ExternalLink size={9} /> {msg.link}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">#{idx + 1}</span>
                </div>
              </div>

              {/* Status badge */}
              <Badge variant={msg.isActive ? "default" : "secondary"} className="shrink-0 text-[11px]">
                {msg.isActive ? "Live" : "Hidden"}
              </Badge>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreVertical size={13} /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(msg)}><Pencil size={13} className="mr-2" /> Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggle(msg)}>
                    {msg.isActive ? <><EyeOff size={13} className="mr-2" /> Hide</> : <><Eye size={13} className="mr-2" /> Make Live</>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(msg._id)} className="text-red-500">
                    <Trash2 size={13} className="mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <TickerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editing}
        nextOrder={messages.length}
      />
    </div>
  );
}

// ─── Pop Notifications Tab ──────────────────────────────────────────────────

function PopTab() {
  const notifications = useQuery(api.communications.listAllPopNotifications, {});
  const deletePop = useMutation(api.communications.deletePopNotification);
  const updatePop = useMutation(api.communications.updatePopNotification);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PopRow | null>(null);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (r: PopRow) => { setEditing(r); setDialogOpen(true); };

  const handleDelete = async (id: Id<"popNotifications">) => {
    if (!confirm("Delete this notification?")) return;
    await deletePop({ id });
    toast.success("Deleted");
  };

  const handleToggle = async (r: PopRow) => {
    await updatePop({ id: r._id, isActive: !r.isActive });
    toast.success(r.isActive ? "Notification hidden" : "Notification is now live");
  };

  if (!notifications) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  const active = notifications.filter((n) => n.isActive).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm text-gray-500">
            {notifications.length} notification{notifications.length !== 1 ? "s" : ""} · <span className="text-green-600 font-medium">{active} live</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">All active notifications are shown simultaneously to visitors.</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus size={14} /> Add Notification
        </Button>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No pop notifications yet</p>
          <p className="text-sm mt-1">Create one to engage visitors on the landing page</p>
          <Button size="sm" className="mt-4 gap-1" onClick={openCreate}><Plus size={14} /> Add Notification</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {notifications.map((n) => {
            const ts = typeStyle(n.type);
            const TsIcon = ts.icon;
            const now = new Date().toISOString();
            const scheduled = n.startAt && n.startAt > now;
            const expired = n.endAt && n.endAt < now;
            return (
              <div
                key={n._id}
                className={cn(
                  "rounded-xl border p-4 flex flex-col gap-3 transition-all",
                  n.isActive && !expired ? "bg-white border-gray-200 shadow-sm" : "bg-gray-50 border-gray-100 opacity-60"
                )}
              >
                {/* Header */}
                <div className="flex items-start gap-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ts.bg)}>
                    {n.icon ? <span className="text-base">{n.icon}</span> : <TsIcon size={16} className={ts.color} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{n.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreVertical size={13} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(n as PopRow)}><Pencil size={13} className="mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggle(n as PopRow)}>
                        {n.isActive ? <><EyeOff size={13} className="mr-2" /> Hide</> : <><Eye size={13} className="mr-2" /> Make Live</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(n._id)} className="text-red-500">
                        <Trash2 size={13} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin size={10} /> {POSITIONS.find((p) => p.value === n.position)?.label ?? n.position}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {n.delay === 0 ? "Immediate" : `${n.delay / 1000}s delay`}
                  </span>
                  {n.showOnce && (
                    <span className="flex items-center gap-1">
                      <MousePointerClick size={10} /> Show once
                    </span>
                  )}
                  {n.link && (
                    <span className="flex items-center gap-1 text-blue-400 truncate max-w-[120px]">
                      <ExternalLink size={10} /> {n.link}
                    </span>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {expired ? (
                    <Badge variant="secondary" className="text-[11px]">Expired</Badge>
                  ) : scheduled ? (
                    <Badge variant="secondary" className="text-[11px] text-amber-600 border-amber-200 bg-amber-50">Scheduled</Badge>
                  ) : (
                    <Badge variant={n.isActive ? "default" : "secondary"} className="text-[11px]">
                      {n.isActive ? "Live" : "Hidden"}
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn("text-[11px]", ts.color)}>{n.type}</Badge>
                  {(n.startAt || n.endAt) && (
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <RefreshCw size={9} />
                      {n.startAt ? new Date(n.startAt).toLocaleDateString() : "now"} →{" "}
                      {n.endAt ? new Date(n.endAt).toLocaleDateString() : "∞"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PopDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editing}
      />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

type CTab = "ticker" | "pop" | "internal" | "reports";

const CTABS: { id: CTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "ticker", label: "Ticker Bar", icon: Radio, desc: "Scrolling announcement bar at the top of the homepage" },
  { id: "pop",    label: "Pop Notifications", icon: Bell, desc: "Contextual pop-up cards shown to landing page visitors" },
  { id: "internal", label: "Internal Communications", icon: MessagesSquare, desc: "Staff inbox, channels, and announcements" },
  { id: "reports", label: "Management Reporting", icon: FileBarChart, desc: "Report Centre, approvals, subscriptions, and archive" },
];

export default function AdminCommunications() {
  const [tab, setTab] = useState<CTab>("ticker");
  const commsAccess = useQuery(api.internalComms.getMyCommsAccess, {});
  const reportsAccess = useQuery(api.reporting.getMyReportsAccess, {});

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
          Communications Centre
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage the live ticker bar, instant pop notifications, and internal staff communications.
          Public changes take effect in real time.
        </p>
      </div>

      {/* Status hint */}
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700">
        <Zap size={14} className="shrink-0" />
        <span>Public ticker and pop notification changes are <strong>live immediately</strong> — no publish step required.</span>
      </div>

      {/* Tab selector */}
      <div className="flex gap-3 flex-wrap">
        {CTABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 sm:flex-none flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer",
              tab === t.id
                ? "bg-[var(--brand)] text-white border-[var(--brand)] shadow-md"
                : "bg-white text-gray-700 border-gray-200 hover:border-[var(--brand)] hover:shadow-sm"
            )}
          >
            <t.icon size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">{t.label}</p>
              <p className={cn("text-[11px] mt-0.5", tab === t.id ? "text-blue-100" : "text-gray-400")}>{t.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        {tab === "ticker" && <TickerTab />}
        {tab === "pop" && <PopTab />}
        {tab === "internal" && (
          commsAccess === undefined ? (
            <CommsSkeleton className="h-40 w-full" />
          ) : !commsAccess.featureEnabled ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Lock /></EmptyMedia>
                <EmptyTitle>Enhanced Internal Communications is currently off</EmptyTitle>
                <EmptyDescription>An administrator can turn this on from Settings → Features.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : !commsAccess.isStaff ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Lock /></EmptyMedia>
                <EmptyTitle>Staff access required</EmptyTitle>
                <EmptyDescription>You need staff access to use internal communications.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <InternalCommsPanel access={commsAccess} />
          )
        )}
        {tab === "reports" && (
          reportsAccess === undefined ? (
            <CommsSkeleton className="h-40 w-full" />
          ) : !reportsAccess.featureEnabled ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Lock /></EmptyMedia>
                <EmptyTitle>Management Reporting is currently off</EmptyTitle>
                <EmptyDescription>An administrator can turn this on from Settings → Features.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : !reportsAccess.isStaff || !reportsAccess.canView ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Lock /></EmptyMedia>
                <EmptyTitle>Reporting access required</EmptyTitle>
                <EmptyDescription>You do not have permission to view management reports.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ReportsPanel access={reportsAccess} />
          )
        )}
      </div>
    </div>
  );
}
