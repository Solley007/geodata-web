"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import { SOCIAL } from "@/lib/site-content";
import { summarise, type UnitRecord, type UnitStatus } from "@/lib/availability-types";
import { formatUpdateDate } from "@/lib/site-updates-types";
import BookViewingButton from "@/components/shared/BookViewingButton";
import CurrencySwitcher from "@/components/shared/CurrencySwitcher";
import Price from "@/components/shared/Price";
import SectionErrorBoundary from "@/components/shared/SectionErrorBoundary";

// Mapbox uses browser-only APIs, load on the client only
const SitePlanMap = dynamic(() => import("./SitePlanMap"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[360px] bg-navy-100 dark:bg-navy-900 animate-pulse" />,
});

export interface SitePlanPlot {
  slug:       string;
  title:      string;
  type:       string;     // "Terrace · 4 bed"
  plotNo:     string;
  coords:     { lat: number; lng: number };
  priceNgn:   number;
  priceLabel: string;
  units:      UnitRecord[];
}

interface Props {
  plots:        SitePlanPlot[];
  updatedAt:    string;
  placeholder?: boolean;
}

const STATUS_LABEL: Record<UnitStatus, string> = {
  available: "Available",
  reserved:  "Reserved",
  sold:      "Sold",
};

const STATUS_CHIP: Record<UnitStatus, string> = {
  available: "bg-navy-900 dark:bg-bone",
  reserved:  "bg-accent",
  sold:      "bg-hairline dark:bg-white/15",
};

