"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import type { BlogPost } from "@/lib/blog-types";

interface Props {
  post: BlogPost;
}

/**
 * PostBody
 * ----
 * Two-column layout:
 *  - LEFT (sticky): author, share buttons, table of contents
 *  - RIGHT: rendered article HTML in a styled .prose container
 *
 * The .prose class (defined in globals.css) is where editorial typography
 * lives — measure, line-height, heading rhythm, list bullet styling,
 * blockquote treatment, code blocks, etc.
 */
export default function PostBody({ post }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".pb-fade", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const handleShare = (platform: "twitter" | "linkedin" | "copy") => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = post.title;

    if (platform === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        "_blank"
      );
    } else if (platform === "linkedin") {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        "_blank"
      );
    } else if (platform === "copy") {
      navigator.clipboard.writeText(url);
    }
  };

  return (
    <section ref={root} id="article-body" className="bg-bone dark:bg-navy-950 py-20 md:py-24">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-x-12 items-start">
          {/* LEFT — sticky meta column (desktop only) */}
          <aside className="hidden lg:block col-span-3 sticky top-32 self-start">
            <div className="pb-fade space-y-10">
              <div>
                <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">Written by</p>
                <p className="font-display text-xl text-navy-950 dark:text-bone leading-tight">
                  {post.author}
                </p>
                {post.authorRole && (
                  <p className="text-sm text-ink-muted dark:text-bone/60 mt-1">{post.authorRole}</p>
                )}
              </div>

              <div>
                <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">Share</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleShare("twitter")}
                    className="text-left text-sm text-ink dark:text-bone/75 hover:text-navy-900 dark:text-bone/90 transition-colors py-1"
                  >
                    Twitter
                  </button>
                  <button
                    onClick={() => handleShare("linkedin")}
                    className="text-left text-sm text-ink dark:text-bone/75 hover:text-navy-900 dark:text-bone/90 transition-colors py-1"
                  >
                    LinkedIn
                  </button>
                  <button
                    onClick={() => handleShare("copy")}
                    className="text-left text-sm text-ink dark:text-bone/75 hover:text-navy-900 dark:text-bone/90 transition-colors py-1"
                  >
                    Copy link
                  </button>
                </div>
              </div>

              {post.headings.length > 0 && (
                <div>
                  <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">In this post</p>
                  <ul className="space-y-2">
                    {post.headings
                      .filter((h) => h.depth === 2)
                      .map((h) => (
                        <li key={h.id}>
                          <a
                            href={`#${h.id}`}
                            className="text-sm text-ink-muted dark:text-bone/60 hover:text-navy-900 dark:text-bone/90 transition-colors leading-snug block"
                          >
                            {h.text}
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT — article body */}
          <div className="col-span-12 lg:col-span-8 lg:col-start-5">
            <article
              className="pb-fade prose"
              dangerouslySetInnerHTML={{ __html: post.html }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
