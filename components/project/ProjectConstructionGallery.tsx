"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  fetchConstructionUpdates,
  formatUpdateDate,
  type ConstructionUpdate,
} from "@/lib/construction-updates";

interface Props {
  /** Construction-updates slug for this project (matches what was uploaded in admin) */
  slug: string;
  /** Section eyebrow + headline */
  eyebrow?: string;
  headline?: string;
  /** Optional status text e.g. "Finishing stage · Completion 2026" */
  status?: string;
  /** Background variant */
  variant?: "light" | "dark";
}

/**
 * ProjectConstructionGallery
 * ----
 * A simpler ProgressBar tailored for project pages without typology phases.
 * Shows: hero photo + 3 thumbnails + "+N more" overflow + full gallery lightbox
 * with prev/next navigation through every uploaded photo.
 */
export default function ProjectConstructionGallery({
  slug,
  eyebrow  = "Construction progress",
  headline = "On site.",
  status,
  variant  = "light",
}: Props) {
  const [updates, setUpdates] = useState<ConstructionUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    fetchConstructionUpdates()
      .then((all) => {
        // Filter by slug only — ignore phase
        const filtered = all
          .filter((u) => u.propertySlug === slug)
          .sort((a, b) => +new Date(b.date) - +new Date(a.date));
        setUpdates(filtered);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const hero      = updates[0];
  const thumbsMax = 3;
  const thumbs    = updates.slice(1, 1 + thumbsMax);
  const remaining = Math.max(0, updates.length - 1 - thumbsMax);

  const lightbox = lightboxIdx !== null ? updates[lightboxIdx] : null;

  function open(i: number)  { setLightboxIdx(i); }
  function close()          { setLightboxIdx(null); }
  function next() { if (lightboxIdx !== null) setLightboxIdx((lightboxIdx + 1) % updates.length); }
  function prev() { if (lightboxIdx !== null) setLightboxIdx((lightboxIdx - 1 + updates.length) % updates.length); }

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")           close();
      else if (e.key === "ArrowRight")  next();
      else if (e.key === "ArrowLeft")   prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIdx]);

  const isDark = variant === "dark";

  // Don't render section if no photos
  if (!loading && updates.length === 0) return null;

  return (
    <section className={`py-8 md:py-10 ${isDark ? "bg-navy-950 text-bone" : "bg-bone dark:bg-navy-950"}`}>
      <div className="container-editorial">
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-6 md:gap-10 items-center">

          {/* Left: text + thumbnails */}
          <div>
            <p className={`eyebrow mb-3 ${isDark ? "text-bone/50" : "text-ink-muted dark:text-bone/50"}`}>{eyebrow}</p>
            <h2 className={`text-2xl md:text-3xl font-display tracking-tight leading-[1.1] mb-2 ${isDark ? "text-bone" : "text-navy-950 dark:text-bone"}`}>
              {headline}
            </h2>
            {status && (
              <p className={`text-sm mb-4 ${isDark ? "text-bone/60" : "text-ink-muted dark:text-bone/60"}`}>
                {status}
              </p>
            )}
            {hero && (
              <p className={`text-xs mb-5 ${isDark ? "text-bone/50" : "text-ink-muted dark:text-bone/50"}`}>
                Last updated {formatUpdateDate(hero.date)}
              </p>
            )}

            {thumbs.length > 0 && (
              <div className={`mt-6 pt-5 border-t ${isDark ? "border-white/10" : "border-hairline dark:border-white/10"}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`eyebrow text-[10px] ${isDark ? "text-bone/50" : "text-ink-muted dark:text-bone/50"}`}>
                    More photos
                  </p>
                  {updates.length > 1 && (
                    <button
                      onClick={() => open(0)}
                      className={`text-[10px] uppercase tracking-widest hover:text-accent transition-colors ${isDark ? "text-bone" : "text-navy-950 dark:text-bone"}`}
                    >
                      View all ({updates.length}) →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {thumbs.map((u, i) => (
                    <button
                      key={u.id}
                      onClick={() => open(1 + i)}
                      className="group relative aspect-square overflow-hidden cursor-zoom-in"
                    >
                      <Image
                        src={u.imageUrl}
                        alt={u.caption}
                        fill
                        sizes="100px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </button>
                  ))}
                  {remaining > 0 && (
                    <button
                      onClick={() => open(1 + thumbsMax)}
                      className="group relative aspect-square overflow-hidden cursor-zoom-in bg-navy-950/90"
                    >
                      <Image
                        src={updates[1 + thumbsMax].imageUrl}
                        alt=""
                        fill
                        sizes="100px"
                        className="object-cover opacity-40 transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-navy-950/50">
                        <p className="text-bone font-display text-lg leading-none">+{remaining}</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: hero photo */}
          <div>
            {loading ? (
              <div className="aspect-[4/3] bg-hairline/40 dark:bg-white/5 animate-pulse" />
            ) : hero ? (
              <button
                type="button"
                onClick={() => open(0)}
                className="relative block w-full aspect-[4/3] overflow-hidden group cursor-zoom-in"
              >
                <Image
                  src={hero.imageUrl}
                  alt={hero.caption}
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.02]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/85 via-navy-950/30 to-transparent pt-12 pb-4 px-5">
                  <p className="mt-0.5 text-bone text-sm md:text-base font-display tracking-tight line-clamp-2">
                    {hero.caption}
                  </p>
                </div>
              </button>
            ) : null}
          </div>

        </div>
      </div>

      {/* Gallery Lightbox */}
      {lightbox && lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[100] bg-navy-950/95 flex items-center justify-center p-6 md:p-12"
          onClick={close}
        >
          <button
            onClick={close}
            className="absolute top-6 right-6 z-20 text-bone hover:text-accent transition-colors text-3xl leading-none"
            aria-label="Close"
          >×</button>
          <p className="absolute top-7 left-6 z-20 text-bone/60 text-xs uppercase tracking-widest">
            {lightboxIdx + 1} <span className="text-bone/30">/</span> {updates.length}
          </p>
          {updates.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 h-12 w-12 flex items-center justify-center text-bone/70 hover:text-bone bg-navy-950/40 hover:bg-navy-950/60 transition-colors"
                aria-label="Previous photo"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 h-12 w-12 flex items-center justify-center text-bone/70 hover:text-bone bg-navy-950/40 hover:bg-navy-950/60 transition-colors"
                aria-label="Next photo"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}
          <div className="relative w-full h-full max-w-6xl flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.imageUrl} alt={lightbox.caption} className="max-w-full max-h-[80vh] object-contain" />
            <div className="mt-6 text-center">
              <p className="text-bone text-base md:text-lg">{lightbox.caption}</p>
              <p className="text-bone/60 text-xs mt-1 uppercase tracking-widest">
                {formatUpdateDate(lightbox.date)}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
