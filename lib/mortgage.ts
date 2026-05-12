// ---------------------------------------------------------------------------
// MREIF Mortgage Calculator
// ---------------------------------------------------------------------------
// IMPORTANT — VERIFY WITH ARM INVESTMENT MANAGERS BEFORE LAUNCH
//
// Current MREIF parameters used here:
//   - Interest rate: 9.75% fixed (annual)
//   - Maximum tenor: 20 years (240 months)
//   - Minimum equity: 10% of property value
//
// Assumptions baked in that may need adjustment:
//   - No loan size cap (some mortgage programmes cap at ₦50M; verify)
//   - No setup fees, stamp duty, or insurance folded into the calculation
//   - Single flat rate regardless of buyer income band
//
// Adjust constants below once you have authoritative figures from ARM.
// ---------------------------------------------------------------------------

export const MREIF = {
  rate: 0.0975, // 9.75% annual
  maxTenorYears: 20,
  minEquityPercent: 10,
} as const;

export interface MortgageInput {
  propertyPrice: number;
  equityPercent: number;
  tenorYears: number;
}

export interface MortgageOutput {
  loanAmount: number;
  equityAmount: number;
  monthlyRepayment: number;
  totalRepayment: number;
  totalInterest: number;
  affordable: boolean; // true if equity is at or above MREIF minimum
}

/**
 * Standard amortization formula:
 *   M = P * (r(1+r)^n) / ((1+r)^n - 1)
 *
 * P = principal (loan amount)
 * r = monthly interest rate (annual rate / 12)
 * n = number of payments (tenor years × 12)
 */
export function calculateMortgage(input: MortgageInput): MortgageOutput {
  const { propertyPrice, equityPercent, tenorYears } = input;

  const equityAmount = propertyPrice * (equityPercent / 100);
  const loanAmount = propertyPrice - equityAmount;

  const monthlyRate = MREIF.rate / 12;
  const numPayments = tenorYears * 12;

  // Edge case — zero loan, zero payment
  if (loanAmount <= 0 || numPayments <= 0) {
    return {
      loanAmount: 0,
      equityAmount,
      monthlyRepayment: 0,
      totalRepayment: 0,
      totalInterest: 0,
      affordable: equityPercent >= MREIF.minEquityPercent,
    };
  }

  const factor = Math.pow(1 + monthlyRate, numPayments);
  const monthlyRepayment = (loanAmount * (monthlyRate * factor)) / (factor - 1);
  const totalRepayment = monthlyRepayment * numPayments;
  const totalInterest = totalRepayment - loanAmount;

  return {
    loanAmount,
    equityAmount,
    monthlyRepayment,
    totalRepayment,
    totalInterest,
    affordable: equityPercent >= MREIF.minEquityPercent,
  };
}

/** Format a number as Naira with thousand separators */
export function formatNaira(amount: number, options: { decimals?: number } = {}) {
  const { decimals = 0 } = options;
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
