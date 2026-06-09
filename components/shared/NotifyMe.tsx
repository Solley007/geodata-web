/**
 * NotifyMe — availability alert capture.
 *
 * Save as: components/shared/NotifyMe.tsx
 * Pairs with: app/api/availability-alert/route.ts (provided alongside).
 *
 * Drop next to scarcity copy on a typology row:
 *   <NotifyMe property="Southern Bridge City" typology="6-Bedroom Terrace Duplex" />
 *
 * A buyer who sets an alert is telling you exactly which unit they want
 * and that timing is their blocker. Gold-tier lead segment.
 */
"use client";

import React, { useState } from "react";

interface Props {
  property: string;
  typology: string;
  className?: string;
}

type Status = "idle" | "sending" | "done" | "error";

export default function NotifyMe({ property, typology, className = "" }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/availability-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, property, typology }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className={`text-sm text-navy-900/70 dark:text-bone/70 ${className}`}>
        Noted. We will email you if availability or pricing changes on the{" "}
        {typology}.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 bg-transparent border border-navy-900/20 dark:border-bone/20 px-4 py-3 text-sm text-navy-950 dark:text-bone focus:outline-none focus:border-accent"
        aria-label="Email for availability alerts"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center gap-2 bg-navy-900 text-bone px-6 py-3 text-xs uppercase tracking-eyebrow font-medium hover:bg-navy-800 transition-colors duration-400 disabled:opacity-50"
      >
        {status === "sending" ? "Saving…" : "Notify me"}
      </button>
      {status === "error" && (
        <p className="text-xs text-accent self-center">
          Something went wrong. Try again or WhatsApp us.
        </p>
      )}
    </form>
  );
}
