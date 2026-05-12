"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import { PROJECTS } from "@/lib/projects-data";

export default function TrackRecord() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".tr-fade", {
        y: 28,
        opacity: 0,
        duration: 0.9,
        stagger: 0.06,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
      gsap.from(".tr-rule", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  // Show residential, commercial, and infrastructure projects in this section.
  // Institutional projects (CBN, FIRS, Federal Uni) get their own dedicated
  // InstitutionalClients section below — including them here would duplicate.
  const projects = PROJECTS.filter(
    (p) => p.category !== "Institutional"
  ).sort((a, b) => {
    // Ongoing first, then newest completed first
    if (a.status === "Ongoing" && b.status !== "Ongoing") return -1;
    if (a.status !== "Ongoing" && b.status === "Ongoing") return 1;
    const ay = a.completionYear ?? a.year;
    const by = b.completionYear ?? b.year;
    return by - ay;
  });

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-32 md:py-48">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-5">
            <p className="tr-fade eyebrow mb-6">The work</p>
            <h2 className="tr-fade text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
              Built and <em className="font-light">building.</em>
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:pt-6">
            <p className="tr-fade text-lg leading-relaxed text-ink dark:text-bone/75">
              Geodata's portfolio spans residential developments, commercial
              buildings, and infrastructure across Nigeria. A selection of
              completed and active projects.
            </p>
            <Link
              href="/projects"
              className="tr-fade mt-6 inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone/90 hover:text-gold-dark transition-colors duration-400 pb-1 border-b border-navy-900 dark:border-white/20 hover:border-gold-dark"
            >
              View full portfolio
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div className="tr-rule h-px w-full bg-navy-950" />

        {projects.map((project) => {
          const displayYear = project.completionYear ?? project.year;
          return (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="tr-fade group grid grid-cols-12 gap-6 py-10 border-b border-hairline dark:border-white/10 items-baseline transition-colors duration-400 hover:bg-bone-100 dark:bg-navy-900"
            >
              {/* Year + status */}
              <div className="col-span-3 md:col-span-2">
                <p className="font-display text-3xl md:text-4xl text-navy-950 dark:text-bone tracking-tightest leading-none">
                  {displayYear}
                </p>
                {project.status === "Ongoing" && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-eyebrow font-medium text-gold-dark">
                    <span className="block h-1.5 w-1.5 rounded-full bg-gold-dark animate-pulse" />
                    Ongoing
                  </p>
                )}
              </div>

              {/* Project name */}
              <div className="col-span-9 md:col-span-5">
                <h3 className="font-display text-2xl md:text-3xl text-navy-950 dark:text-bone leading-tight transition-transform duration-400 ease-editorial group-hover:translate-x-1">
                  {project.name}
                </h3>
                <p className="mt-2 text-sm text-ink-muted dark:text-bone/60">{project.location}</p>
              </div>

              {/* Type + scope (hide on mobile) */}
              <div className="hidden md:block col-span-4">
                <p className="text-ink dark:text-bone/75 leading-relaxed">{project.subtitle}</p>
                <p
                  className={clsx(
                    "mt-2 text-sm",
                    project.status === "Ongoing" ? "text-gold-dark" : "text-ink-faint dark:text-bone/40"
                  )}
                >
                  {project.scope}
                </p>
              </div>

              {/* View arrow */}
              <div className="hidden md:flex col-span-1 justify-end items-center">
                <span
                  aria-hidden
                  className="text-ink-faint dark:text-bone/40 group-hover:text-navy-900 dark:text-bone/90 group-hover:translate-x-1 transition-all duration-400"
                >
                  →
                </span>
              </div>

              {/* Mobile-only: scope underneath */}
              <div className="md:hidden col-span-12 pl-[calc(25%+0.75rem)] -mt-4">
                <p className="text-sm text-ink-muted dark:text-bone/60">{project.subtitle}</p>
                <p
                  className={clsx(
                    "mt-1 text-sm",
                    project.status === "Ongoing" ? "text-gold-dark" : "text-ink-faint dark:text-bone/40"
                  )}
                >
                  {project.scope}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
