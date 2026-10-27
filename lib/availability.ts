// ---------------------------------------------------------------------------
// Availability, server-side read/write to /data/availability.json
// ---------------------------------------------------------------------------
// Edited from the admin page at /admin → Availability. Like the other admin
// data, changes are saved locally; commit and push to publish:
//   git add data/availability.json && git commit -m "Update availability" && git push
// ---------------------------------------------------------------------------
import "server-only";
import fs   from "fs";
import path from "path";
import type { AvailabilityData, PlotAvailability } from "./availability-types";
import { summarise } from "./availability-types";

const DATA_FILE = path.join(process.cwd(), "data", "availability.json");

export function readAvailability(): AvailabilityData {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    if (Array.isArray(data?.plots)) return data;
  } catch { /* fall through */ }
  return { updatedAt: "", plots: [] };
}

export function writeAvailability(data: AvailabilityData): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function getPlotAvailability(slug: string): PlotAvailability | undefined {
  return readAvailability().plots.find((p) => p.slug === slug);
}

/** Available count for a property, null when no unit data has been entered */
export function getAvailableCount(slug: string): number | null {
  const plot = getPlotAvailability(slug);
  if (!plot || plot.units.length === 0) return null;
  return summarise(plot.units).available;
}
