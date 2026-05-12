"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { COMPANY_FACTS } from "@/lib/about-data";

// Company-level stats — same source of truth as the About page hero.
// This ensures both sections always show identical numbers.
const STATS = [
  {
    value: new Date().getFullYear() - COMPANY_FACTS.founded,
    suffix: "",
    label: "Years active",
  },
  {
    value: 500,
    suffix: "+",
    label: "Units delivered",
  },
  {
    value: 80,
    suffix: "+",
    label: "In-house specialists",
  },
  {
    value: 11,
    suffix: "",
    label: "Regulatory bodies",
  },
];

export default function StatsCounter() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".stat-number").forEach((node) => {
        const target = parseFloat(node.dataset.value ?? "0");
        const decimals = parseInt(node.dataset.decimals ?? "0", 10);
        // The counter object is mutated by GSAP and read into innerText
        const obj = { v: 0 };

        gsap.to(obj, {
          v: target,
          duration: 2.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: node,
            start: "top 80%",
            once: true,
          },
          onUpdate: () => {
            node.textContent = obj.v.toFixed(decimals);
          },
        });
      });

      // Hairline divider draws in alongside the numbers
      gsap.from(".stat-rule", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.4,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="bg-navy-950 text-bone py-10 md:py-12 relative overflow-hidden"
    >
      {/* Texture overlay — not pure flat black. Adds atmosphere. */}
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
        <div className="grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-5">
            <p className="eyebrow text-bone/60 mb-6">By the numbers</p>
            <h2 className="text-display-md font-display tracking-tightest">
              Eighteen years.<em className="font-light"> The receipts.</em>
            </h2>
          </div>
        </div>

        <div className="stat-rule h-px w-full bg-bone/15 mb-20 origin-left" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="border-l border-bone/15 pl-6">
              <p className="font-display text-6xl md:text-7xl tracking-tightest leading-none">
                <span
                  className="stat-number"
                  data-value={s.value}
                  data-decimals={s.decimals ?? 0}
                >
                  0
                </span>
                <span className="text-gold">{s.suffix}</span>
              </p>
              <p className="mt-6 text-sm text-bone/70 leading-relaxed max-w-[220px]">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
