"use client";

import { useState, useRef, useEffect } from "react";
import ConstructionAdmin from "./_components/ConstructionAdmin";
import SiteUpdatesAdmin  from "./_components/SiteUpdatesAdmin";

function BlogNotifyForm({ pw }: { pw: string }) {
  const [title,       setTitle]       = useState("");
  const [slug,        setSlug]        = useState("");
  const [excerpt,     setExcerpt]     = useState("");
  const [sending,     setSending]     = useState(false);
  const [msg,         setMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setMsg(null);
    try {
      const res  = await fetch("/api/admin/notify-blog", {
        method: "POST",
        headers: { "x-admin-password": pw, "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, excerpt }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: "Notification sent to all blog subscribers." });
        setTitle(""); setSlug(""); setExcerpt("");
      } else {
        setMsg({ ok: false, text: data.error ?? "Failed to send." });
      }
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    } finally { setSending(false); }
  }

  return (
    <div className="bg-bone border border-hairline p-8 mt-8">
      <h2 className="font-display text-2xl text-navy-950 mb-1">Notify blog subscribers</h2>
      <p className="text-sm text-ink-muted mb-6">After publishing a new blog post, send a notification to all subscribers.</p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="admin-label">Post title</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Understanding MREIF financing" className="admin-input" />
        </div>
        <div>
          <label className="admin-label">Post slug (URL)</label>
          <input required value={slug} onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. understanding-mreif-financing" className="admin-input" />
          <p className="text-[11px] text-ink-faint mt-1">The link in the email will be: /blog/<span className="font-mono">{slug || "your-slug"}</span></p>
        </div>
        <div>
          <label className="admin-label">Excerpt (optional)</label>
          <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
            placeholder="A short preview shown in the email body" className="admin-input" />
        </div>
        {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-500"}`}>{msg.text}</p>}
        <button type="submit" disabled={sending}
          className="bg-navy-900 text-bone px-6 py-3 text-xs uppercase tracking-widest hover:bg-navy-800 transition-colors disabled:opacity-50">
          {sending ? "Sending…" : "Send notification"}
        </button>
      </form>
    </div>
  );
}

type Tab = "site-updates" | "construction";

export default function AdminPage() {
  const [password,  setPassword]  = useState("");
  const [authed,    setAuthed]    = useState(false);
  const [authError, setAuthError] = useState(false);
  const [tab,       setTab]       = useState<Tab>("site-updates");
  const pw = useRef("");

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) { pw.current = saved; setAuthed(true); }
  }, []);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/updates", { headers: { "x-admin-password": password } });
    if (res.ok) {
      pw.current = password;
      sessionStorage.setItem("admin_pw", password);
      setAuthed(true); setAuthError(false);
    } else setAuthError(true);
  }

  if (!authed) return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-bone p-10">
        <div className="flex items-center gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/geodata-mark.png" alt="" className="h-10 w-10" />
          <div>
            <p className="font-brand text-lg text-navy-950">GEODATA<span className="text-gold">.</span></p>
            <p className="text-xs text-ink-muted">Admin Console</p>
          </div>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-ink-muted mb-2">Password</label>
            <input type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b border-navy-900 bg-transparent py-2 text-navy-950 focus:outline-none focus:border-gold"
              autoFocus />
            {authError && <p className="mt-2 text-xs text-red-500">Incorrect password.</p>}
          </div>
          <button type="submit" className="w-full bg-navy-900 text-bone py-3 text-xs uppercase tracking-widest hover:bg-navy-800 transition-colors">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bone-100">
      <div className="bg-navy-950 text-bone px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/geodata-mark.png" alt="" className="h-8 w-8" />
          <div>
            <p className="font-brand text-base leading-tight">GEODATA<span className="text-gold">.</span></p>
            <p className="text-[11px] text-bone/50 uppercase tracking-wider">Admin Console</p>
          </div>
        </div>
        <button onClick={() => { sessionStorage.removeItem("admin_pw"); setAuthed(false); }}
          className="text-xs text-bone/50 hover:text-bone transition-colors uppercase tracking-wider">
          Sign out
        </button>
      </div>

      <div className="bg-navy-950 px-8 border-t border-white/10">
        <div className="max-w-5xl mx-auto flex">
          {([
            { id: "site-updates",  label: "Site Updates"        },
            { id: "construction",  label: "Construction Gallery" },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-xs uppercase tracking-widest transition-colors ${
                tab === t.id ? "text-gold border-b-2 border-gold" : "text-bone/55 hover:text-bone border-b-2 border-transparent"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {tab === "site-updates" && <SiteUpdatesAdmin pw={pw.current} />}
        {tab === "construction" && <ConstructionAdmin pw={pw.current} />}
        <BlogNotifyForm pw={pw.current} />
      </div>

      <style jsx global>{`
        .admin-label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94A0B0; margin-bottom: 0.5rem; }
        .admin-input { width: 100%; border-bottom: 1px solid #0F2547; background: transparent; padding: 0.5rem 0; font-size: 0.875rem; color: #0A1628; outline: none; }
        .admin-input:focus { border-bottom-color: #C9A961; }
        .admin-select { width: 100%; border-bottom: 1px solid #0F2547; background: transparent; padding: 0.5rem 0; font-size: 0.875rem; color: #0A1628; outline: none; cursor: pointer; }
      `}</style>
    </div>
  );
}
