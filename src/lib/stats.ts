export type StatSource = "manual" | "propertiesSold" | "estates" | "clients";
export type StatItem = { value: string; label: string; icon: string; source?: StatSource };
export type LiveStats = { propertiesSold: number; estates: number; clients: number };

export const STAT_SOURCE_LABELS: Record<StatSource, string> = {
  manual: "Typed in by hand",
  propertiesSold: "Properties and plots sold",
  estates: "Number of estates",
  clients: "Registered clients",
};

// Items saved before this feature have no source: the first three default to live counts
const DEFAULT_SOURCES: StatSource[] = ["propertiesSold", "estates", "clients"];

export function sourceOf(item: StatItem, index: number): StatSource {
  return item.source ?? DEFAULT_SOURCES[index] ?? "manual";
}

// In automatic mode, replace each live-linked stat's value with the real count
export function applyLiveStats(items: StatItem[], live: LiveStats | undefined): StatItem[] {
  if (!live) return items;
  return items.map((item, i) => {
    const source = sourceOf(item, i);
    if (source === "manual") return item;
    return { ...item, value: live[source].toLocaleString("en-NG") };
  });
}
