import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Calendar, ArrowLeft, User, Share2, Link2, MessageCircle, CheckCircle2, Send } from "lucide-react";
import { FacebookLogo, TwitterLogo, LinkedinLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { ensureHtml } from "@/components/ui/rich-text-editor.tsx";
import Navbar from "../../home/_components/Navbar.tsx";
import Footer from "../../home/_components/Footer.tsx";
import WhatsAppButton from "../../home/_components/WhatsAppButton.tsx";
import { useSeo, useJsonLd } from "@/hooks/use-seo.ts";
import { CONVEX_SITE_URL } from "@/lib/convex-site";

// ─── Share Button ─────────────────────────────────────────────────────────
// ogUrl: the Convex HTTP endpoint that serves real og:image/title/description
//        to social crawlers. Real users clicking it are redirected to the article.
// cleanUrl: only used as the visible display text in the copy toast.
function ShareButtons({ title, ogUrl }: { title: string; ogUrl: string; cleanUrl?: string }) {
  const encoded = encodeURIComponent(ogUrl);
  const encodedTitle = encodeURIComponent(title);

  // Copy the OG URL — crawlers (WhatsApp, Telegram, iMessage, Slack, etc.)
  // follow it and get the article image. Real users get redirected instantly.
  const copy = () => {
    navigator.clipboard.writeText(ogUrl).then(() => toast.success("Link copied!"));
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5"><Share2 size={14} />Share:</span>
      <a href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encoded}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        WhatsApp
      </a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors">
        <FacebookLogo size={14} /> Facebook
      </a>
      <a href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encoded}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-medium hover:bg-sky-100 transition-colors">
        <TwitterLogo size={14} /> X / Twitter
      </a>
      <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encoded}&title=${encodedTitle}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 text-xs font-medium hover:bg-blue-100 transition-colors">
        <LinkedinLogo size={14} /> LinkedIn
      </a>
      <button onClick={copy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer">
        <Link2 size={14} /> Copy Link
      </button>
    </div>
  );
}

// ─── Comments Section ─────────────────────────────────────────────────────
type CommentDoc = {
  _id: Id<"blogComments">;
  name: string;
  content: string;
  _creationTime: number;
};

