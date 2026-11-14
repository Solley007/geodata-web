import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Calendar, Tag, ArrowRight, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import Navbar from "../home/_components/Navbar.tsx";
import Footer from "../home/_components/Footer.tsx";
import WhatsAppButton from "../home/_components/WhatsAppButton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";

const CATEGORIES = ["All", "Market Insights", "Investment", "Legal Guide", "Company News", "Buyer Guide", "Lifestyle", "Events", "Announcements"];
const PAGE_SIZE = 9;

export default function NewsPage() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");

  useSeo({
    title: "News & Insights | Geodata World Services",
    description:
      "Market updates, investment guides, legal tips, and company announcements from Geodata World Services, Nigeria's trusted real estate company.",
    canonicalPath: "/news",
  });

  const { results: articles, status, loadMore } = usePaginatedQuery(
    api.cms.listNewsArticlesPaginated,
    { category: cat },
    { initialNumItems: PAGE_SIZE }
  );

  const isLoading = status === "LoadingFirstPage";
  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

  const filtered = articles.filter((a) =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.excerpt ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const featured = !search ? (filtered.find((a) => a.featured) ?? filtered[0]) : undefined;
  const rest = filtered.filter((a) => a._id !== featured?._id);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-[var(--brand)] py-14 px-6 sm:px-10 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-blue-200 text-sm mb-3">
            <Link to="/" className="hover:text-white">Home</Link><span>/</span><span className="text-white">News & Blog</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>News & Insights</h1>
          <p className="text-blue-100">Market updates, investment guides, and company announcements.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-10">

        {/* Search & Category Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => { setCat(c); setSearch(""); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${cat === c ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand)]/50"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-8">
            <Skeleton className="w-full h-80 rounded-3xl" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          </div>
        )}

        {!isLoading && (
          <>
            {/* Featured article */}
            {featured && !search && (
              <div className="mb-12 rounded-3xl overflow-hidden shadow-xl relative group cursor-pointer">
                <img
                  src={featured.imageUrl ?? undefined}
                  alt={featured.title}
                  width={1200}
                  height={384}
                  className="w-full h-72 sm:h-96 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111]/80 via-[#111]/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <Badge className="bg-[var(--brand)] text-white text-xs border-0 mb-3">{featured.category}</Badge>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{featured.title}</h2>
                  <p className="text-white/70 text-sm mb-4 max-w-2xl hidden sm:block">{featured.excerpt}</p>
                  <Link to={`/news/${featured.slug}`} className="inline-flex items-center gap-1.5 text-white font-medium text-sm bg-[var(--brand)] px-4 py-2 rounded-xl hover:bg-[var(--brand-dark)] transition-colors">
                    Read Article <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg font-medium">No articles found</p>
                <p className="text-sm mt-1">Try a different category or search term.</p>
              </div>
            )}

            {/* Articles Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((article, i) => (
                <motion.div
                  key={article._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % PAGE_SIZE) * 0.06 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group"
                >
                  <div className="h-44 overflow-hidden bg-gray-100">
                    {article.imageUrl
                      ? <img src={article.imageUrl} alt={article.title} width={400} height={176} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
                      : <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                    }
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-[var(--brand)]/10 text-[var(--brand)] text-xs border-0">
                        <Tag size={10} className="mr-1" />{article.category}
                      </Badge>
                      <span className="text-gray-400 text-xs flex items-center gap-1">
                        <Calendar size={10} />{formatDate(article._creationTime)}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[var(--brand)] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{article.excerpt}</p>
                    <Link to={`/news/${article.slug}`} aria-label={`Read article: ${article.title}`} className="inline-flex items-center gap-1 text-[var(--brand)] text-sm font-semibold hover:gap-2 transition-all">
                      Read More <ArrowRight size={14} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Load More */}
            {(canLoadMore || isLoadingMore) && !search && (
              <div className="flex justify-center mt-12">
                <Button
                  onClick={() => loadMore(PAGE_SIZE)}
                  disabled={isLoadingMore}
                  variant="ghost"
                  className="border border-gray-200 hover:border-[var(--brand)] hover:text-[var(--brand)] px-8 py-3 rounded-xl font-semibold text-sm gap-2 cursor-pointer"
                >
                  {isLoadingMore ? (
                    <><Loader2 size={15} className="animate-spin" /> Loading...</>
                  ) : (
                    <>Load More Articles <ArrowRight size={14} /></>
                  )}
                </Button>
              </div>
            )}

            {/* All loaded indicator */}
            {status === "Exhausted" && filtered.length > PAGE_SIZE && !search && (
              <p className="text-center text-sm text-gray-400 mt-10">You&apos;ve reached the end · {filtered.length} articles</p>
            )}
          </>
        )}
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
