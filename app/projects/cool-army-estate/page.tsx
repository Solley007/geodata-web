import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROJECTS } from "@/lib/projects-data";
import ProjectGallery, { type GalleryItem } from "@/components/project/ProjectGallery";
import { readSiteUpdates } from "@/lib/site-updates";
import { formatUpdateDate } from "@/lib/site-updates-types";

// ============================================================================
//  EDIT GALLERY HERE
// ============================================================================
const GALLERY: GalleryItem[] = [
  { type: "photo", src: "/collage-1.jpg", caption: "Estate overview" },
  { type: "photo", src: "/collage-2.jpg", caption: "Streetscape" },
  { type: "photo", src: "/collage-3.jpg", caption: "Roofline detail" },
  // { type: "video", src: "https://res.cloudinary.com/.../cae-walkthrough.mp4", poster: "/poster.jpg" },
];
// ============================================================================

// ============================================================================
//  Cool Army Estate — built by Geodata for Cool Real Estate.
//  Geodata is the developer/contractor, not the seller. No prices, no
//  inquiries on this page. Shown as portfolio / case study work.
// ============================================================================
const UNITS = [
  {
    id:    "cae-7br-mansion",
    name:  "7-Bedroom Mansion",
    count: 4,
    image: "/collage-1.jpg",   // ← replace with real photo
  },
  {
    id:    "cae-5br-duplex",
    name:  "5-Bedroom Duplex",
    count: 4,
    image: "/collage-2.jpg",
  },
  {
    id:    "cae-5br-semi-bq",
    name:  "5-Bedroom Semi-Detached with BQ",
    count: 4,
    image: "/collage-3.jpg",
  },
  {
    id:    "cae-4br-duplex-a",
    name:  "4-Bedroom Duplex",
    subtitle: "Type A",
    count: 4,
    image: "/collage-4.jpg",
  },
  {
    id:    "cae-4br-duplex-b",
    name:  "4-Bedroom Duplex",
    subtitle: "Type B",
    count: 4,
    image: "/collage-5.jpg",
  },
];

export const metadata = {
  title:       "Cool Army Estate — Geodata World Services",
  description: "20-unit mixed housing development in Owerri, Imo State. Built by Geodata for Cool Real Estate.",
};

