"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import type { BlogPostMeta } from "@/lib/blog-types";

interface Props {
  post: BlogPostMeta;
}

export default function FeaturedPost({ post }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".fp-fade", {
        y: 32,
        opacity: 0,
        duration: 1,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const dateFormatted = new Date(post.date).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-20 md:py-24">
      <div className="container-editorial">
        <Link href={`/blog/${post.slug}`} className="group block">
          <div className="grid grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Image — 2/3 width, dominant */}
            <div className="fp-fade col-span-12 lg:col-span-8 relative aspect-[4/3] overflow-hidden bg-navy-100 dark:bg-navy-800">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                priority
                sizes="(min-width: 1024px) 65vw, 100vw"
                className="object-cover transition-transform duration-1200 ease-editorial group-hover:scale-[1.03]"
              />
              <div className="absolute top-6 left-6 inline-flex items-center px-3 py-1.5 bg-bone/95 backdrop-blur-sm">
                <span className="text-[10px] uppercase tracking-eyebrow font-medium text-navy-900 dark:text-bone/90">
                  Featured · {post.category}
                </span>
              </div>
            </div>

            {/* Content — 1/3 width, breathes */}
            <div className="col-span-12 lg:col-span-4">
              <p className="fp-fade eyebrow text-ink-faint dark:text-bone/40 mb-6">
                {dateFormatted} · {post.readingTime}
              </p>
              <h2 className="fp-fade font-display text-display-md text-navy-950 dark:text-bone tracking-tightest leading-tight transition-transform duration-500 ease-editorial group-hover:-translate-y-1">
                {post.title}
              </h2>
              <p className="fp-fade mt-6 text-lg leading-relaxed text-ink dark:text-bone/75">
                {post.excerpt}
              </p>
              <p className="fp-fade mt-10 text-sm text-ink-muted dark:text-bone/60">
                By {post.author}
                {post.authorRole && (
                  <span className="text-ink-faint dark:text-bone/40"> · {post.authorRole}</span>
                )}
              </p>
              <div className="fp-fade mt-8 inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone/90 border-b border-navy-900 dark:border-white/20 pb-1 group-hover:text-gold-dark group-hover:border-gold-dark transition-colors duration-400">
                Read article
                <span aria-hidden className="transition-transform duration-400 group-hover:translate-x-1">
                  →
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
