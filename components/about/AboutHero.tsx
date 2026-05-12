"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { COMPANY_FACTS } from "@/lib/about-data";

export default function AboutHero() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });
      tl.from(".ah-eyebrow", { y: 16, opacity: 0, duration: 0.8 })
        .from(".ah-line", { yPercent: 110, duration: 1.1, stagger: 0.1, ease: "expo.out" }, "-=0.5")
        .from(".ah-meta > *", { y: 14, opacity: 0, duration: 0.8, stagger: 0.08 }, "-=0.6");
    }, root);
    return () => ctx.revert();
  }, []);

  const yearsActive = new Date().getFullYear() - COMPANY_FACTS.founded;

  return (
    <section
      ref={root}
      className="relative bg-bone dark:bg-navy-950 pt-40 pb-24 md:pt-48 md:pb-32 border-b border-hairline dark:border-white/10"
    >
      <div className="container-editorial">
        {/* Full logo — light background, all colours and text visible */}
        <div className="ah-eyebrow mb-8">
          <Image
            src="/geodata-full-logo.png"
            alt="Geodata World Services Limited — Real Estate · Investment · Infrastructure"
            width={260}
            height={65}
          />
        </div>

        <h1 className="text-display-xl font-display text-navy-950 dark:text-bone tracking-tightest max-w-5xl">
          <span className="block overflow-hidden">
            <span className="ah-line block">Building, slowly,</span>
          </span>
          <span className="block overflow-hidden">
            <span className="ah-line block italic font-light">since 2007.</span>
          </span>
        </h1>

        <div className="ah-meta mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 max-w-5xl">
          <div className="border-l border-navy-950 dark:border-white/10 pl-5">
            <p className="font-display text-5xl text-navy-950 dark:text-bone tracking-tightest leading-none">
              {yearsActive}
            </p>
            <p className="mt-3 eyebrow text-ink-muted dark:text-bone/60">Years active</p>
          </div>
          <div className="border-l border-hairline dark:border-white/10 pl-5">
            <p className="font-display text-5xl text-navy-950 dark:text-bone tracking-tightest leading-none">
              500<span className="text-gold">+</span>
            </p>
            <p className="mt-3 eyebrow text-ink-muted dark:text-bone/60">Units delivered</p>
          </div>
          <div className="border-l border-hairline dark:border-white/10 pl-5">
            <p className="font-display text-5xl text-navy-950 dark:text-bone tracking-tightest leading-none">
              {COMPANY_FACTS.staff}
            </p>
            <p className="mt-3 eyebrow text-ink-muted dark:text-bone/60">In-house specialists</p>
          </div>
          <div className="border-l border-hairline dark:border-white/10 pl-5">
            <p className="font-display text-5xl text-navy-950 dark:text-bone tracking-tightest leading-none">
              11
            </p>
            <p className="mt-3 eyebrow text-ink-muted dark:text-bone/60">Regulatory bodies</p>
          </div>
        </div>
      </div>
    </section>
  );
}
