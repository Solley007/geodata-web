import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// ─── OG Preview endpoint for properties ─────────────────────────────────────
// Social crawlers (WhatsApp, Telegram, Facebook) are bots that don't run JS.
// This endpoint serves a real HTML page with the property's own OG image/title.
// Real users are immediately redirected to the SPA property detail page.
http.route({
  path: "/og/property",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? "";

    const appOrigin = "https://geodata.com.ng";
    const propertyUrl = `${appOrigin}/properties/${id}`;
    const defaultImage = "https://hercules-cdn.com/file_hqjYSAKlVBBRqljHrAkEnfVn";
    const siteName = "GEODATA WORLD SERVICES LIMITED";

    if (!id) {
      return new Response(null, { status: 302, headers: { Location: `${appOrigin}/properties` } });
    }

    const property = await ctx.runQuery(internal.properties.getPropertyForOg, { id });

    if (!property) {
      return new Response(null, { status: 302, headers: { Location: `${appOrigin}/properties` } });
    }

    // Format price for display
    const price = property.price >= 1_000_000_000
      ? `₦${(property.price / 1_000_000_000).toFixed(1)}B`
      : property.price >= 1_000_000
      ? `₦${(property.price / 1_000_000).toFixed(1)}M`
      : `₦${property.price.toLocaleString()}`;

    const title = `${property.title} | ${price} – Geodata World`;
    const description = `${property.title} located in ${property.location}, ${property.state}. Listed at ${price}. View full details on Geodata World Services Limited.`;

    // Resolve fresh image URL directly in this HTTP action
    let image = defaultImage;
    if (property.featuredImageStorageId) {
      const resolved = await ctx.storage.getUrl(property.featuredImageStorageId as string);
      if (resolved) image = resolved;
    } else if (property.featuredImage && property.featuredImage.trim() !== "") {
      image = property.featuredImage;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${escapeHtml(siteName)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(propertyUrl)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <!-- NOTE: intentionally no <meta http-equiv="refresh"> here. Facebook/WhatsApp's
       crawler follows that tag as a redirect and re-scrapes the destination SPA page
       (which has generic site-wide OG tags), overriding this property's title/image.
       Real users are still redirected instantly via the script below (crawlers don't run JS). -->
</head>
<body>
  <p>Redirecting to property… <a href="${escapeHtml(propertyUrl)}">Click here if not redirected.</a></p>
  <script>window.location.replace("${escapeHtml(propertyUrl)}");</script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }),
});

// ─── OG Preview endpoint for blog articles ───────────────────────────────────
// Social media crawlers (WhatsApp, Facebook, Twitter, LinkedIn) are bots that
// don't execute JavaScript. This endpoint serves a real HTML page with correct
// Open Graph meta tags so shared links show the article title, image & excerpt.
// Real users are auto-redirected to the actual SPA article page.
http.route({
  path: "/og/news",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") ?? "";

    const appOrigin = "https://geodata.com.ng";
    const articleUrl = `${appOrigin}/news/${slug}`;
    const defaultImage = "https://hercules-cdn.com/file_hqjYSAKlVBBRqljHrAkEnfVn";
    const siteName = "GEODATA WORLD SERVICES LIMITED";

    if (!slug) {
      return new Response(null, { status: 302, headers: { Location: appOrigin } });
    }

    // Use internal query to get raw fields including imageStorageId
    const article = await ctx.runQuery(internal.cms.getNewsArticleForOg, { slug });

    if (!article) {
      return new Response(null, { status: 302, headers: { Location: `${appOrigin}/news` } });
    }

    const title = article.title ? `${article.title} | Geodata World` : siteName;
    const description = article.excerpt ?? `Read this article on ${siteName}`;

    // Resolve image fresh inside this action for a non-expiring URL.
    // imageStorageId → resolve via storage; image → direct URL; else logo fallback.
    let image = defaultImage;
    if (article.imageStorageId) {
      const resolved = await ctx.storage.getUrl(article.imageStorageId as string);
      if (resolved) image = resolved;
    } else if (article.image && article.image.trim() !== "") {
      image = article.image;
    }

    // Strip HTML tags from excerpt for clean OG description
    const cleanDescription = description.replace(/<[^>]*>/g, "").slice(0, 200);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} – ${siteName}</title>
  <meta name="description" content="${escapeHtml(cleanDescription)}" />

  <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="${escapeHtml(siteName)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(cleanDescription)}" />
  <meta property="og:url" content="${escapeHtml(articleUrl)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(cleanDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <!-- NOTE: intentionally no <meta http-equiv="refresh"> here. Facebook/WhatsApp's
       crawler follows that tag as a redirect and re-scrapes the destination SPA page
       (which has generic site-wide OG tags), overriding this article's title/image.
       Real users are still redirected instantly via the script below (crawlers don't run JS). -->
</head>
<body>
  <p>Redirecting to article… <a href="${escapeHtml(articleUrl)}">Click here if not redirected.</a></p>
  <script>window.location.replace("${escapeHtml(articleUrl)}");</script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Cache for 5 minutes so repeated crawler hits are fast
        "Cache-Control": "public, max-age=300",
      },
    });
  }),
});

// ─── Dynamic sitemap ─────────────────────────────────────────────────────────
// Lists the main pages plus every property, published news article and track
// record project, so new listings are discoverable by search engines right away.
const SITE_ORIGIN = "https://geodata.com.ng";

const PROJECT_SITEMAP_SLUGS = ["cool-army-estate","ize-hostel","southern-bridge-estate","country-court-estate","kashere-bungalows","sil-estate","mabushi-shopping-complex","cbn-maitama-portfolio","firs-office-programme","federal-university-kashere","okpella-community-centre","kogi-raamp-rural-roads","aku-agro-logistic-centre"];

const STATIC_PAGES: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/real-estate", changefreq: "daily", priority: "0.9" },
  { path: "/southern-bridge-city", changefreq: "weekly", priority: "0.9" },
  { path: "/mortgage", changefreq: "monthly", priority: "0.8" },
  { path: "/updates", changefreq: "weekly", priority: "0.7" },
  { path: "/properties", changefreq: "daily", priority: "0.9" },
  { path: "/news", changefreq: "daily", priority: "0.8" },
  { path: "/projects", changefreq: "weekly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/services", changefreq: "monthly", priority: "0.7" },
  { path: "/diaspora", changefreq: "weekly", priority: "0.7" },
  { path: "/gallery", changefreq: "weekly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/faqs", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/sitemap", changefreq: "monthly", priority: "0.3" },
];

function urlEntry(path: string, changefreq: string, priority: string, lastmod?: number): string {
  const mod = lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString()}</lastmod>` : "";
  return `  <url>\n    <loc>${escapeHtml(SITE_ORIGIN + path)}</loc>${mod}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

http.route({
  path: "/sitemap.xml",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const data = await ctx.runQuery(internal.sitemap.getSitemapData, {});
    const entries = [
      ...STATIC_PAGES.map((p) => urlEntry(p.path, p.changefreq, p.priority)),
      ...data.properties.map((p) => urlEntry(`/properties/${p.id}`, "weekly", "0.8", p.updatedAt)),
      ...data.articles.map((a) => urlEntry(`/news/${encodeURIComponent(a.slug)}`, "monthly", "0.6", a.updatedAt)),
      ...PROJECT_SITEMAP_SLUGS.map((slug) => urlEntry(`/projects/${slug}`, "monthly", "0.6")),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
    return new Response(xml, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default http;
