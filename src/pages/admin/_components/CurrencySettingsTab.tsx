import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { convertNaira, effectiveRates, formatFx, FX_CURRENCIES, FX_SYMBOLS, type FxCurrency } from "@/convex/fxUtils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

const NAMES: Record<FxCurrency, string> = { USD: "US Dollar", EUR: "Euro", GBP: "British Pound" };
const SAMPLE_NAIRA = 150_000_000;

type Draft = {
  enabled: boolean;
  round: boolean;
  manual: Record<FxCurrency, string>;
  useManual: Record<FxCurrency, boolean>;
};

type Settings = FunctionReturnType<typeof api.fx.getAdminSettings>;

function toDraft(s: Settings): Draft {
  const manual = {} as Record<FxCurrency, string>;
  const useManual = {} as Record<FxCurrency, boolean>;
  for (const c of FX_CURRENCIES) {
    manual[c] = s.manualRates[c] ? String(s.manualRates[c]) : "";
    useManual[c] = !!s.useManual[c];
  }
  return { enabled: s.enabled, round: s.round, manual, useManual };
}

/** Admin: live exchange rates, per-currency manual override, display options. */
export default function CurrencySettingsTab() {
  const settings = useQuery(api.fx.getAdminSettings, {});
  if (settings === undefined) return <Skeleton className="h-96 w-full rounded-2xl" />;
  return <CurrencyForm settings={settings} />;
}

function CurrencyForm({ settings }: { settings: Settings }) {
  const save = useMutation(api.fx.saveSettings);
  const refresh = useMutation(api.fx.refreshNow);
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const manualNumbers: Partial<Record<FxCurrency, number>> = {};
  for (const c of FX_CURRENCIES) {
    const n = Number(draft.manual[c]);
    if (draft.manual[c] && Number.isFinite(n) && n > 0) manualNumbers[c] = n;
  }
  const preview = effectiveRates(settings.liveRates ?? undefined, manualNumbers, draft.useManual);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({ enabled: draft.enabled, round: draft.round, manualRates: manualNumbers, useManual: draft.useManual });
      toast.success("Currency settings saved. The website has updated.");
    } catch (err) {
      toast.error(err instanceof ConvexError ? (err.data as { message: string }).message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh({});
      toast.success("Fetching the latest rates. They'll appear here in a few seconds.");
    } catch {
      toast.error("Could not start the refresh");
    } finally {
      setTimeout(() => setRefreshing(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Foreign currency prices</h2>
            <p className="max-w-xl text-sm text-gray-500">
              Show approximate US Dollar, Euro and British Pound equivalents next to every Naira price on the website. Prices stay set in Naira.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
            <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
            {draft.enabled ? "Showing on website" : "Hidden"}
          </label>
        </div>

        {settings.stale && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <strong>Live rates haven't updated in over 2 days.</strong> The website keeps showing the last good rates.
              {settings.lastError && <details className="pt-1 text-xs"><summary className="cursor-pointer">Details</summary>{settings.lastError}</details>}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <span>
            {settings.liveFetchedAt
              ? <>Live rates updated {formatDistanceToNow(new Date(settings.liveFetchedAt), { addSuffix: true })} ({format(new Date(settings.liveFetchedAt), "d MMM yyyy, h:mma")}) · source: {settings.liveSource}</>
              : "No live rates fetched yet."}
            {" "}Updates automatically twice a day.
          </span>
          <Button size="sm" variant="ghost" onClick={() => void handleRefresh()} disabled={refreshing} className="cursor-pointer gap-1.5">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh now
          </Button>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-gray-100">
          <div className="hidden grid-cols-[1.2fr_1fr_1.4fr_1fr] gap-3 bg-gray-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:grid">
            <span>Currency</span><span>Live rate</span><span>Your own rate</span><span>In use</span>
          </div>
          {FX_CURRENCIES.map((c) => (
            <div key={c} className="grid grid-cols-2 items-center gap-3 border-t border-gray-50 px-4 py-3 text-sm sm:grid-cols-[1.2fr_1fr_1.4fr_1fr]">
              <div className="font-medium text-gray-900">{FX_SYMBOLS[c]} {NAMES[c]}</div>
              <div className="text-gray-600 tabular-nums">{settings.liveRates ? `₦${settings.liveRates[c].toLocaleString()}` : "—"}</div>
              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <Switch
                  checked={draft.useManual[c]}
                  onCheckedChange={(v) => setDraft({ ...draft, useManual: { ...draft.useManual, [c]: v } })}
                  aria-label={`Use my own ${c} rate`}
                />
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₦</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder={settings.liveRates ? String(settings.liveRates[c]) : "1500"}
                    value={draft.manual[c]}
                    onChange={(e) => setDraft({ ...draft, manual: { ...draft.manual, [c]: e.target.value } })}
                    className="h-8 pl-6 text-sm"
                  />
                </div>
              </div>
              <div className="col-span-2 text-xs sm:col-span-1">
                {preview[c] ? (
                  <span className={draft.useManual[c] && manualNumbers[c] ? "font-semibold text-[var(--brand)]" : "text-gray-600"}>
                    ₦{preview[c]?.toLocaleString()} {draft.useManual[c] && manualNumbers[c] ? "(yours)" : "(live)"}
                  </span>
                ) : <span className="text-gray-400">Not available</span>}
              </div>
            </div>
          ))}
        </div>
        <p className="pt-2 text-xs text-gray-400">Rates are Naira per 1 unit of currency. Turn on "your own rate" to fix a rate, for example for a Diaspora promotion. Turn it off to go back to the live rate.</p>

        <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <Switch checked={draft.round} onCheckedChange={(v) => setDraft({ ...draft, round: v })} />
          Round to clean figures (e.g. $110,000 instead of $110,250)
        </label>

        <div className="mt-5 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Preview for ₦150M</p>
          <p className="pt-1 text-sm font-semibold text-gray-900 tabular-nums">
            {FX_CURRENCIES.filter((c) => preview[c]).map((c) => formatFx(convertNaira(SAMPLE_NAIRA, preview[c] ?? 1, draft.round), c)).join("  ·  ") || "—"}
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => void handleSave()} disabled={saving} className="cursor-pointer gap-1.5 bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]">
            <Check size={15} /> {saving ? "Saving..." : "Save currency settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
