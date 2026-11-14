import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api.js";

export type TrackProject = FunctionReturnType<typeof api.trackRecord.listPublic>[number];
export type TrackCategory = TrackProject["category"];

export const CATEGORY_LABEL: Record<TrackCategory, string> = {
  real_estate: "Real Estate",
  road_infrastructure: "Roads & Infrastructure",
};

// Soft per-category label colors (work in light and dark)
export const CATEGORY_STYLE: Record<TrackCategory, string> = {
  real_estate: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  road_infrastructure: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
};

// Filters stay hidden until there are enough projects for them to be useful
export const FILTER_THRESHOLD = 8;
// Number of cards shown on landing pages before "View all"
export const PREVIEW_COUNT = 6;

// Converts a pasted YouTube/Vimeo link into an embeddable player URL (null if unsupported)
export function getEmbedUrl(link: string | undefined): string | null {
  if (!link) return null;
  try {
    const u = new URL(link.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/);
      return m ? `https://www.youtube.com/embed/${m[1]}` : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const m = u.pathname.match(/(\d+)/);
      return m ? `https://player.vimeo.com/video/${m[1]}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

// Only the figures that apply to the project's category, and only when filled in
export function getFacts(p: TrackProject): { label: string; value: string }[] {
  const facts: { label: string; value: string | undefined }[] =
    p.category === "real_estate"
      ? [
          { label: "Units built", value: p.unitsBuilt?.toLocaleString() },
          { label: "Land size", value: p.landSize },
          { label: "Families housed", value: p.familiesHoused?.toLocaleString() },
        ]
      : [
          { label: "Road length", value: p.roadLengthKm !== undefined ? `${p.roadLengthKm} km` : undefined },
          { label: "Road type", value: p.roadType },
          { label: "Client", value: p.client },
        ];
  return facts.filter((f): f is { label: string; value: string } => !!f.value);
}
