"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useActiveSection } from "@/lib/ActiveSectionContext";
import { PROPERTY_SECTIONS, type Property } from "@/lib/property-data";
import SectionErrorBoundary from "@/components/shared/SectionErrorBoundary";
import FloorPlans from "./FloorPlans";

// Mapbox uses browser-only APIs — load PropertyMap on the client only.
// This prevents SSR errors and reduces initial JS bundle (the map only
// downloads when this section is reached during prefetch).
const PropertyMap = dynamic(() => import("./PropertyMap"), {
  ssr: false,
  loading: () => (
    <div className="relative aspect-[16/9] bg-navy-100 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-ink-faint dark:text-bone/40 text-xs uppercase tracking-eyebrow">Loading map…</p>
      </div>
    </div>
  ),
});

interface Props {
  property: Property;
}

/**
 * ScrollSpyContent
 * ----
 * Two-column content area:
 * - LEFT: long-form sections (Overview, Video, Details, Amenities, Gallery, Location)
 * - RIGHT: sticky table of contents that highlights the current section
 *
 * The active-section detection is the central nervous system. Each section
 * registers a ScrollTrigger with onEnter and onEnterBack callbacks. The
 * resulting active id propagates to BOTH the ToC here and the StickySubNav
 * via ActiveSectionContext.
 *
 * One trigger per section. Single source of truth. No drift between navs.
 */