function CommentsSection({ articleId }: { articleId: Id<"newsArticles"> }) {
  const comments = useQuery(api.cms.listApprovedComments, { articleId });
  const addComment = useMutation(api.cms.addComment);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) { toast.error("Name and comment are required"); return; }
    setSubmitting(true);
    try {
      await addComment({ articleId, name: name.trim(), email: email.trim() || undefined, content: content.trim() });
      setSubmitted(true);
      setName(""); setEmail(""); setContent("");
    } catch {
      toast.error("Failed to submit comment");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        <MessageCircle size={20} className="text-[var(--brand)]" />
        Comments {comments && comments.length > 0 && <span className="text-base font-medium text-gray-400">({comments.length})</span>}
      </h3>

      {/* Approved comments */}
      {comments === undefined ? (
        <div className="space-y-4 mb-8">{[1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : comments.length === 0 ? (
        <p className="text-gray-400 text-sm mb-8 italic">No comments yet. Be the first to share your thoughts!</p>
      ) : (
        <div className="space-y-4 mb-8">
          {(comments as CommentDoc[]).map((c) => (
            <div key={c._id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] font-bold text-sm">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{c.name}</span>
                </div>
                <span className="text-xs text-gray-400">{formatDate(c._creationTime)}</span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comment form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h4 className="font-bold text-gray-900 mb-4">Leave a Comment</h4>
        {submitted ? (
          <div className="flex items-center gap-3 py-4 text-green-700 bg-green-50 rounded-xl px-4">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">Thank you! Your comment has been submitted for review and will appear shortly.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name *</label>
                <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Email (optional)</label>
                <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Comment *</label>
              <Textarea rows={4} placeholder="Share your thoughts…" value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <p className="text-xs text-gray-400">Comments are reviewed before appearing publicly.</p>
            <Button type="submit" disabled={submitting} className="bg-[var(--brand)] text-white gap-2">
              <Send size={14} />
              {submitting ? "Submitting…" : "Post Comment"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Article Page ────────────────────────────────────────────────────

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = useQuery(api.cms.getNewsArticle, slug ? { slug } : "skip");

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });

  // Clean URL: shown when copying — looks professional in messages/emails
  const cleanUrl = slug
    ? `https://geodata.com.ng/news/${encodeURIComponent(slug)}`
    : (typeof window !== "undefined" ? window.location.href : "");

  // OG endpoint URL: used for social shares so crawlers (WhatsApp, Facebook etc.)
  // receive proper og:image, og:title, og:description meta tags.
  // Real users who click the link are auto-redirected to the clean article URL.
  const CONVEX_SITE = CONVEX_SITE_URL;
  const ogShareUrl = slug
    ? `${CONVEX_SITE}/og/news?slug=${encodeURIComponent(slug)}`
    : (typeof window !== "undefined" ? window.location.href : "");

  useSeo({
    title: article ? (article.seoTitle || `${article.title} | Geodata World Services`) : "News & Insights | Geodata World Services",
    description: article ? (article.seoDescription || article.excerpt) : "Market updates, investment guides, and company announcements from Geodata World Services.",
    canonicalPath: slug ? `/news/${slug}` : "/news",
  });

  // Article JSON-LD — datePublished uses _creationTime, the only date the
  // schema actually stores for a news article.
  useJsonLd(
    "ld-article",
    article
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt,
          image: article.imageUrl ? [article.imageUrl] : undefined,
          datePublished: new Date(article._creationTime).toISOString(),
          dateModified: new Date(article._creationTime).toISOString(),
          author: { "@type": "Person", name: article.author },
          publisher: {
            "@type": "Organization",
            name: "Geodata World Services Limited",
            logo: { "@type": "ImageObject", url: "/media/file_hqjYSAKlVBBRqljHrAkEnfVn.png" },
          },
          mainEntityOfPage: cleanUrl,
        }
      : null
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {article === undefined ? (
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : article === null ? (
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Article Not Found</h2>
          <p className="text-gray-500 mb-6">This article may have been removed or the link is incorrect.</p>
          <Link to="/news" className="text-[var(--brand)] font-semibold hover:underline flex items-center gap-1 justify-center">
            <ArrowLeft size={16} />Back to News
          </Link>
        </div>
      ) : (
        <>
          {/* Blue header bar — always shown */}
          <div className="bg-[var(--brand)] py-8 px-6">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 text-blue-200 text-sm mb-3">
                <Link to="/" className="hover:text-white">Home</Link>
                <span>/</span>
                <Link to="/news" className="hover:text-white">News</Link>
                <span>/</span>
                <span className="text-white truncate max-w-[220px]">{article.title}</span>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-xs mb-3">{article.category}</Badge>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                {article.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-blue-200 text-xs flex items-center gap-1"><Calendar size={11} />{formatDate(article._creationTime)}</span>
                <span className="text-blue-200 text-xs flex items-center gap-1"><User size={11} />{article.author}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

            {/* Excerpt */}
            {article.excerpt && (
              <p className="text-lg text-gray-600 border-l-4 border-[var(--brand)] pl-4 mb-8 italic leading-relaxed">{article.excerpt}</p>
            )}

            {/* Featured image — between excerpt and content */}
            {article.imageUrl && (
              <div className="mb-8 rounded-2xl overflow-hidden shadow-md">
                <img src={article.imageUrl} alt={article.title} className="w-full object-cover max-h-[420px]" />
              </div>
            )}

            {/* Body — rendered as formatted HTML with professional typography */}
            <style>{`
              .article-prose { color: #374151; font-size: 1rem; line-height: 1.75; }
              .article-prose h1 { font-family: 'Playfair Display', serif; font-size: 1.75rem; font-weight: 700; color: #111; margin: 1.75rem 0 0.75rem; }
              .article-prose h2 { font-family: 'Playfair Display', serif; font-size: 1.35rem; font-weight: 700; color: #111; margin: 1.5rem 0 0.6rem; }
              .article-prose h3 { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; color: #111; margin: 1.25rem 0 0.5rem; }
              .article-prose p { margin: 0 0 1rem; text-align: justify; }
              .article-prose ul { margin: 0 0 1rem 1.5rem; list-style: disc; }
              .article-prose ol { margin: 0 0 1rem 1.5rem; list-style: decimal; }
              .article-prose li { margin-bottom: 0.35rem; }
              .article-prose blockquote { border-left: 4px solid var(--brand); padding: 0.5rem 0 0.5rem 1rem; margin: 1rem 0; font-style: italic; color: #4B5563; background: #eff6ff; border-radius: 0 8px 8px 0; }
              .article-prose a { color: var(--brand); text-decoration: underline; }
              .article-prose hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
              .article-prose strong { font-weight: 700; color: #111; }
              .article-prose em { font-style: italic; }
              .article-prose u { text-decoration: underline; }
              .article-prose s { text-decoration: line-through; }
            `}</style>
            <div
              className="article-prose"
              dangerouslySetInnerHTML={{ __html: ensureHtml(article.content) }}
            />

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-gray-200">
                <span className="text-sm text-gray-500 font-medium">Tags:</span>
                {article.tags.map((tag) => (
                  <Badge key={tag} className="bg-gray-100 text-gray-600 border-0 text-xs">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Share Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <ShareButtons title={article.title} ogUrl={ogShareUrl} cleanUrl={cleanUrl} />
            </div>

            {/* Comments */}
            <CommentsSection articleId={article._id} />

            {/* Back link */}
            <div className="mt-10">
              <Link to="/news" className="inline-flex items-center gap-2 text-[var(--brand)] font-semibold hover:gap-3 transition-all text-sm">
                <ArrowLeft size={15} />Back to all articles
              </Link>
            </div>
          </div>
        </>
      )}

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
