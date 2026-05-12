// ---------------------------------------------------------------------------
// Blog types and constants — CLIENT-SAFE
// ---------------------------------------------------------------------------
// Pure types and small constants. No filesystem access, no Node built-ins,
// no markdown processing libraries.
//
// IMPORT FROM HERE in any "use client" component.
// IMPORT FROM @/lib/blog only in server components / page files.
// ---------------------------------------------------------------------------

export type BlogCategory =
  | "Development"
  | "Investment"
  | "Mortgage"
  | "Lifestyle"
  | "Company";

export interface BlogFrontmatter {
  title: string;
  excerpt: string;
  date: string;
  author: string;
  authorRole?: string;
  category: BlogCategory;
  coverImage: string;
  featured?: boolean;
}

export interface BlogPostMeta extends BlogFrontmatter {
  slug: string;
  readingTime: string;
  readingMinutes: number;
}

export interface BlogPost extends BlogPostMeta {
  html: string;
  headings: { id: string; text: string; depth: number }[];
}

export const BLOG_CATEGORIES: ("All" | BlogCategory)[] = [
  "All",
  "Development",
  "Investment",
  "Mortgage",
  "Lifestyle",
  "Company",
];
