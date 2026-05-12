"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const STEPS = [
  {
    n: "01",
    title: "Reservation",
    body: "Reserve your unit at Geodata with a 5% commitment fee. Receive your provisional allocation letter.",
  },
  {
    n: "02",
    title: "Equity contribution",
    body: "Top up to the MREIF minimum 10% equity. Submit personal documentation: KYC, bank statements, employment verification.",
  },
  {
    n: "03",
    title: "MREIF assessment",
    body: "ARM Investment Managers reviews eligibility on behalf of the fund. Federal Mortgage Bank issues approval-in-principle within 14 working days.",
  },
  {
    n: "04",
    title: "Disbursement",
    body: "Loan funds are disbursed directly to Geodata. You take possession on the agreed handover date and begin monthly repayments.",
  },
];

export default function MortgageHowItWorks() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".mhow-fade", {
        y: 32,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bg-bone-100 dark:bg-navy-900 py-32 md:py-48">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-5 mhow-fade">
            <p className="eyebrow mb-6">How it works</p>
            <h2 className="text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
              Four steps. <em className="font-light">Roughly six weeks.</em>
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:pt-6 mhow-fade">
            <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
              Geodata's relationship with ARM streamlines the application. Most
              of the paperwork happens once, behind the scenes. You speak with
              one person at Geodata, and the rest is coordinated for you.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step) => (
            <div key={step.n} className="mhow-fade">
              <p className="font-display text-6xl text-gold-dark tracking-tightest leading-none mb-6">
                {step.n}
              </p>
              <h3 className="font-display text-2xl text-navy-950 dark:text-bone mb-4 leading-tight">
                {step.title}
              </h3>
              <p className="text-ink dark:text-bone/75 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
