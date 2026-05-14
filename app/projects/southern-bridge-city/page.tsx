import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAllProperties } from "@/lib/property-data";

export const metadata: Metadata = {
  title: "Southern Bridge City — Idu, Abuja",
  description:
    "321 MREIF-eligible residences across five typologies at Southern Bridge City, Idu. Financed by Zenith Bank, backed by ARM Investment Managers. 9.75% fixed mortgage for 20 years.",
  alternates: { canonical: "/projects/southern-bridge-city" },
  openGraph: {
    title: "Southern Bridge City — Phase One",
    description:
      "321 residences at Idu, Abuja. Five typologies from ₦130M. MREIF-eligible at 9.75% fixed for 20 years.",
    url: "/projects/southern-bridge-city",
    images: [
      {
        url: `/api/og?eyebrow=${encodeURIComponent("Southern Bridge City")}&title=${encodeURIComponent("A new address for Abuja.")}&subtitle=${encodeURIComponent("321 residences at Idu. MREIF-eligible from ₦130M.")}`,
        width: 1200,
        height: 630,
        alt: "Southern Bridge City, Idu Abuja",
      },
    ],
  },
};

// Availability status colour helper
function statusStyle(status: string) {
  if (status.includes("Available") && !status.includes("Limited"))
    return "bg-bone/95 text-navy-900 dark:text-bone/90";
  if (status.includes("Limited")) return "bg-gold/95 text-navy-950 dark:text-bone";
  return "bg-navy-950/80 text-bone/70";
}

// MREIF illustrative payments — calculated at 9.75% / 20yr / 90% LTV
function monthlyPayment(price: number): string {
  const principal = price * 0.9;
  const r = 0.0975 / 12;
  const n = 240;
  const payment = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return `₦${(payment / 1_000_000).toFixed(2)}M`;
}

