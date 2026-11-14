import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { MousePointerClick, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";

/**
 * Admin-configurable CTA catalogue — public pages resolve a button's
 * label/destination by `key` instead of a hard-coded string, so a button
 * can be renamed or repointed without a code change.
 */

type DestinationType = Doc<"diasporaCtas">["destinationType"];
type ProgrammeKey = NonNullable<Doc<"diasporaCtas">["programmeKey"]>;

const PROGRAMME_OPTIONS: Array<{ value: ProgrammeKey; label: string }> = [
  { value: "own", label: "Own" },
  { value: "invest", label: "Invest" },
  { value: "partner", label: "Partner" },
  { value: "refer", label: "Refer" },
  { value: "corporate", label: "Corporate" },
];

const DESTINATION_LABELS: Record<DestinationType, string> = {
  programme: "Programme",
  campaign: "Campaign",
  external: "External Link",
};

export default function DiasporaCtasPanel() {
  const ctas = useQuery(api.diaspora.ctas.listCtas, {});
  const updateCta = useMutation(api.diaspora.ctas.updateCta);
  const deleteCta = useMutation(api.diaspora.ctas.deleteCta);
  const [showCreate, setShowCreate] = useState(false);

  const handleToggle = async (id: Doc<"diasporaCtas">["_id"], field: "enabled" | "visible", value: boolean) => {
    try {
      await updateCta({ id, [field]: value });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update this CTA");
    }
  };

  const handleDelete = async (id: Doc<"diasporaCtas">["_id"], label: string) => {
    if (!window.confirm(`Delete the "${label}" CTA? This cannot be undone.`)) return;
    try {
      await deleteCta({ id });
      toast.success(`Deleted "${label}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete this CTA");
    }
  };

  if (ctas === undefined) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Calls to Action</h2>
          <p className="text-sm text-gray-500 mt-0.5">Admin-configurable CTA catalogue — public pages read these instead of hard-coded buttons.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 cursor-pointer">
          <Plus size={16} /> New CTA
        </Button>
      </div>

      {ctas.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><MousePointerClick /></EmptyMedia>
            <EmptyTitle>No CTAs configured yet</EmptyTitle>
            <EmptyDescription>Programme and campaign pages will use their built-in defaults until you create one here.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setShowCreate(true)} className="cursor-pointer">Create CTA</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {ctas.map((c) => (
            <div key={c._id} className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{c.label}</p>
                  <Badge className="text-xs bg-gray-100 text-gray-500">{c.key}</Badge>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {DESTINATION_LABELS[c.destinationType]}: {c.destinationRef}
                  {c.programmeKey ? ` · ${c.programmeKey} programme` : ""}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Enabled</span>
                  <Switch checked={c.enabled} onCheckedChange={(v) => handleToggle(c._id, "enabled", v)} className="cursor-pointer" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Visible</span>
                  <Switch checked={c.visible} onCheckedChange={(v) => handleToggle(c._id, "visible", v)} className="cursor-pointer" />
                </div>
                <button onClick={() => handleDelete(c._id, c.label)} className="text-gray-400 hover:text-red-600 cursor-pointer">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateCtaDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateCtaDialog({ onClose }: { onClose: () => void }) {
  const createCta = useMutation(api.diaspora.ctas.createCta);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [destinationType, setDestinationType] = useState<DestinationType>("programme");
  const [destinationRef, setDestinationRef] = useState("");
  const [programmeKey, setProgrammeKey] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!key.trim() || !label.trim() || !destinationRef.trim()) {
      toast.error("Key, label, and destination are required");
      return;
    }
    setSubmitting(true);
    try {
      await createCta({
        key: key.trim(),
        label: label.trim(),
        destinationType,
        destinationRef: destinationRef.trim(),
        programmeKey: programmeKey !== "none" ? (programmeKey as ProgrammeKey) : undefined,
      });
      toast.success(`Created CTA "${label.trim()}"`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create CTA");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New CTA</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cta-key">Key</Label>
            <Input id="cta-key" placeholder="hub_primary" value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cta-label">Button Label</Label>
            <Input id="cta-label" placeholder="Get Started Today" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Destination Type</Label>
            <Select value={destinationType} onValueChange={(v) => setDestinationType(v as DestinationType)}>
              <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="programme">Programme</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
                <SelectItem value="external">External Link</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cta-dest">
              {destinationType === "programme" ? "Programme Key (e.g. own)" : destinationType === "campaign" ? "Campaign Code" : "Full URL"}
            </Label>
            <Input id="cta-dest" placeholder={destinationType === "external" ? "https://example.com" : "own"} value={destinationRef} onChange={(e) => setDestinationRef(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Scope to Programme (optional)</Label>
            <Select value={programmeKey} onValueChange={setProgrammeKey}>
              <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (platform-wide)</SelectItem>
                {PROGRAMME_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="cursor-pointer gap-2">
            <X size={14} /> Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="cursor-pointer">
            {submitting ? "Creating…" : "Create CTA"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
