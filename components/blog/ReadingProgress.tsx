"use client";

import { useEffect, useRef } from "react";

/**
 * ReadingProgress
 * ----
 * Hairline at the very top of the page that fills as you scroll the article.
 * Calibrated to the article element so it reflects reading progress, not
 * page-scroll progress (different concept — page includes nav, footer, etc).
 */
export default function ReadingProgress({ targetId }: { targetId: string }) {
  const fill = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const article = document.getElementById(targetId);
    if (!article) return;

    const update = () => {
      if (!fill.current || !article) return;
      const rect = article.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / total));
      fill.current.style.transform = `scaleX(${progress})`;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetId]);

  return (
    <div className="fixed top-0 inset-x-0 z-[55] h-px bg-hairline">
      <div
        ref={fill}
        className="h-full bg-gold origin-left"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
