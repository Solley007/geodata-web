"use client";

import { useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import type { Property, PropertyPhase } from "@/lib/property-data";
import ConstructionGallery from "./ConstructionGallery";
interface Props {
  property: Property;
}

const PHASES: PropertyPhase[] = ["Launch", "Structure", "Finishing", "Handover"];

export default function ProgressBar({ property }: Props) {
  const root = useRef<HTMLElement>(null);
  const { currentPhase, percent } = property.progress;
  const currentIndex = PHASES.indexOf(currentPhase);

  // null = no phase selected yet, gallery hidden until user clicks
  const [selectedPhase, setSelectedPhase] = useState<PropertyPhase | null>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".progress-fill",
        { scaleX: 0 },
        {
          scaleX: percent / 100,
          duration: 1.8,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
        }
      );
      gsap.from(".progress-marker", {
        opacity: 0,
        y: 8,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
      gsap.from(".progress-text > *", {
        y: 16,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, [percent]);

  return (
    <section ref={root} className="bg-bone-100 dark:bg-navy-900 py-24 md:py-32">
      <div className="container-editorial">

        {/* Header */}
        <div className="grid grid-cols-12 gap-12 mb-16">
          <div className="col-span-12 lg:col-span-5 progress-text">
            <p className="eyebrow mb-6">Construction</p>
            <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest">
              Currently in <em className="font-light">{currentPhase}.</em>
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:pt-6 progress-text">
            <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
              Select a phase below to view site photographs from that stage
              of construction. Updated regularly by the site team.
            </p>
          </div>
        </div>

        {/* The bar */}
        <div className="relative pt-16 pb-2">
          <div className="relative h-[2px] w-full bg-hairline">
            <div
              className="progress-fill absolute inset-y-0 left-0 right-0 bg-navy-900 origin-left"
              style={{ transform: "scaleX(0)" }}
            />
          </div>

          {/* Phase markers — now buttons */}
          <div className="absolute inset-x-0 top-0 grid grid-cols-4">
            {PHASES.map((phase, i) => {
              const reached = i <= currentIndex;
              const isSelected = selectedPhase === phase;              const isLast = i === PHASES.length - 1;
              const isCurrent = phase === currentPhase;

              return (
                <div
                  key={phase}
                  className={clsx(
                    "progress-marker flex flex-col",
                    isLast ? "items-end" : "items-start"
                  )}
                >
                  <button
                    onClick={() => setSelectedPhase(phase)}
                    className={clsx(
                      "group flex flex-col gap-1 transition-opacity duration-300",
                      isLast ? "items-end text-right" : "items-start text-left",
                      !reached && "opacity-50 cursor-default"
                    )}
                    disabled={!reached}
                    aria-pressed={isSelected}
                    aria-label={`View ${phase} phase photos`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "eyebrow transition-colors duration-300 hidden md:block",
                          isSelected ? "text-gold-dark" : reached ? "text-navy-900 dark:text-bone/90" : "text-ink-faint dark:text-bone/40"
                        )}
                      >
                        {phase}
                      </span>
                      {isCurrent && (
                        <span className="hidden md:inline-flex items-center gap-1 text-[9px] uppercase tracking-eyebrow text-gold-dark">
                          <span className="h-1 w-1 rounded-full bg-gold-dark animate-pulse block" />
                          Live
                        </span>
                      )}
                    </span>
                    <span
                      className={clsx(
                        "font-display text-2xl transition-colors duration-300",
                        isSelected ? "text-gold-dark" : reached ? "text-navy-950 dark:text-bone" : "text-ink-faint dark:text-bone/40"
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {/* Short label — mobile only, won't overlap */}
                    <span
                      className={clsx(
                        "md:hidden text-[9px] uppercase tracking-widest transition-colors duration-300",
                        isSelected ? "text-gold-dark" : reached ? "text-navy-900 dark:text-bone/90" : "text-ink-faint dark:text-bone/40"
                      )}
                    >
                      {phase.slice(0, 3)}
                    </span>
                  </button>

                  {/* Dot — gold when selected */}
                  <div className="relative w-full mt-4">
                    <span
                      className={clsx(
                        "absolute top-2 h-3 w-3 rounded-full border-2 transition-colors duration-300",
                        isSelected
                          ? "bg-gold-dark border-gold-dark"
                          : reached
                          ? "bg-navy-900 border-navy-900 dark:border-white/20"
                          : "bg-bone dark:bg-navy-950 border-hairline dark:border-white/10",
                        isLast ? "right-0" : "left-0"
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-12 text-sm text-ink-muted dark:text-bone/60">
          {percent}% complete · Last updated May 2026
        </p>

        {/* Hint — only show when nothing selected yet */}
        {!selectedPhase && (
          <p className="mt-3 text-xs text-ink-faint dark:text-bone/40">
            ↑ Click any completed phase to see site photographs
          </p>
        )}

        {/* Gallery — only renders after a phase tab is clicked */}
        {selectedPhase && (
          <ConstructionGallery
            propertySlug={property.slug}
            selectedPhase={selectedPhase}
          />
        )}

      </div>
    </section>
  );
}
