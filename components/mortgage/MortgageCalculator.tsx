"use client";

import { useState, useMemo, useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import {
  calculateMortgage,
  formatNaira,
  MREIF,
} from "@/lib/mortgage";

const PRICE_MIN = 100_000_000;
const PRICE_MAX = 250_000_000;
const PRICE_STEP = 5_000_000;

export default function MortgageCalculator() {
  const root = useRef<HTMLElement>(null);

  // Defaults match a buyer evaluating "The Terrace" with the minimum equity
  const [price, setPrice] = useState(150_000_000);
  const [equityPct, setEquityPct] = useState(20);
  const [tenor, setTenor] = useState(20);

  const result = useMemo(
    () => calculateMortgage({ propertyPrice: price, equityPercent: equityPct, tenorYears: tenor }),
    [price, equityPct, tenor]
  );

  // Animate the headline numbers when they change. We tween a counter object
  // and write into the DOM directly — same pattern as StatsCounter on home.
  const monthlyRef = useRef<HTMLSpanElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);
  const interestRef = useRef<HTMLSpanElement>(null);
  const previousValues = useRef({ monthly: 0, total: 0, interest: 0 });

  useLayoutEffect(() => {
    if (!monthlyRef.current || !totalRef.current || !interestRef.current) return;

    const animateNumber = (
      el: HTMLElement,
      from: number,
      to: number,
      decimals = 0
    ) => {
      const obj = { v: from };
      gsap.to(obj, {
        v: to,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = formatNaira(Math.round(obj.v), { decimals });
        },
      });
    };

    animateNumber(monthlyRef.current, previousValues.current.monthly, result.monthlyRepayment);
    animateNumber(totalRef.current, previousValues.current.total, result.totalRepayment);
    animateNumber(interestRef.current, previousValues.current.interest, result.totalInterest);

    previousValues.current = {
      monthly: result.monthlyRepayment,
      total: result.totalRepayment,
      interest: result.totalInterest,
    };
  }, [result.monthlyRepayment, result.totalRepayment, result.totalInterest]);

  // Entrance animation
  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".calc-fade", {
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
        <div className="grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-7 calc-fade">
            <p className="eyebrow mb-6">Mortgage Calculator</p>
            <h2 className="text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
              Find your <em className="font-light">monthly figure.</em>
            </h2>
            <p className="mt-8 text-lg text-ink dark:text-bone/75 leading-relaxed max-w-xl">
              Adjust property price, equity contribution, and tenor to see
              your repayment under the MREIF programme.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-x-12 gap-y-16">
          {/* LEFT — Inputs */}
          <div className="col-span-12 lg:col-span-7 space-y-12">
            {/* Price input */}
            <div className="calc-fade">
              <div className="flex items-baseline justify-between mb-4">
                <label className="eyebrow text-ink-muted dark:text-bone/60">Property price</label>
                <span className="font-display text-2xl text-navy-950 dark:text-bone tabular-nums">
                  {formatNaira(price)}
                </span>
              </div>
              <input
                type="range"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={PRICE_STEP}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="calc-slider"
                style={{
                  // Inline so the gradient track tracks the value
                  background: `linear-gradient(to right, var(--color-navy) 0%, var(--color-navy) ${
                    ((price - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100
                  }%, var(--color-hairline) ${
                    ((price - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100
                  }%, var(--color-hairline) 100%)`,
                }}
              />
              <div className="flex justify-between mt-3 text-[11px] uppercase tracking-eyebrow text-ink-faint dark:text-bone/40">
                <span>{formatNaira(PRICE_MIN)}</span>
                <span>{formatNaira(PRICE_MAX)}</span>
              </div>
            </div>

            {/* Equity input */}
            <div className="calc-fade">
              <div className="flex items-baseline justify-between mb-4">
                <label className="eyebrow text-ink-muted dark:text-bone/60">
                  Equity contribution
                </label>
                <div className="text-right">
                  <span className="font-display text-2xl text-navy-950 dark:text-bone tabular-nums">
                    {equityPct}%
                  </span>
                  <span className="ml-2 text-sm text-ink-muted dark:text-bone/60 tabular-nums">
                    {formatNaira(result.equityAmount)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={equityPct}
                onChange={(e) => setEquityPct(Number(e.target.value))}
                className="calc-slider"
                style={{
                  background: `linear-gradient(to right, var(--color-navy) 0%, var(--color-navy) ${
                    ((equityPct - 5) / 45) * 100
                  }%, var(--color-hairline) ${
                    ((equityPct - 5) / 45) * 100
                  }%, var(--color-hairline) 100%)`,
                }}
              />
              <div className="flex justify-between mt-3 text-[11px] uppercase tracking-eyebrow text-ink-faint dark:text-bone/40">
                <span>5%</span>
                <span className="text-gold-dark">
                  {MREIF.minEquityPercent}% MREIF minimum
                </span>
                <span>50%</span>
              </div>
            </div>

            {/* Tenor input */}
            <div className="calc-fade">
              <div className="flex items-baseline justify-between mb-4">
                <label className="eyebrow text-ink-muted dark:text-bone/60">Mortgage tenor</label>
                <span className="font-display text-2xl text-navy-950 dark:text-bone tabular-nums">
                  {tenor} {tenor === 1 ? "year" : "years"}
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={MREIF.maxTenorYears}
                step={1}
                value={tenor}
                onChange={(e) => setTenor(Number(e.target.value))}
                className="calc-slider"
                style={{
                  background: `linear-gradient(to right, var(--color-navy) 0%, var(--color-navy) ${
                    ((tenor - 5) / (MREIF.maxTenorYears - 5)) * 100
                  }%, var(--color-hairline) ${
                    ((tenor - 5) / (MREIF.maxTenorYears - 5)) * 100
                  }%, var(--color-hairline) 100%)`,
                }}
              />
              <div className="flex justify-between mt-3 text-[11px] uppercase tracking-eyebrow text-ink-faint dark:text-bone/40">
                <span>5 years</span>
                <span>{MREIF.maxTenorYears} years (max)</span>
              </div>
            </div>

            {/* Affordability warning */}
            {!result.affordable && (
              <div className="calc-fade flex items-start gap-4 p-6 bg-gold-soft/30 border-l-2 border-gold-dark">
                <span className="text-gold-dark mt-1">⚠</span>
                <div>
                  <p className="font-medium text-navy-950 dark:text-bone">
                    Below MREIF minimum equity
                  </p>
                  <p className="text-sm text-ink-muted dark:text-bone/60 mt-1">
                    The MREIF programme requires at least{" "}
                    {MREIF.minEquityPercent}% equity contribution. Increase the
                    slider to qualify.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Results panel */}
          <div className="col-span-12 lg:col-span-5">
            <div className="calc-fade bg-navy-950 text-bone p-6 sm:p-8 lg:p-10 sticky top-32">
              <p className="eyebrow text-bone/60 mb-3">Monthly repayment</p>
              <p className="font-display text-3xl sm:text-display-md tracking-tightest leading-none break-words">
                <span ref={monthlyRef} className="tabular-nums">
                  {formatNaira(result.monthlyRepayment)}
                </span>
              </p>
              <p className="mt-4 text-sm text-bone/60">
                Fixed at {(MREIF.rate * 100).toFixed(2)}% per annum
              </p>

              <div className="mt-10 pt-10 border-t border-bone/15 space-y-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-bone/70">Loan amount</span>
                  <span className="font-display text-xl text-bone tabular-nums">
                    {formatNaira(result.loanAmount)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-bone/70">Total repayment</span>
                  <span className="font-display text-xl text-bone tabular-nums">
                    <span ref={totalRef}>{formatNaira(result.totalRepayment)}</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-bone/70">Total interest</span>
                  <span className="font-display text-xl text-bone tabular-nums">
                    <span ref={interestRef}>{formatNaira(result.totalInterest)}</span>
                  </span>
                </div>
              </div>

              <a
                href="/contact"
                className="mt-10 block w-full bg-bone dark:bg-navy-950 text-navy-950 dark:text-bone px-7 py-4 text-xs uppercase tracking-eyebrow font-medium text-center hover:bg-gold-soft transition-colors duration-400"
              >
                Begin application →
              </a>

              <p className="mt-6 text-[11px] text-bone/50 leading-relaxed">
                Indicative figures only. Final terms subject to MREIF
                eligibility verification by Federal Mortgage Bank of Nigeria.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
