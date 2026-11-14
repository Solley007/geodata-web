import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { convertNaira, formatFx, FX_CURRENCIES, type FxCurrency } from "@/convex/fxUtils.ts";

export type FxConversion = { currency: FxCurrency; label: string };

/**
 * Live (or admin-overridden) NGN → USD/EUR/GBP conversions.
 * Convex de-duplicates the subscription, so many price tags share one query.
 */
export function useFxRates() {
  const data = useQuery(api.fx.getDisplayRates, {});

  const convert = (naira: number | null | undefined): FxConversion[] => {
    if (!data || !naira || naira <= 0) return [];
    return FX_CURRENCIES.flatMap((c) => {
      const rate = data.rates[c];
      return rate ? [{ currency: c, label: formatFx(convertNaira(naira, rate, data.round), c) }] : [];
    });
  };

  return { ready: data !== undefined, enabled: !!data, updatedAt: data?.updatedAt ?? null, rates: data?.rates ?? {}, convert };
}
