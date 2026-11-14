import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { Video, Plus, Search, Calendar, Building2, MapPin, HardHat, User, X, Lock, BookOpen } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { ErrorState, ErrorStateHeader, ErrorStateMedia, ErrorStateTitle, ErrorStateDescription, ErrorStateContent } from "@/components/ui/error-state.tsx";
import { cn } from "@/lib/utils.ts";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-gray-500", bg: "bg-gray-100" },
  requested: { label: "Requested", color: "text-amber-700", bg: "bg-amber-50" },
  scheduled: { label: "Scheduled", color: "text-blue-700", bg: "bg-blue-50" },
  confirmed: { label: "Confirmed", color: "text-indigo-700", bg: "bg-indigo-50" },
  live: { label: "Live Now", color: "text-white", bg: "bg-red-500" },
  completed: { label: "Completed", color: "text-green-700", bg: "bg-green-100" },
  cancelled: { label: "Cancelled", color: "text-gray-400", bg: "bg-gray-50" },
  no_show: { label: "No Show", color: "text-orange-700", bg: "bg-orange-50" },
  rescheduled: { label: "Rescheduled", color: "text-purple-700", bg: "bg-purple-50" },
};

const TYPE_ICON: Record<string, React.ElementType> = {
  property: Building2,
  estate: MapPin,
  construction: HardHat,
};

