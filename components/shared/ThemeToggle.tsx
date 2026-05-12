"use client";

import { useTheme } from "@/lib/ThemeProvider";
import clsx from "clsx";

interface Props {
  className?: string;
}

export default function ThemeToggle({ className }: Props) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={clsx(
        "relative flex items-center justify-center w-9 h-9 rounded-full transition-colors duration-300",
        "hover:bg-navy-900/10 dark:hover:bg-bone/10",
        "focus-visible:outline-2 focus-visible:outline-gold",
        className
      )}
    >
      {/* Sun — visible in dark mode (click to go light) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
        className={clsx(
          "absolute transition-all duration-500",
          isDark
            ? "opacity-100 scale-100 rotate-0"
            : "opacity-0 scale-75 rotate-90"
        )}
        aria-hidden
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>

      {/* Moon — visible in light mode (click to go dark) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="17" height="17" viewBox="0 0 24 24"
        fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
        className={clsx(
          "absolute transition-all duration-500",
          isDark
            ? "opacity-0 scale-75 -rotate-90"
            : "opacity-100 scale-100 rotate-0"
        )}
        aria-hidden
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
