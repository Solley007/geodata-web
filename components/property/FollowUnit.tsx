"use client";

import { useState } from "react";

interface Props {
  slug:  string;
  title: string;
}

type Status = "idle" | "sending" | "done" | "error";

/**
 * FollowUnit, email signup for construction updates on one typology.
 * Pairs with app/api/follow/route.ts.
 */
export default function FollowUnit({ slug, title }: Props) {
  const [email,  setEmail]  = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/follow", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, slug }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-6 pt-5 border-t border-hairline dark:border-white/10">
      <p className="eyebrow text-ink-muted dark:text-bone/50 text-[10px] mb-2">Follow the build</p>
      {status === "done" ? (
        <p className="text-sm text-navy-900/80 dark:text-bone/75">
          You&apos;re following {title}. We&apos;ll email you when new progress goes up.
        </p>
      ) : (
        <>
          <p className="text-sm text-ink-muted dark:text-bone/60 mb-3">
            Get an email when there&apos;s new construction progress on {title}.
          </p>
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label={`Email for ${title} construction updates`}
              className="flex-1 min-w-0 bg-transparent border border-navy-900/20 dark:border-bone/20 px-4 py-2.5 text-sm text-navy-950 dark:text-bone focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex items-center justify-center bg-navy-900 dark:bg-bone dark:text-navy-950 text-bone px-5 py-2.5 text-[11px] uppercase tracking-eyebrow font-medium hover:bg-navy-800 dark:hover:bg-accent-soft transition-colors duration-400 disabled:opacity-50"
            >
              {status === "sending" ? "Saving…" : "Follow"}
            </button>
          </form>
          {status === "error" && (
            <p className="mt-2 text-xs text-accent">Something went wrong. Try again or WhatsApp us.</p>
          )}
        </>
      )}
    </div>
  );
}
