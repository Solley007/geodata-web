"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";

/**
 * MREIF Section
 * ----
 * This is the most important section on the homepage commercially.
 * 9.75% fixed for 20 years on a ₦150M home is a genuinely compelling
 * pitch — but only if it's framed clearly. Resist the urge to bury it
 * in a "Buy with Mortgage" card the way the current site does.
 */

const TERMS = [
  { label: "Interest rate", value: "9.75%", note: "Fixed, full tenor" },
  { label: "Tenor", value: "20 years", note: "Maximum" },
  { label: "Minimum equity", value: "10%", note: "Of property value" },
  { label: "Currency", value: "₦", note: "Naira denominated" },
];

const PARTNERS = [
  { label: "Fund Manager", name: "ARM Investment Managers" },
  { label: "Construction Lender", name: "Zenith Bank" },
  { label: "Programme Sponsor", name: "Federal Mortgage Bank of Nigeria" },
];

export default function MreifSection() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;

    const ctx = gsap.context(() => {
      gsap.from(".mreif-headline > *", {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });

      gsap.from(".mreif-term", {
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: ".mreif-terms", start: "top 80%" },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bg-bone-100 dark:bg-navy-900 py-8 md:py-10 relative">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12">
          {/* Eyebrow + headline */}
          <div className="col-span-12 lg:col-span-7 mreif-headline">
            {/* MREIF logo — programme identity mark */}
            <div className="mb-4">
              <Image
                src="/mreif-logo.png"
                alt="MREIF — Ministry of Finance Real Estate Investment Fund"
                width={96}
                height={96}
                className="h-24 w-24"
              />
            </div>
            <p className="eyebrow mb-3">MREIF Mortgage Programme</p>
            <h2 className="text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
              The most accessible <em className="font-light">premium home loan</em> in Nigeria.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-ink dark:text-bone/75 max-w-2xl">
              Through the Ministry of Finance Real Estate Investment Fund — managed
              by ARM and underwritten by Federal Mortgage Bank — Geodata residences
              qualify for fixed-rate mortgage financing at terms unmatched by
              commercial banks.
            </p>
          </div>

          {/* Right column — partners */}
          <div className="col-span-12 lg:col-span-4 lg:col-start-9 lg:pt-6">
            <p className="eyebrow mb-3">Backed by</p>
            <ul className="space-y-5">
              {PARTNERS.map((p) => (
                <li key={p.name} className="border-t border-hairline dark:border-white/10 pt-5">
                  <p className="text-[11px] uppercase tracking-eyebrow text-ink-faint dark:text-bone/40 mb-1">
                    {p.label}
                  </p>
                  <p className="font-display text-xl text-navy-950 dark:text-bone">{p.name}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Terms grid */}
        <div className="mreif-terms mt-10 grid grid-cols-2 lg:grid-cols-4 border-t border-hairline dark:border-white/10">
          {TERMS.map((t, i) => (
            <div
              key={t.label}
              className={`mreif-term py-6 px-2 ${
                i !== TERMS.length - 1 ? "lg:border-r border-hairline dark:border-white/10" : ""
              } ${i < 2 ? "border-r border-hairline dark:border-white/10 lg:border-r" : ""} ${
                i < 2 ? "border-b lg:border-b-0" : ""
              }`}
            >
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-4">{t.label}</p>
              <p className="font-display text-5xl md:text-6xl text-navy-950 dark:text-bone tracking-tightest leading-none">
                {t.value}
              </p>
              <p className="mt-3 text-sm text-ink-muted dark:text-bone/60">{t.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <a
            href="/mortgage"
            className="inline-flex items-center gap-3 bg-navy-900 px-7 py-4 text-sm font-medium text-bone hover:bg-navy-800 transition-colors duration-400"
          >
            Calculate your mortgage
            <span aria-hidden>→</span>
          </a>
          <a
            href="/mortgage/application"
            className="inline-flex items-center gap-3 px-7 py-4 text-sm font-medium text-navy-900 dark:text-bone/90 border-b border-navy-900 dark:border-white/20 hover:text-gold-dark hover:border-gold-dark transition-colors duration-400"
          >
            Begin application
          </a>
        </div>
      </div>
    </section>
  );
}
