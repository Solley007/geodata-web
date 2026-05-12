import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllProjectSlugs,
  getProjectBySlug,
  getRelatedProjects,
} from "@/lib/projects-data";
import ProjectHero from "@/components/projects/ProjectHero";
import ProjectKeyFacts from "@/components/projects/ProjectKeyFacts";
import ProjectOverview from "@/components/projects/ProjectOverview";
import ProjectGallery from "@/components/projects/ProjectGallery";
import RelatedProjects from "@/components/projects/RelatedProjects";

interface PageProps {
  params: { slug: string };
}

// Static generation — Next.js builds a page per slug at build time.
export function generateStaticParams() {
  return getAllProjectSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const project = getProjectBySlug(params.slug);
  if (!project) return { title: "Project not found" };

  return {
    title: project.name,
    description: project.subtitle,
    alternates: { canonical: `/projects/${params.slug}` },
    openGraph: {
      title: `${project.name} — ${project.location}`,
      description: project.subtitle,
      url: `/projects/${params.slug}`,
      type: "website",
      images: [
        {
          url: project.coverImage,
          width: 1200,
          height: 630,
          alt: project.name,
        },
      ],
    },
  };
}

export default function ProjectDetailPage({ params }: PageProps) {
  const project = getProjectBySlug(params.slug);
  if (!project) notFound();

  const related = getRelatedProjects(project.slug, project.category, 3);

  return (
    <>
      <ProjectHero project={project} />
      <ProjectKeyFacts project={project} />
      <ProjectOverview project={project} />
      <ProjectGallery project={project} />

      {/* End-of-project CTA */}
      <section className="bg-navy-950 text-bone py-24 md:py-32 border-t border-bone/10">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-12">
            <div className="col-span-12 lg:col-span-8">
              <p className="eyebrow text-bone/60 mb-6">Considering working with us?</p>
              <h2 className="font-display text-display-md tracking-tightest leading-none">
                Let's discuss <em className="font-light">your project.</em>
              </h2>
              <p className="mt-8 max-w-xl text-lg text-bone/80 leading-relaxed">
                Whether you're a private client, federal agency, or
                institutional investor — we'd be glad to talk through what
                we can build together.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="/contact"
                  className="inline-flex items-center gap-3 bg-bone dark:bg-navy-950 px-7 py-4 text-sm font-medium text-navy-950 dark:text-bone hover:bg-gold-soft transition-colors duration-400"
                >
                  Get in touch <span aria-hidden>→</span>
                </a>
                <a
                  href="/projects"
                  className="inline-flex items-center gap-3 px-7 py-4 text-sm font-medium text-bone border-b border-bone hover:text-gold-soft hover:border-gold-soft transition-colors duration-400"
                >
                  View other projects
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <RelatedProjects projects={related} />
    </>
  );
}
