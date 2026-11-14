/**
 * HeroSlider — reads the hero_style CMS key and renders the correct style.
 * Renders a dark placeholder while slides are loading to prevent the
 * fallback/hardcoded images from flashing on page load.
 * Style A: Cinematic Fade (default)
 * Style B: Split-Screen Editorial
 * Style C: Vertical Card Stack
 */
import { useHeroStyle, useHeroSlides } from "./hero/shared.ts";
import HeroStyleA from "./hero/HeroStyleA.tsx";
import HeroStyleB from "./hero/HeroStyleB.tsx";
import HeroStyleC from "./hero/HeroStyleC.tsx";

// Dark placeholder shown while slides are fetching — same height as hero
function HeroSkeleton() {
  return (
    <div className="relative h-[88vh] min-h-[580px] max-h-[900px] bg-[#0c1420] flex items-center justify-center overflow-hidden">
      {/* Subtle animated shimmer to show activity */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#0b1929] to-[#06101a] animate-pulse" />
    </div>
  );
}

export default function HeroSlider() {
  const style = useHeroStyle();
  const slides = useHeroSlides();

  // Still fetching from DB — show dark placeholder, not the fallback images
  if (slides === null) return <HeroSkeleton />;

  if (style === "B") return <HeroStyleB slides={slides} />;
  if (style === "C") return <HeroStyleC slides={slides} />;
  return <HeroStyleA slides={slides} />;
}
