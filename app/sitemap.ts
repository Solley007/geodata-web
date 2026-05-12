import type { MetadataRoute } from "next";
import { getAllPostsMeta } from "@/lib/blog";
import { PROPERTIES } from "@/lib/properties-list";
import { getAllProperties } from "@/lib/property-data";
import { PROJECTS } from "@/lib/projects-data";

const BASE_URL = "https://geodata.com.ng";

// Generated automatically — Next.js serves this at /sitemap.xml
// Includes all static routes + every blog post + every property page
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static routes — these are the editorial backbone of the site
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/properties`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/projects`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/mortgage`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
  ];

  // Property detail pages — generated from the canonical property-data source
  const propertyRoutes: MetadataRoute.Sitemap = getAllProperties().map((p) => ({
    url: `${BASE_URL}/properties/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Project detail pages
  const projectRoutes: MetadataRoute.Sitemap = PROJECTS.map((p) => ({
    url: `${BASE_URL}/projects/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Blog post pages — lastModified pulled from frontmatter
  const blogRoutes: MetadataRoute.Sitemap = getAllPostsMeta().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...propertyRoutes, ...projectRoutes, ...blogRoutes];
}
