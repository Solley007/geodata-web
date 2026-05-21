"use client";

import { useEffect } from "react";
import { getCalApi } from "@calcom/embed-react";
import clsx from "clsx";

interface Props {
  /** Cal.com event link, e.g., "geodata/sbc-viewing" */
  calLink: string;
  /** Button label */
  children?: React.ReactNode;
  /** Visual variant */
  variant?: "primary" | "secondary" | "ghost";
  /** Override className for fully custom styling */
  className?: string;
}

/**
 * BookViewingButton, single button that opens the Cal.com booking popup.
 * Drop anywhere a "Reserve a viewing" CTA is wanted.
 *
 * Example:
 *   <BookViewingButton calLink="geodata/sbc-viewing">Reserve a viewing</BookViewingButton>
 *   <BookViewingButton calLink="geodata/sbe-viewing" variant="secondary">Book SBE tour</BookViewingButton>
 */
export default function BookViewingButton({
  calLink,
  children = "Reserve a viewing",
  variant = "primary",
  className,
}: Props) {
  useEffect(() => {
    (async function init() {
      const cal = await getCalApi();
      cal("ui", {
        theme: "auto",
        cssVarsPerTheme: {
          light: { "cal-brand": "#D44455" },
          dark:  { "cal-brand": "#D44455" },
        },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, []);

  const base = "inline-flex items-center gap-3 px-7 py-4 text-sm font-medium transition-colors duration-300";
  const styles = {
    primary:   "bg-navy-900 dark:bg-bone dark:text-navy-950 text-bone hover:bg-navy-800 dark:hover:bg-bone-100",
    secondary: "border border-navy-900 dark:border-bone text-navy-900 dark:text-bone hover:bg-navy-900 hover:text-bone dark:hover:bg-bone dark:hover:text-navy-950",
    ghost:     "text-navy-900 dark:text-bone border-b border-navy-900/30 dark:border-bone/30 hover:border-accent-dark dark:hover:border-accent hover:text-accent-dark dark:hover:text-accent pb-0.5",
  };

  return (
    <button
      type="button"
      data-cal-link={calLink}
      data-cal-config='{"layout":"month_view"}'
      className={className ?? clsx(base, styles[variant])}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <span>{children}</span>
    </button>
  );
}
