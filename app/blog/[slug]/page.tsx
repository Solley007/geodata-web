import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPostSlugs, getPostBySlug, getRelatedPosts } from "@/lib/blog";
import ReadingProgress from "@/components/blog/ReadingProgress";
import PostHero from "@/components/blog/PostHero";
import PostBody from "@/components/blog/PostBody";
import RelatedPosts from "@/components/blog/RelatedPosts";

interface PageProps {
  params: { slug: string };
}

// Static generation — Next.js builds a page per slug at build time.
// New post added → next deploy → page exists. No runtime cost.
export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${params.slug}`,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: [post.category],
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const related = getRelatedPosts(post.slug, post.category, 3);

  // Structured data — Article schema. Improves how Google renders the post
  // in search results (publish date, author, image card).
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Geodata World Services Limited",
      logo: {
        "@type": "ImageObject",
        url: "https://geodata.com.ng/icon-512.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://geodata.com.ng/blog/${params.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ReadingProgress targetId="article-body" />
      <PostHero post={post} />
      <PostBody post={post} />

      {/* End-of-post CTA — converts readers into leads */}
      <section className="bg-navy-950 text-bone py-24 md:py-32 border-t border-bone/10">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-12">
            <div className="col-span-12 lg:col-span-8">
              <p className="eyebrow text-bone/60 mb-6">From the journal</p>
              <h2 className="font-display text-display-md tracking-tightest leading-none">
                Want to talk through this in person?
              </h2>
              <p className="mt-8 max-w-xl text-lg text-bone/80 leading-relaxed">
                Our team is on-site at Southern Bridge City daily. Walk the
                development with us, see the show home, and have your
                questions answered directly.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="/contact"
                  className="inline-flex items-center gap-3 bg-bone dark:bg-navy-950 px-7 py-4 text-sm font-medium text-navy-950 dark:text-bone hover:bg-gold-soft transition-colors duration-400"
                >
                  Schedule a visit <span aria-hidden>→</span>
                </a>
                <a
                  href="/properties"
                  className="inline-flex items-center gap-3 px-7 py-4 text-sm font-medium text-bone border-b border-bone hover:text-gold-soft hover:border-gold-soft transition-colors duration-400"
                >
                  Browse residences
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <RelatedPosts posts={related} />
    </>
  );
}
