import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { Globe2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { cn } from "@/lib/utils.ts";

/**
 * Diaspora Markets = countries the platform actively operates in. Admin
 * creates them manually — nothing is pre-seeded — so no country data is
 * ever invented on the user's behalf.
 */

type ProgrammeKey = Doc<"diasporaMarkets">["supportedProgrammeKeys"][number];

const PROGRAMME_OPTIONS: Array<{ key: ProgrammeKey; label: string }> = [
  { key: "own", label: "Own" },
  { key: "invest", label: "Invest" },
  { key: "partner", label: "Partner" },
  { key: "refer", label: "Refer" },
  { key: "corporate", label: "Corporate" },
];

const MARKET_TOGGLE_FIELDS = [
  { field: "enabled", label: "Enabled" },
  { field: "publicVisible", label: "Public Visibility" },
  { field: "acceptingLeads", label: "Accepting Leads" },
  { field: "featured", label: "Featured" },
] as const;

export default function DiasporaMarketsPanel() {
  const markets = useQuery(api.diaspora.markets.listMarkets, {});
  const updateToggle = useMutation(api.diaspora.markets.updateMarketToggle);
  const deleteMarket = useMutation(api.diaspora.markets.deleteMarket);
  const [showCreate, setShowCreate] = useState(false);

  const handleToggle = async (id: Doc<"diasporaMarkets">["_id"], field: (typeof MARKET_TOGGLE_FIELDS)[number]["field"], value: boolean) => {
    try {
      await updateToggle({ id, field, value });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update this setting");
    }
  };

  const handleDelete = async (id: Doc<"diasporaMarkets">["_id"], country: string) => {
    if (!window.confirm(`Delete the "${country}" market? This cannot be undone.`)) return;
    try {
      await deleteMarket({ id });
      toast.success(`Deleted "${country}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete this market");
    }
  };

  if (markets === undefined) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Markets</h2>
          <p className="text-sm text-gray-500 mt-0.5">Countries the Diaspora Platform actively operates in.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 cursor-pointer">
          <Plus size={16} /> New Market
        </Button>
      </div>

      {markets.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Globe2 /></EmptyMedia>
            <EmptyTitle>No markets yet</EmptyTitle>
            <EmptyDescription>Create your first market (e.g. a country) to start assigning campaigns to it.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setShowCreate(true)} className="cursor-pointer">Create Market</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {markets.map((m) => (
            <div key={m._id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{m.country}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {m.supportedProgrammeKeys.map((k) => (
                      <span key={k} className="text-xs font-medium bg-blue-50 text-[var(--brand)] rounded-full px-2 py-0.5 capitalize">
                        {k}
                      </span>
                    ))}
                  </div>
                  {m.notes && <p className="text-xs text-gray-400 mt-1.5">{m.notes}</p>}
                </div>
                <button onClick={() => handleDelete(m._id, m.country)} className="text-gray-400 hover:text-red-600 cursor-pointer shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MARKET_TOGGLE_FIELDS.map(({ field, label }) => (
                  <div key={field} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                    <Switch checked={m[field]} onCheckedChange={(checked) => handleToggle(m._id, field, checked)} className="cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateMarketDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateMarketDialog({ onClose }: { onClose: () => void }) {
  const createMarket = useMutation(api.diaspora.markets.createMarket);
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<ProgrammeKey[]>(PROGRAMME_OPTIONS.map((p) => p.key));
  const [submitting, setSubmitting] = useState(false);

  const toggleKey = (key: ProgrammeKey) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSubmit = async () => {
    if (!country.trim()) {
      toast.error("Country is required");
      return;
    }
    setSubmitting(true);
    try {
      await createMarket({ country: country.trim(), supportedProgrammeKeys: selectedKeys, notes: notes.trim() || undefined });
      toast.success(`Created market "${country.trim()}"`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create market");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Market</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="market-country">Country</Label>
            <Input id="market-country" placeholder="Belgium" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Supported Programmes</Label>
            <div className="flex flex-wrap gap-2">
              {PROGRAMME_OPTIONS.map((p) => {
                const selected = selectedKeys.includes(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => toggleKey(p.key)}
                    className={cn(
                      "text-xs font-medium rounded-full px-3 py-1.5 border cursor-pointer transition-colors",
                      selected ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="market-notes">Notes (optional)</Label>
            <Textarea id="market-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="cursor-pointer gap-2">
            <X size={14} /> Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="cursor-pointer">
            {submitting ? "Creating…" : "Create Market"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
