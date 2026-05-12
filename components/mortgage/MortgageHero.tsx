"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";

export default function MortgageHero() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });
      tl.from(".mhero-eyebrow", { y: 16, opacity: 0, duration: 0.8 })
        .from(".mhero-line", { yPercent: 110, duration: 1, stagger: 0.08, ease: "expo.out" }, "-=0.5")
        .from(".mhero-sub", { y: 16, opacity: 0, duration: 0.8 }, "-=0.6");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative bg-navy-950 text-bone pt-40 pb-32 md:pt-48 md:pb-40 overflow-hidden"
    >
      {/* Texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(250,250,247,0.6) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="container-editorial relative">
        {/* Official programme badge — bone pill on dark bg so logo text is legible */}
        <div className="mhero-eyebrow inline-flex items-center gap-3 bg-bone dark:bg-navy-950 px-4 py-3 mb-10">
          <Image
            src="/mreif-logo.png"
            alt="MREIF"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0"
          />
          <span className="text-navy-950 dark:text-bone text-xs uppercase tracking-eyebrow font-medium">
            Official Mortgage Programme
          </span>
        </div>

        <h1 className="text-display-xl font-display tracking-tightest max-w-5xl">
          <span className="block overflow-hidden">
            <span className="mhero-line block">9.75% fixed.</span>
          </span>
          <span className="block overflow-hidden">
            <span className="mhero-line block italic font-light">
              Twenty years.
            </span>
          </span>
          <span className="block overflow-hidden">
            <span className="mhero-line block">Naira denominated.</span>
          </span>
        </h1>

        <p className="mhero-sub mt-12 max-w-2xl text-lg text-bone/80 leading-relaxed">
          Through the Ministry of Finance Real Estate Investment Fund — managed
          by ARM Investment Managers and underwritten by Federal Mortgage Bank
          of Nigeria — Geodata residences qualify for fixed-rate financing at
          terms unmatched by any commercial bank in Nigeria.
        </p>
      </div>
    </section>
  );
}
