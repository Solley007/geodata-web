"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { useSavedResidences } from "@/lib/SavedResidencesProvider";
import { PROPERTIES } from "@/lib/properties-list";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SavedDrawer({ open, onClose }: Props) {
  const { saved, remove, clear, count } = useSavedResidences();

  // Lock body scroll + Esc to close
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Resolve slugs → full property data (preserve order of save)
  const items = saved
    .map((slug) => PROPERTIES.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={clsx(
          "fixed inset-0 z-[60] bg-navy-950/40 backdrop-blur-sm transition-opacity duration-400",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-hidden
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-label="Saved residences"
        aria-modal={open}
        className={clsx(
          "fixed top-0 right-0 z-[61] h-full w-full sm:w-[440px] bg-bone dark:bg-navy-950 shadow-xl transition-transform duration-500 ease-editorial flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-hairline dark:border-white/10 shrink-0">
          <div>
            <p className="eyebrow text-ink-muted dark:text-bone/50 mb-1">Your shortlist</p>
            <h2 className="font-display text-2xl tracking-tight text-navy-950 dark:text-bone">
              Saved residences {count > 0 && <span className="text-accent-dark dark:text-accent">({count})</span>}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 inline-flex items-center justify-center text-ink-muted dark:text-bone/60 hover:text-navy-950 dark:hover:text-bone transition-colors"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {count === 0 ? (
            <EmptyState onClose={onClose} />
          ) : (
            <ul>
              {items.map((p) => (
                <li key={p.slug} className="border-b border-hairline dark:border-white/10">
                  <div className="p-4 flex gap-4">
                    {/* Thumbnail */}
                    <Link
                      href={`/properties/${p.slug}`}
                      onClick={onClose}
                      className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden bg-bone-100 group/thumb"
                    >
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        sizes="120px"
                        className="object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/properties/${p.slug}`}
                        onClick={onClose}
                        className="block hover:text-accent-dark dark:hover:text-accent transition-colors"
                      >
                        <p className="font-display text-lg tracking-tight text-navy-950 dark:text-bone leading-tight truncate">
                          {p.title}
                        </p>
                      </Link>
                      <p className="text-xs uppercase tracking-widest text-ink-muted dark:text-bone/50 mt-1">
                        {p.location}
                      </p>
                      <div className="flex items-baseline gap-3 mt-2">
                        <p className="font-display text-base text-accent-dark dark:text-accent">
                          {p.priceLabel}
                        </p>
                        <p className="text-xs text-ink-muted dark:text-bone/60">
                          {p.beds} bed
                          {p.available > 0
                            ? ` · ${p.available} available`
                            : p.area ? ` · ${p.area}` : ""}
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => remove(p.slug)}
                        className="mt-3 text-[11px] uppercase tracking-widest text-ink-faint dark:text-bone/40 hover:text-accent-dark dark:hover:text-accent transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {count > 0 && (
          <div className="px-6 py-5 border-t border-hairline dark:border-white/10 shrink-0 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={clear}
              className="text-xs uppercase tracking-widest text-ink-muted dark:text-bone/50 hover:text-accent-dark dark:hover:text-accent transition-colors"
            >
              Clear all
            </button>
            <Link
              href="/book-viewing"
              onClick={onClose}
              className="inline-flex items-center gap-2 bg-navy-900 dark:bg-bone dark:text-navy-950 text-bone px-5 py-3 text-xs uppercase tracking-eyebrow font-medium hover:bg-navy-800 dark:hover:bg-bone-100 transition-colors"
            >
              Reserve a viewing →
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto mb-5 h-14 w-14 inline-flex items-center justify-center rounded-full bg-bone-100 dark:bg-white/5 text-ink-faint dark:text-bone/40">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
      <p className="font-display text-lg text-navy-950 dark:text-bone mb-2">
        No saved residences yet.
      </p>
      <p className="text-sm text-ink-muted dark:text-bone/60 leading-relaxed max-w-xs mx-auto mb-6">
        Tap the heart on any residence to add it here. Useful when comparing options across Southern Bridge.
      </p>
      <Link
        href="/properties"
        onClick={onClose}
        className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone border-b border-navy-900/30 dark:border-bone/30 hover:border-accent-dark dark:hover:border-accent hover:text-accent-dark dark:hover:text-accent transition-colors pb-0.5"
      >
        Browse all residences →
      </Link>
    </div>
  );
}
