"use client";

import { useLayoutEffect, useRef } from "react";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import { BLOG_CATEGORIES, type BlogCategory } from "@/lib/blog-types";

interface Props {
  activeCategory: "All" | BlogCategory;
  onCategoryChange: (category: "All" | BlogCategory) => void;
  count: number;
}

export default function BlogHeader({ activeCategory, onCategoryChange, count }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });
      tl.from(".bh-eyebrow", { y: 16, opacity: 0, duration: 0.8 })
        .from(".bh-title", { y: 30, opacity: 0, duration: 1 }, "-=0.5")
        .from(".bh-sub", { y: 16, opacity: 0, duration: 0.8 }, "-=0.6")
        .from(".bh-filter", { y: 12, opacity: 0, duration: 0.7, stagger: 0.05 }, "-=0.4");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative bg-bone dark:bg-navy-950 pt-40 pb-16 md:pt-48 md:pb-20 border-b border-hairline dark:border-white/10"
    >
      <div className="container-editorial">
        <p className="bh-eyebrow eyebrow mb-6">Blog</p>

        <div className="grid grid-cols-12 gap-12 items-end">
          <div className="col-span-12 lg:col-span-8">
            <h1 className="bh-title text-display-xl font-display text-navy-950 dark:text-bone tracking-tightest">
              Notes on building, <em className="font-light">slowly.</em>
            </h1>
          </div>

          <div className="col-span-12 lg:col-span-4 lg:pb-3">
            <p className="bh-sub text-lg leading-relaxed text-ink dark:text-bone/75 max-w-md">
              Construction updates, mortgage explainers, neighbourhood pieces,
              and occasional thoughts on the slow craft of building well.
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-2 md:gap-3">
          {BLOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={clsx(
                "bh-filter group relative px-5 py-2.5 text-xs uppercase tracking-eyebrow font-medium transition-all duration-400 ease-editorial border",
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
          {count} {count === 1 ? "post" : "posts"}
        </p>
      </div>
    </section>
  );
}
