// ---------------------------------------------------------------------------
// Currency helpers, shared by server and client components.
// The switcher state itself lives in lib/CurrencyProvider.tsx.
// ---------------------------------------------------------------------------

export const CURRENCIES = [
  { code: "NGN", symbol: "₦",   label: "Naira" },
  { code: "USD", symbol: "$",   label: "US dollar" },
  { code: "GBP", symbol: "£",   label: "Pound sterling" },
  { code: "EUR", symbol: "€",   label: "Euro" },
  { code: "CAD", symbol: "CA$", label: "Canadian dollar" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

/** "₦180,000,000" → 180000000 */
export function ngnFromLabel(label: string): number {
  return Number(label.replace(/[^\d]/g, "")) || 0;
}

/** Compact money format: 85400 → "£85k", 1240000 → "$1.24M" */
export function formatCompact(amount: number, code: CurrencyCode): string {
  const symbol = CURRENCIES.find((c) => c.code === code)?.symbol ?? "";
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${symbol}${m >= 100 ? Math.round(m) : m.toFixed(m >= 10 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  }
  if (amount >= 1_000) return `${symbol}${Math.round(amount / 1_000)}k`;
  return `${symbol}${Math.round(amount)}`;
}
