"use client";
import { PROPERTY_NAV } from "@/lib/site-content";

import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";

/**
 * MegaMenu — opens on hover/focus over the "Properties" nav link.
 *
 * LEFT COLUMN:
 *   Our actual developments, listed by availability status. Links to their
 *   project pages so visitors can read the full project background before
 *   deciding to enquire.
 *
 * RIGHT COLUMN:
 *   Two featured unit types from Southern Bridge City — the development
 *   currently under active sales. Links to the actual property listing pages.
 */

type SalesStatus = "Available" | "Limited" | "Selling Soon" | "Sold Out";

const DEVELOPMENTS = [
  {
    name: "Southern Bridge City",
    location: "Idu, Abuja",
    status: "Available" as SalesStatus,
    detail: "321 units · 5 typologies · MREIF eligible",
    href: "/projects/southern-bridge-city",
  },
  {
    name: "Southern Bridge Estate",
    location: "Idu, Abuja",
    status: "Limited" as SalesStatus,
    detail: "27 units · few spots remain",
    href: "/projects/southern-bridge-estate",
  },
  {
    name: "Mabushi Shopping Complex",
    location: "Mabushi, Abuja",
    status: "Selling Soon" as SalesStatus,
    detail: "6-storey commercial · 2026",
    href: "/projects/mabushi-shopping-complex",
  },
];

// Two featured unit types from Southern Bridge City — pulled from site-content.ts
const FEATURED_UNITS = [
  {
    title:   PROPERTY_NAV.find((p) => p.slug === "4-bed-semi-detached")?.label ?? "The Semi-Detached",
    eyebrow: "Southern Bridge City · 4 bed",
    price:   PROPERTY_NAV.find((p) => p.slug === "4-bed-semi-detached")?.price  ?? "From ₦180M",
    image:   "/properties/4-bed-semi-detached.jpg",
    slug:    "4-bed-semi-detached",
  },
  {
    title:   PROPERTY_NAV.find((p) => p.slug === "4-bed-terrace")?.label ?? "The Terrace",
    eyebrow: "Southern Bridge City · 4 bed",
    price:   PROPERTY_NAV.find((p) => p.slug === "4-bed-terrace")?.price  ?? "From ₦150M",
    image:   "/properties/4-bed-terrace.jpg",
    slug:    "4-bed-terrace",
  },
];

function statusLabel(status: SalesStatus) {
  switch (status) {
    case "Available":
      return { text: "Available", dot: "bg-navy-900" };
    case "Limited":
      return { text: "Limited", dot: "bg-gold-dark" };
    case "Selling Soon":
      return { text: "Selling soon", dot: "bg-ink-faint" };
    case "Sold Out":
      return { text: "Sold out", dot: "bg-ink-faint" };
  }
}

export default function MegaMenu() {
  return (
    <div className="bg-bone dark:bg-navy-950 border-b border-hairline dark:border-white/10 shadow-[0_24px_48px_-24px_rgba(15,37,71,0.12)]">
      <div className="container-editorial grid grid-cols-12 gap-12 py-14">

        {/* LEFT — Developments */}
        <div className="col-span-5">
          <p className="eyebrow mb-6">Our developments</p>
          <ul className="space-y-1">
            {DEVELOPMENTS.map((dev) => {
              const label = statusLabel(dev.status);
              return (
                <li key={dev.href}>
                  <Link
                    href={dev.href}
                    className="group flex items-start justify-between gap-4 py-4 border-b border-hairline dark:border-white/10 hover:border-navy-900 dark:border-white/20 transition-colors duration-400"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-2xl text-navy-900 dark:text-bone/90 transition-transform duration-400 ease-editorial group-hover:translate-x-1">
                        {dev.name}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted dark:text-bone/60">{dev.detail}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 pt-1.5">
                      <span
                        className={clsx(
                          "block h-1.5 w-1.5 rounded-full shrink-0",
                          label.dot,
                          dev.status === "Available" || dev.status === "Limited"
                            ? "animate-pulse"
                            : ""
                        )}
                      />
                      <span className="text-[10px] uppercase tracking-eyebrow text-ink-faint dark:text-bone/40 whitespace-nowrap">
                        {label.text}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone/90 hover:text-gold-dark transition-colors duration-400 pb-1 border-b border-navy-900 dark:border-white/20 hover:border-gold-dark w-fit"
            >
              View all available units
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-sm text-ink-muted dark:text-bone/60 hover:text-navy-900 dark:text-bone/90 transition-colors duration-400 w-fit"
            >
              Full project portfolio
            </Link>
          </div>
        </div>

        {/* RIGHT — Two featured SB City unit types */}
        <div className="col-span-7 grid grid-cols-2 gap-6">
          {FEATURED_UNITS.map((unit) => (
            <Link
              key={unit.slug}
              href={`/properties/${unit.slug}`}
              className="group block"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-navy-100">
                <Image
                  src={unit.image}
                  alt={`${unit.title} — Southern Bridge City, Idu Abuja`}
                  fill
                  sizes="(min-width: 1024px) 28vw, 50vw"
                  className="object-cover transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
                />
                {/* Gradient floor for caption legibility */}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-navy-950/65 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="text-[10px] uppercase tracking-eyebrow text-bone/75 mb-2">
                    {unit.eyebrow}
                  </p>
                  <h3 className="font-display text-2xl text-bone leading-tight">
                    {unit.title}
                  </h3>
                  <p className="text-sm text-gold mt-1 font-medium">{unit.price}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
