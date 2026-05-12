"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import type { PropertyListItem } from "@/lib/properties-list";

interface Props {
  properties: PropertyListItem[];
}

export default function PropertyGrid({ properties }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".pgrid-card", {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, [properties]); // re-runs on filter change

  if (properties.length === 0) {
    return (
      <section className="bg-bone dark:bg-navy-950 py-32 md:py-48">
        <div className="container-editorial text-center">
          <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6">No matches</p>
          <h2 className="font-display text-display-md text-navy-950 dark:text-bone tracking-tightest">
            None in this category, <em className="font-light">yet.</em>
          </h2>
          <p className="mt-6 text-lg text-ink dark:text-bone/75 max-w-lg mx-auto">
            We're adding new residences quarterly. Speak with our sales team
            about upcoming releases.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-24 md:py-32">
      <div className="container-editorial">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-20">
          {properties.map((p, i) => (
            <Link
              key={p.slug}
              href={`/properties/${p.slug}`}
              // Asymmetric vertical offset — odd cards drop 24 units
              className={clsx(
                "pgrid-card group block",
                i % 2 === 1 ? "md:translate-y-24" : ""
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-navy-100 dark:bg-navy-800 mb-6">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
                />
                {/* Status pill — top left */}
                <div
                  className={clsx(
                    "absolute top-6 left-6 inline-flex items-center px-3 py-1.5 backdrop-blur-sm",
                    p.status === "Limited"
                      ? "bg-gold/95 text-navy-950 dark:text-bone"
                      : p.status === "Sold Out"
                      ? "bg-navy-950/90 text-bone"
                      : "bg-bone/95 text-navy-900 dark:text-bone/90"
                  )}
                >
                  <span className="text-[10px] uppercase tracking-eyebrow font-medium">
                    {p.status === "Limited" ? `${p.available} remaining` : p.status}
                  </span>
                </div>
                {/* Type label — bottom left */}
                <div className="absolute bottom-6 left-6">
                  <p className="text-[10px] uppercase tracking-eyebrow font-medium text-bone/90">
                    {p.type}
                  </p>
                </div>
              </div>

              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="eyebrow text-ink-faint dark:text-bone/40 mb-2">{p.location}</p>
                  <h2 className="font-display text-3xl text-navy-950 dark:text-bone leading-tight transition-transform duration-400 ease-editorial group-hover:translate-x-1">
                    {p.title}
                  </h2>
                  <p className="mt-3 text-sm text-ink-muted dark:text-bone/60">
                    {p.beds} bed · {p.baths} bath · {p.area}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-xl md:text-2xl text-navy-900 dark:text-bone/90 whitespace-nowrap">
                    {p.priceLabel}
                  </p>
                  <p className="text-[11px] uppercase tracking-eyebrow text-ink-faint dark:text-bone/40 mt-1">
                    From
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
