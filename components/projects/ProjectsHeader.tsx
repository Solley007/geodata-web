"use client";

import { useLayoutEffect, useRef } from "react";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects-data";

interface Props {
  activeCategory: "All" | ProjectCategory;
  onCategoryChange: (category: "All" | ProjectCategory) => void;
  count: number;
}

export default function ProjectsHeader({ activeCategory, onCategoryChange, count }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });
      tl.from(".prh-eyebrow", { y: 16, opacity: 0, duration: 0.8 })
        .from(".prh-title", { y: 30, opacity: 0, duration: 1 }, "-=0.5")
        .from(".prh-sub", { y: 16, opacity: 0, duration: 0.8 }, "-=0.6")
        .from(".prh-filter", { y: 12, opacity: 0, duration: 0.7, stagger: 0.05 }, "-=0.4");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative bg-bone dark:bg-navy-950 pt-40 pb-16 md:pt-48 md:pb-20 border-b border-hairline dark:border-white/10"
    >
      <div className="container-editorial">
        <p className="prh-eyebrow eyebrow mb-6">Projects</p>

        <div className="grid grid-cols-12 gap-12 items-end">
          <div className="col-span-12 lg:col-span-8">
            <h1 className="prh-title text-display-xl font-display text-navy-950 dark:text-bone tracking-tightest">
              The body of <em className="font-light">work.</em>
            </h1>
          </div>

          <div className="col-span-12 lg:col-span-4 lg:pb-3">
            <p className="prh-sub text-lg leading-relaxed text-ink dark:text-bone/75 max-w-md">
              Eighteen years of residential, commercial, institutional, and
              infrastructure projects across Nigeria. A selection of completed
              and active work.
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-2 md:gap-3">
          {PROJECT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={clsx(
                "prh-filter group relative px-5 py-2.5 text-xs uppercase tracking-eyebrow font-medium transition-all duration-400 ease-editorial border",
                activeCategory === cat
                  ? "bg-navy-900 text-bone border-navy-900 dark:border-white/20"
                  : "bg-transparent text-navy-900 dark:text-bone/90 border-hairline dark:border-white/10 hover:border-navy-900 dark:border-white/20"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="mt-8 text-sm text-ink-faint dark:text-bone/40">
          {count} {count === 1 ? "project" : "projects"}
        </p>
      </div>
    </section>
  );
}
