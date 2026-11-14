import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Video, Calendar, User, Building2, MapPin, HardHat, CheckCircle2, Circle, Ban, FileText, Link2, Unlink, Download, ListChecks, Lock } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ErrorState, ErrorStateHeader, ErrorStateMedia, ErrorStateTitle, ErrorStateDescription, ErrorStateContent } from "@/components/ui/error-state.tsx";
import { cn } from "@/lib/utils.ts";
import LiveInspectionSessionRoom from "@/components/live-inspection/LiveInspectionSessionRoom.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";

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

export default function AdminLiveInspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const access = useQuery(api.liveInspections.getMyAccess, {});
  const inspection = useQuery(
    api.liveInspections.getById,
    id && access?.canView ? { id: id as Id<"liveInspections"> } : "skip"
  );
  const confirmInspection = useMutation(api.liveInspections.confirm);
  const cancelInspection = useMutation(api.liveInspections.cancel);
  const markNoShow = useMutation(api.liveInspections.markNoShow);
  const startSession = useMutation(api.liveInspections.startSession);
  const endSession = useMutation(api.liveInspections.endSession);
  const getReportData = useConvex();
  const generateReportPdf = useAction(api.documents.generateInspectionReport);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  if (access === undefined) {
    return <Skeleton className="h-96 w-full" />;
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
          {access.isAdmin ? (
            <Button size="sm" asChild>
              <Link to="/admin/users">Go to Users & Roles</Link>
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link to="/admin/live-inspections">Back to list</Link>
            </Button>
          )}
        </ErrorStateContent>
      </ErrorState>
    );
  }

  if (inspection === undefined) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (inspection === null) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">
        Inspection not found. <Link to="/admin/live-inspections" className="text-[var(--brand)] underline">Back to list</Link>
      </div>
    );
  }

  const TypeIcon = TYPE_ICON[inspection.inspectionType] ?? Building2;
  const cfg = STATUS_CFG[inspection.status] ?? STATUS_CFG.draft;

  const handleConfirm = async () => {
    try {
      await confirmInspection({ id: inspection._id });
      toast.success("Inspection confirmed");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to confirm"); }
  };

  const handleCancel = async () => {
    const reason = window.prompt("Reason for cancelling this inspection:");
    if (!reason) return;
    try {
      await cancelInspection({ id: inspection._id, reason });
      toast.success("Inspection cancelled");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to cancel"); }
  };

  const handleNoShow = async () => {
    try {
      await markNoShow({ id: inspection._id });
      toast.success("Marked as no-show");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to update"); }
  };

  const handleStartSession = async () => {
    try {
      if (inspection.status !== "live") {
        await startSession({ id: inspection._id });
      }
      setSessionOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start session");
    }
  };

  const handleExitSession = async () => {
    setSessionOpen(false);
    if (inspection.status === "live") {
      try {
        await endSession({ id: inspection._id });
        toast.success("Live session completed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to end session");
      }
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const data = await getReportData.query(api.liveInspections.getReportData, { id: inspection._id });
      const pdfUrl = await generateReportPdf({
        inspectionRef: data.inspection.inspectionRef,
        propertyTitle: data.inspection.propertyTitle,
        estateName: data.inspection.estateName,
        clientName: data.inspection.clientName,
        officerName: data.inspection.officerName,
        scheduledAt: data.inspection.scheduledAt,
        durationSeconds: data.inspection.durationSeconds,
        status: data.inspection.status,
        checklistCompleted: data.checklistCompletion.completed,
        checklistTotal: data.checklistCompletion.total,
        clientRequestedAreas: data.clientRequestedAreas,
        approvedSnapshotCount: data.approvedSnapshotCount,
        clientVisibleNotes: data.clientVisibleNotes,
        documentsPresented: data.documentsPresented.map((d) => d.title),
        outcome: data.inspection.outcome,
        followUpRequired: data.inspection.followUpRequired,
      });
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `inspection-report-${data.inspection.inspectionRef}.pdf`;
      link.click();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  const canAdvance = inspection.status === "scheduled" || inspection.status === "requested";
  const canCancel = !["completed", "cancelled"].includes(inspection.status);
  const canStart = inspection.status === "confirmed" || inspection.status === "scheduled" || inspection.status === "live";
  const canReport = inspection.status === "completed";

  if (sessionOpen) {
    return <LiveInspectionSessionRoom inspectionId={inspection._id} onExit={() => void handleExitSession()} />;
  }

  return (
    <div className="space-y-5">
      <Link to="/admin/live-inspections" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} /> Back to inspections
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <TypeIcon size={20} className="text-gray-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900">{inspection.inspectionRef}</h1>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>{cfg.label}</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{inspection.propertyTitle ?? inspection.estateName ?? "No property linked"}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canAdvance && <Button size="sm" onClick={handleConfirm} className="bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer">Confirm</Button>}
            {canStart && (
              <Button size="sm" onClick={handleStartSession} className="bg-red-500 text-white hover:bg-red-600 gap-1.5 cursor-pointer">
                <Video size={14} /> {inspection.status === "live" ? "Rejoin Live Session" : "Start Live Session"}
              </Button>
            )}
            {canReport && (
              <Button size="sm" onClick={handleGenerateReport} disabled={generatingReport} className="bg-gray-900 text-white hover:bg-gray-800 gap-1.5 cursor-pointer">
                <Download size={14} /> {generatingReport ? "Generating…" : "Download Report"}
              </Button>
            )}
            {canReport && (
              <Button size="sm" onClick={() => setFollowUpOpen(true)} className="bg-blue-50 text-blue-700 hover:bg-blue-100 gap-1.5 cursor-pointer">
                <ListChecks size={14} /> Create Follow-up Task
              </Button>
            )}
            {inspection.status !== "no_show" && canCancel && inspection.status !== "draft" && (
              <Button size="sm" onClick={handleNoShow} className="bg-orange-50 text-orange-700 hover:bg-orange-100 cursor-pointer">Mark No-Show</Button>
            )}
            {canCancel && <Button size="sm" onClick={handleCancel} className="bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer">Cancel</Button>}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-gray-50">
          <div>
            <p className="text-xs text-gray-400 mb-1">Client</p>
            <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><User size={13} /> {inspection.clientName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Assigned Officer</p>
            <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><User size={13} /> {inspection.officerName ?? "Unassigned"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Scheduled</p>
            <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
              <Calendar size={13} /> {inspection.scheduledAt ? format(new Date(inspection.scheduledAt), "MMM d, yyyy · h:mm a") : "Not scheduled"}
            </p>
          </div>
        </div>

        {inspection.cancelReason && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            <span className="font-semibold">Cancellation reason:</span> {inspection.cancelReason}
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 text-sm mb-4">Inspection Checklist</h2>
        {inspection.checklist.length === 0 ? (
          <p className="text-sm text-gray-400">No checklist items for this inspection.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {inspection.checklist.map((item) => (
              <div key={item._id} className="flex items-center gap-2 text-sm text-gray-700 px-3 py-2 rounded-lg bg-gray-50">
                {item.completed ? <CheckCircle2 size={15} className="text-green-600 shrink-0" /> : <Circle size={15} className="text-gray-300 shrink-0" />}
                <span className={item.completed ? "line-through text-gray-400" : ""}>{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes (client-visible only shown here; internal notes are staff-only content built in a later milestone) */}
      {inspection.notes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 text-sm mb-4">Notes</h2>
          <div className="space-y-2">
            {inspection.notes.map((note) => (
              <div key={note._id} className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 flex items-start gap-2">
                {note.visibility === "internal" ? <Ban size={13} className="text-gray-400 mt-0.5 shrink-0" /> : null}
                <span>{note.body}</span>
                <span className="text-[10px] text-gray-400 ml-auto shrink-0">{note.visibility === "internal" ? "Internal" : "Client-visible"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents & Vault integration */}
      <DocumentsPanel inspectionId={inspection._id} />

      {followUpOpen && <FollowUpTaskDialog inspectionId={inspection._id} onClose={() => setFollowUpOpen(false)} />}
    </div>
  );
}

// ── Documents & Vault integration ─────────────────────────────────────────
// Reuses existing vaultDocuments — no second document store. Officers link
// a client's existing document to the inspection and mark whether it was
// presented to the client; confidential vault documents are never exposed
// even if linked, enforced server-side in listDocumentsForViewer.
function DocumentsPanel({ inspectionId }: { inspectionId: Id<"liveInspections"> }) {
  const links = useQuery(api.liveInspections.listDocumentsForViewer, { id: inspectionId });
  const linkable = useQuery(api.liveInspections.listLinkableDocuments, { inspectionId });
  const linkDocument = useMutation(api.liveInspections.linkDocument);
  const unlinkDocument = useMutation(api.liveInspections.unlinkDocument);
  const [pickerOpen, setPickerOpen] = useState(false);

  const linkedIds = new Set((links ?? []).map((l) => l.vaultDocumentId));
  const available = (linkable ?? []).filter((d) => !linkedIds.has(d._id));

  const handleLink = async (vaultDocumentId: Id<"vaultDocuments">, presentedToClient: boolean) => {
    try {
      await linkDocument({ inspectionId, vaultDocumentId, presentedToClient });
      toast.success("Document linked to inspection");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link document");
    }
  };

  const handleUnlink = async (id: Id<"inspectionDocuments">) => {
    try {
      await unlinkDocument({ id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unlink document");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 text-sm">Documents Presented</h2>
        <Button size="sm" onClick={() => setPickerOpen(true)} className="gap-1.5 cursor-pointer bg-gray-100 text-gray-700 hover:bg-gray-200">
          <Link2 size={13} /> Link Document
        </Button>
      </div>
      {links === undefined ? (
        <Skeleton className="h-16 w-full" />
      ) : links.length === 0 ? (
        <p className="text-sm text-gray-400">No documents linked to this inspection yet.</p>
      ) : (
        <div className="space-y-2">
          {links.map((l) => (
            <div key={l._id} className="flex items-center gap-2 text-sm text-gray-700 px-3 py-2 rounded-lg bg-gray-50">
              <FileText size={14} className="text-gray-400 shrink-0" />
              <span className="flex-1 min-w-0 truncate">{l.document.title}</span>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", l.presentedToClient ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600")}>
                {l.presentedToClient ? "Presented to client" : "Internal only"}
              </span>
              <button onClick={() => void handleUnlink(l._id)} className="text-gray-400 hover:text-red-500 cursor-pointer shrink-0"><Unlink size={13} /></button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link a Document</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {available.length === 0 ? (
              <p className="text-sm text-gray-400">No available documents for this client.</p>
            ) : (
              available.map((doc) => (
                <div key={doc._id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
                  <FileText size={14} className="text-gray-400 shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-sm">{doc.title}</span>
                  <Button size="sm" onClick={() => void handleLink(doc._id, false)} className="h-7 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer">Internal</Button>
                  <Button size="sm" onClick={() => void handleLink(doc._id, true)} className="h-7 text-xs bg-green-600 text-white hover:bg-green-700 cursor-pointer">Present to client</Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setPickerOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Follow-up task (reuses existing Tasks & Approvals board) ─────────────
function FollowUpTaskDialog({ inspectionId, onClose }: { inspectionId: Id<"liveInspections">; onClose: () => void }) {
  const createFollowUpTask = useMutation(api.liveInspections.createFollowUpTask);
  const [title, setTitle] = useState("Follow up with client after live inspection");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Task title is required"); return; }
    setSubmitting(true);
    try {
      await createFollowUpTask({ id: inspectionId, title: title.trim(), notes: notes.trim() || undefined, dueDate: dueDate || undefined });
      toast.success("Follow-up task created on the Tasks board");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Follow-up Task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context for the assignee" />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Creating…" : "Create Task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
