"use client";

import clsx from "clsx";
import { useCurrency } from "@/lib/CurrencyProvider";
import { CURRENCIES } from "@/lib/currency";

interface Props {
  /** "light" for bone/light sections, "dark" for navy sections */
  tone?: "light" | "dark";
  className?: string;
  /** Hide the small disclaimer line */
  compact?: boolean;
}

export default function CurrencySwitcher({ tone = "light", className, compact }: Props) {
  const { currency, setCurrency, ratesError } = useCurrency();
  const dark = tone === "dark";

  return (
    <div className={className}>
      <div
        role="radiogroup"
        aria-label="Show prices in"
        className={clsx(
          "inline-flex border",
          dark ? "border-bone/25" : "border-hairline dark:border-white/15"
        )}
      >
        {CURRENCIES.map((c) => {
          const active = currency === c.code;
          return (
            <button
              key={c.code}
              type="button"
              role="radio"
              aria-checked={active}
              title={c.label}
              onClick={() => setCurrency(c.code)}
              className={clsx(
                "px-3 py-2 text-[11px] tracking-wide font-medium transition-colors duration-300",
                active
                  ? dark
                    ? "bg-bone text-navy-950"
                    : "bg-navy-900 text-bone dark:bg-bone dark:text-navy-950"
                  : dark
                    ? "text-bone/70 hover:text-bone"
                    : "text-navy-900 dark:text-bone/70 hover:text-accent-dark dark:hover:text-bone"
              )}
            >
              {c.symbol}
            </button>
          );
        })}
      </div>
      {!compact && currency !== "NGN" && (
        <p className={clsx("mt-2 text-[11px]", dark ? "text-bone/50" : "text-ink-faint dark:text-bone/40")}>
          {ratesError
            ? "Exchange rates are unavailable right now. Prices shown in naira."
            : <>Indicative conversion at today&apos;s rate. Naira price is binding. <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline">Rates by Exchange Rate API</a></>}
        </p>
      )}
    </div>
  );
}
