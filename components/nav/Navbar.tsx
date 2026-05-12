"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import MegaMenu from "./MegaMenu";
import ProjectsMegaMenu from "./ProjectsMegaMenu";
import MobileNavDrawer from "./MobileNavDrawer";
import ThemeToggle from "@/components/shared/ThemeToggle";

// Which mega panel is open — null when both are closed
type MegaKey = "properties" | "projects";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Properties", mega: "properties" as MegaKey },
  { label: "Projects", mega: "projects" as MegaKey },
  { label: "Updates", href: "/updates" },
  { label: "MREIF", href: "/mortgage" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState<MegaKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);

  // Solid/blurred state once user has moved off the hero
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape-to-close for keyboard users
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMegaOpen(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openMega = (key: MegaKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaOpen(key);
  };
  const queueClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMegaOpen(null), 120);
  };

  const isScrolled = scrolled || megaOpen !== null;

  return (
    <>
      <header
        className={clsx(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-600 ease-editorial",
          isScrolled
            ? "bg-bone/98 dark:bg-navy-950/98 backdrop-blur-md border-b border-hairline dark:border-white/10 shadow-[0_1px_24px_-8px_rgba(15,37,71,0.08)]"
            : "bg-transparent"
        )}
      >
        <div className="container-editorial flex h-20 items-center justify-between">

          {/* Brand lockup */}
          <Link
            href="/"
            className={clsx(
              "flex items-center gap-2.5 font-brand text-lg tracking-tight transition-colors duration-400",
              isScrolled ? "text-navy-900 dark:text-bone" : "text-bone"
            )}
          >
            <Image
              src="/geodata-mark.png"
              alt="Geodata"
              width={36}
              height={36}
              priority
              className="h-9 w-9 shrink-0"
            />
            <span>
              GEODATA<span className="text-gold">.</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8 xl:gap-10">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                onMouseEnter={item.mega ? () => openMega(item.mega!) : undefined}
                onMouseLeave={item.mega ? queueClose : undefined}
                onFocus={item.mega ? () => openMega(item.mega!) : undefined}
                onBlur={item.mega ? queueClose : undefined}
                className="relative"
              >
                <Link
                  href={item.href ?? `/${item.label.toLowerCase()}`}
                  aria-haspopup={item.mega ? "menu" : undefined}
                  aria-expanded={item.mega ? megaOpen === item.mega : undefined}
                  className={clsx(
                    "text-sm font-medium tracking-wide transition-colors duration-400 flex items-center gap-1",
                    isScrolled
                      ? "text-navy-900 hover:text-gold-dark dark:text-bone/90 dark:hover:text-gold"
                      : "text-bone hover:text-gold-soft"
                  )}
                >
                  {item.label}
                  {item.mega && (
                    <span
                      aria-hidden
                      className={clsx(
                        "text-[10px] transition-transform duration-300",
                        megaOpen === item.mega ? "rotate-180" : ""
                      )}
                    >
                      ▾
                    </span>
                  )}
                </Link>
              </div>
            ))}
          </nav>

          {/* Theme toggle + Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <ThemeToggle
              className={isScrolled ? "text-navy-900 dark:text-bone" : "text-bone"}
            />
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 bg-navy-900 dark:bg-bone dark:text-navy-950 px-5 py-3 text-xs uppercase tracking-eyebrow font-medium text-bone hover:bg-navy-800 dark:hover:bg-gold-soft transition-colors duration-400"
            >
              Schedule Visit
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className={clsx(
              "lg:hidden p-2 -m-2 transition-colors duration-400",
              isScrolled ? "text-navy-900 dark:text-bone" : "text-bone"
            )}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <svg width="28" height="12" viewBox="0 0 28 12" fill="none" aria-hidden>
              <rect width="28" height="1.5" fill="currentColor" />
              <rect y="10.5" width="20" height="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* Properties mega menu */}
        {megaOpen === "properties" && (
          <div
            onMouseEnter={() => openMega("properties")}
            onMouseLeave={queueClose}
            className="absolute left-0 right-0 top-full z-40"
          >
            <MegaMenu />
          </div>
        )}

        {/* Projects mega menu */}
        {megaOpen === "projects" && (
          <div
            onMouseEnter={() => openMega("projects")}
            onMouseLeave={queueClose}
            className="absolute left-0 right-0 top-full z-40"
          >
            <ProjectsMegaMenu />
          </div>
        )}
      </header>

      {/* Mobile drawer */}
      <MobileNavDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
