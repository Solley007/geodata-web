"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CURRENCIES, type CurrencyCode } from "./currency";

/**
 * Currency Context
 * ----
 * - Lets visitors see indicative prices in their home currency
 * - Persists the choice to localStorage under `geodata_currency`
 * - Rates are fetched lazily from /api/fx, only once a non-naira
 *   currency is chosen, so most visitors never make the request
 */

const STORAGE_KEY = "geodata_currency";

interface CurrencyContext {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  /** Convert a naira amount, null while rates are loading or unavailable */
  convert: (ngn: number) => number | null;
  ratesUpdatedAt: string | null;
  ratesError: boolean;
}

const Ctx = createContext<CurrencyContext | null>(null);

function isCurrency(value: unknown): value is CurrencyCode {
  return CURRENCIES.some((c) => c.code === value);
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("NGN");
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);
  const [ratesError, setRatesError] = useState(false);

  // Hydrate saved choice on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isCurrency(saved)) setCurrencyState(saved);
    } catch { /* storage blocked, stay on naira */ }
  }, []);

  // Fetch rates the first time a foreign currency is selected
  useEffect(() => {
    if (currency === "NGN" || rates || ratesError) return;
    let cancelled = false;
    fetch("/api/fx")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return;
        setRates(data.rates ?? {});
        setRatesUpdatedAt(data.updatedAt ?? null);
      })
      .catch(() => { if (!cancelled) setRatesError(true); });
    return () => { cancelled = true; };
  }, [currency, rates, ratesError]);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    try { window.localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }, []);

  const convert = useCallback(
    (ngn: number) => {
      if (currency === "NGN") return ngn;
      const rate = rates?.[currency];
      return typeof rate === "number" ? ngn * rate : null;
    },
    [currency, rates]
  );

  return (
    <Ctx.Provider value={{ currency, setCurrency, convert, ratesUpdatedAt, ratesError }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCurrency(): CurrencyContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
