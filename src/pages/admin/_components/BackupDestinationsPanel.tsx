import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Cloud, HardDrive as HardDriveIcon, Mail, Plus, Settings2, Trash2, CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils.ts";

// ── Provider metadata ─────────────────────────────────────────────────────────

type Provider = "s3" | "dropbox" | "gdrive" | "email";

const PROVIDER_META: Record<Provider, { name: string; icon: React.ElementType; secrets: string[]; help: string }> = {
  s3: {
    name: "Amazon S3 / R2 / B2",
    icon: HardDriveIcon,
    secrets: ["BACKUP_S3_ACCESS_KEY_ID", "BACKUP_S3_SECRET_ACCESS_KEY"],
    help: "Works with Amazon S3, Cloudflare R2, or Backblaze B2. Add your access key and secret in the Secrets tab, then set the bucket name, region, and optional endpoint (for R2/B2) below.",
  },
  dropbox: {
    name: "Dropbox",
    icon: Cloud,
    secrets: ["BACKUP_DROPBOX_ACCESS_TOKEN"],
    help: "Generate an access token from the Dropbox App Console (Scoped App with files.content.write permission), then add it in the Secrets tab.",
  },
  gdrive: {
    name: "Google Drive",
    icon: Cloud,
    secrets: ["BACKUP_GDRIVE_CLIENT_ID", "BACKUP_GDRIVE_CLIENT_SECRET", "BACKUP_GDRIVE_REFRESH_TOKEN"],
    help: "Create an OAuth Client in Google Cloud Console, generate a refresh token with Drive scope via the OAuth Playground, then add all three values in the Secrets tab.",
  },
  email: {
    name: "Email Delivery",
    icon: Mail,
    secrets: [],
    help: "Sends a download link to chosen recipients after every backup. Requires a verified sender email/domain in the Emails tab.",
  },
};

type Destination = {
  _id: Id<"backupDestinations">;
  provider: Provider;
  label: string;
  enabled: boolean;
  config: string;
  lastSyncAt?: string;
  lastSyncStatus?: "success" | "failed";
  lastSyncError?: string;
};

// ── Config form (provider-specific fields) ───────────────────────────────────

function ConfigForm({ provider, config, onChange }: { provider: Provider; config: Record<string, string>; onChange: (c: Record<string, string>) => void }) {
  const set = (key: string, value: string) => onChange({ ...config, [key]: value });

  if (provider === "s3") {
    return (
      <div className="space-y-3">
        <Field label="Bucket name" value={config.bucket ?? ""} onChange={(v) => set("bucket", v)} placeholder="geodata-backups" />
        <Field label="Region" value={config.region ?? ""} onChange={(v) => set("region", v)} placeholder="us-east-1 (or 'auto' for R2)" />
        <Field label="Custom endpoint (optional, for R2/B2)" value={config.endpoint ?? ""} onChange={(v) => set("endpoint", v)} placeholder="https://xxxx.r2.cloudflarestorage.com" />
        <Field label="Folder path (optional)" value={config.folder ?? ""} onChange={(v) => set("folder", v)} placeholder="geodata/backups" />
      </div>
    );
  }
  if (provider === "dropbox") {
    return <Field label="Folder path (optional)" value={config.folder ?? ""} onChange={(v) => set("folder", v)} placeholder="Backups" />;
  }
  if (provider === "gdrive") {
    return <Field label="Destination folder ID (optional)" value={config.folderId ?? ""} onChange={(v) => set("folderId", v)} placeholder="1AbCdEfGhIjKlMnOpQrS..." />;
  }
  return (
    <div className="space-y-3">
      <Field label="Sender email (must be verified)" value={config.fromAddress ?? ""} onChange={(v) => set("fromAddress", v)} placeholder="backups@geodata.com.ng" />
      <Field
        label="Recipient emails (comma separated)"
        value={config.recipients ?? ""}
        onChange={(v) => set("recipients", v)}
        placeholder="admin@geodata.com.ng, it@geodata.com.ng"
      />
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
      />
    </div>
  );
}

// ── Add / Edit dialog ─────────────────────────────────────────────────────────

