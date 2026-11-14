import { describe, expect, it } from "vitest";
import { convertNaira, effectiveRates, formatFx, invertRates, isStale, parseNairaFromText } from "./fxUtils.ts";

describe("parseNairaFromText", () => {
  it("reads amounts from hero slide tags", () => {
    expect(parseNairaFromText("🏠 4 Bedroom Blocks of Flats (250SQM), Amount: ₦130M")).toBe(130_000_000);
    expect(parseNairaFromText("Land from ₦1.2B")).toBe(1_200_000_000);
    expect(parseNairaFromText("Price ₦45,000,000")).toBe(45_000_000);
    expect(parseNairaFromText("From N8.5m")).toBe(8_500_000);
  });

  it("ignores text without a Naira amount", () => {
    expect(parseNairaFromText("Southern Bridge Estate")).toBeNull();
    expect(parseNairaFromText("4 Bedroom (250SQM)")).toBeNull();
  });
});

describe("effectiveRates", () => {
  const live = { USD: 1360, EUR: 1490, GBP: 1776 };

  it("uses the live rate unless the manual override is on and valid", () => {
    expect(effectiveRates(live, { USD: 1500 }, { USD: true })).toEqual({ USD: 1500, EUR: 1490, GBP: 1776 });
    expect(effectiveRates(live, { USD: 1500 }, { USD: false }).USD).toBe(1360);
    expect(effectiveRates(live, { USD: 0 }, { USD: true }).USD).toBe(1360);
  });

  it("falls back to manual-only rates when no live rates exist", () => {
    expect(effectiveRates(undefined, { GBP: 2000 }, { GBP: true })).toEqual({ GBP: 2000 });
    expect(effectiveRates(undefined, undefined, undefined)).toEqual({});
  });
});

describe("conversion and formatting", () => {
  it("converts and rounds to clean figures", () => {
    expect(convertNaira(150_000_000, 1360.54, true)).toBe(110_000);
    expect(convertNaira(150_000_000, 1360.54, false)).toBe(110_250);
    expect(convertNaira(2_000_000, 1360, true)).toBe(1_500);
  });

  it("formats compact amounts", () => {
    expect(formatFx(110_000, "USD")).toBe("$110,000");
    expect(formatFx(1_250_000, "GBP")).toBe("£1.25M");
    expect(formatFx(2_000_000, "EUR")).toBe("€2M");
  });

  it("inverts API rates (foreign per NGN) into NGN per unit", () => {
    expect(invertRates({ USD: 1 / 1360.54, EUR: 0, GBP: 1 / 1776.2 })).toEqual({ USD: 1360.54, GBP: 1776.2 });
  });

  it("flags rates older than 48 hours as stale", () => {
    const now = Date.parse("2026-10-24T12:00:00Z");
    expect(isStale("2026-10-23T12:00:00Z", now)).toBe(false);
    expect(isStale("2026-10-22T11:00:00Z", now)).toBe(true);
    expect(isStale(undefined, now)).toBe(true);
  });
});
