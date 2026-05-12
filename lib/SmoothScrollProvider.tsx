"use client";

import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * SmoothScrollProvider
 * ----
 * Wires Lenis into the page and drives it from gsap.ticker so ScrollTrigger
 * stays perfectly in sync.
 *
 * Reduced-motion handling: if the user prefers reduced motion (OS-level
 * accessibility setting), Lenis is not initialized at all — the page uses
 * native browser scroll, which is more predictable and respects the
 * intent of the preference.
 */
export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Skip Lenis on touch/mobile devices — those use native scroll which is
    // faster and more reliable on mobile. Lenis adds value on desktop (inertia,
    // smooth deceleration) but causes layout interference on mobile viewports.
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

    if (prefersReduced || isTouchDevice) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
