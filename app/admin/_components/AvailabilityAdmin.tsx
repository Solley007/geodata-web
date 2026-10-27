"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { getAllProperties } from "@/lib/property-data";
import {
  nextUnitId,
  plotNumber,
  summarise,
  UNIT_STATUSES,
  type AvailabilityData,
  type UnitRecord,
  type UnitStatus,
} from "@/lib/availability-types";

const STATUS_STYLE: Record<UnitStatus, string> = {
  available: "bg-navy-900 text-bone border-navy-900",
  reserved:  "bg-accent text-bone border-accent",
  sold:      "bg-transparent text-ink-faint border-hairline line-through",
};

const PROPERTIES = getAllProperties();

export default function AvailabilityAdmin({ pw }: { pw: string }) {
  const [data,    setData]    = useState<AvailabilityData | null>(null);
  const [dirty,   setDirty]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const [addCount, setAddCount] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/availability", { headers: { "x-admin-password": pw } });
    const json = await res.json();
    // Make sure every SBC typology has an entry, even if the file is missing one
    const plots = PROPERTIES.map((p) =>
      json.plots?.find((x: any) => x.slug === p.slug) ?? { slug: p.slug, units: [] }
    );
    setData({ ...json, plots });
    setDirty(false);
  }, [pw]);

  useEffect(() => { load(); }, [load]);

  function updateUnits(slug: string, fn: (units: UnitRecord[]) => UnitRecord[]) {
    setData((d) => d && {
      ...d,
      plots: d.plots.map((p) => (p.slug === slug ? { ...p, units: fn(p.units) } : p)),
    });
    setDirty(true);
    setMsg(null);
  }

  // Click cycles available → reserved → sold → available
  function cycle(slug: string, id: string) {
    updateUnits(slug, (units) => units.map((u) => {
      if (u.id !== id) return u;
      const next = UNIT_STATUSES[(UNIT_STATUSES.indexOf(u.status) + 1) % UNIT_STATUSES.length];
      return { ...u, status: next };
    }));
  }

  function addUnits(slug: string, plotNo: string) {
    const n = Math.max(1, Math.min(200, addCount[slug] ?? 1));
    updateUnits(slug, (units) => {
      const out = [...units];
      for (let i = 0; i < n; i++) out.push({ id: nextUnitId(plotNo, out), status: "available" });
      return out;
    });
  }

  function removeLast(slug: string) {
    updateUnits(slug, (units) => units.slice(0, -1));
  }

  function setAll(slug: string, status: UnitStatus) {
    if (!confirm(`Mark every unit in this block as ${status}?`)) return;
    updateUnits(slug, (units) => units.map((u) => ({ ...u, status })));
  }

  async function save() {
    if (!data) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/availability", {
        method:  "PUT",
        headers: { "x-admin-password": pw, "Content-Type": "application/json" },
        body:    JSON.stringify({ plots: data.plots }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setData((d) => d && { ...d, ...json.data });
      setDirty(false);
      setMsg({ ok: true, text: "Saved to data/availability.json. Commit and push to publish." });
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    } finally { setSaving(false); }
  }

  if (!data) return <p className="text-sm text-ink-muted">Loading availability…</p>;

  return (
    <div className="bg-bone border border-hairline p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div>
          <h2 className="font-display text-2xl text-navy-950 mb-1">Unit availability</h2>
          <p className="text-sm text-ink-muted max-w-xl">
            Click a unit to cycle it between available, reserved and sold. This feeds the
            Southern Bridge City site plan and the &ldquo;available&rdquo; counts on property pages.
          </p>
        </div>
        <button onClick={save} disabled={saving || !dirty}
          className="bg-navy-900 text-bone px-6 py-3 text-xs uppercase tracking-widest hover:bg-navy-800 transition-colors disabled:opacity-40">
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </button>
      </div>

      {data.placeholder && (
        <p className="text-xs text-accent-dark bg-accent/10 px-3 py-2 my-4">
          These figures were seeded from the old listing counts and show as &ldquo;indicative&rdquo; on the
          site. Check them and save once to clear that label.
        </p>
      )}
      {msg && <p className={`text-sm my-4 ${msg.ok ? "text-green-700" : "text-red-500"}`}>{msg.text}</p>}

      <div className="flex gap-4 text-[11px] uppercase tracking-widest text-ink-muted my-6">
        {UNIT_STATUSES.map((s) => (
          <span key={s} className="flex items-center gap-2">
            <span className={clsx("inline-block h-3 w-3 border", STATUS_STYLE[s])} /> {s}
          </span>
        ))}
      </div>

      <div className="space-y-10">
        {PROPERTIES.map((p) => {
          const plot   = data.plots.find((x) => x.slug === p.slug)!;
          const plotNo = plotNumber(p.locationContext.address);
          const sum    = summarise(plot.units);
          return (
            <div key={p.slug} className="border-t border-hairline pt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
                <p className="font-display text-xl text-navy-950">
                  {p.title} <span className="text-sm text-ink-faint">· Plot {plotNo}</span>
                </p>
                <p className="text-xs text-ink-muted">
                  {sum.available} available · {sum.reserved} reserved · {sum.sold} sold · {sum.total} total
                </p>
              </div>

              {plot.units.length === 0 ? (
                <p className="text-sm text-ink-faint mb-4">No units entered. The site shows &ldquo;availability on request&rdquo;.</p>
              ) : (
                <div className="flex flex-wrap gap-1 mb-4">
                  {plot.units.map((u) => (
                    <button key={u.id} onClick={() => cycle(p.slug, u.id)} title={`${u.id}: ${u.status}`}
                      className={clsx("w-14 py-1 text-[10px] font-mono border transition-colors", STATUS_STYLE[u.status])}>
                      {u.id.split("-")[1]}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="flex items-center gap-2">
                  <input type="number" min={1} max={200} value={addCount[p.slug] ?? 1}
                    onChange={(e) => setAddCount((c) => ({ ...c, [p.slug]: Number(e.target.value) }))}
                    className="w-16 border-b border-navy-900 bg-transparent py-1 text-sm" />
                  <button onClick={() => addUnits(p.slug, plotNo)} className="uppercase tracking-widest text-navy-900 hover:text-accent-dark">+ Add units</button>
                </span>
                {plot.units.length > 0 && (
                  <>
                    <button onClick={() => removeLast(p.slug)} className="uppercase tracking-widest text-red-400 hover:text-red-600">− Remove last</button>
                    <button onClick={() => setAll(p.slug, "available")} className="uppercase tracking-widest text-ink-muted hover:text-navy-900">All available</button>
                    <button onClick={() => setAll(p.slug, "sold")} className="uppercase tracking-widest text-ink-muted hover:text-navy-900">All sold</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
