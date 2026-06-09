/**
 * WhatsAppCTA — opens WhatsApp with a prefilled, context-aware message.
 *
 * Usage on a property/project page:
 *   <WhatsAppCTA property="6-Bedroom Terrace Duplex" plot="7270" />
 *
 * Generic usage:
 *   <WhatsAppCTA message="Hi, I'd like to know more about Southern Bridge City." />
 *
 * Every conversation now starts qualified: you know which unit they
 * were looking at before you even reply.
 */
import React from "react";

const PHONE = "2347047620492"; // Geodata sales line, no leading +

interface Props {
  property?: string;
  plot?: string;
  message?: string;
  label?: string;
  variant?: "solid" | "outline";
  className?: string;
}

export default function WhatsAppCTA({
  property,
  plot,
  message,
  label = "Chat on WhatsApp",
  variant = "solid",
  className = "",
}: Props) {
  const text =
    message ??
    `Hi, I'm looking at the ${property ?? "properties"}${
      plot ? ` (Plot ${plot})` : ""
    } on the Geodata website. I'd like to know more.`;

  const href = `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;

  const base =
    "inline-flex items-center justify-center gap-3 px-7 py-4 text-xs uppercase tracking-eyebrow font-medium transition-colors duration-400";
  const styles =
    variant === "solid"
      ? "bg-[#25D366] text-white hover:bg-[#1ebe5b]"
      : "border border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-bone dark:border-bone dark:text-bone dark:hover:bg-bone dark:hover:text-navy-950";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${styles} ${className}`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.42 9.42 0 1 1 7.97 4.41zm0-20.9C5.84.6.8 5.64.8 11.85c0 1.98.52 3.91 1.5 5.61L.7 23.4l6.09-1.6a11.2 11.2 0 0 0 5.25 1.34h.01c6.21 0 11.26-5.05 11.26-11.26 0-3.01-1.17-5.84-3.3-7.97A11.18 11.18 0 0 0 12.05.6z" />
      </svg>
      <span>{label}</span>
    </a>
  );
}
