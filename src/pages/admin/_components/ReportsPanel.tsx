import { useState } from "react";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from "@/components/ui/empty.tsx";
import {
  FileBarChart, Plus, Play, Users, CheckCircle2, Clock, XCircle,
  ExternalLink, Send, Settings2, Lock, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";

// ══════════════════════════════════════════════════════════════════════════
// Management Reporting — Report Centre, Scheduled Reports (via frequency),
// Subscriptions, and Report Archive (existing Documents & Vault). Rendered
// only when `feature_management_reporting` is enabled (checked by parent).
// Report approval reuses the existing Tasks & Approvals engine; the report
// archive is the existing Documents & Vault — this panel only orchestrates.
// ══════════════════════════════════════════════════════════════════════════

type ReportsAccess = {
  featureEnabled: boolean;
  isStaff: boolean;
  canView: boolean;
  canCreate: boolean;
  canApprove: boolean;
  canDistribute: boolean;
  canAdmin: boolean;
};

const RUN_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  generating:        { label: "Generating",       color: "text-gray-600",   bg: "bg-gray-100",   icon: Clock },
  generated:         { label: "Generated",        color: "text-blue-700",   bg: "bg-blue-50",    icon: CheckCircle2 },
  pending_approval:  { label: "Pending Approval",  color: "text-orange-600", bg: "bg-orange-50",  icon: Clock },
  approved:          { label: "Approved",          color: "text-indigo-600", bg: "bg-indigo-50",  icon: CheckCircle2 },
  rejected:          { label: "Rejected",          color: "text-red-700",    bg: "bg-red-100",    icon: XCircle },
  distributed:       { label: "Distributed",       color: "text-green-700",  bg: "bg-green-100",  icon: Send },
  failed:            { label: "Failed",            color: "text-red-700",    bg: "bg-red-100",    icon: XCircle },
};

const REPORT_TYPE_LABEL: Record<string, string> = {
  operational: "Operational", commercial: "Commercial", finance: "Finance",
  management: "Management", governance: "Governance",
};

