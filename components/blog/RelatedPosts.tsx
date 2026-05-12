"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import type { BlogPostMeta } from "@/lib/blog-types";

interface Props {
  posts: BlogPostMeta[];
}

export default function RelatedPosts({ posts }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".rp-fade", {
        y: 30,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  if (posts.length === 0) return null;

  return (
    <section ref={root} className="bg-bone-100 dark:bg-navy-900 py-24 md:py-32 border-t border-hairline dark:border-white/10">
      <div className="container-editorial">
        <div className="rp-fade flex items-end justify-between mb-16 flex-wrap gap-6">
          <div>
            <p className="eyebrow mb-4">Continue reading</p>
            <h2 className="font-display text-display-md text-navy-950 dark:text-bone tracking-tightest">
              Related <em className="font-light">posts.</em>
            </h2>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone/90 hover:text-gold-dark transition-colors duration-400 pb-2 border-b border-navy-900 dark:border-white/20 hover:border-gold-dark"
          >
            View blog
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="rp-fade group block">
              <div className="relative aspect-[4/3] overflow-hidden bg-navy-100 dark:bg-navy-800 mb-6">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="(min-width: 768px) 30vw, 100vw"
                  className="object-cover transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
                />
              </div>
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">
                {post.category} · {post.readingTime}
              </p>
              <h3 className="font-display text-2xl text-navy-950 dark:text-bone leading-tight transition-transform duration-400 ease-editorial group-hover:translate-x-1">
                {post.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
