import { describe, expect, it } from "vitest";
import { computeFulfilmentPercent, eligibleQuantityForAllocation } from "./bulkAcquisitions.ts";
import type { Doc } from "../_generated/dataModel.d.ts";

// ══════════════════════════════════════════════════════════════════════════
// Regression coverage for the two pure functions that drive the
// Institutional / Bulk Acquisition Management dashboard widgets, the
// acquisition register, and allocation-eligibility gating. These are
// mission-critical (money + inventory decisions), so every branch of each
// rule is covered here rather than only exercised indirectly through UI.
// ══════════════════════════════════════════════════════════════════════════

function makeLineItem(overrides: Partial<Doc<"corporateOpportunityLineItems">> = {}): Doc<"corporateOpportunityLineItems"> {
  return {
    _id: "li1" as Doc<"corporateOpportunityLineItems">["_id"],
    _creationTime: 0,
    opportunityId: "opp1" as Doc<"corporateOpportunityLineItems">["opportunityId"],
    quantityRequired: 0,
    quantityEoi: 0,
    quantityProposed: 0,
    quantityNegotiated: 0,
    quantityCommitted: 0,
    quantityPaid: 0,
    quantityAllocated: 0,
    ...overrides,
  } as Doc<"corporateOpportunityLineItems">;
}

function makeAcquisition(overrides: Partial<Doc<"corporateBulkAcquisitions">> = {}): Doc<"corporateBulkAcquisitions"> {
  return {
    _id: "acq1" as Doc<"corporateBulkAcquisitions">["_id"],
    _creationTime: 0,
    acquisitionRef: "GWS-CBAQ-0001",
    organisationId: "org1" as Doc<"corporateBulkAcquisitions">["organisationId"],
    opportunityId: "opp1" as Doc<"corporateBulkAcquisitions">["opportunityId"],
    name: "Test Acquisition",
    statusKey: "draft",
    ...overrides,
  } as Doc<"corporateBulkAcquisitions">;
}

describe("computeFulfilmentPercent", () => {
  it("returns 0 when there is no required or committed quantity", () => {
    expect(computeFulfilmentPercent(makeAcquisition())).toBe(0);
  });

  it("returns 0 when nothing has been paid or allocated yet", () => {
    const acq = makeAcquisition({ requiredQuantity: 100, committedQuantity: 100, paidQuantity: 0, allocatedQuantity: 0 });
    expect(computeFulfilmentPercent(acq)).toBe(0);
  });

  it("averages payment and allocation progress against the required quantity", () => {
    const acq = makeAcquisition({ requiredQuantity: 100, committedQuantity: 100, paidQuantity: 50, allocatedQuantity: 0 });
    // paid 50% + allocated 0% averaged = 25%
    expect(computeFulfilmentPercent(acq)).toBe(25);
  });

  it("returns 100 once fully paid and fully allocated", () => {
    const acq = makeAcquisition({ requiredQuantity: 100, committedQuantity: 100, paidQuantity: 100, allocatedQuantity: 100 });
    expect(computeFulfilmentPercent(acq)).toBe(100);
  });

  it("falls back to committedQuantity as the denominator when nothing was formally required", () => {
    const acq = makeAcquisition({ requiredQuantity: 0, committedQuantity: 50, paidQuantity: 50, allocatedQuantity: 25 });
    // paid 100% + allocated 50% averaged = 75%
    expect(computeFulfilmentPercent(acq)).toBe(75);
  });

  it("never exceeds 100 even if paid/allocated quantities overshoot the denominator", () => {
    const acq = makeAcquisition({ requiredQuantity: 10, committedQuantity: 10, paidQuantity: 999, allocatedQuantity: 999 });
    expect(computeFulfilmentPercent(acq)).toBe(100);
  });
});

describe("eligibleQuantityForAllocation", () => {
  it("full_payment: returns 0 units eligible until every committed unit is paid for", () => {
    const li = makeLineItem({ quantityCommitted: 10, quantityPaid: 5 });
    const acq = makeAcquisition({ allocationEligibilityRule: "full_payment" });
    expect(eligibleQuantityForAllocation(li, acq)).toBe(0);
  });

  it("full_payment: returns the full committed quantity once fully paid", () => {
    const li = makeLineItem({ quantityCommitted: 10, quantityPaid: 10 });
    const acq = makeAcquisition({ allocationEligibilityRule: "full_payment" });
    expect(eligibleQuantityForAllocation(li, acq)).toBe(10);
  });

  it("defaults to full_payment when no rule is configured", () => {
    const li = makeLineItem({ quantityCommitted: 10, quantityPaid: 10 });
    const acq = makeAcquisition({ allocationEligibilityRule: undefined });
    expect(eligibleQuantityForAllocation(li, acq)).toBe(10);
  });

  it("min_percentage: returns 0 below the configured payment threshold", () => {
    const li = makeLineItem({ quantityCommitted: 10, quantityPaid: 4 }); // 40% paid
    const acq = makeAcquisition({ allocationEligibilityRule: "min_percentage", allocationEligibilityPercent: 50 });
    expect(eligibleQuantityForAllocation(li, acq)).toBe(0);
  });

  it("min_percentage: returns the full committed quantity once the threshold is met", () => {
    const li = makeLineItem({ quantityCommitted: 10, quantityPaid: 5 }); // 50% paid
    const acq = makeAcquisition({ allocationEligibilityRule: "min_percentage", allocationEligibilityPercent: 50 });
    expect(eligibleQuantityForAllocation(li, acq)).toBe(10);
  });

  it("min_percentage: treats zero committed quantity as zero eligible, never divides by zero", () => {
    const li = makeLineItem({ quantityCommitted: 0, quantityPaid: 0 });
    const acq = makeAcquisition({ allocationEligibilityRule: "min_percentage", allocationEligibilityPercent: 50 });
    expect(eligibleQuantityForAllocation(li, acq)).toBe(0);
  });

  it("management_exception_only: returns the full committed quantity regardless of payment", () => {
    const li = makeLineItem({ quantityCommitted: 10, quantityPaid: 0 });
    const acq = makeAcquisition({ allocationEligibilityRule: "management_exception_only" });
    expect(eligibleQuantityForAllocation(li, acq)).toBe(10);
  });
});
