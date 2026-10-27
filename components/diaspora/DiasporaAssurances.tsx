"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import { COMPANY } from "@/lib/site-content";

// The fears every diaspora buyer has, answered with something verifiable
const ASSURANCES = [
  {
    fear: "Is the developer real?",
    answer: `${COMPANY.name}, ${COMPANY.rc}, building since ${COMPANY.founded}. REDAN member, with federal clients including CBN and FIRS.`,
    link: { label: "Our track record", href: "/about" },
  },
  {
    fear: "Is it actually being built?",
    answer: "Construction progress is published on the site, so you can see the work for yourself instead of taking anyone's word for it.",
    link: { label: "Construction updates", href: "/updates" },
  },
  {
    fear: "Has anything been delivered before?",
    answer: "Country Court Estate is delivered, sold and fully occupied. Southern Bridge Estate in Jabi is a fully delivered, gated estate.",
    link: { label: "See the portfolio", href: "/projects" },
  },
  {
    fear: "Can I finance it?",
    answer: "Nigerian citizens may qualify for MREIF financing at 9.75% fixed for up to 20 years. Talk to us about how income earned abroad is assessed.",
    link: { label: "MREIF mortgage", href: "/mortgage" },
  },
];

export default function DiasporaAssurances() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".dassure-fade", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-32 md:py-48">
      <div className="container-editorial">
        <div className="max-w-3xl mb-20 dassure-fade">
          <p className="eyebrow mb-6">Peace of mind</p>
          <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest">
            The questions you should ask any developer.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          {ASSURANCES.map((a) => (
            <div
              key={a.fear}
              className="dassure-fade border-t border-hairline dark:border-white/10 py-10"
            >
              <h3 className="font-display text-2xl text-navy-950 dark:text-bone mb-4 leading-tight">
                {a.fear}
              </h3>
              <p className="text-ink dark:text-bone/75 leading-relaxed mb-6">{a.answer}</p>
              <Link
                href={a.link.href}
                className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone pb-1 border-b border-navy-900/30 dark:border-bone/30 hover:text-accent-dark hover:border-accent-dark dark:hover:text-accent dark:hover:border-accent transition-colors duration-400"
              >
                {a.link.label} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
