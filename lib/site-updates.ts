// ---------------------------------------------------------------------------
// Site Updates — server-side read/write to /public/site-updates.json
// ---------------------------------------------------------------------------
import "server-only";
import fs   from "fs";
import path from "path";
import type { SiteUpdate } from "./site-updates-types";

const META_FILE = path.join(process.cwd(), "public", "site-updates.json");

export function readSiteUpdates(): SiteUpdate[] {
  try {
    const raw = fs.readFileSync(META_FILE, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function writeSiteUpdates(updates: SiteUpdate[]): void {
  fs.mkdirSync(path.dirname(META_FILE), { recursive: true });
  fs.writeFileSync(META_FILE, JSON.stringify(updates, null, 2), "utf-8");
}

/** Sort newest first */
export function sortByDate(updates: SiteUpdate[]): SiteUpdate[] {
  return [...updates].sort((a, b) => (a.date > b.date ? -1 : 1));
}
