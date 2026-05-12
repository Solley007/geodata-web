"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import type { Property } from "@/lib/property-data";

interface Props {
  property: Property;
}

export default function SpecGrid({ property }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;

    const ctx = gsap.context(() => {
      // Hairlines draw in like ink, then specs fade up
      gsap.from(".spec-rule-h", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.2,
        ease: "power3.out",
        stagger: 0.05,
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });

      gsap.from(".spec-cell > *", {
        y: 16,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.06,
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-24 md:py-32">
      <div className="container-editorial">
        <p className="eyebrow mb-12">Specification</p>

        {/* Top hairline */}
        <div className="spec-rule-h h-px w-full bg-navy-950 origin-left" />

        {/* 3 columns × 2 rows of specs, with hairline dividers */}
        <div className="grid grid-cols-2 lg:grid-cols-3">
          {property.specs.map((spec, i) => {
            // Compute borders: right border on all but rightmost,
            // bottom border on top row only
            const isLastInRow = (i + 1) % 3 === 0;
            const isTopRow = i < 3;
            return (
              <div
                key={spec.label}
                className={`spec-cell py-10 px-2 lg:px-6 ${
                  !isLastInRow ? "lg:border-r border-hairline dark:border-white/10" : ""
                } ${isTopRow ? "border-b border-hairline dark:border-white/10" : ""} ${
                  // Mobile uses 2 cols — different border logic
                  i % 2 === 0 ? "border-r border-hairline dark:border-white/10 lg:border-r" : ""
                }`}
              >
                <p className="eyebrow text-ink-faint dark:text-bone/40 mb-4">{spec.label}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-display text-4xl md:text-5xl text-navy-950 dark:text-bone tracking-tightest leading-none">
                    {spec.value}
                  </p>
                  {/* MREIF logo badge — only on the mortgage/MREIF spec cell */}
                  {(spec.label === "Mortgage" || spec.value.toLowerCase().includes("mreif")) && (
                    <Image
                      src="/mreif-logo.png"
                      alt="MREIF eligible"
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0"
                    />
                  )}
                </div>
                {spec.hint && (
                  <p className="mt-3 text-sm text-ink-muted dark:text-bone/60">{spec.hint}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom hairline */}
        <div className="spec-rule-h h-px w-full bg-navy-950 origin-left" />
      </div>
    </section>
  );
}
