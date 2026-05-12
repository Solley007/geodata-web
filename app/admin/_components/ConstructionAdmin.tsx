"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const PHASES = ["Launch", "Structure", "Finishing", "Handover"] as const;
const PROPERTIES = [
  { slug: "4-bed-semi-detached",  label: "The Semi-Detached (4 bed)" },
  { slug: "4-bed-terrace",        label: "The Terrace (4 bed)" },
  { slug: "6-bed-terrace",        label: "The Six (6 bed)" },
  { slug: "5-bed-semi-detached",  label: "The Five (5 bed)" },
  { slug: "4-bed-block-flats",    label: "The Pavilion (4 bed flats)" },
];

type Update = {
  id: string; phase: string; date: string;
  caption: string; imageUrl: string; propertySlug: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function ConstructionAdmin({ pw }: { pw: string }) {
  const [phase,        setPhase]        = useState("Structure");
  const [slug,         setSlug]         = useState(PROPERTIES[0].slug);
  const [date,         setDate]         = useState(today());
  const [caption,      setCaption]      = useState("");
  const [file,         setFile]         = useState<File | null>(null);
  const [preview,      setPreview]      = useState<string | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [msg,          setMsg]          = useState<{ ok: boolean; text: string } | null>(null);

  const [updates,      setUpdates]      = useState<Update[]>([]);
  const [loadingList,  setLoadingList]  = useState(false);
  const [filterSlug,   setFilterSlug]   = useState("all");

  const fileRef = useRef<HTMLInputElement>(null);

  const fetchUpdates = useCallback(async () => {
    setLoadingList(true);
    try {
      const res  = await fetch("/api/admin/updates", { headers: { "x-admin-password": pw } });
      const data = await res.json();
      setUpdates(Array.isArray(data) ? data : []);
    } finally { setLoadingList(false); }
  }, [pw]);

  useEffect(() => { fetchUpdates(); }, [fetchUpdates]);

  function handleFilePick(f: File) {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setMsg({ ok: false, text: "Select a photo first." }); return; }
    setUploading(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("phase", phase);
      fd.append("date", date); fd.append("caption", caption);
      fd.append("propertySlug", slug);
      const res  = await fetch("/api/admin/upload", {
        method: "POST", headers: { "x-admin-password": pw }, body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: "Photo uploaded and saved to codebase." });
        setFile(null); setPreview(null); setCaption("");
        if (fileRef.current) fileRef.current.value = "";
        fetchUpdates();
      } else setMsg({ ok: false, text: data.error ?? "Upload failed." });
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    } finally { setUploading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this photo? It will be removed from the codebase.")) return;
    await fetch("/api/admin/updates", {
      method: "DELETE",
      headers: { "x-admin-password": pw, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchUpdates();
  }

  const visible = filterSlug === "all" ? updates : updates.filter((u) => u.propertySlug === filterSlug);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Upload form */}
      <div className="bg-bone border border-hairline p-8">
        <h2 className="font-display text-2xl text-navy-950 mb-7">Add construction photo</h2>
        <form onSubmit={handleUpload} className="space-y-5">
          <div>
            <label className="admin-label">Property</label>
            <select value={slug} onChange={(e) => setSlug(e.target.value)} className="admin-select">
              {PROPERTIES.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Phase</label>
              <select value={phase} onChange={(e) => setPhase(e.target.value)} className="admin-select">
                {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="admin-label">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="admin-input" />
            </div>
          </div>

          <div>
            <label className="admin-label">Caption</label>
            <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Ground floor columns complete, Block A"
              className="admin-input" />
          </div>

          <div>
            <label className="admin-label">Photo</label>
            <div
              className="border-2 border-dashed border-hairline hover:border-navy-900 transition-colors cursor-pointer text-center p-6"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFilePick(f); }}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="preview" className="max-h-40 mx-auto object-contain" />
              ) : (
                <div>
                  <p className="text-ink-muted text-sm">Drag & drop or click to select</p>
                  <p className="text-xs text-ink-faint mt-1">JPG, PNG, WebP</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFilePick(f); }} />
            {file && <p className="mt-2 text-xs text-ink-muted">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
          </div>

          {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-500"}`}>{msg.text}</p>}

          <button type="submit" disabled={uploading}
            className="w-full bg-navy-900 text-bone py-3 text-xs uppercase tracking-widest hover:bg-navy-800 transition-colors disabled:opacity-50">
            {uploading ? "Uploading…" : "Upload photo"}
          </button>
        </form>

        <div className="mt-6 p-4 bg-bone-100 border border-hairline text-xs text-ink-muted leading-relaxed">
          <p className="font-medium text-navy-950 mb-1">After uploading</p>
          <p>Photos save to <code className="font-mono bg-white px-1">/public/construction/</code>. Commit and push to publish.</p>
        </div>
      </div>

      {/* Existing photos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-navy-950">Existing photos</h2>
          <select value={filterSlug} onChange={(e) => setFilterSlug(e.target.value)}
            className="text-xs border border-hairline bg-bone px-3 py-2 text-ink focus:outline-none">
            <option value="all">All properties</option>
            {PROPERTIES.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
          </select>
        </div>

        {loadingList ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="bg-bone border border-dashed border-hairline p-8 text-center">
            <p className="text-sm text-ink-muted">No photos yet. Upload one using the form.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {visible.map((u) => (
              <div key={u.id} className="bg-bone border border-hairline flex gap-4 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.imageUrl} alt={u.caption} className="h-20 w-20 object-cover shrink-0 bg-navy-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink-faint uppercase tracking-widest mb-1">
                    {PROPERTIES.find((p) => p.slug === u.propertySlug)?.label ?? u.propertySlug}
                    {" · "}{u.phase}{" · "}{u.date}
                  </p>
                  <p className="text-sm text-navy-950 leading-snug truncate">{u.caption || <span className="italic text-ink-muted">No caption</span>}</p>
                </div>
                <button onClick={() => handleDelete(u.id)} className="shrink-0 text-red-400 hover:text-red-600 text-sm px-2" title="Delete">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
