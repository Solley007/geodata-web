/**
 * Shared types, constants, and hook used by all three hero styles.
 */
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

export type Slide = {
  mediaType: "image" | "video";
  mediaUrl: string | null | undefined;
  tag: string;
  headline: string;
  subheadline: string;
  body: string;
};

export const FALLBACK_SLIDES: Slide[] = [
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1920",
    tag: "Luxury Residences",
    headline: "Unlock Your Future",
    subheadline: "One Key. Endless Opportunities.",
    body: "Discover premium estates, luxury homes, and strategic investment properties across Nigeria's finest locations.",
  },
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1920",
    tag: "Commercial Properties",
    headline: "Build Your Empire",
    subheadline: "Prime Commercial Real Estate.",
    body: "Strategic commercial spaces, office parks, and industrial properties engineered for your business success.",
  },
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1920",
    tag: "Premium Estates",
    headline: "The Best Investment",
    subheadline: "Is Taking Action Today.",
    body: "Fully serviced estates with world-class infrastructure, security, and lifestyle amenities.",
  },
];

export const PROPERTY_TYPES = ["All Types", "Residential", "Commercial", "Land", "Luxury"];
export const STATES = ["Select State", "Abuja", "Lagos", "Rivers", "Enugu", "Delta", "Ogun"];

export type HeroStyle = "A" | "B" | "C";

/** Reads whether the ReadyMix hero button should be shown */
export function useReadyMixButtonVisible(): boolean {
  const raw = useQuery(api.cms.getSiteSettings, { key: "readymix_button_visible" });
  // Default true — show by default until admin turns it off
  if (raw === undefined || raw === null) return true;
  return raw === "true";
}

/** Reads the hero_style CMS key and returns A, B, or C */
export function useHeroStyle(): HeroStyle {
  const raw = useQuery(api.cms.getSiteSettings, { key: "hero_style" });
  if (raw === "B" || raw === "C") return raw;
  return "A";
}

/**
 * Reads and normalises the active hero slides.
 * Returns null while still loading so the caller can show a skeleton.
 * Only falls back to FALLBACK_SLIDES when the DB is confirmed empty.
 */
export function useHeroSlides(): Slide[] | null {
  const dbSlides = useQuery(api.cms.listActiveHeroSlides);
  // Still loading — return null so caller suppresses render
  if (dbSlides === undefined) return null;
  // DB has slides — use them
  if (dbSlides.length > 0) {
    return dbSlides.map((s) => ({
      mediaType: s.mediaType,
      mediaUrl: s.mediaUrl,
      tag: s.tag,
      headline: s.headline,
      subheadline: s.subheadline,
      body: s.body,
    }));
  }
  // DB is empty — fall back to defaults
  return FALLBACK_SLIDES;
}