function StatusPill({ status }: { status: string }) {
  const cfg = RUN_STATUS_CFG[status] ?? RUN_STATUS_CFG.generated;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

// ── Generate Report Dialog ───────────────────────────────────────────────

function GenerateReportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const definitions = useQuery(api.reporting.listReportDefinitions, open ? {} : "skip");
  const generateRun = useMutation(api.reporting.generateReportRun);
  const attachDocument = useMutation(api.reporting.attachReportDocument);
  const generateUploadUrl = useMutation(api.reporting.generateUploadUrl);
  const createVaultDocument = useMutation(api.docvault.createDocument);
  const generateReportPdf = useAction(api.documents.generateManagementReportPdf);
  const convex = useConvex();
  const [defId, setDefId] = useState<string>("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const activeDefs = definitions?.filter((d) => d.isActive) ?? [];

  const handleGenerate = async () => {
    if (!defId) { toast.error("Select a report to generate"); return; }
    setSaving(true);
    try {
      const runId = await generateRun({ reportDefinitionId: defId as Id<"reportDefinitions">, periodLabel: periodLabel || undefined });
      const run = await convex.query(api.reporting.getReportRun, { id: runId });
      if (!run || !run.definition) throw new Error("Report run not found after creation");

      const metrics = JSON.parse(run.dataSnapshot) as { sections: { label: string; stats: { label: string; value: string | number }[] }[] };
      const pdfDataUri = await generateReportPdf({
        reportName: run.definition.name,
        runRef: run.runRef,
        reportType: run.definition.reportType,
        periodLabel: run.periodLabel,
        generatedAt: run.generatedAt,
        generatedByName: "System",
        approvalStatus: run.status === "pending_approval" ? "pending_approval" : undefined,
        sections: metrics.sections.map((s) => ({ label: s.label, stats: s.stats.map((st) => ({ label: st.label, value: String(st.value) })) })),
      });

      const uploadUrl = await generateUploadUrl();
      const pdfBlob = await (await fetch(pdfDataUri)).blob();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "application/pdf" }, body: pdfBlob });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      const fileUrl = await convex.query(api.cms.getFileUrl, { storageId });

      const vaultDocumentId = await createVaultDocument({
        title: `${run.definition.name} — ${run.runRef}`,
        docType: "report",
        fileUrl: fileUrl ?? "",
        fileName: `${run.runRef}.pdf`,
        mimeType: "application/pdf",
        isConfidential: run.definition.reportType === "finance" || run.definition.reportType === "governance",
      });
      await attachDocument({ runId, vaultDocumentId });

      toast.success(run.status === "pending_approval" ? "Report generated and sent for approval" : "Report generated and archived in Documents & Vault");
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to generate report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Generate Report</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Report</Label>
            <Select value={defId} onValueChange={setDefId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a report…" /></SelectTrigger>
              <SelectContent>
                {activeDefs.map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                {activeDefs.length === 0 && <SelectItem value="none" disabled>No active report definitions</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Period label (optional)</Label>
            <Input className="mt-1" placeholder="e.g. September 2026" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
          </div>
          <p className="text-xs text-gray-400">The report is computed live from real, existing data and archived as a PDF in Documents &amp; Vault.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="gap-1.5" onClick={handleGenerate} disabled={saving || !defId}>
            <Play size={13} /> {saving ? "Generating…" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Report Centre Tab ────────────────────────────────────────────────────

function ReportCentreTab({ access }: { access: ReportsAccess }) {
  const definitions = useQuery(api.reporting.listReportDefinitions, {});
  const seedDefaults = useMutation(api.reporting.seedDefaultReportDefinitions);
  const [showGenerate, setShowGenerate] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedDefaults({});
      toast.success(res.inserted > 0 ? `Added ${res.inserted} standard report(s)` : "Standard reports already configured");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to seed reports");
    } finally {
      setSeeding(false);
    }
  };

  if (definitions === undefined) return <Skeleton className="h-40 w-full" />;

  if (definitions.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><FileBarChart /></EmptyMedia>
          <EmptyTitle>No report definitions yet</EmptyTitle>
          <EmptyDescription>Set up the standard catalogue of operational, commercial, finance, management, and governance reports.</EmptyDescription>
        </EmptyHeader>
        {access.canAdmin && (
          <EmptyContent>
            <Button size="sm" onClick={handleSeed} disabled={seeding}>{seeding ? "Setting up…" : "Set Up Standard Reports"}</Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Configurable report types, computed from real existing data only.</p>
        {access.canCreate && <Button size="sm" className="gap-1.5" onClick={() => setShowGenerate(true)}><Play size={13} /> Generate Report</Button>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {definitions.map((d) => (
          <div key={d._id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-gray-900">{d.name}</p>
              <Badge variant={d.isActive ? "default" : "secondary"} className="text-[10px] shrink-0">{d.isActive ? "Active" : "Inactive"}</Badge>
            </div>
            <p className="text-xs text-gray-500 mb-2">{d.description}</p>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="px-1.5 py-0.5 rounded bg-gray-100">{REPORT_TYPE_LABEL[d.reportType] ?? d.reportType}</span>
              <span className="capitalize">{d.frequency.replace(/_/g, " ")}</span>
              {d.requiresApproval && <span className="text-orange-500">Requires approval</span>}
            </div>
          </div>
        ))}
      </div>
      <GenerateReportDialog open={showGenerate} onClose={() => setShowGenerate(false)} />
    </div>
  );
}

// ── Report Runs (My Reports / Scheduled / Approvals shared list) ────────

function ReportRunsTab({ access, mineOnly, approvalsOnly }: { access: ReportsAccess; mineOnly?: boolean; approvalsOnly?: boolean }) {
  const runs = useQuery(api.reporting.listReportRuns, { mineOnly });
  const distributeRun = useMutation(api.reporting.distributeReportRun);
  const syncFromApproval = useMutation(api.reporting.syncReportRunFromApproval);

  if (runs === undefined) return <Skeleton className="h-40 w-full" />;

  const filtered = approvalsOnly ? runs.filter((r) => r.status === "pending_approval") : runs;

  const handleDistribute = async (id: Id<"reportRuns">) => {
    try {
      await distributeRun({ runId: id });
      toast.success("Report distributed to subscribers");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to distribute report");
    }
  };

  const handleSync = async (id: Id<"reportRuns">) => {
    try {
      const status = await syncFromApproval({ runId: id });
      toast.success(status ? `Status refreshed: ${status.replace(/_/g, " ")}` : "No linked approval");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to refresh status");
    }
  };

  if (filtered.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><FileBarChart /></EmptyMedia>
          <EmptyTitle>{approvalsOnly ? "No reports awaiting approval" : "No report runs yet"}</EmptyTitle>
          <EmptyDescription>{approvalsOnly ? "Reports requiring sign-off will appear here." : "Generated reports will appear here."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((r) => (
        <div key={r._id} className="rounded-xl border p-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{r.definitionName}</p>
              <StatusPill status={r.status} />
            </div>
            <p className="text-[11px] text-gray-400">
              {r.runRef} · {r.periodLabel ?? "On demand"} · by {r.generatedByName} · {format(parseISO(r.generatedAt), "dd MMM yyyy, HH:mm")}
              {r.distributedCount !== undefined && r.status === "distributed" && ` · sent to ${r.distributedCount} subscriber(s)`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {r.approvalId && (r.status === "pending_approval" || r.status === "rejected") && (
              <Button size="sm" variant="secondary" onClick={() => handleSync(r._id)}>Refresh</Button>
            )}
            {r.fileUrl && (
              <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer">
                <ExternalLink size={14} />
              </a>
            )}
            {access.canDistribute && (r.status === "generated" || r.status === "approved") && r.fileUrl && (
              <Button size="sm" className="gap-1.5" onClick={() => handleDistribute(r._id)}><Send size={12} /> Distribute</Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Subscriptions Tab ────────────────────────────────────────────────────

function SubscriptionsTab({ access }: { access: ReportsAccess }) {
  const definitions = useQuery(api.reporting.listReportDefinitions, {});
  const [selectedDefId, setSelectedDefId] = useState<Id<"reportDefinitions"> | null>(null);
  const subs = useQuery(api.reporting.listReportSubscriptions, selectedDefId ? { reportDefinitionId: selectedDefId } : "skip");
  const staff = useQuery(api.reporting.listStaffForSubscriptions, access.canAdmin ? {} : "skip");
  const addSub = useMutation(api.reporting.addReportSubscription);
  const removeSub = useMutation(api.reporting.removeReportSubscription);
  const [addingUserId, setAddingUserId] = useState("");

  if (!access.canAdmin) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Lock /></EmptyMedia>
          <EmptyTitle>Restricted</EmptyTitle>
          <EmptyDescription>You do not have permission to manage report subscriptions.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (definitions === undefined) return <Skeleton className="h-40 w-full" />;

  const handleAdd = async () => {
    if (!selectedDefId || !addingUserId) return;
    try {
      await addSub({ reportDefinitionId: selectedDefId, userId: addingUserId as Id<"users"> });
      toast.success("Subscriber added");
      setAddingUserId("");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to add subscriber");
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
      <div className="space-y-1">
        {definitions.map((d) => (
          <button
            key={d._id}
            onClick={() => setSelectedDefId(d._id)}
            className={cn(
              "w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm cursor-pointer transition-colors",
              selectedDefId === d._id ? "bg-[var(--brand)] text-white" : "hover:bg-gray-50 text-gray-700"
            )}
          >
            {d.name} <ChevronRight size={12} className="shrink-0" />
          </button>
        ))}
      </div>
      <div>
        {!selectedDefId ? (
          <p className="text-sm text-gray-400 p-4">Select a report to manage its subscribers.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Select value={addingUserId} onValueChange={setAddingUserId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Add a subscriber…" /></SelectTrigger>
                <SelectContent>{staff?.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd} disabled={!addingUserId}><Plus size={13} /></Button>
            </div>
            <div className="divide-y rounded-xl border">
              {subs === undefined ? (
                <div className="p-3"><Skeleton className="h-8 w-full" /></div>
              ) : subs.length === 0 ? (
                <p className="p-4 text-xs text-gray-400 text-center">No subscribers yet.</p>
              ) : (
                subs.map((s) => (
                  <div key={s._id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{s.userName}</span>
                    <button onClick={() => removeSub({ id: s._id })} className="text-gray-400 hover:text-red-500 cursor-pointer text-xs">Remove</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────

type ReportsTab = "centre" | "my_reports" | "approvals" | "subscriptions" | "archive";

export default function ReportsPanel({ access }: { access: ReportsAccess }) {
  const [tab, setTab] = useState<ReportsTab>("centre");

  const tabs: { id: ReportsTab; label: string; icon: React.ElementType; show: boolean }[] = [
    { id: "centre", label: "Report Centre", icon: FileBarChart, show: true },
    { id: "my_reports", label: "My Reports", icon: Clock, show: true },
    { id: "approvals", label: "Report Approvals", icon: CheckCircle2, show: access.canApprove },
    { id: "subscriptions", label: "Subscriptions", icon: Users, show: access.canAdmin },
    { id: "archive", label: "Report Archive", icon: Settings2, show: true },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabs.filter((t) => t.show).map((t) => (
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
      {tab === "centre" && <ReportCentreTab access={access} />}
      {tab === "my_reports" && <ReportRunsTab access={access} mineOnly />}
      {tab === "approvals" && access.canApprove && <ReportRunsTab access={access} approvalsOnly />}
      {tab === "subscriptions" && access.canAdmin && <SubscriptionsTab access={access} />}
      {tab === "archive" && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileBarChart /></EmptyMedia>
            <EmptyTitle>Report Archive lives in Documents &amp; Vault</EmptyTitle>
            <EmptyDescription>
              Every generated report is archived as a document (type &quot;Report&quot;) in the existing Documents &amp; Vault — the same secure repository used for all other company documents.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <a href="/admin/documents">
              <Button size="sm" className="gap-1.5">Open Documents &amp; Vault <ExternalLink size={12} /></Button>
            </a>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
