"use client";

import Link from "next/link";
import clsx from "clsx";
import { PROJECTS, type ProjectCategory } from "@/lib/projects-data";

/**
 * ProjectsMegaMenu
 * ----
 * Dropdown panel showing all 12 projects grouped by category.
 * Opens on hover/focus of the Projects link in the desktop nav.
 *
 * Layout: two columns.
 *   Left  — Residential (6) + Commercial (1)
 *   Right — Institutional (3) + Infrastructure (2)
 */

const CATEGORY_COLUMNS: ProjectCategory[][] = [
  ["Residential", "Commercial"],
  ["Institutional", "Infrastructure"],
];

export default function ProjectsMegaMenu() {
  return (
    <div className="bg-bone dark:bg-navy-950 border-b border-hairline dark:border-white/10 shadow-[0_24px_48px_-24px_rgba(15,37,71,0.12)]">
      <div className="container-editorial grid grid-cols-12 gap-12 py-12">

        {/* Two-column category layout */}
        <div className="col-span-9 grid grid-cols-2 gap-x-12 gap-y-0">
          {CATEGORY_COLUMNS.map((cats, ci) => (
            <div key={ci} className="space-y-8">
              {cats.map((category) => {
                const projects = PROJECTS.filter((p) => p.category === category);
                if (projects.length === 0) return null;
                return (
                  <div key={category}>
                    <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">{category}</p>
                    <ul className="space-y-1">
                      {projects.map((p) => (
                        <li key={p.slug}>
                          <Link
                            href={`/projects/${p.slug}`}
                            className="group flex items-center justify-between py-2.5 border-b border-hairline dark:border-white/10 hover:border-navy-900 dark:border-white/20 transition-colors duration-300"
                          >
                            <span className="text-navy-950 dark:text-bone text-sm font-medium group-hover:text-navy-800 dark:text-bone/80 transition-colors duration-300 group-hover:translate-x-0.5 inline-block transition-transform">
                              {p.name}
                            </span>
                            {p.status === "Ongoing" && (
                              <span className="flex items-center gap-1 text-[10px] uppercase tracking-eyebrow text-gold-dark shrink-0 ml-3">
                                <span className="block h-1 w-1 rounded-full bg-gold-dark animate-pulse" />
                                Live
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Right — CTA panel */}
        <div className="col-span-3 flex flex-col justify-between">
          <div>
            <p className="eyebrow mb-4">Portfolio</p>
            <p className="text-sm text-ink dark:text-bone/75 leading-relaxed">
              18 years of residential, commercial, institutional, and
              infrastructure work across Nigeria.
            </p>
          </div>
          <div className="mt-8 space-y-3">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone/90 hover:text-gold-dark transition-colors duration-400 pb-1 border-b border-navy-900 dark:border-white/20 hover:border-gold-dark"
            >
              View all projects
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
