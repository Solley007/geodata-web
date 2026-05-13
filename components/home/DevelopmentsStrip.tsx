"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import { DEVELOPMENTS } from "@/lib/site-content";

type SalesStatus = "Available" | "Limited" | "Sold Out" | "Selling Soon";

export default function DevelopmentsStrip() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".dev-fade", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 80%" },
      });
      gsap.from(".dev-card", {
        x: 60,
        opacity: 0,
        duration: 1,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: ".dev-track", start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-12 md:py-16 overflow-hidden">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-8 mb-16 items-end">
          <div className="col-span-12 lg:col-span-7">
            <p className="dev-fade eyebrow mb-6">Our developments</p>
            <h2 className="dev-fade text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
              The body of <em className="font-light">work.</em>
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9">
            <p className="dev-fade text-lg leading-relaxed text-ink dark:text-bone/75">
              From Southern Bridge City — our flagship under construction —
              to delivered estates across Abuja, here are the residential and
              commercial developments that define our portfolio.
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal scroll track. Container goes full-bleed (left padding only)
          so the rightmost cards bleed off the viewport edge — the standard
          luxury-hotel "more-to-see" cue. */}
      <div className="dev-track relative">
        <div className="overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory">
          <div className="flex gap-6 px-6 md:px-10 lg:pl-16 lg:pr-16">
            {DEVELOPMENTS.map((d) => (
              <Link
                key={d.slug}
                href={`/projects/${d.slug}`}
                className="dev-card group block shrink-0 snap-start
                           w-[80vw] sm:w-[60vw] md:w-[44vw] lg:w-[28vw]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-navy-100 mb-5">
                  <Image
                    src={d.image}
                    alt={d.name}
                    fill
                    sizes="(min-width: 1024px) 28vw, (min-width: 768px) 44vw, 80vw"
                    className="object-cover object-bottom transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
                  />

                  {/* Status pill — top left. Color signals availability. */}
                  <div className={clsx("absolute top-5 left-5", statusPillStyle(d.status))}>
                    {(d.status === "Available" || d.status === "Limited") && (
                      <span className="block h-1.5 w-1.5 rounded-full bg-current mr-2 animate-pulse" />
                    )}
                    <span className="text-[10px] uppercase tracking-eyebrow font-medium">
                      {d.status}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="eyebrow text-ink-faint dark:text-bone/40 mb-2">{d.location}</p>
                  <h3 className="font-display text-2xl text-navy-950 dark:text-bone leading-tight transition-transform duration-400 ease-editorial group-hover:translate-x-1">
                    {d.name}
                  </h3>
                  <p className="mt-3 text-sm text-ink-muted dark:text-bone/60 leading-relaxed">
                    {d.description}
                  </p>
                </div>
              </Link>
            ))}

            {/* "View all" trailing card — completes the strip with a clear CTA */}
            <Link
              href="/projects"
              className="dev-card group flex shrink-0 snap-start
                         w-[80vw] sm:w-[60vw] md:w-[44vw] lg:w-[28vw]
                         items-center justify-center"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy-950 transition-colors duration-400 group-hover:bg-navy-900">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-bone p-8 text-center">
                  <p className="eyebrow text-bone/60 mb-6">More work</p>
                  <p className="font-display text-3xl leading-tight mb-8">
                    View the full <em className="font-light">portfolio</em>
                  </p>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-eyebrow font-medium border-b border-bone pb-1 transition-transform duration-500 ease-editorial group-hover:translate-x-2">
                    All projects <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Status pill styling. Each status gets a distinct visual treatment:
 *  - Available: bone background, navy text — neutral, "yes you can buy"
 *  - Limited: gold background, navy text — urgent, "few left"
 *  - Selling Soon: navy background, gold text — anticipatory
 *  - Sold Out: muted, low-contrast — historical credibility marker
 */
function statusPillStyle(status: SalesStatus): string {
  const base = "inline-flex items-center px-3 py-1.5 backdrop-blur-sm";
  switch (status) {
    case "Available":
      return clsx(base, "bg-bone/95 text-navy-900 dark:text-bone/90");
    case "Limited":
      return clsx(base, "bg-gold/95 text-navy-950 dark:text-bone");
    case "Selling Soon":
      return clsx(base, "bg-navy-950/85 text-gold");
    case "Sold Out":
      return clsx(base, "bg-navy-950/80 text-bone/70");
  }
}
