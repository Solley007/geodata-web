import Image from "next/image";
import Link from "next/link";
import { SOCIAL } from "@/lib/site-content";

export const metadata = {
  title:       "Ize Hostel — Coming Soon — Geodata World Services",
  description: "A luxury student hostel for Nile and Baze University students. Coming soon.",
};

export default function IzeHostelPage() {
  return (
    <main className="bg-navy-950 text-bone min-h-screen flex flex-col">

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section className="relative flex-1 flex items-center overflow-hidden">

        {/* Background image */}
        <Image
          src="/collage-1.jpg"   // ← replace with real Ize Hostel render when available
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/60 via-navy-950/85 to-navy-950" />

        <div className="relative z-10 container-editorial py-32 md:py-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-gold/15 text-gold border border-gold/30 px-3 py-1.5 text-[10px] uppercase tracking-widest font-medium mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              Coming Soon
            </div>

            <h1 className="text-display-xl font-display tracking-tightest leading-none">
              Ize <em className="font-light">Hostel.</em>
            </h1>

            <p className="mt-8 text-xl text-bone/80 max-w-2xl leading-relaxed">
              A luxury student hostel — purpose-built for Nile University and Baze University students.
            </p>

            <p className="mt-6 text-base text-bone/60 max-w-2xl leading-relaxed">
              We're putting the finishing touches on the design and programming. Details — including pricing, room types, and amenities — will be published as planning progresses.
            </p>

            {/* CTAs */}
            <div className="mt-12 flex flex-wrap items-center gap-4">
              <a
                href={`${SOCIAL.whatsapp}?text=${encodeURIComponent("Hello, I'd like to register interest in Ize Hostel.")}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-bone text-navy-950 px-7 py-4 text-sm font-medium hover:bg-gold-soft transition-colors"
              >
                Register interest <span aria-hidden>→</span>
              </a>
              <Link
                href="/projects"
                className="inline-flex items-center gap-3 border border-bone/30 px-7 py-4 text-sm font-medium hover:border-bone hover:bg-bone/5 transition-colors"
              >
                View all projects
              </Link>
            </div>

            {/* Small detail strip */}
            <div className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-8 max-w-2xl border-t border-bone/15 pt-10">
              <Detail label="For students of"   value="Nile · Baze" />
              <Detail label="Location"          value="FCT, Abuja" />
              <Detail label="Stage"             value="Planning" />
            </div>
          </div>
        </div>
      </section>

      {/* Back link */}
      <div className="py-8 border-t border-bone/10 text-center">
        <Link href="/" className="text-sm text-bone/50 hover:text-gold transition-colors">
          ← Back to Geodata
        </Link>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-bone/40 mb-2">{label}</p>
      <p className="font-display text-xl tracking-tight">{value}</p>
    </div>
  );
}
