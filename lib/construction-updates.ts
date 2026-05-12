// ---------------------------------------------------------------------------
// Construction Updates — reads from /public/construction-updates.json
// ---------------------------------------------------------------------------
// Photos and metadata are managed via the admin page at /admin.
// After adding photos locally, commit and push to publish:
//   git add . && git commit -m "Add construction photos" && git push
// ---------------------------------------------------------------------------

import type { PropertyPhase } from "./property-data";

export interface ConstructionUpdate {
  id:           string;
  phase:        PropertyPhase;
  date:         string;
  caption:      string;
  imageUrl:     string;
  propertySlug: string;
}

/**
 * Fetch all construction updates from the static JSON file.
 * Runs in the browser — no API key needed.
 */
export async function fetchConstructionUpdates(): Promise<ConstructionUpdate[]> {
  try {
    const res = await fetch("/construction-updates.json", {
      cache: "no-store", // always get the latest after deployments
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Filter updates for a specific property and phase, newest first */
export function filterUpdates(
  updates: ConstructionUpdate[],
  propertySlug: string,
  phase: PropertyPhase
): ConstructionUpdate[] {
  return updates
    .filter(
      (u) =>
        (u.propertySlug === "all" || u.propertySlug === propertySlug) &&
        u.phase === phase
    )
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

/** Format YYYY-MM-DD to a readable date */
export function formatUpdateDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-NG", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
