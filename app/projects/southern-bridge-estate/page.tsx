import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROJECTS } from "@/lib/projects-data";
import { SOCIAL } from "@/lib/site-content";
import ProjectGallery, { type GalleryItem } from "@/components/project/ProjectGallery";

// ============================================================================
//  EDIT GALLERY HERE — drop your own image / Cloudinary video URLs in
// ============================================================================
const GALLERY: GalleryItem[] = [
  { type: "photo", src: "/collage-2.jpg", caption: "Phase One streetscape" },
  { type: "photo", src: "/collage-3.jpg", caption: "Estate aerial" },
  { type: "photo", src: "/collage-4.jpg", caption: "Roofline detail" },
  // { type: "video", src: "https://res.cloudinary.com/.../walkthrough.mp4", poster: "/poster.jpg" },
];

// ============================================================================
//  EDIT UNIT DETAILS / PRICES HERE
// ============================================================================
const UNITS = [
  {
    id:          "sbe-6bt",
    name:        "6-Bedroom Terrace Duplex",
    count:       12,
    status:      "Sold Out" as const,
    description: "Twelve terraced family residences delivered and fully occupied.",
    image:       "/collage-4.jpg",
    price:       null,
    detailHref:  "/properties/sbe-6-bed-terrace",
  },
  {
    id:          "sbe-6bsd-phase1",
    name:        "6-Bedroom Semi-Detached",
    subtitle:    "Phase One — Completed",
    count:       8,
    available:   2,
    status:      "2 Available" as const,
    description: "Eight semi-detached residences fully built and finished. Two units remain for sale.",
    image:       "/collage-2.jpg",
    price:       "₦XX,000,000",
    detailHref:  "/properties/sbe-6-bed-semi-detached",
  },
  {
    id:          "sbe-6bsd-phase2",
    name:        "6-Bedroom Semi-Detached",
    subtitle:    "Phase Two — Finishing Stage",
    count:       7,
    available:   7,
    status:      "Under Construction" as const,
    description: "Seven additional semi-detached residences currently in the finishing phase. Early access pricing available.",
    image:       "/collage-3.jpg",
    price:       "₦XX,000,000",
    detailHref:  "/properties/sbe-6-bed-semi-detached",
  },
];
// ============================================================================

export const metadata = {
  title:       "Southern Bridge Estate — Geodata World Services",
  description: "27-unit residential development in Idu, Abuja. Mostly delivered.",
};

