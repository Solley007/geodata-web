"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "@/lib/gsap";

// PLACEHOLDER LISTINGS — these mirror your current ₦130M–₦220M lineup
const PROPERTIES = [
  {
    slug: "4-bed-semi-detached",
    title: "4-Bedroom Semi-Detached",
    location: "Southern Bridge City, Idu",
    price: "₦180,000,000",
    specs: { beds: 4, baths: 5, area: "340m²" },
    image:
      "/properties/4-bed-semi-detached.jpg",
  },
  {
    slug: "4-bed-terrace",
    title: "4-Bedroom Terrace Duplex",
    location: "Southern Bridge City, Idu",
    price: "₦150,000,000",
    specs: { beds: 4, baths: 5, area: "240m²" },
    image:
      "/properties/4-bed-terrace.jpg",
  },
  {
    slug: "6-bed-terrace",
    title: "6-Bedroom Terrace",
    location: "Southern Bridge City, Idu",
    price: "₦220,000,000",
    specs: { beds: 6, baths: 7, area: "250m²" },
    image:
      "/properties/6-bed-terrace.jpg",
  },
  {
    slug: "5-bed-semi-detached",
    title: "5-Bedroom Semi-Detached",
    location: "Southern Bridge City, Idu",
    price: "₦220,000,000",
    specs: { beds: 5, baths: 6, area: "440m²" },
    image:
      "/properties/5-bed-semi-detached.jpg",
  },
];

export default function FeaturedProperties() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;

    const ctx = gsap.context(() => {
      gsap.from(".property-card", {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: root.current,
          start: "top 75%",
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-16 md:py-24">
      <div className="container-editorial">
        <div className="flex items-end justify-between mb-20">
          <div className="max-w-xl">
            <p className="eyebrow mb-6">Southern Bridge City</p>
            <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest">
              Currently <em className="font-light">available.</em>
            </h2>
          </div>
          <Link
            href="/properties"
            className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone/90 hover:text-gold-dark transition-colors duration-400 pb-2 border-b border-navy-900 dark:border-white/20 hover:border-gold-dark"
          >
            View all residences
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-20">
          {PROPERTIES.map((p, i) => (
            <Link
              key={p.slug}
              href={`/properties/${p.slug}`}
              className={`property-card group block ${
                i % 2 === 1 ? "md:translate-y-24" : ""
              }`}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-navy-100 mb-6">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover object-bottom transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
                />
                <div className="absolute top-6 left-6 inline-flex items-center px-3 py-1.5 bg-bone/90 backdrop-blur-sm">
                  <span className="text-[10px] uppercase tracking-eyebrow font-medium text-navy-900 dark:text-bone/90">
                    Available
                  </span>
                </div>
              </div>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="eyebrow text-ink-faint dark:text-bone/40 mb-2">{p.location}</p>
                  <h3 className="font-display text-3xl text-navy-950 dark:text-bone leading-tight">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm text-ink-muted dark:text-bone/60">
                    {p.specs.beds} bed · {p.specs.baths} bath · {p.specs.area}
                  </p>
                </div>
                <p className="font-display text-xl text-navy-900 dark:text-bone/90 whitespace-nowrap">
                  {p.price}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
