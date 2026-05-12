import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { readSiteUpdates, sortByDate } from "@/lib/site-updates";
import { formatUpdateDate } from "@/lib/site-updates-types";
import { PROJECTS } from "@/lib/projects-data";
import UpdateCard from "@/components/updates/UpdateCard";
import UpdateMedia from "@/components/updates/UpdateMedia";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return readSiteUpdates().map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const update = readSiteUpdates().find((u) => u.slug === slug);
  if (!update) return { title: "Update — Geodata" };
  return {
    title: `${update.title} — Geodata Updates`,
    description: update.body.slice(0, 160) || `An update from ${update.projectSlug}.`,
    openGraph: {
      title:   update.title,
      images:  [update.coverImage],
    },
  };
}

export default async function UpdatePage({ params }: PageProps) {
  const { slug } = await params;
  const all = readSiteUpdates();
  const update = all.find((u) => u.slug === slug);
  if (!update) notFound();

  const project = PROJECTS.find((p) => p.slug === update.projectSlug);
  const related = sortByDate(all.filter((u) => u.id !== update.id)).slice(0, 3);

  return (
    <main className="bg-bone dark:bg-navy-950 pt-32 pb-32 md:pt-40">
      <article className="container-editorial">

        {/* Breadcrumb */}
        <nav className="mb-10">
          <Link
            href="/updates"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-ink-muted dark:text-bone/60 hover:text-gold-dark dark:hover:text-gold transition-colors"
          >
            <span aria-hidden>←</span> All updates
          </Link>
        </nav>

        {/* Header */}
        <header className="max-w-3xl mb-12 md:mb-16">
          <p className="text-[11px] uppercase tracking-widest text-ink-faint dark:text-bone/40 mb-5">
            {project?.title ?? "Geodata"}{" · "}{formatUpdateDate(update.date)}
          </p>
          <h1 className="text-display-lg md:text-display-xl font-display text-navy-950 dark:text-bone tracking-tightest leading-[1.05]">
            {update.title}
          </h1>
        </header>

        {/* Media */}
        <UpdateMedia update={update} />

        {/* Body */}
        {update.body && (
          <div className="max-w-2xl mt-12 md:mt-16">
            <div className="text-lg md:text-xl text-ink dark:text-bone/80 leading-relaxed whitespace-pre-line">
              {update.body}
            </div>
          </div>
        )}

        {/* Project link */}
        {project && (
          <div className="max-w-2xl mt-12 pt-8 border-t border-hairline dark:border-white/10">
            <p className="text-xs uppercase tracking-widest text-ink-faint dark:text-bone/40 mb-2">About this project</p>
            <Link href={`/projects/${project.slug}`} className="inline-flex items-center gap-2 text-base font-medium text-navy-900 dark:text-bone hover:text-gold-dark dark:hover:text-gold border-b border-navy-900 dark:border-bone/40 hover:border-gold-dark dark:hover:border-gold transition-colors pb-1">
              View {project.title}
              <span aria-hidden>→</span>
            </Link>
          </div>
        )}

        {/* Related updates */}
        {related.length > 0 && (
          <section className="mt-32 pt-16 border-t border-hairline dark:border-white/10">
            <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">More updates</p>
            <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest mb-12">
              From other sites.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {related.map((u) => <UpdateCard key={u.id} update={u} />)}
            </div>
          </section>
        )}

      </article>
    </main>
  );
}
