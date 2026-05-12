"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register plugins exactly once. Importing this module from any client
// component guarantees ScrollTrigger is available.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);

  // Refresh on font load — Fraunces shifts metrics and would mis-trigger
  // ScrollTriggers calculated against fallback fonts.
  if ("fonts" in document) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}

/**
 * Returns true if the user has prefers-reduced-motion: reduce set.
 * Components can use this to collapse animations to fade-only or skip
 * scroll-scrubbed parallax entirely.
 *
 * SSR-safe: returns false during server render (no window).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * gsap.matchMedia wrapper that runs different animation logic based on
 * the motion preference. Returns the gsap.MatchMedia instance which the
 * caller should clean up via .revert() inside gsap.context cleanup.
 *
 * Usage:
 *   const ctx = gsap.context(() => {
 *     motionMatch({
 *       full: () => { gsap.from(...) },
 *       reduced: () => { gsap.set(..., { opacity: 1 }) },
 *     });
 *   }, root);
 */
export function motionMatch({
  full,
  reduced,
}: {
  full: () => void;
  reduced?: () => void;
}) {
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", full);
  if (reduced) {
    mm.add("(prefers-reduced-motion: reduce)", reduced);
  }
  return mm;
}

export { gsap, ScrollTrigger };
