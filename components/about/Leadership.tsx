"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { LEADERSHIP } from "@/lib/about-data";

export default function Leadership() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".ld-fade", {
        y: 28,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 80%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bg-bone-100 dark:bg-navy-900 py-32 md:py-48">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-5">
            <p className="ld-fade eyebrow mb-6">Leadership</p>
            <h2 className="ld-fade text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
              Drawn from <em className="font-light">specialised fields.</em>
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:pt-6">
            <p className="ld-fade text-lg leading-relaxed text-ink dark:text-bone/75">
              The leadership team brings decades of combined experience in
              engineering, real estate development, finance, and public-sector
              project delivery — supported by an in-house team of {""}
              <span className="text-navy-950 dark:text-bone">80+</span> specialists across all
              construction disciplines.
            </p>
          </div>
        </div>

        {/* Top hairline */}
        <div className="ld-fade h-px w-full bg-navy-950" />

        {/* Leadership entries — each is a row, considered, no faces yet */}
        <div>
          {LEADERSHIP.map((person) => (
            <div
              key={person.name}
              className="ld-fade grid grid-cols-12 gap-6 py-12 border-b border-hairline dark:border-white/10 items-baseline"
            >
              <div className="col-span-12 md:col-span-7">
                <p className="text-sm uppercase tracking-eyebrow text-ink-faint dark:text-bone/40 mb-2">
                  {person.prefix && (
                    <span className="text-ink-muted dark:text-bone/60">{person.prefix} </span>
                  )}
                </p>
                <h3 className="font-display text-3xl md:text-4xl text-navy-950 dark:text-bone tracking-tightest leading-none">
                  {person.name}
                </h3>
              </div>
              <div className="col-span-12 md:col-span-5">
                <p className="text-lg text-ink dark:text-bone/75 leading-relaxed">
                  {person.title}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="ld-fade mt-12 text-sm text-ink-faint dark:text-bone/40 max-w-xl">
          A full capability statement listing the technical team across
          architecture, civil, M&E, building, quantity surveying, ICT, and
          environmental disciplines is available on request.
        </p>
      </div>
    </section>
  );
}
