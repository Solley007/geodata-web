"use client";

import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";

// ─── Update these URLs with real profile/page links ───────────────
const SOCIALS = [
  {
    id: "livechat",
    label: "Chat with us",
    href: "https://wa.me/2347047620492?text=Hello%2C%20I%20would%20like%20to%20enquire%20about%20Southern%20Bridge%20City.",
    bg: "#C9A961",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <circle cx="9" cy="11" r="1" fill="white" stroke="none" />
        <circle cx="12" cy="11" r="1" fill="white" stroke="none" />
        <circle cx="15" cy="11" r="1" fill="white" stroke="none" />
      </svg>
    ),
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: "https://wa.me/2347047620492",
    bg: "#25D366",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" width="20" height="20" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.989.575 3.842 1.569 5.408L2 22l4.744-1.545A9.963 9.963 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
      </svg>
    ),
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://youtube.com/@geodataworldservices", // ← update with real channel
    bg: "#FF0000",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path fill="white" d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
        <polygon fill="#FF0000" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    href: "https://facebook.com/geodataworldservices", // ← update with real page
    bg: "#1877F2",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" width="20" height="20" aria-hidden>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://instagram.com/geodataworldservices", // ← update with real handle
    bg: "#E1306C",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
];

export default function FloatingActions() {
  const [open, setOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  // Show scroll-to-top after 400px scroll
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Close the panel when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("#floating-actions")) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  return (
    <div
      id="floating-actions"
      className="fixed bottom-6 right-4 md:right-6 z-40 flex flex-col items-center gap-3"
      role="complementary"
      aria-label="Quick links and actions"
    >

      {/* Social icons — fan upward when open */}
      <div className="flex flex-col items-center gap-2.5">
        {SOCIALS.map((s, i) => {
          const delay = open
            ? `${i * 50}ms`
            : `${(SOCIALS.length - 1 - i) * 40}ms`;
          return (
            <a
              key={s.id}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              title={s.label}
              style={{
                backgroundColor: s.bg,
                transitionDelay: delay,
              }}
              className={clsx(
                "flex items-center justify-center w-11 h-11 rounded-full shadow-lg",
                "transition-all duration-300 ease-out",
                "hover:scale-110 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-white",
                open
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-4 pointer-events-none"
              )}
            >
              {s.icon}
            </a>
          );
        })}
      </div>

      {/* Main toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close quick links" : "Open quick links"}
        aria-expanded={open}
        className={clsx(
          "flex items-center justify-center w-12 h-12 rounded-full shadow-lg",
          "bg-navy-900 dark:bg-bone text-bone dark:text-navy-950",
          "hover:bg-navy-800 dark:hover:bg-gold-soft",
          "transition-all duration-300 focus-visible:outline-2 focus-visible:outline-gold"
        )}
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
          className={clsx(
            "transition-transform duration-400",
            open ? "rotate-45" : "rotate-0"
          )}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className={clsx(
          "flex items-center justify-center w-11 h-11 rounded-full shadow-md",
          "bg-bone dark:bg-navy-800 border border-hairline dark:border-white/10",
          "text-navy-900 dark:text-bone",
          "hover:bg-bone-100 dark:hover:bg-navy-700 hover:shadow-lg",
          "transition-all duration-400 focus-visible:outline-2 focus-visible:outline-gold",
          showTop
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </button>

    </div>
  );
}
