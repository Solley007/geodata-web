"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import type { BlogPost } from "@/lib/blog-types";

interface Props {
  post: BlogPost;
}

export default function PostHero({ post }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });
      tl.from(".ph-back", { y: 12, opacity: 0, duration: 0.6 })
        .from(".ph-eyebrow", { y: 16, opacity: 0, duration: 0.7 }, "-=0.2")
        .from(".ph-title", { y: 30, opacity: 0, duration: 1.1 }, "-=0.4")
        .from(".ph-excerpt", { y: 16, opacity: 0, duration: 0.8 }, "-=0.6")
        .from(".ph-meta", { y: 12, opacity: 0, duration: 0.7 }, "-=0.5")
        .from(
          ".ph-cover",
          { y: 30, opacity: 0, duration: 1, scale: 1.02 },
          "-=0.5"
        );
    }, root);
    return () => ctx.revert();
  }, []);

  const dateFormatted = new Date(post.date).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 pt-32 md:pt-40 pb-12 md:pb-16">
      <div className="container-editorial">
        <Link
          href="/blog"
          className="ph-back inline-flex items-center gap-2 text-xs uppercase tracking-eyebrow font-medium text-ink-muted dark:text-bone/60 hover:text-navy-900 dark:text-bone/90 transition-colors duration-300 mb-12"
        >
          <span aria-hidden>←</span> All posts
        </Link>

        <div className="max-w-4xl">
          <p className="ph-eyebrow eyebrow mb-6">{post.category}</p>
          <h1 className="ph-title text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest leading-[1.05]">
            {post.title}
          </h1>
          <p className="ph-excerpt mt-8 text-xl leading-relaxed text-ink dark:text-bone/75 max-w-3xl">
            {post.excerpt}
          </p>

          <div className="ph-meta mt-12 flex items-center flex-wrap gap-x-8 gap-y-2 border-t border-hairline dark:border-white/10 pt-6">
            <p className="text-sm text-ink-muted dark:text-bone/60">
              By <span className="text-navy-950 dark:text-bone font-medium">{post.author}</span>
              {post.authorRole && (
                <span className="text-ink-faint dark:text-bone/40"> · {post.authorRole}</span>
              )}
            </p>
            <p className="text-sm text-ink-faint dark:text-bone/40">{dateFormatted}</p>
            <p className="text-sm text-ink-faint dark:text-bone/40">{post.readingTime}</p>
          </div>
        </div>
      </div>

      {/* Cover image — full container width, dramatic but not full-bleed */}
      <div className="container-editorial mt-16 md:mt-20">
        <div className="ph-cover relative aspect-[16/9] overflow-hidden bg-navy-100 dark:bg-navy-800">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
