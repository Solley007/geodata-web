"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * NavigationProgress
 * ----
 * A 2px gold progress bar that appears at the top of the page during
 * route transitions. Critical UX feedback for slow connections — without
 * it, users on 3G mobile in Nigeria hit a link and have no idea anything
 * is happening for a second or two.
 *
 * Behavior:
 *   1. User clicks an internal link (same-origin) → bar appears, animates
 *      toward 90% on an ease curve (it never quite reaches 100% during
 *      load — that signals "still working")
 *   2. New pathname mounts (navigation complete) → bar snaps to 100%,
 *      fades out after a short hold
 *
 * Respects prefers-reduced-motion via the global CSS layer.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Detect clicks on internal links — start of a navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find the nearest anchor ancestor (Link renders as <a>)
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Only show progress for internal navigations
      // - hash links (#section) → no transition, skip
      // - external URLs (https://...) → handled by browser, skip
      // - mailto / tel → no navigation, skip
      // - target="_blank" → opens in new tab, current page doesn't change
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      // External URL guard
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        // Same path? No navigation, skip
        if (url.pathname === window.location.pathname) return;
      } catch {
        return;
      }

      // Modifier keys mean new tab / bypass — skip
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      setVisible(true);
      setProgress(0);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // When pathname changes, navigation has completed → finish + fade
  useEffect(() => {
    if (!visible) return;
    setProgress(100);
    const fadeTimer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
    return () => clearTimeout(fadeTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Animate toward 90% while waiting — "still working" signal
  useEffect(() => {
    if (!visible || progress >= 90) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        // Ease curve — moves fast at first, slows as it approaches 90%
        return p + (90 - p) * 0.08;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [visible, progress]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none"
      role="progressbar"
      aria-label="Page loading"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-gold shadow-[0_0_10px_rgba(201,169,97,0.6)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