function DestinationDialog({ existing, onClose }: { existing: Destination | null; onClose: () => void }) {
  const [provider, setProvider] = useState<Provider>(existing?.provider ?? "s3");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [config, setConfig] = useState<Record<string, string>>(existing ? (JSON.parse(existing.config) as Record<string, string>) : {});
  const [saving, setSaving] = useState(false);
  const upsertDestination = useMutation(api.backupInternal.upsertDestination);

  const meta = PROVIDER_META[provider];

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("Give this destination a name");
      return;
    }
    setSaving(true);
    try {
      const normalizedConfig =
        provider === "email"
          ? { ...config, recipients: (config.recipients ?? "").split(",").map((r) => r.trim()).filter(Boolean) }
          : config;
      await upsertDestination({
        destinationId: existing?._id,
        provider,
        label: label.trim(),
        enabled,
        config: JSON.stringify(normalizedConfig),
      });
      toast.success(existing ? "Destination updated" : "Destination added");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save destination");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Destination" : "Add External Destination"}</DialogTitle>
          <DialogDescription>Configure where completed backups should also be sent.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!existing && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Provider</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PROVIDER_META) as Provider[]).map((p) => {
                  const ProviderIcon = PROVIDER_META[p].icon;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={cn(
                        "flex items-center gap-2 text-left p-2.5 rounded-xl border cursor-pointer transition-colors text-sm",
                        provider === p ? "border-[var(--brand)] bg-blue-50/50 font-semibold" : "border-gray-200 text-gray-600"
                      )}
                    >
                      <ProviderIcon size={14} />
                      {PROVIDER_META[p].name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex gap-2">
            <Info size={14} className="text-[var(--brand)] shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-900/80">{meta.help}</p>
          </div>

          {meta.secrets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {meta.secrets.map((s) => (
                <Badge key={s} className="bg-gray-100 text-gray-600 font-mono text-[10px]">{s}</Badge>
              ))}
            </div>
          )}

          <Field label="Name" value={label} onChange={setLabel} placeholder="Primary offsite backup" />

          <ConfigForm provider={provider} config={config} onChange={setConfig} />

          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <p className="text-sm font-medium text-gray-700">Enabled</p>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <DialogFooter>
          <Button className="cursor-pointer" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="cursor-pointer" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Destination"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Destination row ───────────────────────────────────────────────────────────

function DestinationRow({ dest, onEdit, onDelete }: { dest: Destination; onEdit: () => void; onDelete: () => void }) {
  const upsertDestination = useMutation(api.backupInternal.upsertDestination);
  const meta = PROVIDER_META[dest.provider];
  const Icon = meta.icon;

  const toggleEnabled = async (checked: boolean) => {
    try {
      await upsertDestination({ destinationId: dest._id, provider: dest.provider, label: dest.label, enabled: checked, config: dest.config });
    } catch {
      toast.error("Could not update destination");
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-none">
      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{dest.label}</p>
          <Badge className="text-[10px] bg-gray-100 text-gray-600">{meta.name}</Badge>
          {dest.lastSyncStatus === "success" && (
            <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
              <CheckCircle2 size={11} /> Synced
            </span>
          )}
          {dest.lastSyncStatus === "failed" && (
            <span className="flex items-center gap-1 text-[10px] text-red-600 font-medium">
              <XCircle size={11} /> Failed
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {dest.lastSyncAt ? `Last synced ${format(parseISO(dest.lastSyncAt), "dd MMM, HH:mm")}` : "Not synced yet"}
        </p>
        {dest.lastSyncError && <p className="text-[11px] text-red-600 mt-0.5 truncate">{dest.lastSyncError}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Switch checked={dest.enabled} onCheckedChange={toggleEnabled} />
        <Button size="sm" className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700" onClick={onEdit}>
          <Settings2 size={12} />
        </Button>
        <Button size="sm" className="cursor-pointer bg-red-50 hover:bg-red-100 text-red-600" onClick={onDelete}>
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────────

export default function BackupDestinationsPanel() {
  const destinations = useQuery(api.backupInternal.listDestinations);
  const deleteDestination = useMutation(api.backupInternal.deleteDestination);
  const [editing, setEditing] = useState<Destination | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Destination | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDestination({ destinationId: deleteTarget._id });
      toast.success("Destination removed");
    } catch {
      toast.error("Could not remove destination");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud size={14} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">External Destinations</p>
        </div>
        <Button size="sm" className="cursor-pointer" onClick={() => setEditing("new")}>
          <Plus size={12} className="mr-1" /> Add Destination
        </Button>
      </div>

      {destinations === undefined ? (
        <div className="p-4 space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : destinations.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-gray-500">No external destinations configured. Every backup stays in our secure file storage until you add one.</p>
        </div>
      ) : (
        <div>
          {destinations.map((d) => (
            <DestinationRow
              key={d._id}
              dest={d as Destination}
              onEdit={() => setEditing(d as Destination)}
              onDelete={() => setDeleteTarget(d as Destination)}
            />
          ))}
        </div>
      )}

      {editing !== null && <DestinationDialog existing={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this destination?</AlertDialogTitle>
            <AlertDialogDescription>
              Future backups will no longer be sent to &ldquo;{deleteTarget?.label}&rdquo;. Previously synced files are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction className="cursor-pointer bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
