"use client";

import clsx from "clsx";
import { useSavedResidences } from "@/lib/SavedResidencesProvider";

interface Props {
  slug: string;
  /** Visual variant, "overlay" sits on top of an image; "inline" sits in a regular text flow */
  variant?: "overlay" | "inline";
  className?: string;
}

export default function SaveButton({ slug, variant = "overlay", className }: Props) {
  const { isSaved, toggle, hydrated } = useSavedResidences();
  const saved = hydrated && isSaved(slug);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // don't trigger parent <Link>
    toggle(slug);
  };

  const base =
    "group/save inline-flex items-center justify-center transition-all duration-300 active:scale-90";

  const variantClass =
    variant === "overlay"
      ? "absolute top-3 right-3 z-10 h-10 w-10 rounded-full bg-bone/85 hover:bg-bone backdrop-blur-sm shadow-sm"
      : "h-9 w-9 rounded-full hover:bg-bone-100 dark:hover:bg-white/5";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={saved ? "Remove from saved residences" : "Save this residence"}
      aria-pressed={saved}
      className={clsx(base, variantClass, className)}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={saved ? 0 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={clsx(
          "transition-all duration-300",
          saved
            ? "text-accent-dark dark:text-accent scale-110"
            : "text-navy-950 dark:text-bone group-hover/save:text-accent-dark dark:group-hover/save:text-accent"
        )}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
