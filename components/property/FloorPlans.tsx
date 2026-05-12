"use client";

import { useState } from "react";
import clsx from "clsx";
import type { FloorPlan } from "@/lib/property-data";

interface Props {
  floorPlans: FloorPlan[];
  floorPlanPdf: string;
  propertyTitle: string;
}

export default function FloorPlans({ floorPlans, floorPlanPdf, propertyTitle }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const active = floorPlans[activeIndex];
  if (!active) return null;

  const hasImage = !imageErrors[activeIndex];

  return (
    <>
      <div className="mt-16 pt-12 border-t border-hairline dark:border-white/10">
        {/* Header row — title left, single PDF download right */}
        <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
          <div>
            <p className="eyebrow text-ink-faint dark:text-bone/40 mb-2">Floor plans</p>
            <p className="text-sm text-ink-muted dark:text-bone/60">
              {floorPlans.length > 1
                ? "Select a floor to view. Click any plan to enlarge."
                : "Click the plan to enlarge."}
            </p>
          </div>

          {/* Single PDF download for the full building */}
          <a
            href={floorPlanPdf}
            download
            className="shrink-0 inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone/90 hover:text-gold-dark transition-colors duration-400 pb-1 border-b border-navy-900 dark:border-white/20 hover:border-gold-dark"
          >
            <svg
              width="13" height="15" viewBox="0 0 13 15" fill="none"
              xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden
            >
              <path
                d="M6.5 1v8.5M6.5 9.5l-2.5-2.5M6.5 9.5l2.5-2.5M1 12.5h11"
                stroke="currentColor" strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            Download floor plan PDF
          </a>
        </div>

        {/* Floor tabs — only render if more than one floor */}
        {floorPlans.length > 1 && (
          <div className="flex gap-0 border-b border-hairline dark:border-white/10 overflow-x-auto scrollbar-hide mb-6">
            {floorPlans.map((plan, i) => (
              <button
                key={plan.floor}
                onClick={() => { setActiveIndex(i); setLightboxOpen(false); }}
                className={clsx(
                  "shrink-0 px-5 py-3 text-xs uppercase tracking-eyebrow font-medium transition-all duration-300 border-b-2 -mb-px",
                  i === activeIndex
                    ? "border-navy-900 dark:border-white/20 text-navy-900 dark:text-bone/90"
                    : "border-transparent text-ink-muted dark:text-bone/60 hover:text-navy-900 dark:text-bone/90"
                )}
              >
                {plan.floor}
              </button>
            ))}
          </div>
        )}

        {/* Plan image */}
        {hasImage ? (
          <button
            onClick={() => setLightboxOpen(true)}
            className="group relative block w-full bg-bone-100 dark:bg-navy-900 border border-hairline dark:border-white/10 overflow-hidden cursor-zoom-in"
            aria-label={`View ${active.floor} plan full size`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.imageUrl}
              alt={`${propertyTitle} — ${active.floor}`}
              className="w-full h-auto object-contain max-h-[600px] transition-transform duration-700 group-hover:scale-[1.02]"
              onError={() =>
                setImageErrors((prev) => ({ ...prev, [activeIndex]: true }))
              }
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-navy-950/70 backdrop-blur-sm px-4 py-2 text-bone text-xs uppercase tracking-eyebrow">
                Click to enlarge
              </div>
            </div>
          </button>
        ) : (
          <div className="w-full bg-bone-100 dark:bg-navy-900 border border-dashed border-hairline dark:border-white/10 flex flex-col items-center justify-center py-20 px-8 text-center">
            <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">Floor plan image coming soon</p>
            <p className="text-sm text-ink-muted dark:text-bone/60 max-w-sm">
              Add <code className="font-mono text-xs bg-navy-100 px-1">{active.imageUrl}</code> to display the plan here.
            </p>
          </div>
        )}

        {/* Mobile pinch hint */}
        <p className="mt-3 text-xs text-ink-faint dark:text-bone/40 md:hidden">
          Tap image to enlarge · Pinch to zoom
        </p>
      </div>

      {/* Full-screen lightbox */}
      {lightboxOpen && hasImage && (
        <div
          className="fixed inset-0 z-[90] bg-navy-950/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 text-bone/70 hover:text-bone transition-colors text-sm uppercase tracking-eyebrow z-10"
            aria-label="Close"
          >
            Close ×
          </button>

          <p className="absolute top-6 left-1/2 -translate-x-1/2 text-bone/50 text-xs md:hidden whitespace-nowrap">
            Pinch to zoom
          </p>

          <div
            className="relative w-full h-full overflow-auto flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: "pinch-zoom" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.imageUrl}
              alt={`${propertyTitle} — ${active.floor}`}
              className="max-w-none w-full md:w-auto md:max-w-5xl md:max-h-[85vh] object-contain"
              style={{ touchAction: "pinch-zoom" }}
            />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6">
            <span className="text-bone/60 text-sm">{propertyTitle} · {active.floor}</span>
            <a
              href={floorPlanPdf}
              download
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-bone hover:text-gold-soft transition-colors pb-0.5 border-b border-bone/40 hover:border-gold-soft"
            >
              Download PDF
            </a>
          </div>
        </div>
      )}
    </>
  );
}
