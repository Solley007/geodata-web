import Image from "next/image";
import Link from "next/link";
import { SOCIAL } from "@/lib/site-content";
import ProjectGallery, { type GalleryItem } from "@/components/project/ProjectGallery";

// ============================================================================
//  EDIT GALLERY HERE — drop your Ize Hostel photos / renders
//  Replace `/collage-*.jpg` with paths to your actual images in /public/
//  Or use full URLs from Cloudinary / S3
// ============================================================================
const GALLERY: GalleryItem[] = [
  // Exterior & blocks
  { type: "photo", src: "/ize-hostel/Exterior.JPG",                  caption: "Exterior" },
  { type: "photo", src: "/ize-hostel/block-a-sign.JPG",              caption: "Block A" },
  { type: "photo", src: "/ize-hostel/block-b.JPG",                   caption: "Block B" },
  { type: "photo", src: "/ize-hostel/Block C.JPG",                   caption: "Block C" },
  { type: "photo", src: "/ize-hostel/Block-C-view.JPG",              caption: "Block C — view" },
  { type: "photo", src: "/ize-hostel/Block-d.JPG",                   caption: "Block D" },
  { type: "photo", src: "/ize-hostel/block-c-d.JPG",                 caption: "Blocks C & D" },
  { type: "photo", src: "/ize-hostel/common-area-exterior.JPG",      caption: "Common area — exterior" },
  { type: "photo", src: "/ize-hostel/walk-area.JPG",                 caption: "Walkway" },

  // Common areas & amenities
  { type: "photo", src: "/ize-hostel/common-area.JPG",               caption: "Common area" },
  { type: "photo", src: "/ize-hostel/common-area-space.JPG",         caption: "Common area — lounge" },
  { type: "photo", src: "/ize-hostel/common-area-roof.JPG",          caption: "Rooftop common area" },
  { type: "photo", src: "/ize-hostel/common-area-showing-pool.JPG",  caption: "Common area & pool" },
  { type: "photo", src: "/ize-hostel/pool.JPG",                      caption: "Swimming pool" },
  { type: "photo", src: "/ize-hostel/ping-pong.JPG",                 caption: "Ping-pong table" },

  // Rooms
  { type: "photo", src: "/ize-hostel/1-bed.JPG",                     caption: "1-bed room" },
  { type: "photo", src: "/ize-hostel/1-bed-view.JPG",                caption: "1-bed room — view" },
  { type: "photo", src: "/ize-hostel/2-bed.JPG",                     caption: "2-bed room" },
  { type: "photo", src: "/ize-hostel/2-bed-view.JPG",                caption: "2-bed room — view" },
  { type: "photo", src: "/ize-hostel/2-bed-view-1.JPG",              caption: "2-bed room — alt view" },
  { type: "photo", src: "/ize-hostel/3-bed.JPG",                     caption: "3-bed room" },
  { type: "photo", src: "/ize-hostel/3-bed-view.JPG",                caption: "3-bed room — view" },
  { type: "photo", src: "/ize-hostel/3-bed-right-side.JPG",          caption: "3-bed room — right side" },
  { type: "photo", src: "/ize-hostel/3room-view.JPG",                caption: "3-bed room — panorama" },

  // Room facilities
  { type: "photo", src: "/ize-hostel/wardrobe-space.JPG",            caption: "Wardrobe space" },
  { type: "photo", src: "/ize-hostel/Air-conditioner.JPG",           caption: "Air conditioning" },
  { type: "photo", src: "/ize-hostel/heater.JPG",                    caption: "Water heater" },
  { type: "photo", src: "/ize-hostel/shower.JPG",                    caption: "Shower" },
  { type: "photo", src: "/ize-hostel/toilet.JPG",                    caption: "Toilet" },
  { type: "photo", src: "/ize-hostel/wash.JPG",                      caption: "Wash area" },
  { type: "photo", src: "/ize-hostel/washer.JPG",                    caption: "Washing machine" },
  { type: "photo", src: "/ize-hostel/stool.JPG",                     caption: "Furnishings" },
];

