/**
 * Mortgage Affordability Quiz — calculation utilities
 *
 * Math:
 *   - MREIF: 9.75% fixed annual rate, 20-year tenure (240 months)
 *   - Comfort threshold: 40% of monthly take-home (aggressive but
 *     standard for Nigerian buyers who stretch for property)
 *   - Max loan from monthly budget = budget / amortisation factor
 *   - Max property price = max loan / (1 - deposit%)
 */

import { PROPERTIES } from "./properties-list";

export const MREIF = {
  annualRate: 0.0975,         // 9.75% fixed
  tenureMonths: 240,          // 20 years
  comfortThreshold: 0.40,     // 40% of take-home
  defaultDeposit: 0.20,       // 20%
  minDeposit: 0.10,           // MREIF minimum
  maxDeposit: 0.50,           // upper bound on slider
} as const;

// ─── Question option types ─────────────────────────────────────────────────
export const INCOME_BRACKETS = [
  { id: "500k-1m", label: "₦500K – ₦1M",   midpoint:   750_000 },
  { id: "1m-2m",   label: "₦1M – ₦2M",     midpoint: 1_500_000 },
  { id: "2m-4m",   label: "₦2M – ₦4M",     midpoint: 3_000_000 },
  { id: "4m+",     label: "₦4M and above", midpoint: 5_000_000 },
] as const;
export type IncomeBracketId = typeof INCOME_BRACKETS[number]["id"];

export const BEDROOM_OPTIONS = [
  { id: "4",    label: "4 bedrooms",   beds: 4 },
  { id: "5",    label: "5 bedrooms",   beds: 5 },
  { id: "6",    label: "6 bedrooms",   beds: 6 },
  { id: "open", label: "Open to options", beds: 0 }, // 0 = no filter
] as const;
export type BedroomOptionId = typeof BEDROOM_OPTIONS[number]["id"];

export const TIMELINE_OPTIONS = [
  { id: "6mo",    label: "Within 6 months",     sub: "Ready / finishing-stage homes" },
  { id: "12-18",  label: "12–18 months",        sub: "Off-plan with steady progress" },
  { id: "open",   label: "Value matters more",  sub: "Best value, flexible on timing" },
] as const;
export type TimelineId = typeof TIMELINE_OPTIONS[number]["id"];

export const APPROVAL_OPTIONS = [
  { id: "yes",  label: "Yes — pre-approved",      sub: "I have an MREIF letter or bank pre-approval" },
  { id: "no",   label: "Not yet — need guidance", sub: "I'd like help with the bank approval step" },
  { id: "cash", label: "Paying cash",             sub: "No mortgage needed" },
] as const;
export type ApprovalId = typeof APPROVAL_OPTIONS[number]["id"];

// ─── Core math ─────────────────────────────────────────────────────────────
/** Amortisation factor — multiply by loan to get monthly payment */
function amortisationFactor(annualRate = MREIF.annualRate, months = MREIF.tenureMonths): number {
  const r = annualRate / 12;
  return (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/** Monthly mortgage payment for a given loan amount */
export function monthlyPayment(loanAmount: number): number {
  return loanAmount * amortisationFactor();
}

/** Max loan a buyer can carry given their monthly budget */
export function maxLoanFromBudget(monthlyBudget: number): number {
  return monthlyBudget / amortisationFactor();
}

/** Headline number: max property price affordable */
export function maxPropertyPrice(monthlyIncome: number, depositPct: number = MREIF.defaultDeposit): number {
  const budget = monthlyIncome * MREIF.comfortThreshold;
  const maxLoan = maxLoanFromBudget(budget);
  return maxLoan / (1 - depositPct);
}

// ─── Property matching ─────────────────────────────────────────────────────
export interface QuizAnswers {
  income: IncomeBracketId;
  bedrooms: BedroomOptionId;
  timeline: TimelineId;
  approval: ApprovalId;
  depositPct: number; // 0.10 to 0.50
}

export interface QuizResult {
  monthlyIncome: number;
  monthlyBudget: number;
  maxPropertyPrice: number;
  matches: typeof PROPERTIES;
  primaryMatch: typeof PROPERTIES[number] | null;
  monthlyPaymentForPrimary: number;
  affordabilityRatio: number; // payment / income, e.g., 0.38
  fallback: boolean; // true if no exact match — showing closest alternatives
}

export function runQuiz(answers: QuizAnswers): QuizResult {
  const bracket = INCOME_BRACKETS.find(b => b.id === answers.income)!;
  const monthlyIncome = bracket.midpoint;
  const monthlyBudget = monthlyIncome * MREIF.comfortThreshold;
  const maxPrice = maxPropertyPrice(monthlyIncome, answers.depositPct);

  // Filter inventory
  const bedFilter = BEDROOM_OPTIONS.find(b => b.id === answers.bedrooms)!.beds;
  const onlyAvailable = PROPERTIES.filter(p => p.available > 0 && p.price > 0);

  // Try to find matches within budget + bedroom preference
  let candidates = onlyAvailable.filter(p => {
    if (p.price > maxPrice) return false;
    if (bedFilter > 0 && p.beds !== bedFilter) return false;
    return true;
  });

  let fallback = false;
  // No match? Loosen the bedroom constraint
  if (candidates.length === 0 && bedFilter > 0) {
    candidates = onlyAvailable.filter(p => p.price <= maxPrice);
    fallback = candidates.length > 0;
  }
  // Still no match? Show the cheapest properties as fallback
  if (candidates.length === 0) {
    candidates = [...onlyAvailable].sort((a, b) => a.price - b.price).slice(0, 2);
    fallback = true;
  }

  // Sort by best match: closest to (but not exceeding) max budget
  candidates.sort((a, b) => b.price - a.price);
  const matches = candidates.slice(0, 3);
  const primaryMatch = matches[0] ?? null;
  const monthlyPaymentForPrimary = primaryMatch
    ? monthlyPayment(primaryMatch.price * (1 - answers.depositPct))
    : 0;

  return {
    monthlyIncome,
    monthlyBudget,
    maxPropertyPrice: maxPrice,
    matches,
    primaryMatch,
    monthlyPaymentForPrimary,
    affordabilityRatio: primaryMatch ? monthlyPaymentForPrimary / monthlyIncome : 0,
    fallback,
  };
}

// ─── Display helpers ───────────────────────────────────────────────────────
export function formatNaira(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `₦${m.toFixed(m >= 10 ? 0 : 1)}M`;
  }
  if (amount >= 1_000) {
    return `₦${Math.round(amount / 1_000)}K`;
  }
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function formatNairaFull(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}
