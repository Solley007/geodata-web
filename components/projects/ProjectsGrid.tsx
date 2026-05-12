"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import type { Project } from "@/lib/projects-data";

interface Props {
  projects: Project[];
}

export default function ProjectsGrid({ projects }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".pr-card", {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, [projects]);

  if (projects.length === 0) {
    return (
      <section className="bg-bone dark:bg-navy-950 py-32 md:py-48">
        <div className="container-editorial text-center">
          <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6">No projects</p>
          <h2 className="font-display text-display-md text-navy-950 dark:text-bone tracking-tightest">
            None in this category, <em className="font-light">yet.</em>
          </h2>
        </div>
      </section>
    );
  }

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-24 md:py-32">
      <div className="container-editorial">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-20">
          {projects.map((p, i) => (
            <Link
              key={p.slug}
              href={`/projects/${p.slug}`}
              className={clsx(
                "pr-card group block",
                // Asymmetric vertical offset on every other card
                i % 2 === 1 ? "md:translate-y-24" : ""
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-navy-100 dark:bg-navy-800 mb-6">
                <Image
                  src={p.coverImage}
                  alt={`${p.name} — ${p.location}`}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
                />

                {/* Status pill — top left */}
                <div
                  className={clsx(
                    "absolute top-6 left-6 inline-flex items-center px-3 py-1.5 backdrop-blur-sm",
                    p.status === "Ongoing"
                      ? "bg-gold/95 text-navy-950 dark:text-bone"
                      : "bg-bone/95 text-navy-900 dark:text-bone/90"
                  )}
                >
                  {p.status === "Ongoing" && (
                    <span className="block h-1.5 w-1.5 rounded-full bg-navy-950 mr-2 animate-pulse" />
                  )}
                  <span className="text-[10px] uppercase tracking-eyebrow font-medium">
                    {p.status}
                  </span>
                </div>

                {/* Category — bottom left */}
                <div className="absolute bottom-6 left-6">
                  <p className="text-[10px] uppercase tracking-eyebrow font-medium text-bone/90">
                    {p.category}
                  </p>
                </div>
              </div>

              <div>
                <p className="eyebrow text-ink-faint dark:text-bone/40 mb-2">
                  {p.location}
                  {p.completionYear && ` · Completed ${p.completionYear}`}
                  {p.status === "Ongoing" && ` · Started ${p.year}`}
                </p>
                <h2 className="font-display text-3xl text-navy-950 dark:text-bone leading-tight transition-transform duration-400 ease-editorial group-hover:translate-x-1">
                  {p.name}
                </h2>
                <p className="mt-3 text-base text-ink dark:text-bone/75 leading-relaxed">
                  {p.subtitle}
                </p>
                {p.client && (
                  <p className="mt-4 text-sm text-ink-faint dark:text-bone/40">
                    Client · <span className="text-ink-muted dark:text-bone/60">{p.client}</span>
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
