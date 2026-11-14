import { v, type Infer } from "convex/values";

export const PARTNER_CATEGORIES = [
  "agency",
  "mortgage_finance",
  "construction",
  "diaspora_association",
  "legal_advisory",
  "other",
] as const;

export const partnerCategoryValidator = v.union(
  ...PARTNER_CATEGORIES.map((c) => v.literal(c)),
);

/** Showcase content a partner submits; reused for both the live and pending copy. */
export const partnerProfileContent = v.object({
  displayName: v.string(),
  tagline: v.optional(v.string()),
  description: v.optional(v.string()),
  website: v.optional(v.string()),
  country: v.optional(v.string()),
  category: partnerCategoryValidator,
  logoStorageId: v.optional(v.id("_storage")), // colour logo (light backgrounds)
  logoLightStorageId: v.optional(v.id("_storage")), // white/mono logo (dark backgrounds)
});

export type PartnerProfileContent = Infer<typeof partnerProfileContent>;
