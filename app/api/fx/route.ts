import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Indicative exchange rates for the currency switcher.
// Source: ExchangeRate-API open access (free, no key, updates daily).
// Cached for 12 hours so we stay well inside their fair-use limits.
// The naira price is always the binding one, these are for orientation only.
// ---------------------------------------------------------------------------

export const revalidate = 43200;

const SOURCE = "https://open.er-api.com/v6/latest/NGN";
const WANTED = ["USD", "GBP", "EUR", "CAD"] as const;

export async function GET() {
  try {
    const res = await fetch(SOURCE, { next: { revalidate } });
    if (!res.ok) throw new Error(`FX source ${res.status}`);
    const data = await res.json();
    if (data?.result !== "success" || !data?.rates) throw new Error("FX source returned no rates");

    const rates: Record<string, number> = {};
    for (const code of WANTED) {
      if (typeof data.rates[code] === "number") rates[code] = data.rates[code];
    }

    return NextResponse.json({
      base:      "NGN",
      rates,                                  // 1 NGN = rates[code] units of that currency
      updatedAt: data.time_last_update_utc ?? null,
    });
  } catch (err) {
    console.error("[fx]", err);
    return NextResponse.json({ error: "Rates unavailable" }, { status: 503 });
  }
}
