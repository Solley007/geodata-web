"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import type { Property, PropertyPhase } from "@/lib/property-data";
import {
  fetchConstructionUpdates,
  filterUpdates,
  formatUpdateDate,
  type ConstructionUpdate,
} from "@/lib/construction-updates";

interface Props {
  property: Property;
}

const PHASES: PropertyPhase[] = ["Launch", "Structure", "Finishing", "Handover"];

export default function ProgressBar({ property }: Props) {
  const root = useRef<HTMLElement>(null);
  const { currentPhase, percent } = property.progress;
  const currentIndex = PHASES.indexOf(currentPhase);

  const [updates, setUpdates] = useState<ConstructionUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConstructionUpdates()
      .then((all) => setUpdates(filterUpdates(all, property.slug, currentPhase)))
      .finally(() => setLoading(false));
  }, [property.slug, currentPhase]);

  const hero      = updates[0];
  // Show 3 thumbnails inline + a 4th tile that opens the rest as a gallery
  const thumbsMax = 3;
  const thumbs    = updates.slice(1, 1 + thumbsMax);
  const remaining = Math.max(0, updates.length - 1 - thumbsMax);

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const lightbox = lightboxIdx !== null ? updates[lightboxIdx] : null;

  function openLightbox(idx: number) { setLightboxIdx(idx); }
  function closeLightbox()           { setLightboxIdx(null); }
  function next() { if (lightboxIdx !== null) setLightboxIdx((lightboxIdx + 1) % updates.length); }
  function prev() { if (lightboxIdx !== null) setLightboxIdx((lightboxIdx - 1 + updates.length) % updates.length); }

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")      closeLightbox();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft")  prev();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIdx]);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".progress-fill",
        { scaleX: 0 },
        {
          scaleX: percent / 100,
          duration: 1.4,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 80%", once: true },
        }
      );
    }, root);
    return () => ctx.revert();
  }, [percent]);

  return (
    <section ref={root} id="progress" className="py-8 md:py-10 bg-bone dark:bg-navy-950">
      <div className="container-editorial">

        {/* Side-by-side: text/timeline on left, current photo on right */}
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-6 md:gap-10 items-center">

          {/* Left: status + timeline */}
          <div>
            <p className="eyebrow text-ink-muted dark:text-bone/50 mb-3">Construction progress</p>
            <h2 className="text-2xl md:text-3xl font-display text-navy-950 dark:text-bone tracking-tight leading-[1.1] mb-2">
              On site, <span className="text-gold-dark dark:text-gold">{percent}%</span> complete.
            </h2>
            {hero && (
              <p className="text-xs text-ink-muted dark:text-bone/50 mb-5">
                Last updated {formatUpdateDate(hero.date)}
              </p>
            )}

            {/* Inline timeline */}
            <div className="relative h-px bg-hairline dark:bg-white/10 mb-3">
              <div className="progress-fill absolute inset-y-0 left-0 right-0 bg-navy-900 dark:bg-gold origin-left" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {PHASES.map((phase, i) => {
                const isCurrent = phase === currentPhase;
                const isPast    = i < currentIndex;
                return (
                  <div key={phase} className="flex flex-col items-start">
                    <span
                      className={clsx(
                        "inline-block h-1.5 w-1.5 rounded-full mb-1.5",
                        isPast    && "bg-navy-900 dark:bg-gold",
                        isCurrent && "bg-gold ring-2 ring-gold/20 animate-pulse",
                        !isPast && !isCurrent && "bg-hairline dark:bg-white/15"
                      )}
                    />
                    <p className={clsx(
                      "text-[10px] uppercase tracking-widest",
                      isCurrent ? "text-navy-950 dark:text-bone font-medium" : "text-ink-muted dark:text-bone/40"
                    )}>
                      {phase}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Inline recent thumbnails */}
            {thumbs.length > 0 && (
              <div className="mt-6 pt-5 border-t border-hairline dark:border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <p className="eyebrow text-ink-muted dark:text-bone/50 text-[10px]">More photos</p>
                  {updates.length > 1 && (
                    <button
                      onClick={() => openLightbox(0)}
                      className="text-[10px] uppercase tracking-widest text-navy-950 dark:text-bone hover:text-gold-dark dark:hover:text-gold transition-colors"
                    >
                      View all ({updates.length}) →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {thumbs.map((u, i) => (
                    <button
                      key={u.id}
                      onClick={() => openLightbox(1 + i)}
                      className="group relative aspect-square overflow-hidden cursor-zoom-in"
                    >
                      <Image
                        src={u.imageUrl}
                        alt={u.caption}
                        fill
                        sizes="100px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </button>
                  ))}
                  {remaining > 0 && (
                    <button
                      onClick={() => openLightbox(1 + thumbsMax)}
                      className="group relative aspect-square overflow-hidden cursor-zoom-in bg-navy-950/90"
                    >
                      <Image
                        src={updates[1 + thumbsMax].imageUrl}
                        alt=""
                        fill
                        sizes="100px"
                        className="object-cover opacity-40 transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-navy-950/50">
                        <p className="text-bone font-display text-lg leading-none">+{remaining}</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: current photo — compact, not full-width */}
          <div>
            {loading ? (
              <div className="aspect-[4/3] bg-hairline/40 dark:bg-white/5 animate-pulse" />
            ) : hero ? (
              <button
                type="button"
                onClick={() => openLightbox(0)}
                className="relative block w-full aspect-[4/3] overflow-hidden group cursor-zoom-in"
              >
                <Image
                  src={hero.imageUrl}
                  alt={hero.caption}
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.02]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/85 via-navy-950/30 to-transparent pt-12 pb-4 px-5">
                  <p className="text-[10px] uppercase tracking-eyebrow text-bone/70">
                    {currentPhase} phase
                  </p>
                  <p className="mt-0.5 text-bone text-sm md:text-base font-display tracking-tight line-clamp-2">
                    {hero.caption}
                  </p>
                </div>
              </button>
            ) : (
              <div className="aspect-[4/3] bg-hairline/30 dark:bg-white/5 flex items-center justify-center">
                <p className="text-ink-muted dark:text-bone/50 text-xs text-center px-4">No photos yet for the {currentPhase} phase.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Gallery Lightbox */}
      {lightbox && lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[100] bg-navy-950/95 flex items-center justify-center p-6 md:p-12"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-6 right-6 z-20 text-bone hover:text-gold transition-colors text-3xl leading-none"
            aria-label="Close"
          >
            ×
          </button>

          {/* Counter */}
          <p className="absolute top-7 left-6 z-20 text-bone/60 text-xs uppercase tracking-widest">
            {lightboxIdx + 1} <span className="text-bone/30">/</span> {updates.length}
          </p>

          {/* Prev arrow */}
          {updates.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 h-12 w-12 flex items-center justify-center text-bone/70 hover:text-bone bg-navy-950/40 hover:bg-navy-950/60 transition-colors"
              aria-label="Previous photo"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Next arrow */}
          {updates.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 h-12 w-12 flex items-center justify-center text-bone/70 hover:text-bone bg-navy-950/40 hover:bg-navy-950/60 transition-colors"
              aria-label="Next photo"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}

          {/* Image + caption */}
          <div className="relative w-full h-full max-w-6xl flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.imageUrl}
              alt={lightbox.caption}
              className="max-w-full max-h-[80vh] object-contain"
            />
            <div className="mt-6 text-center">
              <p className="text-bone text-base md:text-lg">{lightbox.caption}</p>
              <p className="text-bone/60 text-xs mt-1 uppercase tracking-widest">
                {lightbox.phase} · {formatUpdateDate(lightbox.date)}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
