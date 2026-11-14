// Hero content for the World Corporate Directory page. Stored as JSON in the
// existing siteSettings table under HERO_SETTINGS_KEY and edited from
// Admin → World Corporate Directory. Defaults are used until an admin saves.
export const HERO_SETTINGS_KEY = "group_hero_content";

export type HeroContent = {
  badge: string;
  headingLine1: string;
  headingHighlight: string;
  headingRest: string;
  description: string;
  primaryButtonLabel: string;
  secondaryButtonLabel: string;
};

export const HERO_DEFAULTS: HeroContent = {
  badge: "Geodata Group",
  headingLine1: "One Group.",
  headingHighlight: "Six Businesses.",
  headingRest: "A Built Environment Ecosystem.",
  description:
    "From real estate development to infrastructure, materials, equipment and technology — Geodata Group brings together the businesses that build Nigeria's communities, under one shared standard of trust and delivery.",
  primaryButtonLabel: "Explore Our Businesses",
  secondaryButtonLabel: "About the Group",
};

export function parseHeroContent(raw: string | null | undefined): HeroContent {
  if (!raw) return HERO_DEFAULTS;
  try {
    const parsed = JSON.parse(raw) as Partial<HeroContent>;
    const merged: HeroContent = { ...HERO_DEFAULTS };
    for (const key of Object.keys(HERO_DEFAULTS) as (keyof HeroContent)[]) {
      const val = parsed[key];
      // Blank values fall back to defaults so the hero never renders empty
      if (typeof val === "string" && val.trim()) merged[key] = val;
    }
    return merged;
  } catch {
    return HERO_DEFAULTS;
  }
}
