"use client";

import { useState, useEffect } from "react";

/**
 * SubscribePopup — site-wide email capture with preference checkboxes
 * Shows after 4 seconds on first eligible visit. Once subscribed: never
 * shown again. Once dismissed: 14 day cooldown.
 */

const SHOW_DELAY_MS    = 4_000;
const DISMISS_COOLDOWN = 14 * 24 * 60 * 60 * 1000; // 14 days

const CATEGORIES = [
  { id: "updates",       label: "Site updates",         description: "Construction photos & videos from active sites" },
  { id: "blog",          label: "Blog",                 description: "Editorial articles and insights" },
  { id: "properties",    label: "Properties & pricing", description: "New projects, units, and price changes" },
  { id: "announcements", label: "Announcements",        description: "Events, milestones, and other news" },
] as const;

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  // Don't show inside admin pages
  if (window.location.pathname.startsWith("/admin")) return false;
  if (localStorage.getItem("geodata_subscribed") === "true") return false;
  const dismissedAt = localStorage.getItem("geodata_popup_dismissed");
  if (dismissedAt) {
    const t = new Date(dismissedAt).getTime();
    if (!isNaN(t) && Date.now() - t < DISMISS_COOLDOWN) return false;
  }
  return true;
}

export default function SubscribePopup() {
  const [visible,    setVisible]    = useState(false);
  const [email,      setEmail]      = useState("");
  const [selected,   setSelected]   = useState<Set<string>>(new Set(["updates", "blog", "properties", "announcements"]));
  const [submitting, setSubmitting] = useState(false);
  const [status,     setStatus]     = useState<"idle" | "success" | "error">("idle");
  const [error,      setError]      = useState("");

  useEffect(() => {
    if (!shouldShow()) return;
    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function dismiss() {
    localStorage.setItem("geodata_popup_dismissed", new Date().toISOString());
    setVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      setStatus("error");
      setError("Pick at least one category.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, categories: Array.from(selected) }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("geodata_subscribed", "true");
        setStatus("success");
        setTimeout(() => setVisible(false), 3500);
      } else {
        setStatus("error");
        setError(data.error ?? "Subscription failed");
      }
    } catch (err: any) {
      setStatus("error");
      setError(err.message ?? "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscribe-title"
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 animate-[sp-fade_400ms_ease-out]"
    >
      <div className="absolute inset-0 bg-navy-950/65 backdrop-blur-sm" onClick={dismiss} aria-hidden />

      <div className="relative w-full max-w-md bg-bone dark:bg-navy-900 shadow-2xl animate-[sp-scale_500ms_cubic-bezier(0.33,1,0.68,1)] max-h-[90vh] overflow-y-auto">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="sticky top-4 ml-auto mr-4 -mb-9 z-10 w-9 h-9 flex items-center justify-center text-ink-muted dark:text-bone/60 hover:text-navy-950 dark:hover:text-bone transition-colors block"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <div className="px-8 pt-10 pb-8">
          <div className="flex items-center gap-2.5 mb-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/geodata-mark.png" alt="" className="h-8 w-8" />
            <p className="font-brand text-base text-navy-950 dark:text-bone leading-none">
              GEODATA<span className="text-gold">.</span>
            </p>
          </div>

          {status === "success" ? (
            <div className="py-4">
              <h2 className="font-display text-2xl text-navy-950 dark:text-bone mb-3 tracking-tightest">
                You're on the list.
              </h2>
              <p className="text-sm text-ink dark:text-bone/75 leading-relaxed">
                We'll email you when there's something new in your selected categories. Easy to unsubscribe anytime.
              </p>
            </div>
          ) : (
            <>
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">Stay informed</p>
              <h2 id="subscribe-title" className="font-display text-3xl text-navy-950 dark:text-bone mb-3 tracking-tightest leading-[1.1]">
                Get what{" "}
                <em className="font-light">matters to you.</em>
              </h2>
              <p className="text-sm text-ink dark:text-bone/70 leading-relaxed mb-5">
                Pick what you'd like to hear about. We'll email a preview with a link straight to the post — no spam.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category checkboxes */}
                <div className="space-y-2 mb-1">
                  {CATEGORIES.map((cat) => {
                    const checked = selected.has(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex gap-3 p-3 border cursor-pointer transition-colors ${
                          checked
                            ? "border-navy-900 dark:border-bone/50 bg-bone-100 dark:bg-navy-800"
                            : "border-hairline dark:border-white/10 hover:border-navy-900/40 dark:hover:border-bone/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(cat.id)}
                          className="sr-only"
                        />
                        <span
                          className={`shrink-0 mt-0.5 w-4 h-4 border flex items-center justify-center transition-colors ${
                            checked
                              ? "bg-navy-900 dark:bg-bone border-navy-900 dark:border-bone"
                              : "border-navy-900/30 dark:border-bone/30"
                          }`}
                          aria-hidden
                        >
                          {checked && (
                            <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-bone dark:text-navy-900">
                              <polyline points="3 8 7 12 13 4" />
                            </svg>
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-navy-950 dark:text-bone leading-snug">
                            {cat.label}
                          </span>
                          <span className="block text-xs text-ink-muted dark:text-bone/55 leading-snug mt-0.5">
                            {cat.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Email */}
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-transparent border-b border-navy-900 dark:border-white/20 py-3 text-navy-950 dark:text-bone placeholder:text-ink-faint dark:placeholder:text-bone/30 focus:outline-none focus:border-gold transition-colors"
                />

                {status === "error" && (
                  <p className="text-xs text-red-500">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-navy-900 text-bone py-3.5 text-xs uppercase tracking-widest font-medium hover:bg-navy-800 transition-colors duration-400 disabled:opacity-50"
                >
                  {submitting ? "Subscribing…" : "Subscribe"}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="w-full text-xs text-ink-muted dark:text-bone/50 hover:text-navy-950 dark:hover:text-bone transition-colors mt-1"
                >
                  No thanks
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes sp-fade   { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sp-scale  { from { opacity: 0; transform: translateY(20px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}
