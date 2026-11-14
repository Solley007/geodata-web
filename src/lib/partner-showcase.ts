import type { PartnerProfileContent } from "@/convex/schema/partnerProfile.ts";

export type PartnerCategory = PartnerProfileContent["category"];

export const PARTNER_CATEGORY_LABELS: Record<PartnerCategory, string> = {
  agency: "Real Estate Agency",
  mortgage_finance: "Mortgage & Finance",
  construction: "Construction",
  diaspora_association: "Diaspora Association",
  legal_advisory: "Legal & Advisory",
  other: "Other",
};

export const PARTNER_CATEGORY_OPTIONS = Object.entries(PARTNER_CATEGORY_LABELS).map(
  ([value, label]) => ({ value: value as PartnerCategory, label }),
);

/** Profile as returned by the backend (content plus resolved logo URLs). */
export type PresentedProfileContent = PartnerProfileContent & {
  logoUrl: string | null;
  logoLightUrl: string | null;
};

export const LOGO_ACCEPT = "image/png,image/svg+xml,image/webp";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
