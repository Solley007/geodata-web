import Image from "next/image";
import Link from "next/link";
import ProjectGallery, { type GalleryItem } from "@/components/project/ProjectGallery";
import { SOCIAL } from "@/lib/site-content";

// ============================================================================
//  EDIT PRICES + GALLERY HERE
// ============================================================================
const PRICES = {
  phase1Completed:        "₦XX,000,000",   // 2 finished units, ready to move in
  phase2UnderConstruction: "₦XX,000,000",  // 7 finishing stage, early-access price
};

const GALLERY: GalleryItem[] = [
  { type: "photo", src: "/collage-2.jpg", caption: "Phase One completed unit" },
  { type: "photo", src: "/collage-3.jpg", caption: "Streetscape" },
  { type: "photo", src: "/collage-4.jpg", caption: "Estate aerial" },
  // { type: "video", src: "https://res.cloudinary.com/.../sbe-walkthrough.mp4", poster: "/poster.jpg" },
];
// ============================================================================

export const metadata = {
  title:       "6-Bedroom Semi-Detached — Southern Bridge Estate — Geodata",
  description: "Nine 6-bedroom semi-detached residences across two phases. Two completed and ready, seven at finishing stage.",
};

const WA_PHASE1 = `${SOCIAL.whatsapp}?text=${encodeURIComponent("Hello, I'd like to enquire about the completed 6-bedroom semi-detached unit at Southern Bridge Estate (Phase One).")}`;
const WA_PHASE2 = `${SOCIAL.whatsapp}?text=${encodeURIComponent("Hello, I'd like to enquire about the 6-bedroom semi-detached units at Southern Bridge Estate (Phase Two — finishing stage).")}`;

export default function SBESemiDetachedPage() {
  return (
    <main className="bg-bone dark:bg-navy-950 text-navy-950 dark:text-bone">

      {/* Hero */}
      <section className="relative h-[70vh] min-h-[520px] overflow-hidden">
        <Image src="/collage-2.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/40 via-navy-950/30 to-navy-950/80" />
        <div className="absolute inset-0 container-editorial flex flex-col justify-end pb-20">
          <Link href="/projects/southern-bridge-estate" className="eyebrow text-bone/70 mb-6 hover:text-gold transition-colors inline-block">
            ← Southern Bridge Estate
          </Link>
          <div className="inline-flex self-start items-center gap-2 bg-gold text-navy-950 px-3 py-1.5 text-[10px] uppercase tracking-widest mb-6">
            9 Available
          </div>
          <h1 className="text-display-xl font-display text-bone tracking-tightest leading-none max-w-3xl">
            The <em className="font-light">6-Bedroom</em> Semi-Detached
          </h1>
          <p className="mt-6 text-lg text-bone/80 max-w-xl">
            Fifteen semi-detached residences across two phases. Two completed, seven at finishing stage.
          </p>
        </div>
      </section>

      {/* Overview + Specs */}
      <section className="py-20 md:py-24">
        <div className="container-editorial grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-7">
            <p className="eyebrow text-ink-muted dark:text-bone/50 mb-6">About this typology</p>
            <h2 className="text-display-md font-display tracking-tightest leading-tight mb-8">
              A premium six-bedroom <em className="font-light">family residence</em>.
            </h2>
            <p className="text-lg leading-relaxed text-ink-muted dark:text-bone/70">
              Generous interiors, dual-aspect living areas, en-suite primary bedrooms, and the kind of unhurried detailing that has come to define Southern Bridge Estate. Phase One is delivered; Phase Two is at the finishing stage and reservations are open.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <dl className="grid grid-cols-2 gap-y-6 gap-x-8 border-t border-hairline dark:border-white/10 pt-6">
              <Spec label="Bedrooms"      value="6" />
              <Spec label="Bathrooms"     value="7" />
              <Spec label="Configuration" value="Semi-Detached" />
              <Spec label="Floors"        value="2" />
              <Spec label="Total units"   value="15" />
              <Spec label="Available"     value="9" />
            </dl>
          </div>
        </div>
      </section>

      {/* Two phases */}
      <section className="py-16 border-t border-hairline dark:border-white/10">
        <div className="container-editorial">
          <p className="eyebrow text-ink-muted dark:text-bone/50 mb-4">Two phases, two opportunities</p>
          <h2 className="text-display-md font-display tracking-tightest leading-none mb-12">
            Move in now <em className="font-light">or reserve at finishing stage.</em>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Phase 1 */}
            <article className="border border-hairline dark:border-white/10 p-8 md:p-10 bg-bone-100 dark:bg-white/[0.03]">
              <p className="eyebrow text-ink-muted dark:text-bone/50 mb-3">Phase One</p>
              <h3 className="font-display text-3xl tracking-tight mb-2">Completed.</h3>
              <p className="text-ink-muted dark:text-bone/60 mb-6 leading-relaxed">
                Eight residences finished and handed over. Two units remain available for immediate occupancy.
              </p>
              <dl className="space-y-3 mb-8 border-t border-hairline dark:border-white/10 pt-5 text-sm">
                <Row k="Status"    v="Move-in ready" />
                <Row k="Available" v="2 units" />
                <Row k="From"      v={PRICES.phase1Completed} />
              </dl>
              <a href={WA_PHASE1} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-3 bg-navy-900 dark:bg-bone dark:text-navy-950 text-bone px-6 py-3 text-sm font-medium hover:bg-navy-800 transition-colors">
                Enquire on WhatsApp <span aria-hidden>→</span>
              </a>
            </article>

            {/* Phase 2 */}
            <article className="border border-gold/40 bg-gold/[0.04] p-8 md:p-10">
              <p className="eyebrow text-gold mb-3">Phase Two · Early access</p>
              <h3 className="font-display text-3xl tracking-tight mb-2">At finishing stage.</h3>
              <p className="text-ink-muted dark:text-bone/60 mb-6 leading-relaxed">
                Seven additional residences currently in the finishing phase. Reserve now before completion pricing applies.
              </p>
              <dl className="space-y-3 mb-8 border-t border-gold/30 pt-5 text-sm">
                <Row k="Status"    v="Finishing stage" />
                <Row k="Available" v="7 units" />
                <Row k="From"      v={PRICES.phase2UnderConstruction} />
              </dl>
              <a href={WA_PHASE2} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-3 bg-gold text-navy-950 px-6 py-3 text-sm font-medium hover:bg-gold-dark transition-colors">
                Reserve on WhatsApp <span aria-hidden>→</span>
              </a>
            </article>

          </div>
        </div>
      </section>

      {/* Gallery */}
      <ProjectGallery items={GALLERY} eyebrow="Gallery" title="See the residences." />

      {/* CTA */}
      <section className="py-16 bg-navy-950 text-bone text-center">
        <div className="container-editorial">
          <h2 className="text-display-lg font-display tracking-tightest leading-none mb-4">
            Schedule a site visit.
          </h2>
          <p className="text-bone/70 max-w-xl mx-auto mb-8">
            See the finished units, walk through the finishing-stage residences, and meet the team in person.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-3 bg-bone text-navy-950 px-7 py-4 text-sm font-medium hover:bg-gold-soft transition-colors">
            Book a visit <span aria-hidden>→</span>
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-muted dark:text-bone/50">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