export default function SouthernBridgeEstatePage() {
  const project = PROJECTS.find((p) => p.slug === "southern-bridge-estate");
  if (!project) notFound();

  const totalAvailable = UNITS.reduce((sum, u) => sum + (u.available ?? 0), 0);

  return (
    <main className="bg-bone dark:bg-navy-950 text-navy-950 dark:text-bone">

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section className="relative h-[80vh] min-h-[600px] overflow-hidden">
        <Image
          src={project.coverImage}
          alt={project.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/40 via-navy-950/30 to-navy-950/80" />
        <div className="absolute inset-0 container-editorial flex flex-col justify-end pb-20 md:pb-28">
          <p className="eyebrow text-bone/80 mb-6">{project.location}</p>
          <h1 className="text-display-xl font-display text-bone tracking-tightest leading-none max-w-4xl">
            Southern <em className="font-light">Bridge</em> Estate
          </h1>
          <p className="mt-8 text-lg text-bone/80 max-w-xl leading-relaxed">
            27 residences. Mostly delivered. {totalAvailable > 0 && <>{totalAvailable} units still available.</>}
          </p>
        </div>
      </section>

      {/* ─── Overview ──────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="container-editorial grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-8">
            <p className="eyebrow text-ink-muted dark:text-bone/50 mb-6">About the development</p>
            <h2 className="text-display-md font-display tracking-tightest leading-tight mb-8">
              A quiet, fully infrastructured residential estate <em className="font-light">a few hundred metres from Southern Bridge City.</em>
            </h2>
            <p className="text-lg leading-relaxed text-ink-muted dark:text-bone/70 max-w-2xl">
              Southern Bridge Estate was Geodata's first development in the Idu corridor — twenty-seven residences across two phases, designed for families seeking space, privacy, and the same build quality that defines our larger developments.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-6 self-end">
            <Stat value="27" label="Total residences" />
            <Stat value={String(25 - totalAvailable + (totalAvailable === 9 ? 0 : 0)).padStart(2,"0")} label="Already sold" />
            <Stat value={String(totalAvailable)} label="Still available" />
            <Stat value="2025" label="Phase 2 completion" />
          </div>
        </div>
      </section>

      {/* ─── Unit Types ────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 border-t border-hairline dark:border-white/10">
        <div className="container-editorial">
          <p className="eyebrow text-ink-muted dark:text-bone/50 mb-4">Unit types</p>
          <h2 className="text-display-md font-display tracking-tightest leading-none mb-16">
            Three configurations across two phases.
          </h2>

          <div className="space-y-12">
            {UNITS.map((unit) => (
              <article key={unit.id} className="grid grid-cols-12 gap-8 items-center">
                <Link href={unit.detailHref} className="col-span-12 md:col-span-7 relative aspect-[4/3] overflow-hidden group">
                  <Image src={unit.image} alt={unit.name} fill sizes="(max-width: 768px) 100vw, 60vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span className={`absolute top-4 left-4 px-3 py-1.5 text-[10px] uppercase tracking-widest font-medium ${
                    unit.status === "Sold Out"            ? "bg-navy-950/85 text-bone" :
                    unit.status === "Under Construction"  ? "bg-gold text-navy-950" :
                                                            "bg-bone text-navy-950"
                  }`}>
                    {unit.status}
                  </span>
                </Link>

                <div className="col-span-12 md:col-span-5">
                  {unit.subtitle && (
                    <p className="eyebrow text-ink-muted dark:text-bone/50 mb-3">{unit.subtitle}</p>
                  )}
                  <h3 className="text-3xl md:text-4xl font-display tracking-tight leading-tight mb-4">
                    <Link href={unit.detailHref} className="hover:text-gold transition-colors">{unit.name}</Link>
                  </h3>
                  <p className="text-ink-muted dark:text-bone/60 leading-relaxed mb-6">
                    {unit.description}
                  </p>
                  <dl className="space-y-2 text-sm border-t border-hairline dark:border-white/10 pt-5">
                    <div className="flex justify-between"><dt className="text-ink-muted dark:text-bone/50">Total units</dt><dd>{unit.count}</dd></div>
                    {unit.available && <div className="flex justify-between"><dt className="text-ink-muted dark:text-bone/50">Available</dt><dd className="font-medium">{unit.available}</dd></div>}
                    {unit.price && <div className="flex justify-between border-t border-hairline dark:border-white/10 pt-2"><dt className="text-ink-muted dark:text-bone/50">From</dt><dd className="font-display text-lg">{unit.price}</dd></div>}
                  </dl>

                  <Link href={unit.detailHref} className="mt-6 inline-flex items-center gap-3 bg-navy-900 dark:bg-bone dark:text-navy-950 px-6 py-3 text-sm font-medium text-bone hover:bg-navy-800 transition-colors">
                    View full details <span aria-hidden>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Gallery ───────────────────────────────────────────────── */}
      <ProjectGallery items={GALLERY} eyebrow="Gallery" title="See the estate." />

      {/* ─── Location ──────────────────────────────────────────────── */}
      <section className="py-20 md:py-24 border-t border-hairline dark:border-white/10">
        <div className="container-editorial grid grid-cols-12 gap-12">
          <div className="col-span-12 md:col-span-5">
            <p className="eyebrow text-ink-muted dark:text-bone/50 mb-4">Location</p>
            <h2 className="text-display-md font-display tracking-tightest leading-tight mb-6">
              Idu, Abuja.
            </h2>
            <p className="text-ink-muted dark:text-bone/70 leading-relaxed">
              A residential pocket inside Abuja's Idu district. A few hundred metres from Southern Bridge City — close enough to share infrastructure, far enough to feel like its own neighbourhood.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-navy-950 text-bone">
        <div className="container-editorial text-center">
          <h2 className="text-display-lg font-display tracking-tightest leading-none mb-6">
            Schedule a private viewing.
          </h2>
          <p className="text-bone/70 max-w-xl mx-auto mb-10">
            See the completed units, the finishing-stage residences, and the surrounding neighbourhood in person.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-3 bg-bone text-navy-950 px-7 py-4 text-sm font-medium hover:bg-gold-soft transition-colors">
            Book a visit <span aria-hidden>→</span>
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
