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

  // Fetch all updates for THIS property's current phase, newest first
  useEffect(() => {
    fetchConstructionUpdates()
      .then((all) => setUpdates(filterUpdates(all, property.slug, currentPhase)))
      .finally(() => setLoading(false));
  }, [property.slug, currentPhase]);

  // Hero = most recent update; recent strip = next 3
  const hero    = updates[0];
  const recents = updates.slice(1, 5);

  // Lightbox for any photo
  const [lightbox, setLightbox] = useState<ConstructionUpdate | null>(null);
  useEffect(() => {
    if (!lightbox) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  // Animate the progress fill on scroll-in
  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".progress-fill",
        { scaleX: 0 },
        {
          scaleX: percent / 100,
          duration: 1.6,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
        }
      );
    }, root);
    return () => ctx.revert();
  }, [percent]);

  return (
    <section ref={root} id="progress" className="py-20 md:py-24 bg-bone dark:bg-navy-950">
      <div className="container-editorial">

        {/* Eyebrow + headline */}
        <p className="eyebrow text-ink-muted dark:text-bone/50 mb-4">Construction progress</p>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest leading-none">
            On site, {percent}% complete.
          </h2>
          {hero && (
            <p className="text-sm text-ink-muted dark:text-bone/50">
              Last updated {formatUpdateDate(hero.date)}
            </p>
          )}
        </div>

        {/* HERO — current state of construction */}
        {loading ? (
          <div className="aspect-[16/9] bg-hairline/40 dark:bg-white/5 animate-pulse" />
        ) : hero ? (
          <button
            type="button"
            onClick={() => setLightbox(hero)}
            className="relative block w-full aspect-[16/9] overflow-hidden group cursor-zoom-in"
          >
            <Image
              src={hero.imageUrl}
              alt={hero.caption}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1100px"
              className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.02]"
            />
            {/* Bottom gradient + caption */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/85 via-navy-950/30 to-transparent pt-20 pb-6 px-6 md:px-10 text-left">
              <p className="text-[11px] uppercase tracking-eyebrow text-bone/70">
                {currentPhase} phase
              </p>
              <p className="mt-1 text-bone text-lg md:text-xl font-display tracking-tight">
                {hero.caption}
              </p>
            </div>
          </button>
        ) : (
          <div className="aspect-[16/9] bg-hairline/30 dark:bg-white/5 flex items-center justify-center">
            <p className="text-ink-muted dark:text-bone/50 text-sm">No construction photos yet for the {currentPhase} phase.</p>
          </div>
        )}

        {/* Progress timeline — visual indicator only, not clickable */}
        <div className="mt-12 md:mt-16">
          <div className="relative h-px bg-hairline dark:bg-white/10 mb-6">
            <div className="progress-fill absolute inset-y-0 left-0 right-0 bg-navy-900 dark:bg-gold origin-left" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {PHASES.map((phase, i) => {
              const isCurrent = phase === currentPhase;
              const isPast    = i < currentIndex;
              return (
                <div key={phase} className="flex flex-col items-start">
                  <span
                    className={clsx(
                      "inline-block h-2 w-2 rounded-full mb-3",
                      isPast    && "bg-navy-900 dark:bg-gold",
                      isCurrent && "bg-gold ring-4 ring-gold/20 animate-pulse",
                      !isPast && !isCurrent && "bg-hairline dark:bg-white/15"
                    )}
                  />
                  <p className={clsx(
                    "text-xs uppercase tracking-widest font-medium",
                    isCurrent ? "text-navy-950 dark:text-bone" : "text-ink-muted dark:text-bone/40"
                  )}>
                    {phase}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent updates strip — quick visual proof of progress */}
        {recents.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow text-ink-muted dark:text-bone/50">Recent updates</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {recents.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setLightbox(u)}
                  className="group relative aspect-[4/3] overflow-hidden cursor-zoom-in"
                >
                  <Image
                    src={u.imageUrl}
                    alt={u.caption}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/80 to-transparent pt-12 pb-2 px-3">
                    <p className="text-[10px] text-bone/80 uppercase tracking-widest">
                      {formatUpdateDate(u.date)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-navy-950/95 flex items-center justify-center p-6 md:p-12"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 text-bone hover:text-gold transition-colors text-3xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
          <div className="relative w-full h-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.imageUrl}
              alt={lightbox.caption}
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-navy-950/90 to-transparent pt-12 pb-6 px-6 text-center">
              <p className="text-bone text-lg">{lightbox.caption}</p>
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
