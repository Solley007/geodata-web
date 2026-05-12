"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, motionMatch } from "@/lib/gsap";

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;

    // gsap.context scopes selectors to the hero and gives us automatic
    // cleanup — non-negotiable in React or animations will multiply on
    // route changes and HMR.
    const ctx = gsap.context(() => {
      motionMatch({
        // Full motion — staggered headline reveal + slow ken-burns drift
        full: () => {
          const tl = gsap.timeline({
            defaults: { ease: "power3.out" },
            delay: 0.1,
          });

          tl.from(".hero-eyebrow", {
            y: 20,
            opacity: 0,
            duration: 0.8,
          })
            .from(
              ".hero-line",
              {
                yPercent: 110,
                duration: 1.1,
                stagger: 0.08,
                ease: "expo.out",
              },
              "-=0.5"
            )
            .from(
              ".hero-sub",
              {
                y: 16,
                opacity: 0,
                duration: 0.8,
              },
              "-=0.6"
            )
            .from(
              ".hero-cta",
              {
                y: 12,
                opacity: 0,
                duration: 0.6,
                stagger: 0.08,
              },
              "-=0.5"
            )
            .from(
              ".hero-meta",
              {
                opacity: 0,
                duration: 0.8,
              },
              "-=0.4"
            );

          // Slow Ken Burns drift on the background — desktop only.
          // On mobile, scale() transforms can escape overflow containment
          // in some Chromium/WebKit versions, causing horizontal overflow.
          const isDesktop = window.matchMedia("(min-width: 768px)").matches;
          if (isDesktop) {
            gsap.to(".hero-bg", {
              scale: 1.08,
              duration: 18,
              ease: "none",
              repeat: -1,
              yoyo: true,
            });
          }
        },

        // Reduced motion — gentle fades only, no transforms or ken-burns
        reduced: () => {
          gsap.set([".hero-line"], { yPercent: 0 });
          const tl = gsap.timeline({ defaults: { ease: "none" }, delay: 0.05 });
          tl.from(".hero-eyebrow", { opacity: 0, duration: 0.3 })
            .from(".hero-line", { opacity: 0, duration: 0.4, stagger: 0.04 }, "-=0.1")
            .from(".hero-sub", { opacity: 0, duration: 0.3 }, "-=0.2")
            .from(".hero-cta", { opacity: 0, duration: 0.3, stagger: 0.04 }, "-=0.2")
            .from(".hero-meta", { opacity: 0, duration: 0.3 }, "-=0.1");
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden"
    >
      {/* Background — video plate with image fallback.
          Drop your real walkthrough/montage video at /public/hero-video.mp4
          (recommended: 1920x1080, H.264 MP4, under 5MB, 15-30 second loop).
          The poster image shows while the video loads or if it fails.
          clip-path: inset(0) is here as belt-and-suspenders — it clips
          children even when will-change:transform causes overflow:hidden
          to fail in some Chromium/WebKit versions. */}
      <div className="hero-bg absolute inset-0 will-change-transform [clip-path:inset(0)]">
        <video
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          poster="/collage-1.jpg"
          className="absolute inset-0 h-full w-full object-cover"
          preload="metadata"
        >
          <source
            src="https://geodata-wsl.s3.us-east-1.amazonaws.com/Showcase.mp4"
            type="video/mp4"
          />
          Your browser doesn't support video. Please upgrade.
        </video>
        {/* Two-layer gradient — vertical for legibility, vignette for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/40 via-navy-950/30 to-navy-950/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,22,40,0.45)_100%)]" />
      </div>

      {/* Content — pt-24/pt-32 ensures the headline always starts below
          the fixed navbar (80px) with comfortable breathing room. Without
          this, a tall headline at justify-end can extend behind the nav
          on shorter viewports or when the heading itself fills most of
          the hero height. */}
      <div className="relative z-10 container-editorial flex h-full flex-col justify-end pt-24 md:pt-32 pb-20 md:pb-28">
        <div className="max-w-5xl">
          <p className="hero-eyebrow eyebrow text-bone/85 mb-8">
            Southern Bridge City — Phase One
          </p>

          {/* Lines wrapped for staggered slide-up reveal */}
          <h1 className="text-display-xl font-display text-bone tracking-tightest">
            <span className="block overflow-hidden">
              <span className="hero-line block">Reimagining</span>
            </span>
            <span className="block overflow-hidden">
              <span className="hero-line block italic font-light">
                urban living
              </span>
            </span>
            <span className="block overflow-hidden">
              <span className="hero-line block">in Abuja.</span>
            </span>
          </h1>

          <p className="hero-sub mt-10 max-w-xl text-lg text-bone/80 leading-relaxed">
            A 320-unit residential development by Geodata World Services, financed
            by Zenith Bank and qualified for the MREIF mortgage programme — 9.75%
            fixed for 20 years.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="/properties"
              className="hero-cta inline-flex items-center gap-3 bg-bone dark:bg-navy-950 px-7 py-4 text-sm font-medium text-navy-900 dark:text-bone/90 transition-colors duration-400 hover:bg-gold-soft"
            >
              Explore residences
              <span aria-hidden>→</span>
            </a>
            <a
              href="#progress"
              className="hero-cta inline-flex items-center gap-3 border border-bone/30 px-7 py-4 text-sm font-medium text-bone backdrop-blur-sm transition-colors duration-400 hover:border-bone hover:bg-bone/10"
            >
              View construction progress
            </a>
          </div>
        </div>

        {/* Bottom meta row — small but considered */}
        <div className="hero-meta mt-20 flex items-center justify-between border-t border-bone/15 pt-6">
          <p className="text-[11px] uppercase tracking-eyebrow text-bone/60">
            RC 688927 · CAC Registered
          </p>
          <p className="text-[11px] uppercase tracking-eyebrow text-bone/60 hidden md:block">
            Scroll <span className="ml-2">↓</span>
          </p>
        </div>
      </div>
    </section>
  );
}
