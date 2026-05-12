"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import type { BlogPostMeta } from "@/lib/blog-types";

interface Props {
  posts: BlogPostMeta[];
}

export default function BlogGrid({ posts }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".bg-card", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, [posts]);

  if (posts.length === 0) {
    return (
      <section className="bg-bone dark:bg-navy-950 py-32">
        <div className="container-editorial text-center">
          <p className="eyebrow text-ink-faint dark:text-bone/40 mb-6">Nothing here yet</p>
          <h2 className="font-display text-display-md text-navy-950 dark:text-bone tracking-tightest">
            No posts in this category, <em className="font-light">yet.</em>
          </h2>
        </div>
      </section>
    );
  }

  return (
    <section ref={root} className="bg-bone dark:bg-navy-950 py-20 md:py-24 border-t border-hairline dark:border-white/10">
      <div className="container-editorial">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BlogCard({ post }: { post: BlogPostMeta }) {
  const dateFormatted = new Date(post.date).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={`/blog/${post.slug}`} className="bg-card group block">
      <div className="relative aspect-[4/3] overflow-hidden bg-navy-100 dark:bg-navy-800 mb-6">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
        />
      </div>

      <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">
        {post.category} · {dateFormatted}
      </p>

      <h2 className="font-display text-2xl text-navy-950 dark:text-bone leading-tight transition-transform duration-400 ease-editorial group-hover:translate-x-1">
        {post.title}
      </h2>

      <p className="mt-4 text-ink dark:text-bone/75 leading-relaxed line-clamp-3">{post.excerpt}</p>

      <p className="mt-6 text-sm text-ink-muted dark:text-bone/60">
        {post.author} · {post.readingTime}
      </p>
    </Link>
  );
}
