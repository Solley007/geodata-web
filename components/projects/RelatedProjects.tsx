"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import type { Project } from "@/lib/projects-data";

interface Props {
  projects: Project[];
}

export default function RelatedProjects({ projects }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".rpr-fade", {
        y: 30,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  if (projects.length === 0) return null;

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-24 md:py-32 border-t border-hairline dark:border-white/10">
      <div className="container-editorial">
        <div className="rpr-fade flex items-end justify-between mb-16 flex-wrap gap-6">
          <div>
            <p className="eyebrow mb-4">More work</p>
            <h2 className="font-display text-display-md text-navy-950 dark:text-bone tracking-tightest">
              Related <em className="font-light">projects.</em>
            </h2>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone/90 hover:text-gold-dark transition-colors duration-400 pb-2 border-b border-navy-900 dark:border-white/20 hover:border-gold-dark"
          >
            View all projects
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
          {projects.map((p) => (
            <Link
              key={p.slug}
              href={`/projects/${p.slug}`}
              className="rpr-fade group block"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-navy-100 dark:bg-navy-800 mb-6">
                <Image
                  src={p.coverImage}
                  alt={`${p.name} — ${p.location}`}
                  fill
                  sizes="(min-width: 768px) 30vw, 100vw"
                  className="object-cover transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
                />
              </div>
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">
                {p.category} ·{" "}
                {p.completionYear ? `Completed ${p.completionYear}` : "Ongoing"}
              </p>
              <h3 className="font-display text-2xl text-navy-950 dark:text-bone leading-tight transition-transform duration-400 ease-editorial group-hover:translate-x-1">
                {p.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