export default function AdminLiveInspections() {
  const featureStatus = useQuery(api.liveInspections.getFeatureStatus, {});
  const access = useQuery(api.liveInspections.getMyAccess, {});
  const [searchParams] = useSearchParams();
  const propertyIdFilter = searchParams.get("propertyId");
  const clientIdFilter = searchParams.get("clientId");
  const estateIdFilter = searchParams.get("estateId");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(searchParams.get("action") === "schedule");

  // Only fetch the list once we know the caller is allowed to view it — an
  // unauthorized fetch would throw and render blank instead of the access
  // denied screen below.
  const inspections = useQuery(
    api.liveInspections.list,
    access?.canView ? (statusFilter === "all" ? {} : { status: statusFilter }) : "skip"
  );

  if (featureStatus === undefined || access === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!featureStatus.enabled) {
    return (
      <ErrorState>
        <ErrorStateHeader>
          <ErrorStateMedia variant="icon">
            <Video />
          </ErrorStateMedia>
          <ErrorStateTitle>Live Virtual Inspection is currently off</ErrorStateTitle>
          <ErrorStateDescription>
            An administrator can turn this feature on from Settings → Access Control. Existing inspection records are preserved and will reappear once the feature is re-enabled.
          </ErrorStateDescription>
        </ErrorStateHeader>
        <ErrorStateContent>
          <Button size="sm" asChild>
            <Link to="/admin/settings">Go to Settings</Link>
          </Button>
        </ErrorStateContent>
      </ErrorState>
    );
  }

  if (!access.canView) {
    return (
      <ErrorState>
        <ErrorStateHeader>
          <ErrorStateMedia variant="icon">
            <Lock />
          </ErrorStateMedia>
          <ErrorStateTitle>You don't have access to Live Inspections</ErrorStateTitle>
          <ErrorStateDescription>
            {access.isAdmin
              ? "Your account is an administrator but has not been granted the \"View Live Inspections\" permission yet. Grant it to yourself (or your role) from Users & Roles → Permissions."
              : "Ask an administrator to grant you the required Live Inspection permissions from Users & Roles → Permissions."}
          </ErrorStateDescription>
        </ErrorStateHeader>
        <ErrorStateContent>
          {access.isAdmin && (
            <Button size="sm" asChild>
              <Link to="/admin/users">Go to Users & Roles</Link>
            </Button>
          )}
        </ErrorStateContent>
      </ErrorState>
    );
  }

  const filtered = (inspections ?? []).filter((i) => {
    if (propertyIdFilter && i.propertyId !== propertyIdFilter) return false;
    if (clientIdFilter && i.clientId !== clientIdFilter) return false;
    if (estateIdFilter && i.estateId !== estateIdFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return i.inspectionRef.toLowerCase().includes(s) || i.clientName.toLowerCase().includes(s) || (i.propertyTitle ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Live Virtual Inspection</h1>
          <p className="text-sm text-gray-500">Schedule and manage remote video inspections for properties, estates, and construction sites</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer bg-[var(--brand)] text-white hover:opacity-90 shrink-0">
          <Plus size={15} /> Schedule Inspection
        </Button>
      </div>

      <div className="flex justify-end">
        <Link to="/admin/live-inspections/guide" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:underline">
          <BookOpen size={12} /> View User Guide
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by reference, client, or property…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(propertyIdFilter || clientIdFilter || estateIdFilter) && (
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--brand)] bg-[var(--brand)]/5 border border-[var(--brand)]/20 rounded-lg px-3 py-2 w-fit">
          Showing inspections linked to the selected {propertyIdFilter ? "property" : estateIdFilter ? "estate" : "client"}
          <Link to="/admin/live-inspections" className="inline-flex items-center gap-1 hover:underline">
            <X size={12} /> Clear
          </Link>
        </div>
      )}

      {inspections === undefined ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Video /></EmptyMedia>
            <EmptyTitle>No live inspections yet</EmptyTitle>
            <EmptyDescription>Schedule a live remote inspection for a client to get started.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)}>Schedule Inspection</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {filtered.map((inspection) => {
            const TypeIcon = TYPE_ICON[inspection.inspectionType] ?? Building2;
            const cfg = STATUS_CFG[inspection.status] ?? STATUS_CFG.draft;
            return (
              <Link
                key={inspection._id}
                to={`/admin/live-inspections/${inspection._id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <TypeIcon size={16} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">{inspection.inspectionRef}</span>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {inspection.clientName} · {inspection.propertyTitle ?? inspection.estateName ?? "No property linked"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                    <Calendar size={11} />
                    {inspection.scheduledAt ? format(new Date(inspection.scheduledAt), "MMM d, yyyy · h:mm a") : "Not scheduled"}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                    <User size={11} /> {inspection.officerName ?? "Unassigned"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {createOpen && (
        <CreateInspectionDialog
          onClose={() => setCreateOpen(false)}
          initialClientId={clientIdFilter ?? undefined}
          initialPropertyId={propertyIdFilter ?? undefined}
          initialEstateId={estateIdFilter ?? undefined}
        />
      )}
    </div>
  );
}

// ─── Create Inspection Dialog ────────────────────────────────────────────────

function CreateInspectionDialog({
  onClose,
  initialClientId,
  initialPropertyId,
  initialEstateId,
}: {
  onClose: () => void;
  initialClientId?: string;
  initialPropertyId?: string;
  initialEstateId?: string;
}) {
  const clients = useQuery(api.clients.listClients, {});
  const properties = useQuery(api.properties.listAll, {});
  const estates = useQuery(api.admin.listEstates);
  const staff = useQuery(api.users.listAll, {});
  const create = useMutation(api.liveInspections.create);

  const [inspectionType, setInspectionType] = useState<"property" | "estate" | "construction">(initialEstateId ? "estate" : "property");
  const [clientId, setClientId] = useState<string>(initialClientId ?? "");
  const [propertyId, setPropertyId] = useState<string>(initialPropertyId ?? "");
  const [estateId, setEstateId] = useState<string>(initialEstateId ?? "");
  const [officerId, setOfficerId] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const staffUsers = (staff ?? []).filter((u) => u.role === "super_admin" || u.role === "admin" || u.role === "manager" || u.role === "agent");

  const handleSubmit = async () => {
    if (!clientId) { toast.error("Select a client"); return; }
    if (inspectionType !== "construction" && !propertyId && !estateId) {
      toast.error("Select a property or estate to inspect");
      return;
    }
    setSaving(true);
    try {
      await create({
        inspectionType,
        clientId: clientId as Id<"clients">,
        propertyId: (inspectionType === "property" || inspectionType === "construction") && propertyId ? (propertyId as Id<"properties">) : undefined,
        estateId: inspectionType === "estate" && estateId ? (estateId as Id<"estates">) : undefined,
        assignedOfficer: officerId ? (officerId as Id<"users">) : undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });
      toast.success("Live inspection scheduled");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule inspection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Live Inspection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Inspection Type</Label>
            <Select value={inspectionType} onValueChange={(v) => { setInspectionType(v as typeof inspectionType); setPropertyId(""); setEstateId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="property">Live Property Inspection</SelectItem>
                <SelectItem value="estate">Live Estate / Location Inspection</SelectItem>
                <SelectItem value="construction">Live Construction Inspection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select a client…" /></SelectTrigger>
              <SelectContent>
                {(clients ?? []).map((c) => <SelectItem key={c._id} value={c._id}>{c.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {inspectionType === "estate" ? (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Estate</Label>
              <Select value={estateId} onValueChange={setEstateId}>
                <SelectTrigger><SelectValue placeholder="Select an estate…" /></SelectTrigger>
                <SelectContent>
                  {(estates ?? []).map((e) => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger><SelectValue placeholder="Select a property…" /></SelectTrigger>
                <SelectContent>
                  {(properties ?? []).map((p) => <SelectItem key={p._id} value={p._id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Assigned Officer</Label>
            <Select value={officerId} onValueChange={setOfficerId}>
              <SelectTrigger><SelectValue placeholder="Select an officer…" /></SelectTrigger>
              <SelectContent>
                {staffUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Scheduled Date &amp; Time</Label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 text-gray-800"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-[var(--brand)] text-white hover:opacity-90 cursor-pointer">
            {saving ? "Scheduling…" : "Schedule Inspection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
