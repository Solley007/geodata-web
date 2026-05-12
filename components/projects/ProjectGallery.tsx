"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import type { Project } from "@/lib/projects-data";

interface Props {
  project: Project;
}

export default function ProjectGallery({ project }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".pg-fade", {
        y: 32,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: "top 80%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  if (project.gallery.length === 0) return null;

  return (
    <section ref={root} className="bg-bone-100 dark:bg-navy-900 py-24 md:py-32">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12 mb-16">
          <div className="col-span-12 lg:col-span-5">
            <p className="pg-fade eyebrow mb-6">Imagery</p>
            <h2 className="pg-fade font-display text-display-md text-navy-950 dark:text-bone tracking-tightest">
              The work, <em className="font-light">in light.</em>
            </h2>
          </div>
        </div>

        {/* Editorial 2-column grid with varied aspect ratios */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {project.gallery.map((img, i) => {
            // First image gets wide treatment, others alternate
            const ratioClass =
              i === 0
                ? "aspect-[16/10] col-span-2"
                : i % 3 === 1
                ? "aspect-[3/4]"
                : "aspect-[4/5]";
            return (
              <div
                key={i}
                className={`pg-fade relative overflow-hidden bg-navy-100 dark:bg-navy-800 ${ratioClass}`}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover transition-transform duration-1200 ease-editorial hover:scale-[1.03]"
                />
              </div>
            );
          })}
        </div>

        <p className="pg-fade mt-8 text-sm text-ink-faint dark:text-bone/40">
          Photography and renders represent the project at various stages.
        </p>
      </div>
    </section>
  );
}
