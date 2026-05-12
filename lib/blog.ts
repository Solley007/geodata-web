// ---------------------------------------------------------------------------
// Blog post parser — SERVER ONLY
// ---------------------------------------------------------------------------
// Reads markdown files from /content/blog. Uses Node's fs module, so this
// file must NEVER be imported from a client component.
//
// CLIENT COMPONENTS: import types from "@/lib/blog-types" instead.
// SERVER COMPONENTS: import either parser functions or types from here.
//
// The "server-only" import below is a guard: if any client component
// accidentally pulls this file in, the build fails immediately with a
// clear error pointing at the offending file (much better than the
// cryptic "Module not found: fs" we used to see).
// ---------------------------------------------------------------------------

import "server-only";

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";

import type {
  BlogCategory,
  BlogFrontmatter,
  BlogPostMeta,
  BlogPost,
} from "./blog-types";

// Re-export types and constants so server-side imports of "@/lib/blog"
// continue to work without changes
export type { BlogCategory, BlogFrontmatter, BlogPostMeta, BlogPost };
export { BLOG_CATEGORIES } from "./blog-types";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

/** List all post slugs (filenames without extension) */
export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

/** Get all post metadata, sorted newest first */
export function getAllPostsMeta(): BlogPostMeta[] {
  return getAllPostSlugs()
    .map((slug) => {
      const filePath = path.join(BLOG_DIR, `${slug}.md`);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);
      const frontmatter = data as BlogFrontmatter;
      const stats = readingTime(content);

      return {
        slug,
        ...frontmatter,
        readingTime: stats.text,
        readingMinutes: Math.ceil(stats.minutes),
      };
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

/** Get a single post by slug, fully rendered with HTML body and TOC headings */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const frontmatter = data as BlogFrontmatter;
  const stats = readingTime(content);

  // Extract headings BEFORE rendering — used for the article TOC if needed
  const headings = extractHeadings(content);

  // Process markdown -> HTML with the full editorial pipeline
  const processed = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      properties: { className: ["heading-anchor"] },
    })
    .use(rehypePrettyCode, {
      theme: "github-dark-dimmed",
      keepBackground: false,
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content);

  return {
    slug,
    ...frontmatter,
    readingTime: stats.text,
    readingMinutes: Math.ceil(stats.minutes),
    html: String(processed),
    headings,
  };
}

/** Pull H2/H3 headings out of markdown source for table-of-contents rendering */
function extractHeadings(markdown: string) {
  const headings: { id: string; text: string; depth: number }[] = [];
  const lines = markdown.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!match) continue;

    const depth = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    headings.push({ id, text, depth });
  }

  return headings;
}

/** Get related posts — same category, excluding the current one */
export function getRelatedPosts(
  currentSlug: string,
  category: BlogCategory,
  limit = 3
): BlogPostMeta[] {
  return getAllPostsMeta()
    .filter((p) => p.slug !== currentSlug && p.category === category)
    .slice(0, limit);
}
