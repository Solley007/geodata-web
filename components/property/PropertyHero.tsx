"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import type { Property } from "@/lib/property-data";

interface Props {
  property: Property;
}

export default function PropertyHero({ property }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;

    const ctx = gsap.context(() => {
      // Title entrance — slow, deliberate. This is the cover of a book,
      // not a movie title. Resist the urge to make it dramatic.
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        delay: 0.15,
      });

      tl.from(".phero-eyebrow", { y: 16, opacity: 0, duration: 0.9 })
        .from(".phero-title", { y: 30, opacity: 0, duration: 1.2 }, "-=0.6")
        .from(".phero-sub", { y: 16, opacity: 0, duration: 0.9 }, "-=0.7")
        .from(".phero-meta > *", { opacity: 0, duration: 0.8, stagger: 0.1 }, "-=0.5");

      // Parallax — image drifts up slower than the page scrolls down.
      // The classic "the building is huge and we're walking past it" effect.
      gsap.to(".phero-bg", {
        yPercent: 25,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Title fades + lifts gently as we scroll past — feels handheld rather
      // than locked. Subtle, but the difference is felt.
      gsap.to(".phero-content", {
        yPercent: -20,
        opacity: 0.4,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative h-[100svh] min-h-[680px] w-full overflow-hidden"
    >
      {/* Background plate */}
      <div className="phero-bg absolute inset-0 scale-110 will-change-transform">
        <Image
          src={property.heroImage}
          alt={property.title}
          fill
          priority
          sizes="100vw"
          className="object-cover object-bottom"
        />
        {/* Layered scrim — vertical for legibility, vignette for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/20 via-navy-950/30 to-navy-950/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,22,40,0.4)_100%)]" />
      </div>

      {/* Content — centered. This is the "book cover" composition. */}
      <div className="phero-content relative z-10 container-editorial flex h-full flex-col items-center justify-center text-center">
        <p className="phero-eyebrow eyebrow text-bone/85 mb-8">
          {property.location}
        </p>

        <h1 className="phero-title font-display text-bone text-display-xl tracking-tightest max-w-5xl">
          {property.title}
        </h1>

        <p className="phero-sub mt-8 max-w-xl text-lg text-bone/85 leading-relaxed">
          {property.subtitle}
        </p>
      </div>

      {/* Bottom meta strip */}
      <div className="phero-meta absolute inset-x-0 bottom-0 z-10 container-editorial pb-10">
        <div className="flex items-end justify-between border-t border-bone/15 pt-6 text-bone/70">
          <p className="text-[11px] uppercase tracking-eyebrow">
            From {property.pricing.from}
          </p>
          <p className="text-[11px] uppercase tracking-eyebrow hidden md:block">
            Scroll to explore <span className="ml-2">↓</span>
          </p>
          <p className="text-[11px] uppercase tracking-eyebrow">
            {property.specs[1].value} available
          </p>
        </div>
      </div>
    </section>
  );
}
