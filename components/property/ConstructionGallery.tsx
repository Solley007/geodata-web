"use client";

import { useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import {
  fetchConstructionUpdates,
  filterUpdates,
  formatUpdateDate,
  type ConstructionUpdate,
} from "@/lib/construction-updates";
import type { PropertyPhase } from "@/lib/property-data";

interface Props {
  propertySlug: string;
  selectedPhase: PropertyPhase;
}

export default function ConstructionGallery({ propertySlug, selectedPhase }: Props) {
  const [allUpdates, setAllUpdates] = useState<ConstructionUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<ConstructionUpdate | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetchConstructionUpdates()
      .then(setAllUpdates)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Close lightbox on Escape key
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setLightbox(null);
  }, []);
  useEffect(() => {
    if (lightbox) {
      window.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    } else {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, handleKey]);

  const updates = filterUpdates(allUpdates, propertySlug, selectedPhase);

  // --- Loading state ---
  if (loading) {
    return (
      <div className="mt-12 pt-12 border-t border-hairline dark:border-white/10">
        <p className="eyebrow text-ink-faint dark:text-bone/40 mb-8">Site photographs</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-[4/3] bg-navy-100 animate-pulse rounded-none"
            />
          ))}
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="mt-12 pt-12 border-t border-hairline dark:border-white/10">
        <p className="eyebrow text-ink-faint dark:text-bone/40 mb-4">Site photographs</p>
        <p className="text-sm text-ink-muted dark:text-bone/60">
          Could not load construction updates right now. Please try refreshing.
        </p>
      </div>
    );
  }

  // --- Empty state ---
  if (updates.length === 0) {
    const hasApiConfig =
      process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID &&
      process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY;

    return (
      <div className="mt-12 pt-12 border-t border-hairline dark:border-white/10">
        <p className="eyebrow text-ink-faint dark:text-bone/40 mb-4">Site photographs</p>
        {!hasApiConfig ? (
          <div className="bg-bone dark:bg-navy-950 border border-hairline dark:border-white/10 p-6 text-sm text-ink-muted dark:text-bone/60">
            <p className="font-medium text-navy-950 dark:text-bone mb-2">Setup required</p>
            <p>
              Add <code className="font-mono text-xs bg-navy-100 px-1 py-0.5">NEXT_PUBLIC_GOOGLE_SHEETS_ID</code> and{" "}
              <code className="font-mono text-xs bg-navy-100 px-1 py-0.5">NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY</code> to your <code className="font-mono text-xs bg-navy-100 px-1 py-0.5">.env.local</code> file to activate construction updates.
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted dark:text-bone/60">
            No site photographs yet for the <strong>{selectedPhase}</strong> phase.
            Add updates to the Google Sheet to populate this section.
          </p>
        )}
      </div>
    );
  }

  // --- Gallery ---
  return (
    <>
      <div className="mt-12 pt-12 border-t border-hairline dark:border-white/10">
        <div className="flex items-baseline justify-between mb-8">
          <p className="eyebrow text-ink-faint dark:text-bone/40">
            Site photographs
          </p>
          <p className="text-xs text-ink-faint dark:text-bone/40">
            {updates.length} {updates.length === 1 ? "update" : "updates"}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {updates.map((update, i) => (
            <button
              key={i}
              onClick={() => setLightbox(update)}
              className="group block text-left focus-visible:outline-2 focus-visible:outline-gold"
              aria-label={`View photo: ${update.caption}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-navy-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={update.imageUrl}
                  alt={update.caption}
                  className="w-full h-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.04]"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/30 transition-colors duration-400 flex items-end">
                  <div className="w-full p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-400">
                    <p className="text-bone text-xs leading-snug line-clamp-2">
                      {update.caption}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-ink-faint dark:text-bone/40">
                {formatUpdateDate(update.date)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[90] bg-navy-950/95 backdrop-blur-sm flex items-center justify-center p-6 md:p-12"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.caption}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-bone/70 hover:text-bone transition-colors text-sm uppercase tracking-eyebrow"
              aria-label="Close"
            >
              Close ×
            </button>

            {/* Image */}
            <div className="overflow-hidden flex-1 min-h-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.imageUrl}
                alt={lightbox.caption}
                className="w-full h-full object-contain max-h-[75vh]"
              />
            </div>

            {/* Caption */}
            <div className="mt-4 flex items-start justify-between gap-8">
              <p className="text-bone leading-relaxed">{lightbox.caption}</p>
              <p className="text-bone/50 text-sm shrink-0">
                {formatUpdateDate(lightbox.date)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