export const metadata = {
  title:       "Ize Hostel — Geodata World Services",
  description: "A purpose-built 23-room, 50-bed-space student hostel for Nile University and Baze University students in Abuja.",
};

const WA_LINK = `${SOCIAL.whatsapp}?text=${encodeURIComponent("Hello, I'd like to enquire about Ize Hostel.")}`;

export default function IzeHostelPage() {
  return (
    <main className="bg-bone dark:bg-navy-950 text-navy-950 dark:text-bone">

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section className="relative h-[70vh] min-h-[520px] overflow-hidden">
        {/* Replace this image with your actual hero photo/render */}
        <Image src="/ize-hostel/Exterior.JPG" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/40 via-navy-950/30 to-navy-950/80" />
        <div className="absolute inset-0 container-editorial flex flex-col justify-end pb-20">
          <Link href="/projects" className="eyebrow text-bone/70 mb-6 hover:text-accent transition-colors inline-block">
            ← All projects
          </Link>
          <h1 className="text-display-xl font-display text-bone tracking-tightest leading-none max-w-3xl">
            Ize Hostel.
          </h1>
          <p className="mt-6 text-lg text-bone/80 max-w-xl">
            A purpose-built student hostel — 23 rooms, 50 bed spaces — for Nile and Baze University students.
          </p>
        </div>
      </section>

      {/* ─── About ─────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="container-editorial grid grid-cols-12 gap-y-12 lg:gap-12">
          <div className="col-span-12 md:col-span-5">
            <p className="eyebrow text-ink-muted dark:text-bone/50 mb-6">About the project</p>
            <h2 className="text-display-md font-display tracking-tightest leading-tight">
              A new standard for student living in Abuja.
            </h2>
          </div>

          <div className="col-span-12 md:col-span-6 md:col-start-7 text-lg leading-relaxed text-ink-muted dark:text-bone/70 space-y-5">
            <p>
              Ize Hostel is a purpose-built residence designed specifically for university students. Twenty-three rooms accommodate fifty residents across single and shared configurations, with thoughtful layouts that prioritise study, rest, and community.
            </p>
            <p>
              Positioned to serve students of Nile University and Baze University, the project sits within easy reach of both campuses. Every room is designed to support academic life, with proper desks, generous storage, and reliable utilities.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Key facts ─────────────────────────────────────────────── */}
      <section className="border-t border-hairline dark:border-white/10 py-16 md:py-20">
        <div className="container-editorial">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <Fact value="23" label="Rooms" />
            <Fact value="50" label="Bed spaces" />
            <Fact value="2" label="Universities served" />
            <Fact value="Abuja" label="Location" />
          </div>
        </div>
      </section>

      {/* ─── Gallery ───────────────────────────────────────────────── */}
      <ProjectGallery items={GALLERY} eyebrow="Gallery" title="See the hostel." />

      {/* ─── Contact CTA ───────────────────────────────────────────── */}
      <section className="border-t border-hairline dark:border-white/10 py-20 md:py-24">
        <div className="container-editorial text-center max-w-2xl mx-auto">
          <p className="eyebrow text-ink-muted dark:text-bone/50 mb-4">Enquiries</p>
          <h2 className="text-display-md font-display tracking-tightest leading-tight mb-6">
            Reserve a room.
          </h2>
          <p className="text-ink-muted dark:text-bone/70 mb-10 leading-relaxed">
            For room availability, pricing, and tour bookings — get in touch directly.
          </p>
          <a
            href={WA_LINK}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-navy-900 dark:bg-bone dark:text-navy-950 text-bone px-8 py-4 text-sm font-medium hover:bg-navy-800 dark:hover:bg-bone-100 transition-colors"
          >
            Enquire on WhatsApp <span aria-hidden>→</span>
          </a>
        </div>
      </section>

    </main>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-4xl md:text-5xl tracking-tight text-gold-dark dark:text-accent leading-none">
        {value}
      </p>
      <p className="text-[11px] uppercase tracking-widest text-ink-muted dark:text-bone/50 mt-3">
        {label}
      </p>
    </div>
  );
}
