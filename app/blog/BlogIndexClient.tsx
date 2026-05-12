"use client";

import { useState, useMemo } from "react";
import BlogHeader from "@/components/blog/BlogHeader";
import FeaturedPost from "@/components/blog/FeaturedPost";
import BlogGrid from "@/components/blog/BlogGrid";
import type { BlogPostMeta, BlogCategory } from "@/lib/blog-types";

interface Props {
  posts: BlogPostMeta[];
}

export default function BlogIndexClient({ posts }: Props) {
  const [category, setCategory] = useState<"All" | BlogCategory>("All");

  const filtered = useMemo(() => {
    if (category === "All") return posts;
    return posts.filter((p) => p.category === category);
  }, [posts, category]);

  // Featured post — only when looking at "All". Otherwise we just show the grid.
  const featured = category === "All" ? filtered.find((p) => p.featured) ?? filtered[0] : null;
  const rest = featured ? filtered.filter((p) => p.slug !== featured.slug) : filtered;

  return (
    <>
      <BlogHeader
        activeCategory={category}
        onCategoryChange={setCategory}
        count={filtered.length}
      />
      {featured && <FeaturedPost post={featured} />}
      <BlogGrid posts={rest} />
    </>
  );
}
