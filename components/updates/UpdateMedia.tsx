"use client";

import { useState } from "react";
import Image from "next/image";
import type { SiteUpdate } from "@/lib/site-updates-types";
import { cloudinaryHLSUrl } from "@/lib/site-updates-types";
import HLSVideoPlayer from "@/components/shared/HLSVideoPlayer";

export default function UpdateMedia({ update }: { update: SiteUpdate }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (update.mediaType === "video" && update.videoUrl) {
    return (
      <div className="relative w-full aspect-video bg-navy-950 overflow-hidden">
        <HLSVideoPlayer
          src={cloudinaryHLSUrl(update.videoUrl)}
          fallbackSrc={update.videoUrl}
          poster={update.coverImage}
          controls
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
      </div>
    );
  }

  if (update.mediaType === "gallery" && update.gallery && update.gallery.length > 0) {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {update.gallery.map((url, i) => (
            <button
              key={i}
              onClick={() => setLightboxIdx(i)}
              className={`relative bg-navy-100 dark:bg-navy-900 overflow-hidden ${
                i === 0 ? "md:col-span-2 aspect-[16/9]" : "aspect-[4/3]"
              }`}
            >
              <Image
                src={url}
                alt={`${update.title} — photo ${i + 1}`}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                unoptimized
                className="object-cover hover:scale-[1.02] transition-transform duration-1000"
              />
            </button>
          ))}
        </div>

        {/* Lightbox */}
        {lightboxIdx !== null && (
          <div
            className="fixed inset-0 z-[150] bg-navy-950/95 flex items-center justify-center p-6"
            onClick={() => setLightboxIdx(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={update.gallery[lightboxIdx]}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
            <button
              onClick={() => setLightboxIdx(null)}
              className="absolute top-6 right-6 text-bone text-2xl"
              aria-label="Close"
            >
              ✕
            </button>
            {update.gallery.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + update.gallery!.length) % update.gallery!.length); }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-bone text-2xl bg-navy-950/50 w-10 h-10 flex items-center justify-center"
                  aria-label="Previous"
                >
                  ←
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx + 1) % update.gallery!.length); }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-bone text-2xl bg-navy-950/50 w-10 h-10 flex items-center justify-center"
                  aria-label="Next"
                >
                  →
                </button>
              </>
            )}
          </div>
        )}
      </>
    );
  }

  // Single photo
  return (
    <div className="relative w-full aspect-[16/9] bg-navy-100 dark:bg-navy-900 overflow-hidden">
      <Image
        src={update.coverImage}
        alt={update.title}
        fill
        sizes="100vw"
        priority
        unoptimized
        className="object-cover"
      />
    </div>
  );
}