export default async function CoolArmyEstatePage() {
  const project = PROJECTS.find((p) => p.slug === "cool-army-estate");
  if (!project) notFound();

  // Load site updates filtered for this project
  const allUpdates    = readSiteUpdates();
  const projectUpdates = allUpdates
    .filter((u) => u.projectSlug === "cool-army-estate")
    .slice(0, 6);

  return (
    <main className="bg-bone dark:bg-navy-950 text-navy-950 dark:text-bone">

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section className="relative h-[80vh] min-h-[600px] overflow-hidden">
        <Image src={project.coverImage} alt={project.name} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/40 via-navy-950/30 to-navy-950/80" />
        <div className="absolute inset-0 container-editorial flex flex-col justify-end pb-20 md:pb-28">
          <p className="eyebrow text-bone/80 mb-6">{project.location}</p>
          <h1 className="text-display-xl font-display text-bone tracking-tightest leading-none max-w-4xl">
            Cool Army <em className="font-light">Estate</em>
          </h1>
          <p className="mt-8 text-lg text-bone/80 max-w-xl leading-relaxed">
            Twenty residences across five typologies. Built by Geodata for Cool Real Estate.
          </p>
        </div>
      </section>

      {/* ─── Attribution banner ────────────────────────────────────── */}
      <section className="py-8 bg-bone-100 dark:bg-white/[0.03] border-y border-hairline dark:border-white/10">
        <div className="container-editorial flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow text-ink-muted dark:text-bone/50 mb-1">Built for</p>
            <p className="font-display text-xl">Cool Real Estate</p>
          </div>
          <p className="text-sm text-ink-muted dark:text-bone/60 max-w-md">
            Geodata is the developer and contractor. For sales enquiries, please contact Cool Real Estate directly.
          </p>
        </div>
      </section>

      {/* ─── Overview ──────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="container-editorial grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-8">
            <p className="eyebrow text-ink-muted dark:text-bone/50 mb-6">About the development</p>
            <h2 className="text-display-md font-display tracking-tightest leading-tight mb-8">
              A mixed-typology estate <em className="font-light">delivered to spec</em> in Owerri.
            </h2>
            <p className="text-lg leading-relaxed text-ink-muted dark:text-bone/70 max-w-2xl">
              Twenty residences across five distinct typologies, designed and built by Geodata on behalf of Cool Real Estate. The estate combines large family mansions with mid-sized duplexes and semi-detached homes — each finished to the same standard regardless of size.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-6 self-end">
            <Stat value="20" label="Total residences" />
            <Stat value="5"  label="Typologies" />
            <Stat value="4"  label="Units per type" />
            <Stat value={String(project.year ?? "—")} label="Delivered" />
          </div>
        </div>
      </section>

      {/* ─── Unit Types ────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 border-t border-hairline dark:border-white/10">
        <div className="container-editorial">
          <p className="eyebrow text-ink-muted dark:text-bone/50 mb-4">Typologies</p>
          <h2 className="text-display-md font-display tracking-tightest leading-none mb-16">
            Five configurations. Four units each.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {UNITS.map((unit) => (
              <article key={unit.id} className="group">
                <div className="relative aspect-[4/3] overflow-hidden bg-bone-100 dark:bg-white/[0.03]">
                  <Image src={unit.image} alt={unit.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.02]" />
                  <span className="absolute top-3 left-3 bg-navy-950/85 text-bone px-3 py-1 text-[10px] uppercase tracking-widest">
                    {unit.count} units
                  </span>
                </div>
                <div className="mt-5">
                  {unit.subtitle && (
                    <p className="text-[11px] uppercase tracking-widest text-ink-muted dark:text-bone/50 mb-1">{unit.subtitle}</p>
                  )}
                  <h3 className="font-display text-2xl tracking-tight leading-tight">{unit.name}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Gallery ───────────────────────────────────────────────── */}
      <ProjectGallery items={GALLERY} eyebrow="Gallery" title="See the estate." />

      {/* ─── Site updates ──────────────────────────────────────────── */}
      {projectUpdates.length > 0 && (
        <section className="py-20 md:py-24 border-t border-hairline dark:border-white/10">
          <div className="container-editorial">
            <p className="eyebrow text-ink-muted dark:text-bone/50 mb-4">Site updates</p>
            <h2 className="text-display-md font-display tracking-tightest leading-none mb-12">
              Recent activity from site.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectUpdates.map((u) => (
                <Link
                  key={u.id}
                  href={`/updates/${u.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden mb-4">
                    <Image
                      src={u.coverImage}
                      alt={u.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {u.mediaType === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-navy-950/20">
                        <div className="h-12 w-12 rounded-full bg-bone/90 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="h-5 w-5 text-navy-950 translate-x-0.5"><polygon points="6,4 6,20 20,12" fill="currentColor"/></svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] uppercase tracking-widest text-ink-muted dark:text-bone/50 mb-1">
                    {formatUpdateDate(u.date)}
                  </p>
                  <h3 className="font-display text-xl tracking-tight leading-tight group-hover:text-gold transition-colors">
                    {u.title}
                  </h3>
                </Link>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link href="/updates?project=cool-army-estate" className="inline-flex items-center gap-2 text-sm hover:text-gold transition-colors">
                View all site updates <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── Location ──────────────────────────────────────────────── */}
      <section className="py-20 md:py-24 border-t border-hairline dark:border-white/10">
        <div className="container-editorial grid grid-cols-12 gap-12">
          <div className="col-span-12 md:col-span-5">
            <p className="eyebrow text-ink-muted dark:text-bone/50 mb-4">Location</p>
            <h2 className="text-display-md font-display tracking-tightest leading-tight mb-6">
              Owerri, Imo State.
            </h2>
            <p className="text-ink-muted dark:text-bone/70 leading-relaxed">
              A quiet residential setting in Owerri, the Imo State capital. The estate sits within an area planned for established and serving Nigerian Army personnel and their families.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA (no sales — back to portfolio) ────────────────────── */}
      <section className="py-20 bg-navy-950 text-bone">
        <div className="container-editorial text-center">
          <h2 className="text-display-lg font-display tracking-tightest leading-none mb-6">
            See what else we've built.
          </h2>
          <p className="text-bone/70 max-w-xl mx-auto mb-10">
            Cool Army Estate is one of more than a dozen developments Geodata has delivered. Browse our broader portfolio of completed and active projects.
          </p>
          <Link href="/projects" className="inline-flex items-center gap-3 bg-bone text-navy-950 px-7 py-4 text-sm font-medium hover:bg-gold-soft transition-colors">
            View all projects <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Back link */}
      <div className="py-8 border-t border-hairline dark:border-white/10 text-center">
        <Link href="/projects" className="text-sm text-ink-muted dark:text-bone/50 hover:text-gold transition-colors">
          ← View all Geodata projects
        </Link>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-4xl font-display font-light tracking-tight">{value}</p>
      <p className="text-[11px] uppercase tracking-widest text-ink-muted dark:text-bone/50 mt-2">{label}</p>
    </div>
  );
}
