"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import BookViewingEmbed from "@/components/shared/BookViewingEmbed";
import { SOCIAL } from "@/lib/site-content";

type Site = "sbc" | "sbe";

const SITES = [
  {
    id: "sbc" as const,
    label: "Southern Bridge City",
    sub: "Phase One — 320 residences",
    calLink: "geodata/sbc-viewing",
    location: "Plot 7266, Idu Industrial Layout, Abuja",
  },
  {
    id: "sbe" as const,
    label: "Southern Bridge Estate",
    sub: "27 residences, mostly delivered",
    calLink: "geodata/sbe-viewing",
    location: "Idu, Abuja",
  },
];

const WA_LINK = `${SOCIAL.whatsapp}?text=${encodeURIComponent(
  "Hi, I'd like to arrange a viewing but couldn't find a suitable slot online."
)}`;

export default function BookViewingClient() {
  const [active, setActive] = useState<Site>("sbc");
  const current = SITES.find(s => s.id === active)!;

  return (
    <main className="min-h-screen bg-bone dark:bg-navy-950 pt-28 md:pt-32 pb-20">
      <div className="container-editorial max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-12 md:mb-16">
          <p className="eyebrow text-ink-muted dark:text-bone/50 mb-4">Reserve a viewing</p>
          <h1 className="font-display text-display-md md:text-display-lg text-navy-950 dark:text-bone tracking-tightest leading-[1.1] mb-6">
            See <em className="font-light">the work</em> in person.
          </h1>
          <p className="text-lg text-ink-muted dark:text-bone/70 leading-relaxed max-w-2xl">
            Pick a one-hour slot — Monday to Saturday — and we'll meet you on site. Morning tours work best for daylight inspection. Afternoon tours catch the golden hour for photos.
          </p>
        </div>

        {/* Site tabs */}
        <div className="border-b border-hairline dark:border-white/10 mb-8 flex gap-1 overflow-x-auto">
          {SITES.map(site => (
            <button
              key={site.id}
              onClick={() => setActive(site.id)}
              className={clsx(
                "px-5 py-3 text-sm font-medium transition-colors duration-300 whitespace-nowrap border-b-2 -mb-px",
                active === site.id
                  ? "border-accent-dark dark:border-accent text-navy-950 dark:text-bone"
                  : "border-transparent text-ink-muted dark:text-bone/50 hover:text-navy-950 dark:hover:text-bone"
              )}
            >
              {site.label}
            </button>
          ))}
        </div>

        {/* Active site context */}
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-widest text-ink-muted dark:text-bone/50">
            {current.sub}
          </p>
          <p className="text-sm text-ink-muted dark:text-bone/60 mt-1 flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" className="shrink-0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            {current.location}
          </p>
        </div>

        {/* The actual calendar — keep BOTH mounted, hide inactive (avoids re-init on tab switch) */}
        {SITES.map(site => (
          <div key={site.id} className={active === site.id ? "block" : "hidden"}>
            <BookViewingEmbed calLink={site.calLink} namespace={site.id} />
          </div>
        ))}

        {/* Fallback */}
        <div className="mt-12 pt-10 border-t border-hairline dark:border-white/10 text-center">
          <p className="eyebrow text-ink-muted dark:text-bone/50 mb-4">Can't find a time?</p>
          <p className="text-ink-muted dark:text-bone/70 mb-6 max-w-xl mx-auto">
            We do private viewings for diaspora buyers and groups. Send us a WhatsApp message and we'll arrange something that works.
          </p>
          <a
            href={WA_LINK}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-navy-900 dark:text-bone border-b border-navy-900/30 dark:border-bone/30 hover:text-accent-dark hover:border-accent-dark dark:hover:text-accent dark:hover:border-accent transition-colors pb-0.5"
          >
            Message us on WhatsApp →
          </a>
        </div>

      </div>
    </main>
  );
}
