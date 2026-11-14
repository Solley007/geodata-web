import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { CalendarClock, Globe2, Megaphone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { cn } from "@/lib/utils.ts";

/**
 * Consultation bookings from Diaspora programme pages — always linked back
 * into the existing CRM lead pipeline via `leadId`. Staff assign an officer
 * and move each through requested → scheduled → completed/no_show/cancelled.
 */

type Status = Doc<"diasporaConsultations">["status"];
type ConsultationRow = Doc<"diasporaConsultations"> & {
  leadName: string; leadEmail: string | undefined; leadPhone: string; leadCountry: string | undefined; campaignName: string | undefined;
};

const STATUS_OPTIONS: Array<{ value: Status; label: string }> = [
  { value: "requested", label: "Requested" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-Show" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLOR: Record<Status, string> = {
  requested: "bg-amber-100 text-amber-700",
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  no_show: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-600",
};

const TYPE_LABELS: Record<Doc<"diasporaConsultations">["consultationType"], string> = {
  property: "Property Consultation",
  investment: "Investment Consultation",
  advisory: "General Advisory",
  development: "Development Discussion",
  partnership: "Partnership Discussion",
  corporate: "Corporate / Institutional Briefing",
  virtual_presentation: "Virtual Presentation",
};

const PROGRAMME_LABELS: Record<Doc<"diasporaConsultations">["programmeKey"], string> = {
  own: "Own", invest: "Invest", partner: "Partner", refer: "Refer", corporate: "Corporate",
};

export default function DiasporaConsultationsPanel() {
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const consultations = useQuery(api.diaspora.consultations.listConsultations, statusFilter === "all" ? {} : { status: statusFilter });
  const [selectedId, setSelectedId] = useState<Id<"diasporaConsultations"> | null>(null);

  if (consultations === undefined) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  const selected = consultations.find((c) => c._id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Consultations</h2>
          <p className="text-sm text-gray-500 mt-0.5">Bookings from programme pages — each is already a lead in the sales pipeline.</p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
          <SelectTrigger className="w-44 cursor-pointer"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {consultations.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarClock /></EmptyMedia>
            <EmptyTitle>No consultations yet</EmptyTitle>
            <EmptyDescription>Bookings from the "Book a Consultation" CTA on programme pages will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {consultations.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedId(c._id)}
              className="w-full text-left p-5 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{c.leadName}</p>
                  <Badge className={cn("text-xs", STATUS_COLOR[c.status])}>{STATUS_OPTIONS.find((s) => s.value === c.status)?.label}</Badge>
                  <Badge className="text-xs bg-violet-100 text-violet-700">{PROGRAMME_LABELS[c.programmeKey]}</Badge>
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>{TYPE_LABELS[c.consultationType]}</span>
                  {c.leadCountry && <span className="flex items-center gap-1"><Globe2 size={11} /> {c.leadCountry}</span>}
                  {c.campaignName && <span className="flex items-center gap-1"><Megaphone size={11} /> {c.campaignName}</span>}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <ConsultationDetailDialog consultation={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function ConsultationDetailDialog({ consultation, onClose }: { consultation: ConsultationRow; onClose: () => void }) {
  const staff = useQuery(api.users.listAll);
  const assignOfficer = useMutation(api.diaspora.consultations.assignConsultationOfficer);
  const updateStatus = useMutation(api.diaspora.consultations.updateConsultationStatus);

  const [scheduledAt, setScheduledAt] = useState(consultation.scheduledAt ?? "");
  const [outcome, setOutcome] = useState(consultation.outcome ?? "");
  const [followUpDate, setFollowUpDate] = useState(consultation.followUpDate ?? "");

  const staffOptions = (staff ?? []).filter((u) => u.role === "admin" || u.role === "manager" || u.role === "agent" || u.role === "super_admin");

  const handleAssign = async (officerId: string) => {
    try {
      await assignOfficer({ id: consultation._id, officerId: officerId === "none" ? undefined : (officerId as Id<"users">) });
      toast.success("Officer assignment updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign officer");
    }
  };

  const handleStatusChange = async (status: Status) => {
    try {
      await updateStatus({
        id: consultation._id, status,
        scheduledAt: scheduledAt || undefined,
        outcome: outcome || undefined,
        followUpDate: followUpDate || undefined,
      });
      toast.success(`Status updated to ${STATUS_OPTIONS.find((s) => s.value === status)?.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleSaveDetails = async () => {
    try {
      await updateStatus({
        id: consultation._id, status: consultation.status,
        scheduledAt: scheduledAt || undefined,
        outcome: outcome || undefined,
        followUpDate: followUpDate || undefined,
      });
      toast.success("Consultation details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save details");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>{consultation.leadName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-500 space-y-0.5">
            {consultation.leadEmail && <p>{consultation.leadEmail}</p>}
            <p>{consultation.leadPhone}</p>
            {consultation.leadCountry && <p className="flex items-center gap-1"><Globe2 size={12} /> {consultation.leadCountry}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={consultation.status} onValueChange={(v) => handleStatusChange(v as Status)}>
                <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><User size={13} /> Assigned Officer</Label>
              <Select value={consultation.assignedOfficer ?? "none"} onValueChange={handleAssign}>
                <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {staffOptions.map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email ?? "Staff"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Scheduled At</Label>
            <Input type="datetime-local" value={scheduledAt ? scheduledAt.slice(0, 16) : ""} onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : "")} />
          </div>

          {consultation.notes && (
            <div className="space-y-1.5">
              <Label>Visitor Notes</Label>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{consultation.notes}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={3} placeholder="Summary once completed..." />
          </div>

          <div className="space-y-1.5">
            <Label>Follow-Up Date</Label>
            <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>

          <Button onClick={handleSaveDetails} className="w-full cursor-pointer">Save Details</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
