import { internalQuery } from "./_generated/server";

// Bounded reads: sitemaps cap at 50,000 URLs, and we stay far below that
const MAX_ITEMS = 1000;

// Data for the dynamic sitemap served by the HTTP route in http.ts
export const getSitemapData = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [properties, articles, projects] = await Promise.all([
      ctx.db.query("properties").order("desc").take(MAX_ITEMS),
      ctx.db.query("newsArticles").withIndex("by_published", (q) => q.eq("published", true)).order("desc").take(MAX_ITEMS),
      ctx.db.query("trackRecordProjects").withIndex("by_displayOrder").take(MAX_ITEMS),
    ]);
    return {
      properties: properties.map((p) => ({ id: p._id as string, updatedAt: p._creationTime })),
      articles: articles.map((a) => ({ slug: a.slug, updatedAt: a._creationTime })),
      projects: projects.filter((p) => p.visible).map((p) => ({ slug: p.slug, updatedAt: p._creationTime })),
    };
  },
});
