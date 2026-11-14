// Pure contract date helpers shared by the backend and the admin/partner UI.
// Contract dates are calendar days (YYYY-MM-DD) in Lagos time (UTC+1, no DST).

export const REMINDER_DAYS = [1, 7, 30] as const;
export const EXPIRING_WINDOW_DAYS = 30;

export type ContractStatus = "active" | "expiring" | "expired";

const DAY_MS = 86_400_000;
const LAGOS_OFFSET_MS = 3_600_000;

export function todayLagos(now: number = Date.now()): string {
  return new Date(now + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

export function isCalendarDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  // Clamp to month end (e.g. 31 Jan + 1 month → 28/29 Feb)
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function contractStatus(endDate: string, today: string = todayLagos()): ContractStatus {
  const left = daysBetween(today, endDate);
  if (left < 0) return "expired";
  if (left <= EXPIRING_WINDOW_DAYS) return "expiring";
  return "active";
}

/**
 * Which reminder tier applies for `daysLeft`, or null when none is due.
 * The smallest tier that covers daysLeft wins, so a contract created with 5 days left
 * gets the 7-day reminder once, not the 30-day one too.
 */
export function dueReminderTier(daysLeft: number, sent: readonly number[]): number | null {
  if (daysLeft < 0) return null;
  const tier = REMINDER_DAYS.find((d) => daysLeft <= d);
  if (tier === undefined || sent.includes(tier)) return null;
  return tier;
}

/** Tiers to mark as sent once `tier` goes out (every larger tier is now moot). */
export function tiersCoveredBy(tier: number): number[] {
  return REMINDER_DAYS.filter((d) => d >= tier);
}