export default function SitePlan({ plots, updatedAt, placeholder }: Props) {
  const root = useRef<HTMLElement>(null);
  const hasMap = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

  const withSummary = useMemo(
    () => plots.map((p) => ({ ...p, summary: summarise(p.units) })),
    [plots]
  );

  // Open on the block with the most units still available
  const [selected, setSelected] = useState(
    () => [...withSummary].sort((a, b) => b.summary.available - a.summary.available)[0]?.slug ?? ""
  );
  const plot = withSummary.find((p) => p.slug === selected) ?? withSummary[0];

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".splan-fade", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  if (!plot) return null;
  const { summary } = plot;

  return (
    <section ref={root} id="availability" className="bg-bone-100 dark:bg-navy-900 py-32 md:py-48">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12 mb-16">
          <div className="col-span-12 lg:col-span-6 splan-fade">
            <p className="eyebrow mb-6">Live availability</p>
            <h2 className="text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
              Choose your plot.
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:pt-6 splan-fade">
            <p className="text-lg leading-relaxed text-ink dark:text-bone/75 mb-6">
              Every typology sits on its own plot within the estate. Pick one
              to see how many units are left, unit by unit.
            </p>
            <CurrencySwitcher />
          </div>
        </div>

        {/* Plot picker, works with or without the map */}
        <div className="splan-fade -mx-4 px-4 overflow-x-auto mb-6">
          <div className="flex gap-2 min-w-max">
            {withSummary.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => setSelected(p.slug)}
                aria-pressed={p.slug === selected}
                className={clsx(
                  "px-4 py-2.5 text-xs uppercase tracking-eyebrow font-medium border transition-colors duration-300",
                  p.slug === selected
                    ? "bg-navy-900 text-bone border-navy-900 dark:bg-bone dark:text-navy-950 dark:border-bone"
                    : "text-navy-900 dark:text-bone/80 border-hairline dark:border-white/15 hover:border-navy-900 dark:hover:border-bone/50"
                )}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 lg:gap-0 splan-fade">
          {hasMap && (
            <div className="col-span-12 lg:col-span-7 h-[420px] lg:h-auto">
              <SectionErrorBoundary sectionName="SitePlanMap">
                <SitePlanMap plots={withSummary} selected={selected} onSelect={setSelected} />
              </SectionErrorBoundary>
            </div>
          )}

          {/* Plot panel */}
          <div
            className={clsx(
              "col-span-12 bg-bone dark:bg-navy-950 p-8 md:p-10",
              hasMap && "lg:col-span-5"
            )}
            aria-live="polite"
          >
            <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">
              Plot {plot.plotNo} · {plot.type}
            </p>
            <h3 className="font-display text-3xl md:text-4xl text-navy-950 dark:text-bone tracking-tightest leading-tight">
              {plot.title}
            </h3>
            <p className="mt-3 font-display text-2xl text-navy-900 dark:text-bone/90">
              From <Price ngn={plot.priceNgn} label={plot.priceLabel} />
            </p>

            {summary.total === 0 ? (
              <div className="mt-10 border-t border-hairline dark:border-white/10 pt-8">
                <p className="text-ink dark:text-bone/75 leading-relaxed mb-6">
                  Availability for this typology is on request. Message the
                  sales team for the current position.
                </p>
                <a
                  href={`${SOCIAL.whatsapp}?text=${encodeURIComponent(`Hello, I'd like to know availability for ${plot.title} (Plot ${plot.plotNo}).`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone pb-1 border-b border-navy-900/30 dark:border-bone/30 hover:text-accent-dark hover:border-accent-dark transition-colors duration-400"
                >
                  Ask on WhatsApp →
                </a>
              </div>
            ) : (
              <>
                {/* Counts */}
                <div className="mt-10 grid grid-cols-3 border-t border-hairline dark:border-white/10">
                  {(["available", "reserved", "sold"] as const).map((s) => (
                    <div key={s} className="pt-6">
                      <p className="font-display text-4xl text-navy-950 dark:text-bone tracking-tightest leading-none">
                        {summary[s]}
                      </p>
                      <p className="mt-2 eyebrow text-ink-faint dark:text-bone/40">{STATUS_LABEL[s]}</p>
                    </div>
                  ))}
                </div>

                {/* Unit grid */}
                <div className="mt-8">
                  <div className="flex flex-wrap gap-1" role="list" aria-label={`${summary.total} units`}>
                    {plot.units.map((u) => (
                      <span
                        key={u.id}
                        role="listitem"
                        title={`Unit ${u.id}: ${STATUS_LABEL[u.status]}`}
                        aria-label={`Unit ${u.id}: ${STATUS_LABEL[u.status]}`}
                        className={clsx("h-3 w-3", STATUS_CHIP[u.status])}
                      />
                    ))}
                  </div>
                  <div className="mt-4 flex gap-5 text-[10px] uppercase tracking-eyebrow text-ink-muted dark:text-bone/50">
                    {(["available", "reserved", "sold"] as const).map((s) => (
                      <span key={s} className="flex items-center gap-1.5">
                        <span className={clsx("h-2.5 w-2.5", STATUS_CHIP[s])} /> {STATUS_LABEL[s]}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="mt-10 flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3">
              <Link
                href={`/properties/${plot.slug}`}
                className="inline-flex items-center justify-center gap-2 border border-navy-900 text-navy-900 dark:border-bone dark:text-bone px-6 py-3.5 text-xs uppercase tracking-eyebrow font-medium hover:bg-navy-900 hover:text-bone dark:hover:bg-bone dark:hover:text-navy-950 transition-colors duration-400"
              >
                View residence
              </Link>
              <BookViewingButton
                calLink="geodata/sbc-viewing"
                className="inline-flex items-center justify-center gap-2 bg-navy-900 dark:bg-bone dark:text-navy-950 text-bone px-6 py-3.5 text-xs uppercase tracking-eyebrow font-medium hover:bg-navy-800 dark:hover:bg-accent-soft transition-colors duration-400"
              >
                Book a viewing
              </BookViewingButton>
            </div>

            <p className="mt-8 text-[11px] text-ink-faint dark:text-bone/40">
              {placeholder ? "Indicative availability. Confirm with the sales team before reserving." : `Updated ${formatUpdateDate(updatedAt)}.`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
