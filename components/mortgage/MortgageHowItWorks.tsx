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
    body: "Your application is reviewed for MREIF eligibility through the partner bank. Approval-in-principle is typically issued within 14 working days.",
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
              Four steps. Roughly six weeks.
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:pt-6 mhow-fade">
            <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
              Geodata guides you through reservation and equity, and helps you
              assemble what the lender will need. MREIF assessment, approval,
              and disbursement run on the bank's side from there.
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
