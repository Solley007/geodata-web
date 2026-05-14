"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap, motionMatch } from "@/lib/gsap";
import { HERO_SLIDES, type HeroSlide } from "@/lib/site-content";

const DEFAULT_DURATION = 6000;

export default function Hero() {
  const [current,  setCurrent]  = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused,   setPaused]   = useState(false);
  const [loaded,   setLoaded]   = useState(false);

  const containerRef = useRef<HTMLElement>(null);
  const textRef      = useRef<HTMLDivElement>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef     = useRef<number>(0);
  const pausedAtRef  = useRef<number>(0);

  const slide = HERO_SLIDES[current];
  const total = HERO_SLIDES.length;

  // ── Auto-advance timer ──────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    startRef.current = Date.now() - pausedAtRef.current;
    const dur = (slide.duration ?? DEFAULT_DURATION);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min((elapsed / dur) * 100, 100);
      setProgress(p);
      if (p >= 100) {
        pausedAtRef.current = 0;
        setCurrent((c) => (c + 1) % total);
      }
    }, 50);
  }, [slide, total]);

  useEffect(() => {
    if (!paused) {
      startTimer();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      pausedAtRef.current = Date.now() - startRef.current;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, startTimer]);

  // Reset timer on slide change
  useEffect(() => {
    setProgress(0);
    pausedAtRef.current = 0;
  }, [current]);

  // ── Text entrance animation ─────────────────────────────────────────────
  const animateText = useCallback(() => {
    if (!textRef.current) return;
    const els = textRef.current.querySelectorAll(".slide-anim");
    motionMatch({
      full: () => {
        gsap.fromTo(els,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: "power3.out", clearProps: "all" }
        );
      },
      reduced: () => {
        gsap.set(els, { opacity: 1, y: 0 });
      },
    });
  }, []);

  // Initial mount animation
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      // Backgrounds use CSS transitions for slide changes — no GSAP here,
      // because GSAP from() leaves inline opacity styles that block CSS transitions
      setTimeout(animateText, 100);
    }, containerRef);
    setLoaded(true);
    return () => ctx.revert();
  }, [animateText]);

  // Slide change animation
  useEffect(() => {
    if (!loaded) return;
    animateText();
  }, [current, loaded, animateText]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  function goTo(i: number) {
    if (i === current) return;
    pausedAtRef.current = 0;
    setCurrent(i);
  }

  return (
    <section
      ref={containerRef}
      className="relative w-full h-screen min-h-[640px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Backgrounds — all stacked, only active one visible ───────── */}
      {HERO_SLIDES.map((s, i) => (
        <SlideBackground key={i} slide={s} active={i === current} />
      ))}

      {/* ── Dark overlay ─────────────────────────────────────────────── */}
      {/* Overlays for legibility on any background */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/55 via-navy-950/40 to-navy-950/85 pointer-events-none z-[2]" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950/55 via-navy-950/20 to-transparent pointer-events-none z-[2]" />

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="relative z-10 container-editorial flex h-full flex-col justify-end pt-24 md:pt-32 pb-20 md:pb-24">
        <div ref={textRef} className="max-w-5xl">

          <p className="slide-anim eyebrow text-bone/80 mb-6">{slide.eyebrow}</p>

          <h1 className="text-display-xl font-display text-bone tracking-tightest">
            {slide.headline.split("\n").map((line, i) => (
              <span key={i} className="block overflow-hidden">
                <span className={`slide-anim block${i === 1 ? " italic font-light" : ""}`}>{line}</span>
              </span>
            ))}
          </h1>

          {slide.subheadline && (
            <p className="slide-anim mt-8 max-w-xl text-lg text-bone/80 leading-relaxed">
              {slide.subheadline}
            </p>
          )}

          <div className="slide-anim mt-10 flex flex-wrap items-center gap-4">
            {slide.cta1 && (
              <a href={slide.cta1.href}
                className="inline-flex items-center gap-3 bg-bone dark:bg-navy-950 px-7 py-4 text-sm font-medium text-navy-900 dark:text-bone/90 hover:bg-gold-soft transition-colors duration-400">
                {slide.cta1.label} <span aria-hidden>→</span>
              </a>
            )}
            {slide.cta2 && (
              <a href={slide.cta2.href}
                className="inline-flex items-center gap-3 border border-bone/30 px-7 py-4 text-sm font-medium text-bone backdrop-blur-sm hover:border-bone hover:bg-bone/10 transition-colors duration-400">
                {slide.cta2.label}
              </a>
            )}
          </div>
        </div>

        {/* ── Slide indicators ─────────────────────────────────────────── */}
        <div className="mt-14 flex items-center justify-end gap-8 border-t border-bone/15 pt-6">

          {/* Progress bars + counter */}
          <div className="flex items-center gap-3">
            {HERO_SLIDES.length > 1 && (
              <div className="flex gap-2">
                {HERO_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Slide ${i + 1}`}
                    className="group relative h-0.5 w-12 bg-bone/25 overflow-hidden"
                  >
                    {i === current ? (
                      <span
                        className="absolute inset-y-0 left-0 bg-bone transition-none"
                        style={{ width: `${progress}%` }}
                      />
                    ) : i < current ? (
                      <span className="absolute inset-0 bg-bone/60" />
                    ) : null}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] uppercase tracking-eyebrow text-bone/50 hidden md:block tabular-nums">
              {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Prev / next arrows (hover-only) ──────────────────────────── */}
      {total > 1 && (
        <>
          <button
            onClick={() => goTo((current - 1 + total) % total)}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center text-bone/60 hover:text-bone transition-colors opacity-0 hover:opacity-100 focus:opacity-100"
            aria-label="Previous slide"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => goTo((current + 1) % total)}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center text-bone/60 hover:text-bone transition-colors opacity-0 hover:opacity-100 focus:opacity-100"
            aria-label="Next slide"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}
    </section>
  );
}

// ── Slide background component ─────────────────────────────────────────────

function SlideBackground({ slide, active }: { slide: HeroSlide; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pause video when slide is inactive, resume when active
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else        v.pause();
  }, [active]);

  return (
    <div
      className={`hero-bg-layer absolute inset-0 transition-opacity duration-[1000ms] ease-in-out ${
        active ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
      }`}
    >
      {slide.type === "video" && slide.videoUrl ? (
        <video
          ref={videoRef}
          autoPlay muted loop playsInline disablePictureInPicture
          poster={slide.videoPoster}
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={slide.videoUrl} type="video/mp4" />
        </video>
      ) : slide.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}
