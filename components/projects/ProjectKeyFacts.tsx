"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import type { Project } from "@/lib/projects-data";

interface Props {
  project: Project;
}

export default function ProjectKeyFacts({ project }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".pkf-rule-h", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
      gsap.from(".pkf-cell > *", {
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
    <section ref={root} className="bg-bone dark:bg-navy-950 py-20 md:py-24">
      <div className="container-editorial">
        <p className="eyebrow mb-12">Project facts</p>

        <div className="pkf-rule-h h-px w-full bg-navy-950 origin-left" />

        <div className="grid grid-cols-2 lg:grid-cols-3">
          {project.keyFacts.map((fact, i) => {
            const isLastInRow = (i + 1) % 3 === 0;
            const isTopRow = i < 3;
            return (
              <div
                key={fact.label}
                className={`pkf-cell py-10 px-2 lg:px-6 ${
                  !isLastInRow ? "lg:border-r border-hairline dark:border-white/10" : ""
                } ${isTopRow ? "border-b border-hairline dark:border-white/10" : ""} ${
                  i % 2 === 0 ? "border-r border-hairline dark:border-white/10 lg:border-r" : ""
                }`}
              >
                <p className="eyebrow text-ink-faint dark:text-bone/40 mb-4">{fact.label}</p>
                <p className="font-display text-3xl md:text-4xl text-navy-950 dark:text-bone tracking-tightest leading-tight">
                  {fact.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className="pkf-rule-h h-px w-full bg-navy-950 origin-left" />
      </div>
    </section>
  );
}
