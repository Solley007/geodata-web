"use client";

import { useLayoutEffect, useRef, useState, useEffect } from "react";
import clsx from "clsx";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useActiveSection } from "@/lib/ActiveSectionContext";
import { PROPERTY_SECTIONS } from "@/lib/property-data";

interface Props {
  property: { title: string; pricing: { from: string } };
}

/**
 * StickySubNav (with mobile section drawer)
 * ----
 * Activates once the user scrolls past the property hero. On desktop, all
 * section anchors show inline. On mobile, a "Sections" button opens a small
 * sheet listing the same anchors.
 */
export default function StickySubNav({ property }: Props) {
  const [pinned, setPinned] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { activeId } = useActiveSection();

  useLayoutEffect(() => {
    if (!ref.current) return;
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: "top top",
      onEnter: () => setPinned(true),
      onLeaveBack: () => setPinned(false),
    });
    return () => trigger.kill();
  }, []);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  const handleJump = (id: string) => {
    setSheetOpen(false);
    const target = document.getElementById(id);
    if (!target) return;
    const navHeight = 72;
    const targetY = target.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  // Find the active label for mobile button display
  const activeLabel =
    PROPERTY_SECTIONS.find((s) => s.id === activeId)?.label ?? "Sections";

  return (
    <>
      <div ref={ref} className="relative">
        <div className="h-px" />

        <nav
          className={clsx(
            "fixed inset-x-0 top-0 z-[60] transition-all duration-500 ease-editorial",
            pinned
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "-translate-y-full opacity-0 pointer-events-none"
          )}
        >
          <div className="bg-bone/85 backdrop-blur-xl border-b border-hairline dark:border-white/10">
            <div className="container-editorial flex h-[72px] items-center justify-between gap-4">
              {/* Property identity */}
              <div className="flex items-baseline gap-4 min-w-0">
                <p className="font-display text-lg text-navy-900 dark:text-bone/90 truncate">
                  {property.title}
                </p>
                <p className="hidden md:block text-[11px] uppercase tracking-eyebrow text-ink-faint dark:text-bone/40 whitespace-nowrap">
                  From {property.pricing.from}
                </p>
              </div>

              {/* Desktop section links */}
              <ul className="hidden lg:flex items-center gap-8">
                {PROPERTY_SECTIONS.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => handleJump(s.id)}
                      className={clsx(
                        "relative py-1 text-sm font-medium transition-colors duration-300",
                        activeId === s.id
                          ? "text-navy-900 dark:text-bone/90"
                          : "text-ink-muted dark:text-bone/60 hover:text-navy-900 dark:text-bone/90"
                      )}
                    >
                      {s.label}
                      <span
                        className={clsx(
                          "absolute -bottom-0.5 left-0 right-0 h-px bg-gold transition-all duration-400 ease-editorial",
                          activeId === s.id ? "scale-x-100" : "scale-x-0"
                        )}
                        style={{ transformOrigin: "left center" }}
                      />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-3">
                {/* Mobile sections trigger — shows current section name */}
                <button
                  onClick={() => setSheetOpen(true)}
                  className="lg:hidden inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-eyebrow font-medium text-navy-900 dark:text-bone/90 border border-hairline dark:border-white/10 hover:border-navy-900 dark:border-white/20 transition-colors"
                >
                  {activeLabel}
                  <span className="text-base leading-none">↓</span>
                </button>

                {/* Enquire CTA */}
                <button
                  onClick={() => handleJump("enquire")}
                  className="inline-flex items-center gap-2 bg-navy-900 px-5 py-2.5 text-xs uppercase tracking-eyebrow font-medium text-bone hover:bg-navy-800 transition-colors duration-400"
                >
                  Enquire <span aria-hidden>→</span>
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile sections sheet */}
      <div
        onClick={() => setSheetOpen(false)}
        className={clsx(
          "fixed inset-0 z-[70] bg-navy-950/40 backdrop-blur-sm transition-opacity duration-400 lg:hidden",
          sheetOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />
      <div
        className={clsx(
          "fixed inset-x-0 bottom-0 z-[80] bg-bone dark:bg-navy-950 shadow-2xl rounded-t-lg transition-transform duration-500 ease-editorial lg:hidden",
          sheetOpen ? "translate-y-0" : "translate-y-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 pt-4 pb-8">
          <div className="flex justify-center mb-2">
            <span className="block w-12 h-1 bg-hairline rounded-full" />
          </div>
          <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6 text-center">Jump to section</p>
          <ul className="space-y-1">
            {PROPERTY_SECTIONS.map((s, i) => (
              <li key={s.id}>
                <button
                  onClick={() => handleJump(s.id)}
                  className="w-full flex items-baseline gap-4 py-4 border-b border-hairline dark:border-white/10 last:border-b-0 text-left"
                >
                  <span
                    className={clsx(
                      "font-display text-sm tabular-nums",
                      activeId === s.id ? "text-gold-dark" : "text-ink-faint dark:text-bone/40"
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={clsx(
                      "font-display text-2xl",
                      activeId === s.id ? "text-navy-950 dark:text-bone" : "text-ink-muted dark:text-bone/60"
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
