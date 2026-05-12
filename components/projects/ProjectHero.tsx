"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import type { Project } from "@/lib/projects-data";

interface Props {
  project: Project;
}

export default function ProjectHero({ project }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });
      tl.from(".pdh-back", { y: 12, opacity: 0, duration: 0.6 })
        .from(".pdh-eyebrow", { y: 16, opacity: 0, duration: 0.7 }, "-=0.2")
        .from(".pdh-title", { y: 30, opacity: 0, duration: 1.1 }, "-=0.4")
        .from(".pdh-sub", { y: 16, opacity: 0, duration: 0.8 }, "-=0.6")
        .from(".pdh-meta", { y: 12, opacity: 0, duration: 0.7 }, "-=0.5")
        .from(".pdh-cover", { y: 30, opacity: 0, duration: 1, scale: 1.02 }, "-=0.5");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 pt-32 md:pt-40 pb-12 md:pb-16">
      <div className="container-editorial">
        <Link
          href="/projects"
          className="pdh-back inline-flex items-center gap-2 text-xs uppercase tracking-eyebrow font-medium text-ink-muted dark:text-bone/60 hover:text-navy-900 dark:text-bone/90 transition-colors duration-300 mb-12"
        >
          <span aria-hidden>←</span> All projects
        </Link>

        <div className="max-w-4xl">
          <div className="pdh-eyebrow flex items-center gap-3 flex-wrap mb-6">
            <span className="eyebrow">{project.category}</span>
            <span className="text-ink-faint dark:text-bone/40">·</span>
            <span
              className={clsx(
                "inline-flex items-center text-[11px] uppercase tracking-eyebrow font-medium",
                project.status === "Ongoing" ? "text-gold-dark" : "text-ink-muted dark:text-bone/60"
              )}
            >
              {project.status === "Ongoing" && (
                <span className="block h-1.5 w-1.5 rounded-full bg-gold-dark mr-2 animate-pulse" />
              )}
              {project.status}
            </span>
          </div>

          <h1 className="pdh-title text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest leading-[1.05]">
            {project.name}
          </h1>

          <p className="pdh-sub mt-8 text-xl leading-relaxed text-ink dark:text-bone/75 max-w-3xl">
            {project.subtitle}
          </p>

          <div className="pdh-meta mt-12 flex items-center flex-wrap gap-x-8 gap-y-2 border-t border-hairline dark:border-white/10 pt-6">
            <p className="text-sm text-ink-muted dark:text-bone/60">
              <span className="text-ink-faint dark:text-bone/40">Location · </span>
              <span className="text-navy-950 dark:text-bone">{project.location}</span>
            </p>
            {project.client && (
              <p className="text-sm text-ink-muted dark:text-bone/60">
                <span className="text-ink-faint dark:text-bone/40">Client · </span>
                <span className="text-navy-950 dark:text-bone">{project.client}</span>
              </p>
            )}
            <p className="text-sm text-ink-faint dark:text-bone/40">
              {project.completionYear
                ? `Completed ${project.completionYear}`
                : `Started ${project.year}`}
            </p>
          </div>
        </div>
      </div>

      {/* Cover image — full container width */}
      <div className="container-editorial mt-16 md:mt-20">
        <div className="pdh-cover relative aspect-[16/9] overflow-hidden bg-navy-100 dark:bg-navy-800">
          <Image
            src={project.coverImage}
            alt={`${project.name} — cover image showing ${project.location}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
