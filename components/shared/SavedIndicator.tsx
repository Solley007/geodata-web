"use client";

import { useState } from "react";
import clsx from "clsx";
import { useSavedResidences } from "@/lib/SavedResidencesProvider";
import SavedDrawer from "./SavedDrawer";

interface Props {
  /** Use 'light' on transparent dark backgrounds (top of hero); 'dark' once scrolled into light bg */
  variant?: "light" | "dark" | "auto";
  /** When 'auto', pass isScrolled state from parent so the indicator follows the navbar theme */
  isScrolled?: boolean;
}

export default function SavedIndicator({ variant = "auto", isScrolled = false }: Props) {
  const { count, hydrated } = useSavedResidences();
  const [open, setOpen] = useState(false);

  // Color logic based on variant
  let textClass = "text-navy-900 dark:text-bone";
  if (variant === "light")       textClass = "text-bone";
  else if (variant === "dark")   textClass = "text-navy-900 dark:text-bone";
  else if (variant === "auto")   textClass = isScrolled ? "text-navy-900 dark:text-bone" : "text-bone";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Saved residences${count > 0 ? ` (${count})` : ""}`}
        className={clsx(
          "relative inline-flex items-center justify-center h-9 w-9 transition-colors duration-300",
          textClass,
          "hover:text-accent-soft"
        )}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill={hydrated && count > 0 ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={hydrated && count > 0 ? 0 : 1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={clsx(
            "transition-all duration-300",
            hydrated && count > 0 && "text-accent-dark dark:text-accent"
          )}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {/* Count badge */}
        {hydrated && count > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center bg-accent-dark dark:bg-accent text-bone text-[10px] font-medium rounded-full leading-none"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      <SavedDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
