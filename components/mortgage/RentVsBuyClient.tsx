/**
 * Rent vs Buy calculator — the reframe section.
 *
 * Lives on the MREIF mortgage page, wrapped by MortgageRentVsBuy.
 *
 * Core argument: Abuja rent is paid annually upfront and rises every year.
 * An MREIF mortgage at 9.75% fixed is a flat payment that builds equity.
 * Most renters have never seen the two side by side.
 */
"use client";

import React, { useMemo, useState } from "react";

const MREIF_RATE = 0.0975; // 9.75% fixed
const TENURE_YEARS = 20;
const RENT_INFLATION = 0.12; // 12%/yr, conservative for Abuja

function fmt(n: number): string {
  if (!isFinite(n)) return "—";
  return "₦" + Math.round(n).toLocaleString("en-NG");
}

function monthlyMortgage(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (principal <= 0) return 0;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export default function RentVsBuyClient() {
  const [annualRent, setAnnualRent] = useState(8_000_000);
  const [homePrice, setHomePrice] = useState(150_000_000);
  const [depositPct, setDepositPct] = useState(20);

  const calc = useMemo(() => {
    const deposit = homePrice * (depositPct / 100);
    const principal = homePrice - deposit;
    const monthly = monthlyMortgage(principal, MREIF_RATE, TENURE_YEARS);
    const rentMonthly = annualRent / 12;

    // 5-year cumulative comparison
    let rent5y = 0;
    let rentYear = annualRent;
    for (let y = 0; y < 5; y++) {
      rent5y += rentYear;
      rentYear *= 1 + RENT_INFLATION;
    }
    const own5y = monthly * 12 * 5;

    // Equity after 5 years (principal repaid)
    const r = MREIF_RATE / 12;
    const n = TENURE_YEARS * 12;
    const k = 60; // months
    const balance =
      principal * ((Math.pow(1 + r, n) - Math.pow(1 + r, k)) / (Math.pow(1 + r, n) - 1));
    const equity5y = principal - balance + deposit;

    return { deposit, monthly, rentMonthly, rent5y, own5y, equity5y };
  }, [annualRent, homePrice, depositPct]);

  const inputCls =
    "w-full bg-transparent border border-navy-900/20 dark:border-bone/20 px-4 py-3 text-navy-950 dark:text-bone focus:outline-none focus:border-accent";
  const labelCls =
    "block text-[10px] uppercase tracking-eyebrow text-navy-900/60 dark:text-bone/60 mb-2";

  return (
    <div className="grid grid-cols-12 gap-y-12 lg:gap-12">
      {/* Inputs */}
      <div className="col-span-12 lg:col-span-5">
        <div className="space-y-6">
          <div>
            <label className={labelCls}>Your current annual rent</label>
            <input
              type="number"
              className={inputCls}
              value={annualRent}
              min={0}
              step={500000}
              onChange={(e) => setAnnualRent(Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelCls}>Home price</label>
            <input
              type="number"
              className={inputCls}
              value={homePrice}
              min={0}
              step={5000000}
              onChange={(e) => setHomePrice(Number(e.target.value))}
            />
            <p className="mt-2 text-xs text-navy-900/50 dark:text-bone/50">
              Southern Bridge City typologies range ₦110M to ₦220M.
            </p>
          </div>
          <div>
            <label className={labelCls}>Deposit ({depositPct}%)</label>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={depositPct}
              onChange={(e) => setDepositPct(Number(e.target.value))}
              className="w-full accent-[#D44455]"
            />
            <p className="mt-2 text-xs text-navy-900/50 dark:text-bone/50">
              Deposit: {fmt(calc.deposit)}
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="col-span-12 lg:col-span-7">
        <div className="grid grid-cols-2 gap-px bg-navy-900/10 dark:bg-bone/10 border border-navy-900/10 dark:border-bone/10">
          <div className="bg-bone dark:bg-navy-950 p-6">
            <p className={labelCls}>Renting, per month</p>
            <p className="font-display text-3xl text-navy-950 dark:text-bone">
              {fmt(calc.rentMonthly)}
            </p>
            <p className="mt-1 text-xs text-navy-900/50 dark:text-bone/50">
              Paid annually upfront, rises ~12%/yr
            </p>
          </div>
          <div className="bg-bone dark:bg-navy-950 p-6">
            <p className={labelCls}>Owning (MREIF), per month</p>
            <p className="font-display text-3xl text-accent">{fmt(calc.monthly)}</p>
            <p className="mt-1 text-xs text-navy-900/50 dark:text-bone/50">
              9.75% fixed · 20 years · never rises
            </p>
          </div>
          <div className="bg-bone dark:bg-navy-950 p-6">
            <p className={labelCls}>5 years of rent</p>
            <p className="font-display text-2xl text-navy-950 dark:text-bone">
              {fmt(calc.rent5y)}
            </p>
            <p className="mt-1 text-xs text-navy-900/50 dark:text-bone/50">
              Gone. No asset, no equity.
            </p>
          </div>
          <div className="bg-bone dark:bg-navy-950 p-6">
            <p className={labelCls}>Equity after 5 years owning</p>
            <p className="font-display text-2xl text-navy-950 dark:text-bone">
              {fmt(calc.equity5y)}
            </p>
            <p className="mt-1 text-xs text-navy-900/50 dark:text-bone/50">
              Deposit + principal repaid, before any appreciation.
            </p>
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-navy-900/50 dark:text-bone/50">
          Illustrative only. Assumes MREIF fixed rate of 9.75% over 20 years and 12% annual
          rent inflation. Excludes service charges, legal fees and maintenance on both sides.
          MREIF eligibility is assessed by the participating financial institution.
        </p>

        <div className="mt-8">
          <a
            href="#quiz"
            className="inline-flex items-center justify-center gap-3 bg-navy-900 text-bone px-7 py-4 text-xs uppercase tracking-eyebrow font-medium hover:bg-navy-800 transition-colors duration-400"
          >
            Check your MREIF eligibility →
          </a>
        </div>
      </div>
    </div>
  );
}
