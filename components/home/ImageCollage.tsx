"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger, motionMatch } from "@/lib/gsap";

/**
 * ImageCollage
 * ----
 * Five architectural images that travel from off-screen at varied speeds,
 * lock into a deliberate asymmetric grid, then drift slowly while the
 * accompanying text comes up beside them.
 *
 * The composition is the *point* of this section — it's a printed-magazine
 * spread translated into scroll. Resist the urge to make it symmetrical.
 */

// PLACEHOLDER IMAGERY — replace with real Geodata renders / site photography
const PLATES = [
  {
    src: "/collage-1.jpg",
    alt: "Southern Bridge City — residential facade at dusk",
    objectPosition: "center center",
    className: "col-start-1 col-span-5 row-start-1 aspect-[4/3]",
    fromX: -120, // travels in from left
    fromY: 80,
    speed: 1,
  },
  {
    src: "/collage-2.jpg",
    alt: "Southern Bridge City — drone view of terrace houses and courtyard",
    objectPosition: "center top",
    className: "col-start-7 col-span-6 row-start-1 aspect-[5/4] mt-24",
    fromX: 120,
    fromY: 60,
    speed: 1.4,
  },
  {
    src: "/collage-3.jpg",
    alt: "Southern Bridge City — aerial view of development and surroundings",
    objectPosition: "center top",
    className: "col-start-3 col-span-5 row-start-2 aspect-[4/3] -mt-12",
    fromX: -60,
    fromY: 140,
    speed: 0.8,
  },
  {
    src: "/collage-4.jpg",
    alt: "Southern Bridge City — top-down aerial of completed residential blocks",
    objectPosition: "center center",
    className: "col-start-9 col-span-4 row-start-2 aspect-[4/3] mt-16",
    fromX: 80,
    fromY: 100,
    speed: 1.2,
  },
  {
    src: "/collage-5.jpg",
    alt: "Southern Bridge City — balcony and facade detail at golden hour",
    objectPosition: "center center",
    className: "col-start-2 col-span-9 row-start-3 aspect-[16/9] mt-20",
    fromX: 0,
    fromY: 200,
    speed: 0.6,
  },
];

export default function ImageCollage() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;

    const ctx = gsap.context(() => {
      motionMatch({
        // Full motion — the multi-speed parallax composition
        full: () => {
          gsap.utils.toArray<HTMLElement>(".collage-plate").forEach((plate) => {
            const fromX = parseFloat(plate.dataset.fromX ?? "0");
            const fromY = parseFloat(plate.dataset.fromY ?? "0");
            const speed = parseFloat(plate.dataset.speed ?? "1");

            gsap.fromTo(
              plate,
              {
                x: fromX,
                y: fromY,
                opacity: 0,
                scale: 0.94,
              },
              {
                x: 0,
                y: 0,
                opacity: 1,
                scale: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: plate,
                  start: "top bottom",
                  end: "center center",
                  scrub: 1.2 / speed,
                },
              }
            );

            // Internal image continues drifting after the plate locks
            const inner = plate.querySelector(".collage-inner");
            if (inner) {
              gsap.fromTo(
                inner,
                { yPercent: -8 },
                {
                  yPercent: 8,
                  ease: "none",
                  scrollTrigger: {
                    trigger: plate,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true,
                  },
                }
              );
            }
          });

          // Editorial caption fades up alongside the grid resolving
          gsap.from(".collage-text > *", {
            y: 40,
            opacity: 0,
            duration: 1,
            ease: "power3.out",
            stagger: 0.12,
            scrollTrigger: {
              trigger: ".collage-text",
              start: "top 75%",
            },
          });
        },

        // Reduced motion — plates and text simply present, gentle opacity fade
        reduced: () => {
          gsap.set(".collage-plate", { x: 0, y: 0, opacity: 1, scale: 1 });
          gsap.set(".collage-inner", { yPercent: 0 });
          gsap.from(".collage-plate", {
            opacity: 0,
            duration: 0.4,
            stagger: 0.05,
            scrollTrigger: { trigger: root.current, start: "top 85%" },
          });
          gsap.from(".collage-text > *", {
            opacity: 0,
            duration: 0.4,
            stagger: 0.06,
            scrollTrigger: { trigger: ".collage-text", start: "top 85%" },
          });
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative bg-bone dark:bg-navy-950 py-16 md:py-24 [overflow:clip]">
      <div className="container-editorial">
        {/* Top text block — set against the upper edge of the collage */}
        <div className="collage-text grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-5">
            <p className="eyebrow mb-6">A study in restraint</p>
            <h2 className="text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
              Built for the way <em className="font-light">life</em> is actually lived.
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:pt-6">
            <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
              Each residence is composed around proportion, light, and the
              quiet rituals of daily life. Materials are selected for how they
              age. Floor plates are drawn for how they're inhabited.
            </p>
            <p className="mt-6 text-lg leading-relaxed text-ink dark:text-bone/75">
              The result is architecture that feels considered now — and will
              feel considered in twenty years.
            </p>
          </div>
        </div>

        {/* The collage itself — 12-col grid with plates placed asymmetrically */}
        <div className="grid grid-cols-12 gap-6 relative">
          {PLATES.map((plate, i) => (
            <div
              key={i}
              className={`collage-plate relative overflow-hidden bg-navy-100 will-change-transform ${plate.className}`}
              data-from-x={plate.fromX}
              data-from-y={plate.fromY}
              data-speed={plate.speed}
            >
              <div className="collage-inner absolute inset-0 will-change-transform">
                <Image
                  src={plate.src}
                  alt={plate.alt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                  style={{ objectPosition: plate.objectPosition ?? "center" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
