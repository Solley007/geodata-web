"use client";

import Link from "next/link";
import Image from "next/image";
import { PROJECTS } from "@/lib/projects-data";
import type { SiteUpdate } from "@/lib/site-updates-types";
import { formatUpdateDate } from "@/lib/site-updates-types";

export default function UpdateCard({ update }: { update: SiteUpdate }) {
  const project = PROJECTS.find((p) => p.slug === update.projectSlug);
  return (
    <Link
      href={`/updates/${update.slug}`}
      className="group block"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-navy-100 dark:bg-navy-900 mb-5">
        <Image
          src={update.coverImage}
          alt={update.title}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          unoptimized
          className="object-cover transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
        />
        {update.mediaType === "video" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/15">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-bone/95 dark:bg-navy-950/95 text-navy-950 dark:text-bone">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </div>
        )}
        {update.mediaType === "gallery" && (
          <div className="absolute top-3 right-3 bg-bone/95 dark:bg-navy-950/95 text-navy-950 dark:text-bone text-[10px] uppercase tracking-widest px-2 py-1">
            {update.gallery?.length ?? 0} photos
          </div>
        )}
      </div>
      <p className="text-[11px] uppercase tracking-widest text-ink-faint dark:text-bone/40 mb-2">
        {project?.title ?? "Geodata"}{" · "}{formatUpdateDate(update.date)}
      </p>
      <h3 className="text-lg md:text-xl font-display text-navy-950 dark:text-bone leading-tight group-hover:text-gold-dark dark:group-hover:text-gold transition-colors duration-400">
        {update.title}
      </h3>
    </Link>
  );
}
