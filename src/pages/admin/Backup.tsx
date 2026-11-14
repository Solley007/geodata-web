import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  DatabaseBackup, Download, RotateCcw, CheckCircle2, XCircle, Loader2,
  HardDrive, Clock, ShieldAlert, Info, Archive,
} from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import BackupDestinationsPanel from "./_components/BackupDestinationsPanel.tsx";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | undefined | null): string {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let val = bytes;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  completed: { label: "Completed", color: "text-green-700", bg: "bg-green-50", icon: CheckCircle2 },
  running: { label: "Running", color: "text-blue-600", bg: "bg-blue-50", icon: Loader2 },
  failed: { label: "Failed", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
};

type BackupJob = {
  _id: Id<"backupJobs">;
  jobRef: string;
  type: "manual" | "scheduled";
  status: "running" | "completed" | "failed";
  tables: string[];
  totalRecords?: number;
  fileSizeBytes?: number;
  error?: string;
  createdByName?: string;
  startedAt: string;
  completedAt?: string;
};

// ── Restore dialog ───────────────────────────────────────────────────────────

function RestoreDialog({ job, onClose }: { job: BackupJob; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(job.tables));
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [confirmText, setConfirmText] = useState("");
  const [restoring, setRestoring] = useState(false);
  const restoreFromBackup = useAction(api.backup.restoreFromBackup);

  const toggle = (table: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(table)) next.delete(table);
      else next.add(table);
      return next;
    });
  };

  const canConfirm = confirmText === "RESTORE" && selected.size > 0 && !restoring;

  const handleRestore = async () => {
    if (!canConfirm) return;
    setRestoring(true);
    try {
      const result = await restoreFromBackup({
        backupJobId: job._id,
        tables: Array.from(selected),
        mode,
      });
      toast.success(`Restore complete — ${result.recordsWritten} records written`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw size={18} className="text-[var(--brand)]" />
            Restore from {job.jobRef}
          </DialogTitle>
          <DialogDescription>
            Snapshot taken {format(parseISO(job.startedAt), "dd MMM yyyy, HH:mm")}. Choose which tables to restore and how.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tables to restore</p>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-xl">
              {job.tables.map((table) => (
                <button
                  key={table}
                  type="button"
                  onClick={() => toggle(table)}
                  className={cn(
                    "text-[11px] font-medium px-2.5 py-1 rounded-lg border cursor-pointer transition-colors",
                    selected.has(table)
                      ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  )}
                >
                  {table}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Restore mode</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("merge")}
                className={cn(
                  "text-left p-3 rounded-xl border cursor-pointer transition-colors",
                  mode === "merge" ? "border-[var(--brand)] bg-blue-50/50" : "border-gray-200"
                )}
              >
                <p className="text-sm font-semibold text-gray-900">Merge</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Update existing records, add missing ones. Safer.</p>
              </button>
              <button
                type="button"
                onClick={() => setMode("replace")}
                className={cn(
                  "text-left p-3 rounded-xl border cursor-pointer transition-colors",
                  mode === "replace" ? "border-red-400 bg-red-50/50" : "border-gray-200"
                )}
              >
                <p className="text-sm font-semibold text-gray-900">Replace</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Erase current data in selected tables first. Irreversible.</p>
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
            <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Restoring overwrites live data in the selected tables. This action is logged in the Audit Log and cannot be undone automatically. Type <span className="font-mono font-bold">RESTORE</span> below to confirm.
            </p>
          </div>

          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type RESTORE to confirm"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
          />
        </div>

        <DialogFooter>
          <Button className="cursor-pointer" onClick={onClose} disabled={restoring}>
            Cancel
          </Button>
          <Button
            className="cursor-pointer bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleRestore}
            disabled={!canConfirm}
          >
            {restoring ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <RotateCcw size={14} className="mr-1.5" />}
            {restoring ? "Restoring…" : "Restore Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Backup row ───────────────────────────────────────────────────────────────

function BackupRow({ job, onRestore }: { job: BackupJob; onRestore: (job: BackupJob) => void }) {
  const cfg = STATUS_CFG[job.status];
  const Icon = cfg.icon;
  const getDownloadUrl = useAction(api.backup.getBackupDownloadUrl);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const result = await getDownloadUrl({ backupJobId: job._id });
      if (!result) {
        toast.error("Backup file not available");
        return;
      }
      window.open(result.url, "_blank");
    } catch {
      toast.error("Could not generate download link");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-none hover:bg-gray-50/50 transition-colors">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
        <Icon size={16} className={cn(cfg.color, job.status === "running" && "animate-spin")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 font-mono">{job.jobRef}</p>
          <Badge className={cn("text-[10px] capitalize", job.type === "scheduled" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600")}>
            {job.type}
          </Badge>
          <span className={cn("text-[10px] font-semibold", cfg.color)}>{cfg.label}</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {format(parseISO(job.startedAt), "dd MMM yyyy, HH:mm")}
          {job.totalRecords !== undefined && ` · ${job.totalRecords.toLocaleString()} records`}
          {job.fileSizeBytes !== undefined && ` · ${formatBytes(job.fileSizeBytes)}`}
          {job.createdByName && ` · by ${job.createdByName}`}
        </p>
        {job.error && <p className="text-[11px] text-red-600 mt-0.5">{job.error}</p>}
      </div>
      {job.status === "completed" && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" className="cursor-pointer" onClick={handleDownload} disabled={downloading}>
            <Download size={12} className="mr-1" /> Download
          </Button>
          <Button size="sm" className="cursor-pointer bg-gray-900 hover:bg-gray-800 text-white" onClick={() => onRestore(job)}>
            <RotateCcw size={12} className="mr-1" /> Restore
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBackup() {
  const stats = useQuery(api.backupInternal.getBackupStats);
  const backups = useQuery(api.backupInternal.listBackupJobs);
  const createManualBackup = useAction(api.backup.createManualBackup);
  const [creating, setCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupJob | null>(null);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const result = await createManualBackup({});
      toast.success(`Backup ${result.jobRef} started — this may take a moment`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start backup");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Backup &amp; Recovery Center
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            On-demand and automated snapshots of your ERP data, with selective restore.
          </p>
        </div>
        <Button className="cursor-pointer shrink-0" onClick={handleCreateBackup} disabled={creating}>
          {creating ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <DatabaseBackup size={14} className="mr-1.5" />}
          {creating ? "Starting…" : "Create Backup Now"}
        </Button>
      </div>

      {/* Stats */}
      {stats === undefined ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Last Backup", value: stats.lastBackupAt ? format(parseISO(stats.lastBackupAt), "dd MMM, HH:mm") : "Never", icon: Clock, color: "#0B4DBB" },
            { label: "Records Captured", value: stats.lastBackupRecords?.toLocaleString() ?? "—", icon: Archive, color: "#8b5cf6" },
            { label: "Storage Used", value: formatBytes(stats.totalStorageBytes), icon: HardDrive, color: "#10b981" },
            { label: "Failed Jobs", value: stats.failed, icon: XCircle, color: "#ef4444" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">{label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + "15" }}>
                  <Icon size={14} style={{ color }} />
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex gap-3">
        <Info size={16} className="text-[var(--brand)] shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900/80 space-y-1">
          <p>
            <span className="font-semibold">Automated daily backups</span> run at 02:00 UTC and capture every core table (properties, clients, transactions, KYC, finance, documents, and more) into a downloadable snapshot.
          </p>
          <p>
            Your live database itself is also protected by our managed cloud infrastructure. This center gives you an independent, portable copy you control — download anytime, or restore specific tables if something goes wrong.
          </p>
        </div>
      </div>

      {/* External destinations */}
      <BackupDestinationsPanel />

      {/* Backup history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center gap-2">
          <DatabaseBackup size={14} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Backup History</p>
        </div>
        {backups === undefined ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : backups.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><DatabaseBackup /></EmptyMedia>
              <EmptyTitle>No backups yet</EmptyTitle>
              <EmptyDescription>Create your first backup to protect your ERP data.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div>
            {backups.map((job) => (
              <BackupRow key={job._id} job={job as BackupJob} onRestore={setRestoreTarget} />
            ))}
          </div>
        )}
      </div>

      {restoreTarget && <RestoreDialog job={restoreTarget} onClose={() => setRestoreTarget(null)} />}
    </div>
  );
}
