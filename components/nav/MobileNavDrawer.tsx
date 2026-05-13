"use client";
import { PROPERTY_NAV } from "@/lib/site-content";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { PROJECTS } from "@/lib/projects-data";
import ThemeToggle from "@/components/shared/ThemeToggle";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Developments shown in the Properties expansion
const DEVELOPMENTS = [
  { href: "/projects/southern-bridge-city", name: "Southern Bridge City", status: "Available" },
  { href: "/projects/southern-bridge-estate", name: "Southern Bridge Estate", status: "Limited" },
  { href: "/projects/mabushi-shopping-complex", name: "Mabushi Shopping Complex", status: "Selling Soon" },
];

// Individual units — sourced from lib/site-content.ts, edit prices there
const PROPERTY_UNITS = PROPERTY_NAV.map((p) => ({
  href:  `/properties/${p.slug}`,
  label: p.label,
  sub:   p.sub,
}));

// Project categories shown in the Projects expansion
const PROJECT_CATEGORIES = ["Residential", "Commercial", "Institutional", "Infrastructure"] as const;

type ExpandedSection = "properties" | "projects" | null;

export default function MobileNavDrawer({ open, onClose }: Props) {
  const [expanded, setExpanded] = useState<ExpandedSection>(null);

  // Reset expansion when drawer closes
  useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const toggle = (section: ExpandedSection) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={clsx(
          "fixed inset-0 z-[70] bg-navy-950/40 backdrop-blur-sm transition-opacity duration-500",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Drawer panel */}
      <aside
        className={clsx(
          "fixed inset-y-0 right-0 z-[80] w-full max-w-md bg-bone dark:bg-navy-950 shadow-2xl transition-transform duration-600 ease-editorial flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label="Site navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 h-20 border-b border-hairline dark:border-white/10 shrink-0">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5 font-brand text-lg tracking-tight text-navy-900 dark:text-bone"
          >
            <Image
              src="/geodata-mark.png"
              alt="Geodata"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0"
            />
            <span className="leading-none translate-y-1">
              GEODATA<span className="text-gold">.</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle className="text-navy-900 dark:text-bone" />
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="text-navy-900 dark:text-bone text-2xl leading-none p-2 -m-2 hover:text-gold-dark transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable nav content */}
        <nav className="flex-1 overflow-y-auto px-8 py-6">
          <ul className="space-y-0">

            {/* Home */}
            <NavItem href="/" onClose={onClose}>Home</NavItem>

            {/* Properties — expandable */}
            <li className="border-b border-hairline">
              <button
                onClick={() => toggle("properties")}
                aria-expanded={expanded === "properties"}
                className="w-full flex items-center justify-between py-4 font-display text-3xl text-navy-950 hover:text-gold-dark transition-colors duration-300"
              >
                Properties
                <span
                  aria-hidden
                  className={clsx(
                    "text-base text-ink-faint transition-transform duration-300",
                    expanded === "properties" ? "rotate-180" : ""
                  )}
                >
                  ▾
                </span>
              </button>

              {expanded === "properties" && (
                <div className="pb-6 space-y-6">
                  {/* Developments */}
                  <div>
                    <p className="eyebrow text-ink-faint mb-3">Developments</p>
                    <ul className="space-y-0">
                      {DEVELOPMENTS.map((dev) => (
                        <li key={dev.href}>
                          <Link
                            href={dev.href}
                            onClick={onClose}
                            className="flex items-center justify-between py-3 border-b border-hairline text-navy-900 hover:text-gold-dark transition-colors duration-300"
                          >
                            <span className="font-medium text-base">{dev.name}</span>
                            <span className={clsx(
                              "text-[10px] uppercase tracking-eyebrow shrink-0 ml-3",
                              dev.status === "Available" ? "text-navy-900" :
                              dev.status === "Limited" ? "text-gold-dark" :
                              "text-ink-faint"
                            )}>
                              {dev.status}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Unit types */}
                  <div>
                    <p className="eyebrow text-ink-faint mb-3">Southern Bridge City</p>
                    <ul className="space-y-0">
                      {PROPERTY_UNITS.map((unit) => (
                        <li key={unit.href}>
                          <Link
                            href={unit.href}
                            onClick={onClose}
                            className="flex items-baseline justify-between py-3 border-b border-hairline text-navy-900 hover:text-gold-dark transition-colors duration-300"
                          >
                            <span className="font-medium text-base">{unit.label}</span>
                            <span className="text-xs text-ink-faint shrink-0 ml-3">{unit.sub}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href="/properties"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 hover:text-gold-dark transition-colors duration-400 pb-1 border-b border-navy-900 hover:border-gold-dark"
                  >
                    View all available units →
                  </Link>
                </div>
              )}
            </li>

            {/* Projects — expandable */}
            <li className="border-b border-hairline">
              <button
                onClick={() => toggle("projects")}
                aria-expanded={expanded === "projects"}
                className="w-full flex items-center justify-between py-4 font-display text-3xl text-navy-950 hover:text-gold-dark transition-colors duration-300"
              >
                Projects
                <span
                  aria-hidden
                  className={clsx(
                    "text-base text-ink-faint transition-transform duration-300",
                    expanded === "projects" ? "rotate-180" : ""
                  )}
                >
                  ▾
                </span>
              </button>

              {expanded === "projects" && (
                <div className="pb-6 space-y-5">
                  {PROJECT_CATEGORIES.map((cat) => {
                    const catProjects = PROJECTS.filter((p) => p.category === cat);
                    if (catProjects.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="eyebrow text-ink-faint mb-2">{cat}</p>
                        <ul className="space-y-0">
                          {catProjects.map((p) => (
                            <li key={p.slug}>
                              <Link
                                href={`/projects/${p.slug}`}
                                onClick={onClose}
                                className="flex items-center justify-between py-2.5 border-b border-hairline text-navy-900 hover:text-gold-dark transition-colors duration-300"
                              >
                                <span className="text-sm font-medium">{p.name}</span>
                                {p.status === "Ongoing" && (
                                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-eyebrow text-gold-dark shrink-0 ml-3">
                                    <span className="block h-1 w-1 rounded-full bg-gold-dark" />
                                    Live
                                  </span>
                                )}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}

                  <Link
                    href="/projects"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 hover:text-gold-dark transition-colors duration-400 pb-1 border-b border-navy-900 hover:border-gold-dark"
                  >
                    View full portfolio →
                  </Link>
                </div>
              )}
            </li>

            {/* Remaining flat links */}
            <NavItem href="/mortgage" onClose={onClose}>MREIF Mortgage</NavItem>
            <NavItem href="/updates" onClose={onClose}>Updates</NavItem>
            <NavItem href="/blog" onClose={onClose}>Blog</NavItem>
            <NavItem href="/about" onClose={onClose}>About</NavItem>
            <NavItem href="/contact" onClose={onClose}>Contact</NavItem>
          </ul>
        </nav>

        {/* Bottom CTA */}
        <div className="border-t border-hairline px-8 py-8 shrink-0">
          <Link
            href="/contact"
            onClick={onClose}
            className="block w-full bg-navy-900 text-bone text-center px-7 py-4 text-xs uppercase tracking-eyebrow font-medium hover:bg-navy-800 transition-colors duration-400"
          >
            Schedule a visit →
          </Link>
          <div className="mt-6 flex flex-col gap-2 text-sm text-ink-muted">
            <a href="tel:+2347047620492" className="hover:text-navy-900 transition-colors">
              +234 704 762 0492
            </a>
            <a href="mailto:hello@geodata.com.ng" className="hover:text-navy-900 transition-colors">
              hello@geodata.com.ng
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

// Small helper for flat nav links — keeps the list DRY
function NavItem({
  href,
  onClose,
  children,
}: {
  href: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="border-b border-hairline">
      <Link
        href={href}
        onClick={onClose}
        className="block py-4 font-display text-3xl text-navy-950 hover:text-gold-dark transition-colors duration-300"
      >
        {children}
      </Link>
    </li>
  );
}
