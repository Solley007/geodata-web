import type { MetadataRoute } from "next";

// Generated automatically — Next.js serves this at /robots.txt
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Don't waste crawler budget on API routes or 404 trampolines
        disallow: ["/api/", "/_next/", "/404"],
      },
    ],
    sitemap: "https://geodata.com.ng/sitemap.xml",
    host: "https://geodata.com.ng",
  };
}