export default function SouthernBridgeCityPage() {
  const properties = getAllProperties();

  return (
    <main>

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex items-end bg-navy-950 overflow-hidden">
        <Image
          src="/SBC-poster.png"
          alt="Southern Bridge City aerial — Idu, Abuja"
          fill
          priority
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/30 to-transparent" />

        <div className="relative z-10 container-editorial pb-20 md:pb-28 pt-40">
          <p className="eyebrow text-bone/70 mb-6">Ongoing · Phase One · Idu, Abuja</p>
          <h1 className="text-display-xl font-display text-bone tracking-tightest max-w-4xl leading-[0.95]">
            Southern Bridge City
          </h1>
          <p className="mt-8 text-xl text-bone/85 max-w-2xl leading-relaxed">
            321 residences across five typologies. MREIF-eligible from ₦130M.
            9.75% fixed for 20 years.
          </p>

          {/* Stat strip */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl border-t border-bone/20 pt-10">
            {[
              { value: "321", label: "Total units" },
              { value: "5", label: "Typologies" },
              { value: "9.75%", label: "Fixed mortgage rate" },
              { value: "78%", label: "Phase 1 complete" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-4xl text-bone tracking-tightest">{s.value}</p>
                <p className="mt-2 eyebrow text-bone/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── OVERVIEW ─────────────────────────────────────────────── */}
      <section id="overview" className="bg-bone dark:bg-navy-950 py-32 md:py-48">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-12">
            <div className="col-span-12 lg:col-span-5">
              <p className="eyebrow mb-6">The development</p>
              <h2 className="text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
                A new address <em className="font-light">for Abuja.</em>
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-6 lg:col-start-7 space-y-6">
              <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
                Southern Bridge City is a 321-unit master-planned residential
                development at Idu, in Abuja's northern growth corridor. Phase
                One — currently 78% complete — delivers five distinct housing
                typologies on a single contiguous site, united by shared
                infrastructure and a coherent architectural language.
              </p>
              <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
                The development is financed by Zenith Bank and backed by ARM
                Investment Managers through the Ministry of Finance Real Estate
                Investment Fund (MREIF) Offtake Guarantee. Every residence in
                Phase One qualifies for MREIF mortgage financing at 9.75% fixed
                for up to 20 years — terms unmatched by any commercial lender
                in Nigeria.
              </p>
              <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
                Independent quantity surveyors verify monthly progress against
                programme. Construction follows a reinforced concrete frame
                specification with all utilities underground and internal roads
                built to municipal standard before any resident takes possession.
              </p>
            </div>
          </div>

          {/* Development facts grid */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 border-t border-l border-hairline dark:border-white/10">
            {[
              { label: "Location", value: "Idu Industrial Layout, Abuja FCT" },
              { label: "Developer", value: "Geodata World Services Limited" },
              { label: "Construction finance", value: "Zenith Bank" },
              { label: "Mortgage guarantee", value: "ARM Investment Managers / MREIF" },
              { label: "Phase 1 units", value: "321 residences" },
              { label: "Compliance", value: "REDAN Member · RC 688927" },
            ].map((f) => (
              <div key={f.label} className="border-r border-b border-hairline dark:border-white/10 p-8">
                <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">{f.label}</p>
                <p className="text-navy-950 dark:text-bone leading-snug">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MASTER PLAN ──────────────────────────────────────────── */}
      <section id="masterplan" className="bg-bone-100 dark:bg-navy-900 py-32 md:py-48">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-12 mb-16">
            <div className="col-span-12 lg:col-span-5">
              <p className="eyebrow mb-6">Site & infrastructure</p>
              <h2 className="text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
                Built from the <em className="font-light">ground up.</em>
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-6 lg:col-start-7">
              <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
                The estate is planned around a landscaped central spine with
                pedestrian paths, mature planting, and a 1,200m² clubhouse.
                Every service — power, water, fibre, drainage — runs
                underground. No overhead cables, no visible infrastructure.
              </p>
            </div>
          </div>

          {/* Master plan image placeholder */}
          <div className="relative aspect-[16/9] bg-navy-100 overflow-hidden mb-12">
            {/* PLACEHOLDER — replace with real master plan image */}
            <Image
              src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=2400&q=85&auto=format&fit=crop"
              alt="Southern Bridge City site plan — Idu, Abuja"
              fill
              className="object-cover opacity-80"
            />
            <div className="absolute bottom-6 left-6 bg-bone/95 px-4 py-3">
              <p className="eyebrow text-ink-faint dark:text-bone/40 mb-1">Site plan</p>
              <p className="text-sm text-navy-950 dark:text-bone">Southern Bridge City — Phase One, Idu</p>
            </div>
          </div>

          {/* Infrastructure features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Underground utilities",
                desc: "Power, water, fibre, and drainage all routed underground across the entire estate.",
              },
              {
                title: "Paved internal roads",
                desc: "Tarmacked to municipal standard with kerbed walkways, drainage channels, and street lighting.",
              },
              {
                title: "24/7 manned security",
                desc: "Gatehouse, perimeter CCTV, and patrol presence. Facial-recognition resident pass system.",
              },
              {
                title: "Clubhouse & gym",
                desc: "1,200m² community facility with gym, lap pool, co-working lounge, and meeting rooms.",
              },
              {
                title: "Treated water supply",
                desc: "Twin commercial-grade boreholes with multi-stage filtration. Drinking water standard.",
              },
              {
                title: "On-site estate management",
                desc: "Dedicated estate office handles maintenance, visitor passes, and service charges.",
              },
            ].map((f) => (
              <div key={f.title} className="border-t border-hairline dark:border-white/10 pt-6">
                <h3 className="font-display text-xl text-navy-950 dark:text-bone mb-3">{f.title}</h3>
                <p className="text-sm text-ink-muted dark:text-bone/60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THE FIVE RESIDENCES ──────────────────────────────────── */}
      <section id="residences" className="bg-bone dark:bg-navy-950 py-32 md:py-48">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-12 mb-20">
            <div className="col-span-12 lg:col-span-5">
              <p className="eyebrow mb-6">The residences</p>
              <h2 className="text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
                Five typologies. <em className="font-light">One address.</em>
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-6 lg:col-start-7">
              <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
                Every residence shares the same estate infrastructure, security,
                and management. The five typologies differ in size, configuration,
                and price — from The Pavilion apartment at ₦130M to The Six
                and The Five at ₦220M — so buyers can choose the home that
                fits their household, not just their budget.
              </p>
            </div>
          </div>

          <div className="h-px w-full bg-navy-950 mb-0" />

          {properties.map((p, i) => {
            const beds = p.specs.find((s) => s.label === "Bedrooms")?.value;
            const baths = p.specs.find((s) => s.label === "Bathrooms")?.value;
            const area = p.specs.find((s) => s.label === "Built area")?.value;
            const avail = p.specs.find((s) => s.label === "Available");
            const type = p.specs.find((s) => s.label === "Type")?.value;

            return (
              <Link
                key={p.slug}
                href={`/properties/${p.slug}`}
                className="group grid grid-cols-12 gap-6 py-10 border-b border-hairline dark:border-white/10 items-center hover:bg-bone-100 dark:bg-navy-900 transition-colors duration-300 -mx-6 px-6"
              >
                {/* Index */}
                <div className="col-span-1">
                  <p className="font-display text-2xl text-ink-faint dark:text-bone/40">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                </div>

                {/* Image */}
                <div className="col-span-3 md:col-span-2">
                  <div className="relative aspect-[4/3] overflow-hidden bg-navy-100">
                    <Image
                      src={p.heroImage}
                      alt={p.title}
                      fill
                      sizes="15vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    />
                  </div>
                </div>

                {/* Name + type */}
                <div className="col-span-8 md:col-span-3">
                  <h3 className="font-display text-2xl md:text-3xl text-navy-950 dark:text-bone leading-tight group-hover:text-navy-800 transition-colors">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink-muted dark:text-bone/60">{type} · {beds} bed · {area}</p>
                </div>

                {/* Availability */}
                <div className="hidden md:block col-span-2">
                  {avail && (
                    <span className={`inline-flex items-center px-3 py-1.5 text-[10px] uppercase tracking-eyebrow font-medium ${statusStyle(avail.value)}`}>
                      {avail.value}
                    </span>
                  )}
                </div>

                {/* Price + arrow */}
                <div className="hidden md:flex col-span-4 items-center justify-end gap-6">
                  <p className="font-display text-2xl text-navy-950 dark:text-bone">{p.pricing.from}</p>
                  <span aria-hidden className="text-ink-faint dark:text-bone/40 group-hover:text-navy-900 dark:text-bone/90 group-hover:translate-x-1 transition-all duration-300">→</span>
                </div>
              </Link>
            );
          })}

          <div className="mt-12">
            <Link
              href="/properties"
              className="inline-flex items-center gap-3 bg-navy-900 px-7 py-4 text-sm font-medium text-bone hover:bg-navy-800 transition-colors duration-400"
            >
              View all available units →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── MREIF FINANCING ──────────────────────────────────────── */}
      <section id="financing" className="bg-navy-950 text-bone py-32 md:py-48">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-12 mb-20">
            <div className="col-span-12 lg:col-span-5">
              {/* Logo badge */}
              <div className="inline-flex items-center gap-3 bg-bone dark:bg-navy-950 px-4 py-3 mb-8">
                <Image
                  src="/mreif-logo.png"
                  alt="MREIF — Ministry of Finance Real Estate Investment Fund"
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0"
                />
                <span className="text-navy-950 dark:text-bone text-xs uppercase tracking-eyebrow font-medium">
                  Official Mortgage Programme
                </span>
              </div>
              <p className="eyebrow text-bone/60 mb-6">MREIF Mortgage</p>
              <h2 className="text-display-lg font-display tracking-tightest">
                9.75% fixed. <em className="font-light">Twenty years.</em>
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-6 lg:col-start-7 space-y-5">
              <p className="text-lg leading-relaxed text-bone/85">
                Every Southern Bridge City residence qualifies for MREIF
                financing — a federal government mortgage programme backed by
                ARM Investment Managers and administered through partner banks.
                The rate of 9.75% per annum is fixed for the full 20-year term.
                No variable rate risk. No renegotiation.
              </p>
              <p className="text-lg leading-relaxed text-bone/85">
                The minimum equity contribution is 10% of the purchase price.
                Eligible applicants include Nigerian employees in formal
                employment and registered business owners with verifiable income.
              </p>
            </div>
          </div>

          {/* Indicative payment table */}
          <div className="border-t border-bone/15 mb-4">
            <div className="grid grid-cols-4 py-4 text-[11px] uppercase tracking-eyebrow text-bone/50">
              <span>Typology</span>
              <span className="text-right">Price</span>
              <span className="text-right">10% equity</span>
              <span className="text-right">Est. monthly</span>
            </div>
          </div>
          {[
            { name: "The Pavilion",      price: 130_000_000 },
            { name: "The Terrace",       price: 150_000_000 },
            { name: "The Semi-Detached", price: 180_000_000 },
            { name: "The Five",          price: 220_000_000 },
            { name: "The Six",           price: 220_000_000 },
          ].map((row) => (
            <div
              key={row.name}
              className="grid grid-cols-4 py-5 border-t border-bone/10 items-baseline"
            >
              <span className="font-display text-xl text-bone">{row.name}</span>
              <span className="text-right text-bone/85">
                ₦{(row.price / 1_000_000).toFixed(0)}M
              </span>
              <span className="text-right text-gold">
                ₦{(row.price * 0.1 / 1_000_000).toFixed(1)}M
              </span>
              <span className="text-right text-bone/85">
                {monthlyPayment(row.price)}/mo
              </span>
            </div>
          ))}

          <p className="mt-6 text-xs text-bone/40">
            Monthly repayments are indicative at 9.75% p.a. fixed over 240 months on 90% LTV.
            Actual figures subject to lender confirmation.
          </p>

          <div className="mt-14 flex flex-wrap gap-4">
            <Link
              href="/mortgage"
              className="inline-flex items-center gap-3 bg-bone dark:bg-navy-950 px-7 py-4 text-sm font-medium text-navy-950 dark:text-bone hover:bg-gold-soft transition-colors duration-400"
            >
              Full MREIF calculator →
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 border border-bone/30 px-7 py-4 text-sm font-medium text-bone hover:border-bone hover:bg-bone/10 transition-all duration-400"
            >
              Check my eligibility
            </Link>
          </div>
        </div>
      </section>

      {/* ─── WHY BUY ──────────────────────────────────────────────── */}
      <section id="invest" className="bg-bone dark:bg-navy-950 py-32 md:py-48">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-12 mb-20">
            <div className="col-span-12 lg:col-span-5">
              <p className="eyebrow mb-6">Why Southern Bridge City</p>
              <h2 className="text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
                The case for <em className="font-light">buying now.</em>
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-6 lg:col-start-7">
              <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
                Whether you are buying to live or buying to let, Southern Bridge
                City offers a convergence of conditions that rarely align in a
                single development: a credible developer, federal-backed
                financing, a structurally undersupplied location, and a price
                point accessible via the most competitive mortgage terms in
                Nigeria today.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

            {/* For homebuyers */}
            <div>
              <p className="eyebrow text-gold-dark mb-8 pb-4 border-b border-hairline dark:border-white/10">
                For homebuyers
              </p>
              <ul className="space-y-8">
                {[
                  {
                    title: "Fixed payments for 20 years",
                    desc: "The 9.75% MREIF rate is locked for the full term. In a high-inflation economy, a fixed-rate naira mortgage is a rare and valuable instrument — your monthly payment stays the same while rents around you rise.",
                  },
                  {
                    title: "A finished estate from day one",
                    desc: "You don't move into a building site. Roads are paved, utilities are underground, security is operational, and the clubhouse is ready before any resident takes possession. Most Nigerian developments hand over a shell; this is the exception.",
                  },
                  {
                    title: "Quality you can verify",
                    desc: "Independent quantity surveyors audit every stage. Construction photographs are published regularly. ARM Investment Managers' guarantee means a major institution has reviewed and underwritten the project — not just the developer's word.",
                  },
                  {
                    title: "Location with trajectory",
                    desc: "Idu is the next growth corridor — proximate to the CBD, the airport, and Maitama, but priced and positioned as Abuja's answer to mid-market quality housing. Values in well-built gated estates in this corridor have appreciated 40–60% over the last five years.",
                  },
                ].map((r) => (
                  <li key={r.title} className="border-t border-hairline dark:border-white/10 pt-6">
                    <h3 className="font-display text-2xl text-navy-950 dark:text-bone mb-3">{r.title}</h3>
                    <p className="text-ink-muted dark:text-bone/60 leading-relaxed">{r.desc}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* For investors */}
            <div>
              <p className="eyebrow text-gold-dark mb-8 pb-4 border-b border-hairline dark:border-white/10">
                For investors
              </p>
              <ul className="space-y-8">
                {[
                  {
                    title: "Gross yield of 3.8–5.4%",
                    desc: "Idu professional rental market commands ₦5–7M annually for a four-bedroom flat. On The Pavilion at ₦130M, that is a gross yield of 3.8–5.4% before capital appreciation — competitive with the best residential yields in Abuja.",
                  },
                  {
                    title: "MREIF leverage amplifies equity returns",
                    desc: "At 10% equity in, you control ₦130–220M of real estate with ₦13–22M of your own capital. If the asset appreciates 20% in three years — conservative for this corridor — your return on equity is 200%+. Leverage works when the underlying asset is credible.",
                  },
                  {
                    title: "Institutional counterparty risk mitigation",
                    desc: "ARM Investment Managers holds the Offtake Guarantee. Zenith Bank holds the construction loan. Both institutions have reviewed and underwritten this development. The developer cannot abandon the project without triggering both relationships. That is a risk profile most Nigerian residential investments cannot match.",
                  },
                  {
                    title: "Exit liquidity from a captive buyer pool",
                    desc: "MREIF eligibility means your buyer pool at resale includes anyone who qualifies for a federal mortgage — a far larger pool than most premium developments can access. You are not limited to cash buyers.",
                  },
                ].map((r) => (
                  <li key={r.title} className="border-t border-hairline dark:border-white/10 pt-6">
                    <h3 className="font-display text-2xl text-navy-950 dark:text-bone mb-3">{r.title}</h3>
                    <p className="text-ink-muted dark:text-bone/60 leading-relaxed">{r.desc}</p>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ─── ENQUIRE CTA ──────────────────────────────────────────── */}
      <section id="enquire" className="bg-navy-950 text-bone py-32 md:py-40">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-12">
            <div className="col-span-12 lg:col-span-7">
              <p className="eyebrow text-bone/60 mb-6">Begin a conversation</p>
              <h2 className="text-display-lg font-display tracking-tightest leading-none">
                Ready to learn <em className="font-light">more?</em>
              </h2>
              <p className="mt-8 text-lg leading-relaxed text-bone/80 max-w-xl">
                Our sales team responds to every enquiry personally within one
                business day. Whether you want to schedule a site visit, check
                MREIF eligibility, or reserve a unit, we are here.
              </p>
              <div className="mt-12 flex flex-wrap gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-3 bg-bone dark:bg-navy-950 px-7 py-4 text-sm font-medium text-navy-950 dark:text-bone hover:bg-gold-soft transition-colors duration-400"
                >
                  Enquire now →
                </Link>
                <Link
                  href="/properties"
                  className="inline-flex items-center gap-3 border border-bone/30 px-7 py-4 text-sm font-medium text-bone hover:border-bone hover:bg-bone/10 transition-all duration-400"
                >
                  Browse available units
                </Link>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 lg:col-start-9 lg:pt-16">
              <div className="space-y-6">
                <div className="border-t border-bone/20 pt-6">
                  <p className="eyebrow text-bone/50 mb-2">Sales pavilion</p>
                  <p className="text-bone/85 leading-relaxed text-sm">
                    Plot 93, Cadastral Zone B10<br />
                    Dakibiyu, Abuja FCT<br />
                    Mon–Sat · 9am–6pm
                  </p>
                </div>
                <div className="border-t border-bone/20 pt-6">
                  <p className="eyebrow text-bone/50 mb-2">Direct</p>
                  <a
                    href="tel:+2347047620492"
                    className="block font-display text-2xl hover:text-gold-soft transition-colors"
                  >
                    +234 704 762 0492
                  </a>
                  <a
                    href="mailto:hello@geodata.com.ng"
                    className="block text-bone/70 hover:text-gold-soft transition-colors mt-1 text-sm"
                  >
                    hello@geodata.com.ng
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
