"use client";

import { useLayoutEffect, useRef } from "react";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/properties-list";

interface Props {
  activeFilter: "All" | PropertyType;
  onFilterChange: (filter: "All" | PropertyType) => void;
  count: number;
}

export default function PropertiesHeader({ activeFilter, onFilterChange, count }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });
      tl.from(".plist-eyebrow", { y: 16, opacity: 0, duration: 0.8 })
        .from(".plist-title", { y: 30, opacity: 0, duration: 1 }, "-=0.5")
        .from(".plist-sub", { y: 16, opacity: 0, duration: 0.8 }, "-=0.6")
        .from(".plist-filter", { y: 12, opacity: 0, duration: 0.7, stagger: 0.06 }, "-=0.4");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative bg-bone dark:bg-navy-950 pt-40 pb-20 md:pt-48 md:pb-24 border-b border-hairline dark:border-white/10"
    >
      <div className="container-editorial">
        <p className="plist-eyebrow eyebrow mb-6">Southern Bridge City</p>

        <div className="grid grid-cols-12 gap-12 items-end">
          <div className="col-span-12 lg:col-span-8">
            <h1 className="plist-title text-display-xl font-display text-navy-950 dark:text-bone tracking-tightest">
              Currently <em className="font-light">available.</em>
            </h1>
          </div>

          <div className="col-span-12 lg:col-span-4 lg:pb-3">
            <p className="plist-sub text-lg leading-relaxed text-ink dark:text-bone/75 max-w-md">
              {count} {count === 1 ? "residence" : "residences"} across Southern
              Bridge City Phase One. All MREIF-eligible.
            </p>
          </div>
        </div>

        {/* Filter bar — minimal, editorial. No dropdowns, no slider. */}
        <div className="mt-16 flex flex-wrap items-center gap-2 md:gap-3">
          {PROPERTY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onFilterChange(type)}
              className={clsx(
                "plist-filter group relative px-5 py-2.5 text-xs uppercase tracking-eyebrow font-medium transition-all duration-400 ease-editorial border",
                activeFilter === type
                  ? "bg-navy-900 text-bone border-navy-900 dark:border-white/20"
                  : "bg-transparent text-navy-900 dark:text-bone/90 border-hairline dark:border-white/10 hover:border-navy-900 dark:border-white/20"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
