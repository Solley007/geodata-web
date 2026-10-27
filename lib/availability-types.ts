// ---------------------------------------------------------------------------
// Unit availability, Southern Bridge City
// Shared by the public site plan (client) and the admin console.
// Data lives in /data/availability.json, edited from /admin → Availability.
// ---------------------------------------------------------------------------

export type UnitStatus = "available" | "reserved" | "sold";

export const UNIT_STATUSES: UnitStatus[] = ["available", "reserved", "sold"];

export interface UnitRecord {
  id:     string;       // e.g. "7266-014"
  status: UnitStatus;
}

export interface PlotAvailability {
  slug:  string;        // property slug in lib/property-data.ts
  units: UnitRecord[];
}

export interface AvailabilityData {
  updatedAt:    string;   // ISO date
  /** True until someone saves from the admin, shows an "indicative" badge */
  placeholder?: boolean;
  plots:        PlotAvailability[];
}

export interface AvailabilitySummary {
  available: number;
  reserved:  number;
  sold:      number;
  total:     number;
}

export function summarise(units: UnitRecord[]): AvailabilitySummary {
  const s = { available: 0, reserved: 0, sold: 0, total: units.length };
  for (const u of units) s[u.status]++;
  return s;
}

/** "Plot 7266, Southern Bridge City, Idu, Abuja" → "7266" */
export function plotNumber(address: string): string {
  return address.match(/Plot\s+(\d+)/i)?.[1] ?? "";
}

/** Next unit id for a plot, e.g. "7266-015" */
export function nextUnitId(plotNo: string, units: UnitRecord[]): string {
  return `${plotNo}-${String(units.length + 1).padStart(3, "0")}`;
}