export default function ScrollSpyContent({ property }: Props) {
  const root = useRef<HTMLElement>(null);
  const { activeId, setActiveId } = useActiveSection();

  useLayoutEffect(() => {
    if (!root.current) return;

    const ctx = gsap.context(() => {
      // Active-section detection — one trigger per section
      PROPERTY_SECTIONS.forEach((section) => {
        ScrollTrigger.create({
          trigger: `#${section.id}`,
          // The "active band" runs from 30% from top to 30% from bottom.
          // A section is active when its top crosses into that band.
          start: "top 30%",
          end: "bottom 30%",
          onEnter: () => setActiveId(section.id),
          onEnterBack: () => setActiveId(section.id),
        });
      });

      // Section-content fade-up reveals — staggered children per section
      gsap.utils.toArray<HTMLElement>(".spy-section").forEach((section) => {
        gsap.from(section.querySelectorAll(".spy-fade"), {
          y: 32,
          opacity: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
          },
        });
      });
    }, root);

    return () => ctx.revert();
  }, [setActiveId]);

  const handleTocClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navHeight = 72;
    const targetY = el.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-24 md:py-32">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-x-12 items-start">
          {/* LEFT — long-form content */}
          <div className="col-span-12 lg:col-span-8">
            {/* OVERVIEW */}
            <article id="overview" className="spy-section pt-12 pb-32 first:pt-0">
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6 spy-fade">01 — Overview</p>
              <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest mb-12 spy-fade max-w-2xl">
                A house composed for <em className="font-light">how families actually live.</em>
              </h2>
              <div className="space-y-6 max-w-2xl">
                {property.overview.map((para, i) => (
                  <p key={i} className="text-lg leading-relaxed text-ink dark:text-bone/75 spy-fade">
                    {para}
                  </p>
                ))}
              </div>
            </article>

            <div className="hairline" />

            {/* VIDEO */}
            <article id="video" className="spy-section py-32">
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6 spy-fade">02 — Video</p>
              <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest mb-12 spy-fade max-w-2xl">
                Walk through the residence.
              </h2>
              <div className="spy-fade relative aspect-video bg-navy-950 overflow-hidden">
                {/* PLACEHOLDER — replace with embedded Vimeo/YouTube or HLS player */}
                <Image
                  src={property.gallery[1].src}
                  alt={`Video walkthrough preview — ${property.title}`}
                  fill
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover opacity-70"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="group flex items-center gap-3 bg-bone/95 backdrop-blur-sm px-7 py-4 hover:bg-bone dark:bg-navy-950 transition-colors duration-400">
                    <span className="flex h-3 w-3 items-center justify-center">
                      <span className="block h-0 w-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-navy-900" />
                    </span>
                    <span className="text-xs uppercase tracking-eyebrow font-medium text-navy-900 dark:text-bone/90">
                      Play walkthrough
                    </span>
                  </button>
                </div>
              </div>
              <p className="mt-4 text-sm text-ink-faint dark:text-bone/40 spy-fade">
                4 min 32 sec · Filmed February 2026
              </p>
            </article>

            <div className="hairline" />

            {/* DETAILS */}
            <article id="details" className="spy-section py-32">
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6 spy-fade">03 — Details</p>
              <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest mb-12 spy-fade max-w-2xl">
                Construction, finish, and the things you only notice over time.
              </h2>
              <div className="space-y-6 max-w-2xl">
                {property.details.map((para, i) => (
                  <p key={i} className="text-lg leading-relaxed text-ink dark:text-bone/75 spy-fade">
                    {para}
                  </p>
                ))}
              </div>

              {/* Floor plans — tabbed per floor, click to enlarge, download PDF */}
              {property.floorPlans?.length > 0 && (
                <FloorPlans
                  floorPlans={property.floorPlans}
                  floorPlanPdf={property.floorPlanPdf}
                  propertyTitle={property.title}
                />
              )}
            </article>

            <div className="hairline" />

            {/* AMENITIES */}
            <article id="amenities" className="spy-section py-32">
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6 spy-fade">04 — Amenities</p>
              <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest mb-12 spy-fade max-w-2xl">
                What's included, by default.
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
                {property.amenities.map((a) => (
                  <div key={a.title} className="spy-fade border-t border-hairline dark:border-white/10 pt-6">
                    <h3 className="font-display text-2xl text-navy-950 dark:text-bone mb-3 leading-tight">
                      {a.title}
                    </h3>
                    <p className="text-ink-muted dark:text-bone/60 leading-relaxed">{a.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <div className="hairline" />

            {/* GALLERY */}
            <article id="gallery" className="spy-section py-32">
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6 spy-fade">05 — Images</p>
              <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest mb-12 spy-fade max-w-2xl">
                The residence, in light.
              </h2>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {property.gallery.map((img, i) => {
                  const ratioClass =
                    img.ratio === "tall"
                      ? "aspect-[3/4]"
                      : img.ratio === "wide"
                      ? "aspect-[16/10] col-span-2"
                      : "aspect-square";
                  return (
                    <div
                      key={i}
                      className={`spy-fade relative overflow-hidden bg-navy-100 ${ratioClass}`}
                    >
                      <Image
                        src={img.src}
                        alt={img.alt}
                        fill
                        sizes="(min-width: 1024px) 33vw, 50vw"
                        className="object-cover transition-transform duration-1200 ease-editorial hover:scale-[1.03]"
                      />
                    </div>
                  );
                })}
              </div>
            </article>

            <div className="hairline" />

            {/* LOCATION */}
            <article id="location" className="spy-section py-32">
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6 spy-fade">06 — Location</p>
              <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest mb-12 spy-fade max-w-2xl">
                Idu, Abuja.
              </h2>

              {/* Address */}
              <p className="text-lg text-ink dark:text-bone/75 leading-relaxed mb-12 spy-fade max-w-2xl">
                {property.locationContext.address}
              </p>

              {/* Interactive map */}
              <div className="spy-fade mb-12">
                <SectionErrorBoundary sectionName="PropertyMap">
                  <PropertyMap
                    latitude={property.locationContext.coords.lat}
                    longitude={property.locationContext.coords.lng}
                    label={property.locationContext.address}
                  />
                </SectionErrorBoundary>
              </div>

              {/* Travel times */}
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6 spy-fade">Travel times</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1">
                {property.locationContext.travelTimes.map((t) => (
                  <div
                    key={t.destination}
                    className="spy-fade flex items-baseline justify-between border-b border-hairline dark:border-white/10 py-4"
                  >
                    <span className="text-ink dark:text-bone/75">{t.destination}</span>
                    <span className="font-display text-xl text-navy-950 dark:text-bone">{t.time}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>

          {/* RIGHT — sticky ToC */}
          <aside className="hidden lg:block col-span-4 sticky top-32 self-start">
            <div className="border-t border-navy-950 dark:border-white/10 pt-6">
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-8">Contents</p>
              <ul className="space-y-1">
                {PROPERTY_SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <button
                      onClick={() => handleTocClick(s.id)}
                      className="group block w-full text-left py-3"
                    >
                      <div className="flex items-baseline gap-4">
                        <span
                          className={clsx(
                            "font-display text-sm tabular-nums transition-colors duration-400",
                            activeId === s.id ? "text-gold-dark" : "text-ink-faint dark:text-bone/40"
                          )}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={clsx(
                            "font-display text-2xl transition-all duration-500 ease-editorial",
                            activeId === s.id
                              ? "text-navy-950 dark:text-bone translate-x-1"
                              : "text-ink-muted dark:text-bone/60 group-hover:text-navy-900 dark:text-bone/90"
                          )}
                        >
                          {s.label}
                        </span>
                      </div>
                      {/* Hairline progress under active item */}
                      <div
                        className={clsx(
                          "mt-3 h-px bg-navy-950 transition-transform duration-700 ease-editorial origin-left",
                          activeId === s.id ? "scale-x-100" : "scale-x-0"
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Sticky enquiry card under ToC */}
              <div className="mt-12 p-6 bg-navy-950 text-bone">
                <p className="eyebrow text-bone/60 mb-3">Schedule a viewing</p>
                <p className="text-lg leading-snug mb-6">
                  See the residence in person at our Idu sales pavilion.
                </p>
                <button className="w-full bg-bone dark:bg-navy-950 text-navy-950 dark:text-bone px-5 py-3 text-xs uppercase tracking-eyebrow font-medium hover:bg-gold-soft transition-colors duration-400">
                  Book a visit →
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
