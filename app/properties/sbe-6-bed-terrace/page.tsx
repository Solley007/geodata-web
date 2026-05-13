import Image from "next/image";
import Link from "next/link";
import ProjectGallery, { type GalleryItem } from "@/components/project/ProjectGallery";

// ============================================================================
//  EDIT GALLERY HERE — drop your own image / Cloudinary video URLs in
// ============================================================================
const GALLERY: GalleryItem[] = [
  { type: "photo", src: "/collage-4.jpg", caption: "Estate aerial view" },
  { type: "photo", src: "/collage-2.jpg", caption: "Streetscape" },
  { type: "photo", src: "/collage-3.jpg", caption: "Roofline detail" },
  // { type: "video", src: "https://res.cloudinary.com/.../terrace-walkthrough.mp4", poster: "/poster.jpg" },
];
// ============================================================================

export const metadata = {
  title:       "6-Bedroom Terrace Duplex — Southern Bridge Estate — Geodata",
  description: "Twelve completed 6-bedroom terrace residences at Southern Bridge Estate.",
};

export default function SBETerracePage() {
  return (
    <main className="bg-bone dark:bg-navy-950 text-navy-950 dark:text-bone">

      {/* Hero */}
      <section className="relative h-[70vh] min-h-[520px] overflow-hidden">
        <Image src="/collage-4.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/40 via-navy-950/30 to-navy-950/80" />
        <div className="absolute inset-0 container-editorial flex flex-col justify-end pb-20">
          <Link href="/projects/southern-bridge-estate" className="eyebrow text-bone/70 mb-6 hover:text-gold transition-colors inline-block">
            ← Southern Bridge Estate
          </Link>
          <div className="inline-flex self-start items-center gap-2 bg-navy-950/85 text-bone px-3 py-1.5 text-[10px] uppercase tracking-widest mb-6">
            Sold Out
          </div>
          <h1 className="text-display-xl font-display text-bone tracking-tightest leading-none max-w-3xl">
            The <em className="font-light">6-Bedroom</em> Terrace
          </h1>
          <p className="mt-6 text-lg text-bone/80 max-w-xl">
            Twelve completed terrace residences. Fully sold, fully occupied.
          </p>
        </div>
      </section>

      {/* Overview + Specs */}
      <section className="py-20 md:py-24">
        <div className="container-editorial grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-7">
            <p className="eyebrow text-ink-muted dark:text-bone/50 mb-6">About this typology</p>
            <h2 className="text-display-md font-display tracking-tightest leading-tight mb-8">
              The original residences of <em className="font-light">Southern Bridge Estate.</em>
            </h2>
            <p className="text-lg leading-relaxed text-ink-muted dark:text-bone/70">
              Twelve six-bedroom terrace duplexes delivered as part of Southern Bridge Estate's first phase. Generous proportions, private gardens, and the same materials and finish standards that define every Geodata residence.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <dl className="grid grid-cols-2 gap-y-6 gap-x-8 border-t border-hairline dark:border-white/10 pt-6">
              <Spec label="Bedrooms"      value="6" />
              <Spec label="Bathrooms"     value="7" />
              <Spec label="Configuration" value="Terrace" />
              <Spec label="Floors"        value="2" />
              <Spec label="Total units"   value="12" />
              <Spec label="Status"        value="Sold Out" />
            </dl>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <ProjectGallery items={GALLERY} eyebrow="Gallery" title="See the residences." />

      {/* Footer link */}
      <section className="py-16 bg-navy-950 text-bone text-center">
        <div className="container-editorial">
          <h2 className="text-display-lg font-display tracking-tightest leading-none mb-4">
            More at Southern Bridge Estate.
          </h2>
          <p className="text-bone/70 max-w-xl mx-auto mb-8">
            Nine semi-detached residences still available across Phases One and Two.
          </p>
          <Link href="/properties/sbe-6-bed-semi-detached" className="inline-flex items-center gap-3 bg-bone text-navy-950 px-7 py-4 text-sm font-medium hover:bg-gold-soft transition-colors">
            View semi-detached units <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-ink-muted dark:text-bone/50 mb-1">{label}</dt>
      <dd className="font-display text-2xl tracking-tight">{value}</dd>
    </div>
  );
}
