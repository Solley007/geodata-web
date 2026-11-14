// Pure currency helpers shared by the backend and the frontend (via @/convex).
// Rates are stored as "Naira per 1 unit" of the foreign currency, e.g. USD: 1550.

export const FX_CURRENCIES = ["USD", "EUR", "GBP"] as const;
export type FxCurrency = (typeof FX_CURRENCIES)[number];
export type FxRates = Record<FxCurrency, number>;

export const FX_SYMBOLS: Record<FxCurrency, string> = { USD: "$", EUR: "€", GBP: "£" };

/** Live rates older than this are flagged to staff as stale. */
export const FX_STALE_HOURS = 48;

export function isValidRate(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/** Live rate unless the admin has turned on a manual override for that currency. */
export function effectiveRates(
  live: Partial<FxRates> | undefined,
  manual: Partial<FxRates> | undefined,
  useManual: Partial<Record<FxCurrency, boolean>> | undefined,
): Partial<FxRates> {
  const out: Partial<FxRates> = {};
  for (const c of FX_CURRENCIES) {
    const m = manual?.[c];
    const l = live?.[c];
    if (useManual?.[c] && isValidRate(m)) out[c] = m;
    else if (isValidRate(l)) out[c] = l;
  }
  return out;
}

/** Convert a Naira amount, optionally rounding to a "clean" figure for display. */
export function convertNaira(naira: number, nairaPerUnit: number, round: boolean): number {
  const raw = naira / nairaPerUnit;
  if (!round) return Math.round(raw);
  if (raw >= 100_000) return Math.round(raw / 1_000) * 1_000;
  if (raw >= 1_000) return Math.round(raw / 100) * 100;
  return Math.round(raw);
}

/** Compact display, e.g. $97,000 or $1.2M. */
export function formatFx(amount: number, currency: FxCurrency): string {
  const sym = FX_SYMBOLS[currency];
  if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  return `${sym}${amount.toLocaleString("en-US")}`;
}

/**
 * Pull a Naira amount out of free text such as "Amount: ₦130M" or "N1.2B" or
 * "₦45,000,000". Returns null when no amount is present.
 */
export function parseNairaFromText(text: string): number | null {
  const m = text.match(/(?:₦|\bN|\bNGN\s?)\s?(\d[\d,]*(?:\.\d+)?)\s*(k|m|b|million|billion)?\b/i);
  if (!m) return null;
  const base = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(base) || base <= 0) return null;
  const unit = (m[2] ?? "").toLowerCase();
  const mult = unit === "k" ? 1e3 : unit === "m" || unit === "million" ? 1e6 : unit === "b" || unit === "billion" ? 1e9 : 1;
  return base * mult;
}

/** Convert an API response of "foreign units per 1 NGN" into "NGN per 1 unit". */
export function invertRates(perNaira: Record<string, number>): Partial<FxRates> {
  const out: Partial<FxRates> = {};
  for (const c of FX_CURRENCIES) {
    const r = perNaira[c];
    if (isValidRate(r)) out[c] = Math.round((1 / r) * 100) / 100;
  }
  return out;
}

export function isStale(fetchedAt: string | undefined, nowMs: number): boolean {
  if (!fetchedAt) return true;
  return nowMs - Date.parse(fetchedAt) > FX_STALE_HOURS * 3_600_000;
}
