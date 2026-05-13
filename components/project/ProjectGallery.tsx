"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export interface GalleryItem {
  type:    "photo" | "video";
  src:     string;     // image URL or Cloudinary video URL
  poster?: string;     // optional poster image for video items
  caption?: string;
}

interface Props {
  items: GalleryItem[];
  eyebrow?: string;
  title?: string;
}

/**
 * ProjectGallery
 * ----
 * Masonry-style image/video grid with click-to-zoom lightbox.
 * Use on any project landing page.
 */
export default function ProjectGallery({ items, eyebrow = "Gallery", title = "See it in detail." }: Props) {
  const [active, setActive] = useState<number | null>(null);

  // Lightbox keyboard nav + scroll lock
  useEffect(() => {
    if (active === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")      setActive(null);
      if (e.key === "ArrowRight")  setActive((i) => (i! + 1) % items.length);
      if (e.key === "ArrowLeft")   setActive((i) => (i! - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [active, items.length]);

  if (items.length === 0) {
    return (
      <section className="py-20 border-t border-hairline dark:border-white/10">
        <div className="container-editorial text-center">
          <p className="eyebrow text-ink-muted dark:text-bone/50 mb-4">{eyebrow}</p>
          <p className="text-ink-muted dark:text-bone/50">No images yet.</p>
        </div>
      </section>
    );
  }

  const current = active !== null ? items[active] : null;

  return (
    <section className="py-20 md:py-24 border-t border-hairline dark:border-white/10">
      <div className="container-editorial">
        <p className="eyebrow text-ink-muted dark:text-bone/50 mb-4">{eyebrow}</p>
        <h2 className="text-display-md font-display tracking-tightest leading-none mb-12">
          {title}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`group relative overflow-hidden cursor-zoom-in ${
                i % 5 === 0 ? "md:col-span-2 md:row-span-2 aspect-[4/3]" : "aspect-square"
              }`}
            >
              <Image
                src={item.poster ?? item.src}
                alt={item.caption ?? `Photo ${i + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {item.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-navy-950/30">
                  <div className="h-14 w-14 md:h-20 md:w-20 rounded-full bg-bone/90 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 md:h-8 md:w-8 text-navy-950 translate-x-0.5"><polygon points="6,4 6,20 20,12" fill="currentColor"/></svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {current && active !== null && (
        <div
          className="fixed inset-0 z-[100] bg-navy-950/95 flex items-center justify-center p-4 md:p-12"
          onClick={() => setActive(null)}
        >
          <button onClick={() => setActive(null)} aria-label="Close"
            className="absolute top-6 right-6 text-bone hover:text-gold text-3xl leading-none">×</button>

          <button onClick={(e) => { e.stopPropagation(); setActive((active - 1 + items.length) % items.length); }}
            aria-label="Previous"
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-bone hover:text-gold text-3xl px-3 py-2">‹</button>

          <button onClick={(e) => { e.stopPropagation(); setActive((active + 1) % items.length); }}
            aria-label="Next"
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-bone hover:text-gold text-3xl px-3 py-2">›</button>

          <div className="relative max-w-6xl w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            {current.type === "video" ? (
              <video src={current.src} controls autoPlay className="max-h-[85vh] w-full" poster={current.poster} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.src} alt={current.caption ?? ""} className="max-h-[85vh] mx-auto object-contain" />
            )}
            {current.caption && (
              <p className="mt-4 text-center text-bone/70 text-sm">{current.caption}</p>
            )}
            <p className="mt-2 text-center text-bone/40 text-xs">
              {active + 1} of {items.length}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
