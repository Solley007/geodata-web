"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { COMPLIANCE } from "@/lib/about-data";

export default function Compliance() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".cmp-fade", {
        y: 24,
        opacity: 0,
        duration: 0.8,
        stagger: 0.04,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 80%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-32 md:py-48">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-5">
            <p className="cmp-fade eyebrow mb-6">Compliance</p>
            <h2 className="cmp-fade text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
              Regulated, registered, <em className="font-light">accountable.</em>
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:pt-6">
            <p className="cmp-fade text-lg leading-relaxed text-ink dark:text-bone/75">
              Geodata maintains active registration and compliance with every
              relevant Nigerian regulatory body governing real estate
              development, construction, employment, taxation, and financial
              reporting.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-hairline dark:border-white/10">
          {COMPLIANCE.map((item) => (
            <div
              key={item.name}
              className="cmp-fade border-r border-b border-hairline dark:border-white/10 p-8 group hover:bg-bone-100 dark:bg-navy-900 transition-colors duration-400"
            >
              <p className="font-display text-lg text-navy-950 dark:text-bone leading-tight">
                {item.name}
              </p>
              {item.detail && (
                <p className="mt-3 text-xs uppercase tracking-eyebrow text-gold-dark">
                  {item.detail}
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="cmp-fade mt-10 text-sm text-ink-faint dark:text-bone/40">
          Audited accounts and current tax clearance certificates available
          for verification on request.
        </p>
      </div>
    </section>
  );
}
