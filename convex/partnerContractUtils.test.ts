import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  contractStatus,
  daysBetween,
  dueReminderTier,
  tiersCoveredBy,
  todayLagos,
} from "./partnerContractUtils.ts";

describe("partner contract dates", () => {
  it("uses Lagos (UTC+1) for today", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Lagos
    expect(todayLagos(Date.parse("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });

  it("adds days and months, clamping month ends", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-10-24", 12)).toBe("2027-10-24");
  });

  it("classifies status around the 30-day window and end date", () => {
    expect(contractStatus("2026-12-31", "2026-10-24")).toBe("active");
    expect(contractStatus("2026-11-23", "2026-10-24")).toBe("expiring"); // exactly 30 days
    expect(contractStatus("2026-10-24", "2026-10-24")).toBe("expiring"); // ends today
    expect(contractStatus("2026-10-23", "2026-10-24")).toBe("expired");
    expect(daysBetween("2026-10-24", "2026-10-20")).toBe(-4);
  });
});

describe("expiry reminders", () => {
  it("sends each tier once, smallest applicable tier first", () => {
    expect(dueReminderTier(30, [])).toBe(30);
    expect(dueReminderTier(25, [30])).toBeNull();
    expect(dueReminderTier(7, [30])).toBe(7);
    expect(dueReminderTier(1, [30, 7])).toBe(1);
    expect(dueReminderTier(0, [30, 7, 1])).toBeNull();
    expect(dueReminderTier(31, [])).toBeNull();
    expect(dueReminderTier(-1, [])).toBeNull();
  });

  it("does not send stale larger reminders for a short contract", () => {
    // Created with 5 days left: only the 7-day reminder, and 30 is marked as moot
    expect(dueReminderTier(5, [])).toBe(7);
    expect(tiersCoveredBy(7)).toEqual([7, 30]);
  });
});
