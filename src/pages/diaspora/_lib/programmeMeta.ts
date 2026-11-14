import type { Doc } from "@/convex/_generated/dataModel.js";
import { Home, TrendingUp, HardHat, Handshake, Building2, HelpCircle, type LucideIcon } from "lucide-react";

/**
 * Frontend-only display metadata (icon/gradient) for the five fixed Diaspora
 * programmes plus the "Not Sure" entry option. Never a source of truth for
 * enabled/visible state — that always comes from `diasporaProgrammes` via
 * the backend. Shared by the hub, the Opportunity Finder, and the five
 * programme pages so icon/colour choices never drift between them.
 */

export type ProgrammeKey = Doc<"diasporaProgrammes">["key"];
export type ObjectiveKey = ProgrammeKey | "not_sure";

type ProgrammeVisual = {
  icon: LucideIcon;
  gradient: string; // tailwind gradient classes
  accent: string; // tailwind text/border colour
};

export const PROGRAMME_VISUALS: Record<ProgrammeKey, ProgrammeVisual> = {
  own: { icon: Home, gradient: "from-emerald-500 to-emerald-700", accent: "text-emerald-600" },
  invest: { icon: TrendingUp, gradient: "from-amber-500 to-amber-700", accent: "text-amber-600" },
  partner: { icon: HardHat, gradient: "from-sky-500 to-sky-700", accent: "text-sky-600" },
  refer: { icon: Handshake, gradient: "from-violet-500 to-violet-700", accent: "text-violet-600" },
  corporate: { icon: Building2, gradient: "from-rose-500 to-rose-700", accent: "text-rose-600" },
};

export const NOT_SURE_VISUAL: ProgrammeVisual = { icon: HelpCircle, gradient: "from-gray-500 to-gray-700", accent: "text-gray-500" };

export function programmeRoute(key: ProgrammeKey): string {
  return `/diaspora/${key}`;
}
