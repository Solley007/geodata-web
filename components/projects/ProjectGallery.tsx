"use client";

import { useLayoutEffect, useRef, useState, useEffect } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import type { Project } from "@/lib/projects-data";
import { useSwipe } from "@/lib/use-swipe";

interface Props { project: Project; }

export default function ProjectGallery({ project }: Props) {
  const root = useRef<HTMLElement>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".pg-fade", {
        y: 32, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: "top 80%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  function open(i: number)  { setLightboxIdx(i); }
  function close()          { setLightboxIdx(null); }
  function next() { if (lightboxIdx !== null) setLightboxIdx((lightboxIdx + 1) % project.gallery.length); }
  function prev() { if (lightboxIdx !== null) setLightboxIdx((lightboxIdx - 1 + project.gallery.length) % project.gallery.length); }

  const swipe = useSwipe({ onSwipeLeft: next, onSwipeRight: prev });

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")           close();
      else if (e.key === "ArrowRight")  next();
      else if (e.key === "ArrowLeft")   prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIdx]);

  if (project.gallery.length === 0) return null;

  return (
    <>
      <section ref={root} className="bg-bone-100 dark:bg-navy-900 py-24 md:py-32">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-12 mb-16">
            <div className="col-span-12 lg:col-span-5">
              <p className="pg-fade eyebrow mb-6">Imagery</p>
              <h2 className="pg-fade font-display text-display-md text-navy-950 dark:text-bone tracking-tightest">
                The work, in light.
              </h2>
            </div>
          </div>

          {/* Editorial grid, clickable */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {project.gallery.map((img, i) => {
              const ratioClass =
                i === 0 ? "aspect-[16/10] col-span-2"
                : i % 3 === 1 ? "aspect-[3/4]"
                : "aspect-[4/5]";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => open(i)}
                  className={`pg-fade group relative overflow-hidden bg-navy-100 dark:bg-navy-800 cursor-zoom-in ${ratioClass}`}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] ease-editorial group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/20 transition-colors duration-500 flex items-center justify-center">
                    <svg
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-bone"
                      viewBox="0 0 24 24" width="28" height="28" fill="none"
                      stroke="currentColor" strokeWidth="1.5"
                    >
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="pg-fade mt-8 text-sm text-ink-faint dark:text-bone/40">
            Photography and renders represent the project at various stages.
          </p>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[100] bg-navy-950/97 flex items-center justify-center p-6 md:p-16"
          onClick={close}
        >
          <button
            type="button" onClick={(e) => { e.stopPropagation(); close(); }}
            className="absolute top-4 right-4 z-20 h-12 w-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-bone transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          <p className="absolute top-7 left-6 z-20 text-bone/50 text-xs uppercase tracking-widest">
            {lightboxIdx + 1} <span className="text-bone/25">/</span> {project.gallery.length}
          </p>

          {project.gallery.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 flex items-center justify-center text-bone/60 hover:text-bone bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Previous"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {project.gallery.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 flex items-center justify-center text-bone/60 hover:text-bone bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Next"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}

          <div
            className="relative max-w-6xl w-full flex flex-col items-center touch-pan-y"
            onClick={(e) => e.stopPropagation()}
            {...swipe}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.gallery[lightboxIdx].src}
              alt={project.gallery[lightboxIdx].alt}
              className="max-w-full max-h-[80vh] object-contain"
            />
            {project.gallery[lightboxIdx].alt && (
              <p className="mt-5 text-bone/60 text-sm tracking-wide text-center">
                {project.gallery[lightboxIdx].alt}
              </p>
            )}
          </div>

          {/* Thumbnail strip */}
          {project.gallery.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {project.gallery.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); open(i); }}
                  className={`relative h-12 w-16 overflow-hidden transition-opacity duration-200 ${i === lightboxIdx ? "opacity-100 ring-1 ring-accent" : "opacity-40 hover:opacity-70"}`}
                >
                  <Image src={img.src} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
