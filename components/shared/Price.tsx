"use client";

import clsx from "clsx";
import { useCurrency } from "@/lib/CurrencyProvider";
import { formatCompact } from "@/lib/currency";

interface Props {
  /** Naira amount, e.g. 180_000_000 */
  ngn: number;
  /** The naira label as already written on the page, e.g. "₦180M" */
  label: string;
  /** Classes for the converted figure */
  convertedClassName?: string;
  /** Put the converted figure on its own line */
  stacked?: boolean;
}

/**
 * Price, shows the naira price, plus an indicative conversion when the
 * visitor has picked another currency. Naira always stays visible because
 * it is the binding price.
 */
export default function Price({ ngn, label, convertedClassName, stacked }: Props) {
  const { currency, convert } = useCurrency();
  const converted = currency === "NGN" ? null : convert(ngn);

  return (
    <>
      {label}
      {converted !== null && (
        <span
          className={clsx(
            "opacity-60 whitespace-nowrap",
            stacked ? "block text-[0.6em] mt-1" : "ml-2 text-[0.75em]",
            convertedClassName
          )}
          title="Indicative conversion. The naira price is binding."
        >
          ≈ {formatCompact(converted, currency)}
        </span>
      )}
    </>
  );
}
