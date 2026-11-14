// Stages shown on building types until the work-stage checklist replaces them
export const BUILDING_STAGES = ["Not started", "Foundation", "Structure", "Roofing", "Finishing", "Delivered"] as const;

export const STAGE_STYLE: Record<string, string> = {
  "Not started": "bg-muted text-muted-foreground",
  Foundation: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  Structure: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  Roofing: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  Finishing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  Delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};
