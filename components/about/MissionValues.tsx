"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { ABOUT } from "@/lib/site-content";

export default function MissionValues() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".mv-fade", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.07,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 78%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-32 md:py-48 border-b border-hairline dark:border-white/10">
      <div className="container-editorial">

        {/* Section header */}
        <div className="grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-5 mv-fade">
            <p className="eyebrow mb-6">Who we are</p>
            <h2 className="text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
              Purpose, vision &amp; values.
            </h2>
          </div>
        </div>

        {/* Mission + Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-hairline dark:border-white/10">
          <div className="mv-fade py-12 md:pr-16 md:border-r border-hairline dark:border-white/10">
            <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6">Mission</p>
            <p className="text-lg leading-relaxed text-ink dark:text-bone/80">
              {ABOUT.mission}
            </p>
          </div>

          <div className="mv-fade py-12 md:pl-16 border-t md:border-t-0 border-hairline dark:border-white/10">
            <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6">Vision</p>
            <p className="text-lg leading-relaxed text-ink dark:text-bone/80">
              {ABOUT.vision}
            </p>
          </div>
        </div>

        {/* Core Values */}
        <div className="mv-fade mt-20 border-t border-hairline dark:border-white/10 pt-16">
          <p className="eyebrow text-ink-faint dark:text-bone/40 mb-10">Core values</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {ABOUT.values.map((value) => (
              <div
                key={value}
                className="border border-hairline dark:border-white/10 p-6 hover:border-navy-950 dark:hover:border-bone/40 transition-colors duration-300"
              >
                <p className="font-display text-xl text-navy-950 dark:text-bone leading-tight">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
