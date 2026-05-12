"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import type { Project } from "@/lib/projects-data";

interface Props {
  project: Project;
}

export default function ProjectOverview({ project }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".po-fade", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 80%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-24 md:py-32">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-4">
            <p className="po-fade eyebrow text-ink-faint dark:text-bone/40 mb-6">Overview</p>
            <h2 className="po-fade font-display text-display-md text-navy-950 dark:text-bone tracking-tightest leading-tight">
              About this <em className="font-light">project.</em>
            </h2>
          </div>

          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <div className="space-y-6">
              {project.overview.map((para, i) => (
                <p
                  key={i}
                  className="po-fade text-lg leading-relaxed text-ink dark:text-bone/75"
                >
                  {para}
                </p>
              ))}
            </div>

            <div className="po-fade mt-12 pt-6 border-t border-hairline dark:border-white/10 space-y-3">
              <div className="flex items-baseline justify-between gap-6">
                <span className="text-sm text-ink-muted dark:text-bone/60">Scope</span>
                <span className="text-right text-navy-950 dark:text-bone max-w-md">
                  {project.scope}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <span className="text-sm text-ink-muted dark:text-bone/60">Status</span>
                <span className="text-navy-950 dark:text-bone">{project.status}</span>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <span className="text-sm text-ink-muted dark:text-bone/60">
                  {project.completionYear ? "Completed" : "Year started"}
                </span>
                <span className="text-navy-950 dark:text-bone">
                  {project.completionYear ?? project.year}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
