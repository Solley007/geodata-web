import { Building2, HardHat, Factory, Mountain, Truck, Cpu, Globe2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Maps a business slug to a representative icon. Businesses are differentiated
// by imagery/icon only — never by introducing a new color palette (per brand rules).
const BUSINESS_ICONS: Record<string, LucideIcon> = {
  "real-estate": Building2,
  infrastructure: HardHat,
  "concrete-batching": Factory,
  "quarry-aggregates": Mountain,
  "equipment-leasing": Truck,
  "technology-digital": Cpu,
};

export function getBusinessIcon(slug: string): LucideIcon {
  return BUSINESS_ICONS[slug] ?? Globe2;
}

// Slugs whose destination page is actually built and safe to navigate to.
// Everything else routes to a page that doesn't exist yet (built in a later
// milestone), so clicking shows a "coming soon" toast instead of a 404.
// Update this set as each dedicated business page ships.
export const IMPLEMENTED_BUSINESS_ROUTES = new Set([
  "real-estate",
  "concrete-batching",
  "infrastructure",
  "quarry-aggregates",
  "equipment-leasing",
  "technology-digital",
]);
