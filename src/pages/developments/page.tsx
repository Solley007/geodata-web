import { calProps, StyledMap } from "@/pages/home/RealEstateLandingPage.tsx";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { Building2, HardHat, MapPin } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { useSeo } from "@/hooks/use-seo.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";import WhatsAppButton from "@/pages/home/_components/WhatsAppButton.tsx";
import { STAGE_STYLE } from "@/lib/development-stages.ts";

// Public development-status page for one estate. "/southern-bridge-city" uses
// a fixed slug; "/development/:slug" serves any other estate added in admin.
export default function DevelopmentPage({ fixedSlug }: { fixedSlug?: string }) {
  const params = useParams();
  const slug = fixedSlug ?? params.slug ?? "";
  const data = useQuery(api.developments.getPublicEstate, { slug });

  useSeo({
    title: data ? `${data.estate.name} – Development Status | Geodata` : "Estate Development Status | Geodata",
    description: data ? `Follow construction progress at ${data.estate.name}, building type by building type.` : "Follow construction progress by building type.",
    canonicalPath: fixedSlug ? `/${fixedSlug}` : `/development/${slug}`,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 sm:px-10 pt-28 pb-20">
        {data === undefined ? (
          <div className="space-y-4"><Skeleton className="h-12 w-2/3" /><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div></div>
        ) : data === null ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
              <EmptyTitle>Estate not available</EmptyTitle>
              <EmptyDescription>This page is not shown publicly right now.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent><Button asChild size="sm"><Link to="/">Back to home</Link></Button></EmptyContent>
          </Empty>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--brand)] mb-2">Development status</p>
            <h1 className="text-3xl lg:text-5xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>{data.estate.name}</h1>
            {data.estate.location && <p className="flex items-center gap-1.5 text-muted-foreground mb-4"><MapPin size={15} />{data.estate.location}</p>}
            {data.estate.intro && <p className="text-muted-foreground max-w-3xl mb-8 whitespace-pre-line">{data.estate.intro}</p>}

            {data.buildingTypes.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 mb-10">
                <div className="flex flex-wrap justify-between gap-2 text-sm mb-2">
                  <span className="font-semibold">{data.buildingTypes.length} building types, {data.deliveredCount} delivered</span>
                  <span className="font-bold">{data.overallPercent}% overall</span>
                </div>
                <Progress value={data.overallPercent} />
              </div>
            )}

            {data.buildingTypes.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><HardHat /></EmptyMedia>
                  <EmptyTitle>Progress updates coming soon</EmptyTitle>
                  <EmptyDescription>We will share building progress here as work moves forward.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.buildingTypes.map((t) => (
                  <article key={t._id} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="aspect-[16/10] bg-muted overflow-hidden">
                      {t.coverUrl ? <img src={t.coverUrl} alt={t.name} loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><HardHat size={36} /></div>}
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-lg font-bold">{t.name}</h2>
                        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_STYLE[t.stage] ?? STAGE_STYLE["Not started"]}`}>{t.stage}</span>
                      </div>
                      {t.plotsCovered && <p className="text-sm text-muted-foreground">{t.plotsCovered}</p>}
                      {t.description && <p className="text-sm text-muted-foreground line-clamp-3">{t.description}</p>}
                      <div>
                        <div className="flex justify-end text-xs font-semibold mb-1.5">{t.completionPercent}% complete</div>
                        <Progress value={t.completionPercent} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}


// ─── MREIF mortgage page (/mortgage) ─────────────────────────────────────────
// Lives in this file because the Hercules code editor cannot create new files.
const MREIF_RATE = 0.0975;

function mreifMonthly(loan: number, years: number): number {
  const r = MREIF_RATE / 12;
  const n = years * 12;
  if (loan <= 0) return 0;
  return (loan * r) / (1 - Math.pow(1 + r, -n));
}

function principalPaidAfter(loan: number, years: number, months: number): number {
  const r = MREIF_RATE / 12;
  const pay = mreifMonthly(loan, years);
  let balance = loan;
  for (let i = 0; i < months && balance > 0; i++) {
    balance -= pay - balance * r;
  }
  return loan - Math.max(balance, 0);
}

const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Math.round(n));

const MREIF_STEPS = [
  { title: "Reservation", body: "Reserve your unit at Geodata with a 5% commitment fee. Receive your provisional allocation letter." },
{ title: "Deposit", body: "Bring your deposit up to at least 10% of the price, and send us your ID, bank statements and proof of income." },
  { title: "MREIF assessment", body: "Your application is reviewed for MREIF eligibility through the partner bank. Approval-in-principle is typically issued within 14 working days." },
  { title: "Disbursement", body: "Loan funds are disbursed directly to Geodata. You take possession on the agreed handover date and begin monthly repayments." },
];

const MREIF_ELIGIBILITY = [
  "Nigerian citizen or permanent resident",
  "Aged 21 to 60 at application; loan must conclude before age 65",
  "Verifiable income (employment, business, or rental income)",
  "Minimum 10% equity contribution of property value",
  "Clean credit history with Credit Bureau Nigeria",
  "Valid means of identification: international passport, driver's licence, or NIN",
];

const MREIF_FAQS = [
{ q: "Is the 9.75% rate really fixed for the full 20 years?", a: "Yes. Most bank mortgages change when interest rates move. With MREIF, your rate is set on the day your loan starts and stays the same until it is paid off." },
  { q: "Can I prepay or settle the loan early?", a: "Yes, with no prepayment penalties. You can pay down principal at any time, which reduces the total interest paid over the loan's lifetime." },
  { q: "What happens if I lose my job mid-tenor?", a: "Standard mortgage protection applies. Geodata can connect you with optional payment protection insurance at application stage, which covers up to 12 months of repayments in case of involuntary unemployment." },
  { q: "Can I rent out the property while paying the mortgage?", a: "Yes. The property is yours from disbursement; rental income is permitted and can be used to supplement repayments." },
  { q: "Does MREIF require a co-signer?", a: "Not by default. A co-signer (typically a spouse) may be added to strengthen the application or combine incomes for higher loan eligibility." },
  { q: "What's the minimum income to qualify?", a: "MREIF doesn't publish a hard minimum, but as a guide, monthly repayments should not exceed 33% of net income. Use the calculator above to estimate your figure, then work backwards." },
];

function MreifSlider(props: { label: string; value: string; min: number; max: number; step: number; current: number; onChange: (n: number) => void; minLabel: string; maxLabel: string }) {
  return (
    <div className="py-6 border-b border-[#e5e0d5]">
      <div className="flex items-baseline justify-between mb-4">
        <span className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e]">{props.label}</span>
        <span className="text-xl text-[#0a1628]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{props.value}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.current}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full accent-[#0a1628] cursor-pointer"
      />
      <div className="flex justify-between mt-2 text-[11px] uppercase tracking-[0.15em] text-[#5c6b7e]">
        <span>{props.minLabel}</span>
        <span>{props.maxLabel}</span>
      </div>
    </div>
  );
}

export function MortgagePage() {
  const [price, setPrice] = useState(150_000_000);
  const [equityPct, setEquityPct] = useState(20);
  const [years, setYears] = useState(20);
  const [rent, setRent] = useState(8_000_000);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useSeo({
    title: "MREIF Mortgage, 9.75% Fixed for 20 Years | Geodata World Services",
    description: "Finance a Geodata home through the MREIF programme at 9.75% fixed for up to 20 years. Calculate your monthly repayment and compare renting with owning.",
    canonicalPath: "/mortgage",
  });

  const loan = price * (1 - equityPct / 100);
  const monthly = mreifMonthly(loan, years);
  const total = monthly * years * 12;
  const interest = total - loan;

  const rentMonthly = rent / 12;
  let fiveYearRent = 0;
  for (let y = 0; y < 5; y++) fiveYearRent += rent * Math.pow(1.12, y);
  const equityAfterFive = price * (equityPct / 100) + principalPaidAfter(loan, years, 60);

  const serif = { fontFamily: "'Fraunces', Georgia, serif" };

  return (
    <div className="min-h-screen bg-[#fafaf7] text-[#0a1628]">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-[#0a1628] text-[#fafaf7]">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-24 md:py-32">
            <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[#d44455] mb-8">
              <span className="block w-8 h-px bg-[#d44455]" /> Official mortgage programme
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-[88px] font-normal leading-[1.02] tracking-[-0.03em] text-[#fafaf7]" style={serif}>
              9.75% fixed.<br />Twenty years.<br /><em className="italic">Naira denominated.</em>
            </h1>
            <p className="mt-8 max-w-2xl text-lg text-[#fafaf7]/75 leading-relaxed">
MREIF is a federal mortgage scheme run through partner banks. Every Geodata home qualifies, so you can borrow in naira at 9.75% fixed for up to 20 years.

            </p>
          </div>
        </section>

        <AffordabilityQuiz />

        {/* How it works */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">How it works</p>
            <h2 className="text-4xl md:text-5xl font-normal tracking-[-0.025em] mb-6" style={serif}>Four steps. Roughly six weeks.</h2>
            <p className="max-w-2xl text-[#5c6b7e] mb-14">
We help you reserve your home, pay your deposit and gather the documents the bank needs. The bank then checks your application, approves the loan and pays the balance to us.
            </p>
            <div className="grid md:grid-cols-4 border-t border-[#e5e0d5]">
              {MREIF_STEPS.map((s, i) => (
                <div key={s.title} className="pt-8 pr-8 pb-4 md:border-r border-[#e5e0d5] last:border-r-0">
                  <div className="text-sm text-[#a93340] mb-6">{String(i + 1).padStart(2, "0")}</div>
                  <h3 className="text-2xl font-normal mb-3" style={serif}>{s.title}</h3>
                  <p className="text-sm text-[#5c6b7e] leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Calculator */}
        <section id="calculator" className="py-24 bg-[#f4f2ec]">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 grid lg:grid-cols-2 gap-16">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">Mortgage calculator</p>
              <h2 className="text-4xl md:text-5xl font-normal tracking-[-0.025em] mb-6" style={serif}>Find your monthly figure.</h2>
<p className="text-[#5c6b7e] mb-8">Move the sliders to see what you would pay each month. Your deposit (equity) is the share of the price you pay upfront.</p>
              <MreifSlider label="Property price" value={naira(price)} min={90_000_000} max={220_000_000} step={5_000_000} current={price} onChange={setPrice} minLabel={naira(90_000_000)} maxLabel={naira(220_000_000)} />
              <MreifSlider label="Equity contribution" value={`${equityPct}% · ${naira(price * equityPct / 100)}`} min={10} max={50} step={1} current={equityPct} onChange={setEquityPct} minLabel="10% MREIF minimum" maxLabel="50%" />
              <MreifSlider label="Mortgage tenor" value={`${years} years`} min={5} max={20} step={1} current={years} onChange={setYears} minLabel="5 years" maxLabel="20 years (max)" />
            </div>
            <div className="bg-[#0a1628] text-[#fafaf7] p-10 md:p-14 self-start">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#fafaf7]/60 mb-4">Monthly repayment</p>
              <div className="text-5xl md:text-6xl font-normal tracking-[-0.03em]" style={serif}>{naira(monthly)}</div>
              <p className="text-sm text-[#d44455] mt-3 mb-10">Fixed at 9.75% per annum</p>
              <dl className="divide-y divide-white/10 border-y border-white/10 text-sm">
                <div className="flex justify-between py-4"><dt className="text-[#fafaf7]/60">Loan amount</dt><dd>{naira(loan)}</dd></div>
                <div className="flex justify-between py-4"><dt className="text-[#fafaf7]/60">Total repayment</dt><dd>{naira(total)}</dd></div>
                <div className="flex justify-between py-4"><dt className="text-[#fafaf7]/60">Total interest</dt><dd>{naira(interest)}</dd></div>
              </dl>
              <Link to="/contact" className="mt-10 inline-flex items-center gap-3 bg-[#fafaf7] hover:bg-[#d44455] text-[#0a1628] px-8 py-4 uppercase text-xs tracking-[0.15em] font-medium transition-colors">
                Begin application <span aria-hidden="true">&rarr;</span>
              </Link>
<p className="mt-6 text-xs text-[#fafaf7]/50">These are estimates. The bank confirms your final figures once it checks that you qualify.</p>
            </div>
          </div>
        </section>

        {/* Rent vs own */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">The honest comparison</p>
            <h2 className="text-4xl md:text-5xl font-normal tracking-[-0.025em] mb-6" style={serif}>What does renting actually cost you?</h2>
            <p className="max-w-3xl text-[#5c6b7e] mb-10">
              Abuja rent is paid a year upfront and rises every renewal. An MREIF mortgage is a flat monthly payment, fixed for 20 years, on a home you own. Adjust your current rent below; the home price and deposit follow the calculator above.
            </p>
            <div className="max-w-xl mb-12">
              <MreifSlider label="Your current annual rent" value={naira(rent)} min={2_000_000} max={20_000_000} step={500_000} current={rent} onChange={setRent} minLabel={naira(2_000_000)} maxLabel={naira(20_000_000)} />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-[#e5e0d5] border border-[#e5e0d5]">
              {[
                { k: "Renting, per month", v: naira(rentMonthly), n: "Paid annually upfront, rises about 12% a year" },
                { k: "Owning (MREIF), per month", v: naira(monthly), n: `9.75% fixed · ${years} years · never rises` },
                { k: "5 years of rent", v: naira(fiveYearRent), n: "Gone. No asset, no equity." },
                { k: "Equity after 5 years owning", v: naira(equityAfterFive), n: "Deposit plus principal repaid, before any appreciation." },
              ].map((c) => (
                <div key={c.k} className="bg-[#fafaf7] p-8">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">{c.k}</p>
                  <p className="text-3xl font-normal tracking-[-0.02em] mb-2" style={serif}>{c.v}</p>
                  <p className="text-sm text-[#5c6b7e]">{c.n}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-[#5c6b7e] max-w-3xl">
              Illustrative only. Assumes MREIF fixed rate of 9.75% and 12% annual rent inflation. Excludes service charges, legal fees and maintenance on both sides. MREIF eligibility is assessed by the participating financial institution.
            </p>
          </div>
        </section>

        {/* Eligibility and FAQ */}
        <section className="py-24 bg-[#f4f2ec]">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 grid lg:grid-cols-2 gap-16">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">Eligibility</p>
              <h2 className="text-4xl md:text-5xl font-normal tracking-[-0.025em] mb-10" style={serif}>Who qualifies.</h2>
              <ul className="border-t border-[#e5e0d5]">
                {MREIF_ELIGIBILITY.map((e) => (
                  <li key={e} className="flex gap-4 py-5 border-b border-[#e5e0d5]">
                    <span className="text-[#a93340]">+</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
              <Link to="/contact" className="mt-10 inline-flex items-center gap-3 bg-[#0a1628] hover:bg-[#0f2547] text-[#fafaf7] px-8 py-4 uppercase text-xs tracking-[0.15em] font-medium transition-colors">
                Check your MREIF eligibility <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">Frequently asked</p>
<h2 className="text-4xl md:text-5xl font-normal tracking-[-0.025em] mb-10" style={serif}>Your questions, answered.</h2>
              <div className="border-t border-[#e5e0d5]">
                {MREIF_FAQS.map((f, i) => (
                  <div key={f.q} className="border-b border-[#e5e0d5]">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex justify-between items-center gap-6 py-5 text-left cursor-pointer"
                      aria-expanded={openFaq === i}
                    >
                      <span className="text-lg" style={serif}>{f.q}</span>
                      <span className="text-[#a93340] text-xl">{openFaq === i ? "−" : "+"}</span>
                    </button>
                    {openFaq === i && <p className="pb-6 text-[#5c6b7e] leading-relaxed">{f.a}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


// ─── Southern Bridge City sales page (/southern-bridge-city) ─────────────────
// Guide prices and availability from the October 2026 corporate profile (commercial schedule, p. 21).
const SBC_TYPES: { name: string; kind: string; beds: number; size?: number; price: number; available: number }[] = [
  { name: "5 Bedroom Semi-Detached", kind: "Semi-detached", beds: 5, size: 440, price: 220_000_000, available: 48 },
  { name: "6 Bedroom Terrace Duplex", kind: "Terrace", beds: 6, size: 350, price: 220_000_000, available: 28 },
  { name: "4 Bedroom Semi-Detached", kind: "Semi-detached", beds: 4, size: 350, price: 180_000_000, available: 26 },
  { name: "4 Bedroom Terrace Duplex", kind: "Terrace", beds: 4, size: 255, price: 150_000_000, available: 60 },
  { name: "4 Bedroom Block of Flats", kind: "Flat", beds: 4, size: 340, price: 130_000_000, available: 64 },
  { name: "2 Bedroom Block of Flats", kind: "Flat", beds: 2, size: 200, price: 90_000_000, available: 120 },
];

const SBC_REASONS = [
{ group: "For homebuyers", title: "Fixed payments for 20 years", body: "Your mortgage rate is fixed at 9.75% for the whole term, so your monthly payment stays the same even as rents around you go up." },
  { group: "For homebuyers", title: "A finished estate from day one", body: "You don't move into a building site. Roads are paved, utilities are underground, and security is operational before any resident takes possession." },
{ group: "For homebuyers", title: "Quality you can check", body: "Independent surveyors check every stage of the work, and the estate has passed the federal MREIF checks. You don't have to take our word for it." },
{ group: "For investors", title: "Own more with less money down", body: "With a 10% deposit, ₦9M to ₦22M of your own money buys a home worth ₦90M to ₦220M." },
{ group: "For investors", title: "Easier to sell later", body: "Anyone who qualifies for the federal mortgage can buy from you, not only cash buyers." },

];

const shortNaira = (n: number) => `₦${Math.round(n / 1_000_000)}M`;
const shortNairaDec = (n: number) => `₦${(n / 1_000_000).toFixed(2)}M`;

// ─── Live availability (plot picker with satellite map and unit grid) ────────
// Counts follow the commercial release schedule in the October 2026 corporate
// profile: "available now" and the 12-month release target per category.
// Plot coordinates match the plot pins used on the property pages.
const SBC_ESTATE_CENTRE = { lat: 9.0244, lng: 7.3684 };

const SBC_PLOTS: { name: string; plotNo?: string; coords?: { lat: number; lng: number }; release: number }[] = [
  { name: "5 Bedroom Semi-Detached", plotNo: "7261", coords: { lat: 9.024589794673116, lng: 7.36888262396079 }, release: 48 },
  { name: "6 Bedroom Terrace Duplex", plotNo: "7270", coords: { lat: 9.019900426418593, lng: 7.370225517733883 }, release: 36 },
  { name: "4 Bedroom Semi-Detached", plotNo: "7258", coords: { lat: 9.0272080689693, lng: 7.368666226041666 }, release: 26 },
  { name: "4 Bedroom Terrace Duplex", plotNo: "7253", coords: { lat: 9.025235567440559, lng: 7.364539506419074 }, release: 100 },
  { name: "4 Bedroom Block of Flats", plotNo: "7266", coords: { lat: 9.024727799022891, lng: 7.370051250516858 }, release: 128 },
  { name: "2 Bedroom Block of Flats", release: 120 },
];

const SBC_CURRENCIES: { code: string; symbol: string }[] = [
  { code: "NGN", symbol: "₦" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
  { code: "EUR", symbol: "€" },
  { code: "CAD", symbol: "CA$" },
];

function useSbcLinks() {
  const rows = useQuery(api.properties.listLatest, { limit: 50 });
  return (name: string) => {
    const key = (n: string) =>
      ((n.match(/(\d+)[\s-]*bed/i) || [])[1] || "") + (/semi/i.test(n) ? "semi" : /terrace/i.test(n) ? "terrace" : /flat/i.test(n) ? "flat" : "x");
    const want = key(name);
    const hit = ((rows ?? []) as { _id: string; title?: string }[]).find((p) => key(p.title ?? "") === want);
    return hit ? `/properties/${hit._id}` : "/properties";
  };
}

function SbcAvailability() {
  const linkFor = useSbcLinks();
  const serif = { fontFamily: "'Fraunces', Georgia, serif" };
  const [active, setActive] = useState(0);
  const currency = "NGN" as string;
  const rates = null as Record<string, number> | null;

  const type = SBC_TYPES[active];
  const plot = SBC_PLOTS.find((p) => p.name === type.name);
  const release = Math.max(plot?.release ?? type.available, type.available);
  const upcoming = release - type.available;
  const centre = plot?.coords ?? SBC_ESTATE_CENTRE;
  const zoom = plot?.coords ? 18 : 16;
  // Known plots get a pin; others show the estate from above without a pin.
  const mapSrc = `https://maps.google.com/maps?${plot?.coords ? "q" : "ll"}=${centre.lat},${centre.lng}&t=k&z=${zoom}&output=embed`;

  const rate = currency === "NGN" ? 1 : rates?.[currency];
  const symbol = SBC_CURRENCIES.find((c) => c.code === currency)?.symbol ?? "₦";
  const price = rate
    ? symbol + Math.round(type.price * rate).toLocaleString("en-NG")
    : "₦" + type.price.toLocaleString("en-NG");

  return (
    <section id="availability" className="py-24 bg-[#f4f2ec]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        <div className="grid md:grid-cols-2 gap-8 items-end mb-12">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">Live availability</p>
            <h2 className="text-5xl md:text-6xl font-normal tracking-[-0.03em]" style={serif}>Choose your plot.</h2>
          </div>
          <div>
            <p className="text-lg text-[#5c6b7e] mb-6">
Each home type has its own plot in the estate. Pick one to see how many are available now and how many are coming next.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8" role="tablist">
          {SBC_TYPES.map((t, i) => (
            <button
              key={t.name}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`shrink-0 px-4 py-3 text-[11px] uppercase tracking-[0.15em] font-medium cursor-pointer transition-colors ${i === active ? "bg-[#0a1628] text-[#fafaf7]" : "text-[#5c6b7e] hover:text-[#0a1628]"}`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1.3fr_1fr] bg-[#fafaf7] border border-[#e5e0d5]">
          <div className="relative min-h-[360px] lg:min-h-[560px] bg-[#0a1628]">
            <StyledMap key={mapSrc} lat={centre.lat} lng={centre.lng} zoom={zoom} pin={!!plot?.coords} fallbackSrc={mapSrc} title={`${type.name} plot location`} className="absolute inset-0 h-full w-full" />
            <div className="absolute left-4 bottom-4 bg-[#0a1628] text-[#fafaf7] px-3 py-2 text-xs pointer-events-none">
              {type.name} <span className="text-[#d44455] ml-1">{type.available} left</span>
            </div>
          </div>
          <div className="p-8 md:p-10 flex flex-col">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-3">
              {plot?.plotNo ? `Plot ${plot.plotNo} · ` : ""}{type.kind} · {type.beds} bed
            </p>
            <h3 className="text-3xl md:text-4xl font-normal tracking-[-0.02em] mb-2" style={serif}>{type.name}</h3>
            <p className="text-2xl mb-8" style={serif}>From {price}</p>

            <div className="grid grid-cols-3 gap-4 border-t border-[#e5e0d5] pt-6 mb-6">
              <div>
                <div className="text-4xl" style={serif}>{type.available}</div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-[#5c6b7e] mt-1">Available now</div>
              </div>
              <div>
                <div className="text-4xl" style={serif}>{upcoming}</div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-[#5c6b7e] mt-1">Next release</div>
              </div>
              <div>
                <div className="text-4xl" style={serif}>{release}</div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-[#5c6b7e] mt-1">12-month total</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-[3px] mb-3" aria-label={`${type.available} of ${release} units available now`}>
              {Array.from({ length: release }).map((_, i) => (
                <span
                  key={i}
                  className={`w-[10px] h-[10px] ${i < type.available ? "bg-[#0a1628]" : "bg-[#e5e0d5]"}`}
                />
              ))}
            </div>
            <div className="flex gap-6 text-[11px] uppercase tracking-[0.15em] text-[#5c6b7e] mb-8">
              <span className="flex items-center gap-2"><span className="w-[10px] h-[10px] bg-[#0a1628]" /> Available now</span>
              <span className="flex items-center gap-2"><span className="w-[10px] h-[10px] bg-[#e5e0d5]" /> Next release</span>
            </div>

            <div className="mt-auto space-y-3">
              <Link
                to={linkFor(type.name)}
                className="block text-center border border-[#0a1628] hover:bg-[#0a1628] hover:text-[#fafaf7] px-6 py-4 uppercase text-xs tracking-[0.15em] font-medium transition-colors"
              >
                View residence
              </Link>
              <button
                type="button"
                {...calProps}
                className="block w-full text-center bg-[#0a1628] hover:bg-[#0f2547] text-[#fafaf7] px-6 py-4 uppercase text-xs tracking-[0.15em] font-medium transition-colors cursor-pointer"
              >
                Book a viewing
              </button>
              <p className="text-xs text-[#5c6b7e] pt-2">
These numbers change as homes sell. Please check with our sales team before you reserve.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const SBC_HERO = "/media/file_TOt6orgmVAgnMc0npYM7v1oD.webp"; const SBC_AERIAL2 = "/media/file_Ktl1SL4TVwejOSLr3mr1dwKT.webp"; const SBC_U = "/media/file_"; const SBC_SHOTS: Record<string, string[]> = { "5 Bedroom Semi-Detached": ["9YXS1hHerLss5xwydcczgQJA.webp", "SGpmkhzZR76GbmX1hLlStCy4.webp", "SD0CG9Z6qlpPRty6K35Z7FVf.webp", "05UgSBdIoRSJ2RFKpUHVQaz0.webp", "rec93Ujh03sZMuXPxHDIYt0T.webp", "4YKBF0YpoKc0Ey3Xi2oMRmis.webp", "5Dn7DFUAkXSNjcVKKygTPAOF.webp", "9X9NEkRuxCefVm6fztAPS4cx.webp", "BXr1mnXb1aJM43PphMqx9BHR.webp", "GNA25L6sg29MNERWmH51mz2P.webp", "9oLIDlhbw3fDPQXuSWH6TTx7.webp", "pHcy21DeTZO068xr5RbnjXOV.webp", "ScZgHYmYWky36BwdDAWxprMu.webp"].map((i) => SBC_U + i), "6 Bedroom Terrace Duplex": ["mExxar93f8Fk3x6l51JFz31x.webp", "zm1dFDIK8XP8KGf2IcZ3NFOM.webp", "Nf0Y4ZZTO93zcPvax0PaFfzt.webp", "kaPk9CQEX1sIUNoGMYwZpa0r.webp", "kpxiOnxdqycxSPzieKHoxFbW.webp", "CcBKrkqPololULOoAuQOnMlc.webp"].map((i) => SBC_U + i), "4 Bedroom Semi-Detached": ["L4DJh06pYt9Zd5TIc325Hgxc.webp", "N9bC2hqjXbn16gOOcvHDCTyA.webp", "RtmnbMX8DZVEsQ4JnlQqkcxT.webp", "8HDoJ23pWcbnwygC73gD1R0o.webp", "pvq1eU3gy0vRl8O8pGGfRfCU.webp", "3D0ufFur7HVFZTVV6XWlFtP4.webp"].map((i) => SBC_U + i), "4 Bedroom Terrace Duplex": ["d3w8lhdDIH7LoR6aCoMOO4Ob.webp", "nRgILKu6T3X547hZFXHuWR5m.webp", "qPz8Tlh2jpb9hJawu9zLeGi1.webp", "XTpEd4MTXm214WssSUgn7e8t.webp", "PRW0YgxyxbzpsPx8geM5LQnG.webp"].map((i) => SBC_U + i), "4 Bedroom Block of Flats": ["GX50s9jD47NDg8sZS446NnhT.webp", "Yx60cio7L6w3JEVbVX1oJrzX.webp", "sdMPS6NW5X67AhL7cgKmrRdG.webp"].map((i) => SBC_U + i) };
function SbcShowcase({ linkFor }: { linkFor: (n: string) => string }) { const [k, setK] = useState(0); const [n, setN] = useState(0); const t = SBC_TYPES[k]; const imgs = SBC_SHOTS[t.name] ?? []; const serif = { fontFamily: "'Fraunces', Georgia, serif" };return (<section className="py-24 bg-[#0a1628] text-[#fafaf7]"><div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20"><p className="text-[11px] uppercase tracking-[0.2em] text-[#d44455] mb-4">On site now</p><h2 className="text-4xl md:text-5xl font-normal tracking-[-0.025em] mb-4" style={serif}>See every home from the air.</h2><p className="max-w-2xl text-[#fafaf7]/70 mb-10">Drone footage from the site. Pick a home type to see how it is rising on the ground.</p><div className="flex flex-wrap gap-2 mb-8">{SBC_TYPES.map((x, i) => SBC_SHOTS[x.name] ? (<button key={x.name} type="button" onClick={() => { setK(i); setN(0); }} className={"px-4 py-2 text-xs uppercase tracking-[0.12em] border transition-colors " + (i === k ? "bg-[#d44455] border-[#d44455] text-white" : "border-white/25 text-[#fafaf7]/80 hover:border-white")}>{x.name}</button>) : null)}</div><div className="grid lg:grid-cols-[2fr_1fr] gap-8"><div><img key={imgs[n]} src={imgs[n]} alt={t.name + " at Southern Bridge City, Idu, Abuja"} loading="lazy" className="w-full aspect-[16/9] object-cover bg-white/5" /><div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">{imgs.map((s, j) => (<button key={s} type="button" onClick={() => setN(j)} aria-label={"Photo " + (j + 1)} className={"block overflow-hidden border-2 " + (j === n ? "border-[#d44455]" : "border-transparent opacity-70 hover:opacity-100")}><img src={s} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover" /></button>))}</div></div><div className="self-start"><p className="text-[11px] uppercase tracking-[0.2em] text-[#d44455] mb-3">{t.kind}</p><h3 className="text-3xl md:text-4xl font-normal mb-5" style={serif}>{t.name}</h3><dl className="border-t border-white/15">{[["Bedrooms", String(t.beds)], ["Size", t.size ? t.size + " sqm" : "On request"], ["From", shortNaira(t.price)], ["Available", String(t.available)]].map(([a, b]) => (<div key={a} className="flex justify-between py-3 border-b border-white/15"><dt className="text-sm text-[#fafaf7]/60">{a}</dt><dd style={serif}>{b}</dd></div>))}</dl><Link to={linkFor(t.name)} className="mt-8 inline-flex items-center gap-3 bg-[#d44455] hover:bg-[#a93340] text-white px-7 py-4 uppercase text-xs tracking-[0.15em] font-medium transition-colors">View available units <span aria-hidden="true">&rarr;</span></Link></div></div><div className="mt-16 grid md:grid-cols-2 gap-4"><img src={SBC_HERO} alt="Aerial view of Southern Bridge City, Idu, Abuja" loading="lazy" className="w-full aspect-[16/10] object-cover" /><img src={SBC_AERIAL2} alt="Southern Bridge City estate from above" loading="lazy" className="w-full aspect-[16/10] object-cover" /></div></div></section>); }
export function SouthernBridgeCityPage() {
  const linkFor = useSbcLinks();
  const data = useQuery(api.developments.getPublicEstate, { slug: "southern-bridge-city" });
  const serif = { fontFamily: "'Fraunces', Georgia, serif" };

  useSeo({
    title: "Southern Bridge City, Idu, Abuja | Geodata World Services",
description: "Over 1,850 homes at Idu, Abuja. Prices from ₦90M, with a 9.75% fixed-rate mortgage over up to 20 years.",
    canonicalPath: "/southern-bridge-city",
  });

  const overall = data?.overallPercent ?? 78;

  return (
    <div className="min-h-screen bg-[#fafaf7] text-[#0a1628]">
      <Navbar />
      <main>
        {/* Hero */}
<section className="relative bg-[#0a1628] text-[#fafaf7] overflow-hidden max-md:!py-0">
          {SBC_HERO && (
            <img src="/media/file_vDMAQ0EdtO6bETA6V1w8hcAd.webp" alt="Aerial view of Southern Bridge City, Idu, Abuja" className="absolute inset-0 w-full h-full object-cover opacity-55" />
          )}
<div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#0a1628]"><iframe src="https://www.youtube.com/embed/eXc-gVe4nXU?autoplay=1&mute=1&controls=0&loop=1&playlist=eXc-gVe4nXU&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&disablekb=1&start=0" title="Southern Bridge City film" allow="autoplay; encrypted-media" className="absolute border-0 max-w-none top-0 left-1/2 -translate-x-1/2 w-[133.34vw] h-[75vw] md:top-1/2 md:-translate-y-1/2 md:w-[240vh] md:min-w-[135%] md:min-h-[135%] md:opacity-60" /></div>
<div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 pt-[calc(75vw+1.5rem)] pb-8 md:py-32">
<p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[#d44455] mb-4 md:mb-8">
              <span className="block w-8 h-px bg-[#d44455]" /> Ongoing · Phase One · Idu, Abuja
            </p>
<h1 className="text-4xl md:text-7xl lg:text-[88px] font-normal leading-[1.02] tracking-[-0.03em] text-[#fafaf7]" style={serif}>
              Southern Bridge <em className="italic">City</em>
            </h1>
<p className="mt-4 md:mt-8 max-w-2xl text-base md:text-lg text-[#fafaf7]/75 leading-relaxed">
Over 1,850 homes at Idu, Abuja. Prices from ₦90M, with a 9.75% fixed-rate mortgage over up to 20 years.
            </p>
<div className="mt-6 md:mt-14 grid grid-cols-4 border-t border-white/15">
              {[
{ v: "1,850+", k: "Homes" },
{ v: "12", k: "Home types" },
                { v: "346", k: "Available now" },
                { v: `${overall}%`, k: "Phase 1 complete" },
              ].map((s) => (
<div key={s.k} className="pt-4 md:pt-8 pr-2 md:pr-6">
<div className="text-2xl md:text-5xl font-normal tracking-[-0.03em]" style={serif}>{s.v}</div>
<div className="mt-1 md:mt-2 text-[9px] md:text-[11px] uppercase tracking-[0.08em] md:tracking-[0.2em] text-[#fafaf7]/60">{s.k}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The development */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 grid lg:grid-cols-[1.4fr_1fr] gap-16">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">The development</p>
              <h2 className="text-4xl md:text-5xl font-normal tracking-[-0.025em] mb-8" style={serif}>A new address for Abuja.</h2>
              <div className="space-y-5 text-[#5c6b7e] leading-relaxed text-lg">
                <p>
Southern Bridge City is a gated estate of over 1,850 homes on 67 hectares at Idu, Abuja, built by Geodata World Services. It is a short drive from the Idu Industrial District and the Abuja to Kaduna rail station, with direct roads into the city centre. You can choose from flats, terraces, semi-detached and detached homes, all on paved streets with drainage, street lights and security around the clock.
                </p>
                <p>
Independent surveyors check our progress every month. Every home has a reinforced concrete frame, all cables and pipes run underground, and the roads are finished before anyone moves in.
                </p>
              </div>
            </div>
            <dl className="border-t border-[#e5e0d5] self-start">
              {[
                ["Location", data?.estate.location ?? "Idu Industrial Layout, Abuja FCT"],
                ["Developer", "Geodata World Services Limited"],
                ["Mortgage guarantee", "MREIF Offtake Guarantee"],
["Size", "1,850+ homes · 12 home types"],
["Available now", "346 residences"],

              ].map(([k, v]) => (
                <div key={k} className="py-5 border-b border-[#e5e0d5]">
                  <dt className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-1">{k}</dt>
                  <dd className="text-lg" style={serif}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Residences */}
        <section className="py-24 bg-[#f4f2ec]">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">The residences</p>
<h2 className="text-4xl md:text-5xl font-normal tracking-[-0.025em] mb-6" style={serif}>Six home types. One estate.</h2>
            <p className="max-w-3xl text-[#5c6b7e] mb-12">
Every home shares the same roads, security and estate management. Prices run from ₦90M for a two-bedroom flat to ₦220M for a five-bedroom semi-detached, so you can pick the home that suits your family, not just your budget.
            </p>
            <div className="border-t border-[#e5e0d5]">
              {SBC_TYPES.map((t, i) => (
                <Link
                  key={t.name}
                  to={linkFor(t.name)}
className="group grid grid-cols-[2rem_1fr_auto] md:grid-cols-[4rem_1fr_1fr_auto] items-center gap-3 md:gap-4 py-5 md:py-7 border-b border-[#e5e0d5] hover:bg-[#fafaf7] transition-colors px-2"
                >
                  <span className="text-sm text-[#a93340]">{String(i + 1).padStart(2, "0")}</span>
<span className="text-lg md:text-3xl group-hover:text-[#a93340] transition-colors" style={serif}>{t.name}</span>
                  <span className="hidden md:block text-sm text-[#5c6b7e]">{t.kind} · {t.beds} bed{t.size ? ` · ${t.size}m²` : ""} · {t.available} available</span>
                  <span className="text-lg" style={serif}>{shortNaira(t.price)} <span aria-hidden="true" className="text-[#a93340]">&rarr;</span></span>
                </Link>
              ))}
            </div>
            <Link to="/properties" className="mt-10 inline-flex items-center gap-3 text-xs uppercase tracking-[0.15em] font-medium hover:text-[#a93340]">
              View all available units <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </section>

        <SbcShowcase linkFor={linkFor} />
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">Why Southern Bridge City</p>
<h2 className="text-4xl md:text-5xl font-normal tracking-[-0.025em] mb-12" style={serif}>Why buy here.</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#e5e0d5] border border-[#e5e0d5]">
              {SBC_REASONS.map((r) => (
                <div key={r.title} className="bg-[#fafaf7] p-8">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#a93340] mb-4">{r.group}</p>
                  <h3 className="text-2xl font-normal mb-3" style={serif}>{r.title}</h3>
                  <p className="text-sm text-[#5c6b7e] leading-relaxed">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SbcAvailability />

        {/* Enquiry */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 grid md:grid-cols-2 gap-12 items-end">
            <div>
<p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">Talk to us</p>
              <h2 className="text-4xl md:text-5xl font-normal tracking-[-0.025em] mb-6" style={serif}>Ready to learn more?</h2>
              <p className="text-[#5c6b7e]">
A real person on our sales team will reply within one working day. Book a site visit, check if you qualify for the mortgage, or reserve a home.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 md:justify-end">
              <Link to="/contact" className="inline-flex items-center gap-3 bg-[#0a1628] hover:bg-[#0f2547] text-[#fafaf7] px-8 py-4 uppercase text-xs tracking-[0.15em] font-medium transition-colors">
                Enquire now <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link to="/properties" className="inline-flex items-center gap-3 border border-[#e5e0d5] hover:border-[#0a1628] px-8 py-4 uppercase text-xs tracking-[0.15em] font-medium transition-colors">
                Browse available units
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer /><WhatsAppButton />
    </div>
  );
}


// ─── MREIF affordability quiz (shown on /mortgage) ───────────────────────────
const QUIZ_INCOME = [
  { label: "₦500K – ₦1M", value: 750_000 },
  { label: "₦1M – ₦2M", value: 1_500_000 },
  { label: "₦2M – ₦4M", value: 3_000_000 },
  { label: "₦4M and above", value: 5_000_000 },
];
const QUIZ_BEDS = [
  { label: "2 bedrooms", value: 2 },
  { label: "4 bedrooms", value: 4 },
  { label: "5 bedrooms", value: 5 },
  { label: "Open to options", value: 0 },
];
const QUIZ_TIMING = [
  { label: "Within 6 months", sub: "Ready / finishing-stage homes" },
  { label: "12–18 months", sub: "Off-plan with steady progress" },
  { label: "Value matters more", sub: "Best value, flexible on timing" },
];
const QUIZ_BANK = [
  { label: "Yes, pre-approved", sub: "I have an MREIF letter or bank pre-approval" },
  { label: "Not yet, need guidance", sub: "I'd like help with the bank approval step" },
  { label: "Paying cash", sub: "No mortgage needed" },
];

function quizBand(ratio: number) {
  if (ratio <= 0.33) return "Comfortable";
  if (ratio <= 0.5) return "Manageable";
  return "Stretched";
}

function QuizOption({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-6 text-left px-5 py-5 border border-[#e5e0d5] hover:border-[#0a1628] bg-[#fafaf7] transition-colors cursor-pointer"
    >
      <span>
        <span className="block">{label}</span>
        {sub && <span className="block text-sm text-[#5c6b7e] mt-1">{sub}</span>}
      </span>
      <span aria-hidden="true" className="text-[#5c6b7e]">&rsaquo;</span>
    </button>
  );
}

export function AffordabilityQuiz() {
  const serif = { fontFamily: "'Fraunces', Georgia, serif" };
  const createInquiry = useMutation(api.inquiries.create);
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState(QUIZ_INCOME[1]);
  const [beds, setBeds] = useState(QUIZ_BEDS[3]);
  const [timing, setTiming] = useState(QUIZ_TIMING[0]);
  const [bank, setBank] = useState(QUIZ_BANK[1]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deposit, setDeposit] = useState(20);
  const [sending, setSending] = useState(false);

  const cash = bank.label === "Paying cash";
  const pool = SBC_TYPES.filter((t) => beds.value === 0 || t.beds === beds.value);
  const scored = (pool.length ? pool : SBC_TYPES).map((t) => {
    const monthly = cash ? 0 : mreifMonthly(t.price * (1 - deposit / 100), 20);
    return { ...t, monthly, ratio: monthly / income.value };
  });
  const fits = scored.filter((t) => cash || t.ratio <= 0.8).sort((a, b) => b.price - a.price);
  const best = fits[0] ?? [...scored].sort((a, b) => a.price - b.price)[0];
  const alsoFit = fits.filter((t) => t.name !== best.name);
  const qualifies = fits.length > 0;

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please enter your name, email and phone number.");
      return;
    }
    setSending(true);
    try {
      await createInquiry({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: "MREIF affordability quiz",
        type: "mreif_quiz",
        propertyInterest: `Southern Bridge City: ${best.name}`,
        message: [
          `Monthly take-home: ${income.label}`,
          `Bedrooms: ${beds.label}`,
          `Move-in: ${timing.label}`,
          `Bank pre-approval: ${bank.label}`,
          `Closest match: ${best.name} (${shortNaira(best.price)})`,
          cash ? "Paying cash" : `Est. monthly at 20% deposit: ${shortNairaDec(mreifMonthly(best.price * 0.8, 20))}`,
        ].join("\n"),
      });
    } catch {
      // The result is still shown; the sales team simply won't get this lead.
    }
    setSending(false);
    setStep(5);
  };

  const steps = [
{ title: "What's your monthly take-home?", sub: "What actually lands in your account each month, after tax and deductions." },
    { title: "How many bedrooms?", sub: "We have homes from 2 to 5 bedrooms (plus BQ) across Southern Bridge City." },
    { title: "When do you want to move in?", sub: "Helps us point you to ready homes or off-plan opportunities." },
    { title: "Bank pre-approval status?", sub: "MREIF mortgages are issued through Eligible Financial Institutions accredited by the programme." },
    { title: "Almost there.", sub: "Enter your details to see your matched residence and full affordability breakdown." },
  ];

  return (
    <section id="quiz" className="py-24">
      <div className="max-w-5xl mx-auto px-6 sm:px-10">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] pb-4 border-b border-[#e5e0d5] relative">
          <span>Affordability quiz</span>
          <span>{step < 5 ? `Step ${step + 1} of 5` : "Your result"}</span>
          <span className="absolute left-0 -bottom-px h-px bg-[#a93340] transition-all" style={{ width: `${(Math.min(step + 1, 5) / 5) * 100}%` }} />
        </div>

        {step > 0 && step < 5 && (
          <button type="button" onClick={back} className="mt-8 text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] hover:text-[#0a1628] cursor-pointer">
            &lsaquo; Back
          </button>
        )}

        {step < 5 && (
          <div className="mt-8">
            <h2 className="text-4xl md:text-6xl font-normal tracking-[-0.03em] mb-4" style={serif}>{steps[step].title}</h2>
            <p className="text-[#5c6b7e] mb-10">{steps[step].sub}</p>
          </div>
        )}

        {step === 0 && (
          <div className="space-y-3">
            {QUIZ_INCOME.map((o) => <QuizOption key={o.label} label={o.label} onClick={() => { setIncome(o); next(); }} />)}
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3">
            {QUIZ_BEDS.map((o) => <QuizOption key={o.label} label={o.label} onClick={() => { setBeds(o); next(); }} />)}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            {QUIZ_TIMING.map((o) => <QuizOption key={o.label} label={o.label} sub={o.sub} onClick={() => { setTiming(o); next(); }} />)}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            {QUIZ_BANK.map((o) => <QuizOption key={o.label} label={o.label} sub={o.sub} onClick={() => { setBank(o); next(); }} />)}
          </div>
        )}
        {step === 4 && (
          <form onSubmit={submit} className="space-y-6">
            {[
              { label: "Full name", value: name, set: setName, type: "text", ph: "Jane Adekunle" },
              { label: "Email", value: email, set: setEmail, type: "email", ph: "you@example.com" },
              { label: "Phone", value: phone, set: setPhone, type: "tel", ph: "+234 800 000 0000" },
            ].map((f) => (
              <label key={f.label} className="block">
                <span className="block text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-2">{f.label}</span>
                <input
                  type={f.type}
                  value={f.value}
                  placeholder={f.ph}
                  onChange={(e) => f.set(e.target.value)}
                  className="w-full bg-[#fafaf7] border border-[#e5e0d5] focus:border-[#0a1628] outline-none px-4 py-3"
                />
              </label>
            ))}
            <p className="text-xs text-[#5c6b7e]">Our sales team will follow up with your personalised report. We never share your details.</p>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-3 bg-[#0a1628] hover:bg-[#0f2547] disabled:opacity-60 text-[#fafaf7] px-8 py-4 uppercase text-xs tracking-[0.15em] font-medium transition-colors cursor-pointer"
            >
              {sending ? "Matching…" : "See my match"} <span aria-hidden="true">&rarr;</span>
            </button>
          </form>
        )}

        {step === 5 && (
          <div className="mt-10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#a93340] mb-4">{qualifies ? "Closest match found" : "A starting point"}</p>
            <h2 className="text-4xl md:text-6xl font-normal tracking-[-0.03em] mb-6" style={serif}>
              {qualifies ? <>You qualify for {best.name}.</> : <>Let's find your route to {best.name}.</>}
            </h2>
            <p className="max-w-2xl text-[#5c6b7e] text-lg mb-10">
              {name.trim().split(" ")[0] || "Based on your answers"}
              {cash
                ? `, paying cash, ${best.name} (${shortNaira(best.price)}) is the best fit for your requirements.`
                : `, with a ${deposit}% deposit, ${best.name} (${shortNaira(best.price)}) works out at roughly ${shortNairaDec(best.monthly)}/month under MREIF at 9.75% fixed for 20 years.`}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 border-y border-[#e5e0d5] mb-8">
              {[
                { k: "Property price", v: shortNaira(best.price), n: "" },
                { k: "Your deposit", v: shortNaira(best.price * (cash ? 1 : deposit / 100)), n: cash ? "Cash" : `${deposit}%` },
                { k: "Monthly payment", v: cash ? "None" : shortNairaDec(best.monthly), n: cash ? "" : "9.75% fixed" },
                { k: "% of income", v: cash ? "N/A" : `${Math.round(best.ratio * 100)}%`, n: cash ? "" : quizBand(best.ratio) },
              ].map((s) => (
                <div key={s.k} className="py-6 pr-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-2">{s.k}</div>
                  <div className="text-2xl" style={serif}>{s.v}</div>
                  {s.n && <div className="text-[11px] uppercase tracking-[0.15em] text-[#5c6b7e] mt-1">{s.n}</div>}
                </div>
              ))}
            </div>

            {!cash && (
              <div className="bg-[#f4f2ec] border border-[#e5e0d5] p-6 mb-10">
                <div className="flex justify-between text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-3">
                  <span>Adjust deposit</span>
                  <span className="text-[#a93340] text-base normal-case tracking-normal" style={serif}>{deposit}%</span>
                </div>
                <input type="range" min={10} max={50} value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className="w-full accent-[#a93340] cursor-pointer" />
                <div className="flex justify-between text-[11px] uppercase tracking-[0.15em] text-[#5c6b7e] mt-2">
                  <span>10% (MREIF min)</span>
                  <span>50%</span>
                </div>
              </div>
            )}

            {alsoFit.length > 0 && (
              <div className="mb-10">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">Also a fit</p>
                <div className="border-t border-[#e5e0d5]">
                  {alsoFit.map((t) => (
                    <div key={t.name} className="flex justify-between py-4 border-b border-[#e5e0d5]">
                      <span className="text-xl" style={serif}>{t.name}</span>
                      <span className="text-sm text-[#5c6b7e]">{shortNaira(t.price)} · {t.beds} bed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">Next steps</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/contact" className="inline-flex items-center gap-3 border border-[#e5e0d5] hover:border-[#0a1628] px-6 py-4 uppercase text-xs tracking-[0.15em] font-medium">Reserve a viewing</Link>
              <Link to="/southern-bridge-city" className="inline-flex items-center gap-3 border border-[#e5e0d5] hover:border-[#0a1628] px-6 py-4 uppercase text-xs tracking-[0.15em] font-medium">See the residences</Link>
              {!cash && (
                <Link to="/contact" className="inline-flex items-center gap-3 bg-[#0a1628] hover:bg-[#0f2547] text-[#fafaf7] px-6 py-4 uppercase text-xs tracking-[0.15em] font-medium">
                  Start MREIF application <span aria-hidden="true">&rarr;</span>
                </Link>
              )}
            </div>
            <button type="button" onClick={() => setStep(0)} className="mt-8 text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] hover:text-[#0a1628] cursor-pointer">
              Start again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}


// ─── Floor plans and site photos (from the October 2026 corporate profile) ───
const CDN = "/media/";

export const SBC_FLOOR_PLANS: { match: RegExp; name: string; src: string; note: string }[] = [
  { match: /6\s*-?\s*bed.*terrace/i, name: "6 Bedroom Terrace Duplex", src: CDN + "file_IDK6uhCh8gBToqESbS6ZrKGP.jpg", note: "Ground, first and second floor · dimensions in metres" },
  { match: /4\s*-?\s*bed.*semi/i, name: "4 Bedroom Semi-Detached", src: CDN + "file_L6JnXLKYbTvnEtXWcrqnJb5L.jpg", note: "Ground and first floor · areas in m²" },
  { match: /4\s*-?\s*bed.*terrace/i, name: "4 Bedroom Terrace Duplex", src: CDN + "file_A9GRLh5xJn0Lyqe5sBwgzh19.jpg", note: "Ground and first floor · dimensions in metres" },
  { match: /4\s*-?\s*bed.*(block|flat)/i, name: "4 Bedroom Block of Flats", src: CDN + "file_olmNa2gqvpuhrnh9nIqQWEz5.jpg", note: "Typical flat · areas in m²" },
  { match: /2\s*-?\s*bed.*(block|flat)/i, name: "2 Bedroom Block of Flats", src: CDN + "file_PiA53ORZ1ddVaJbLN74D10z8.jpg", note: "Typical flat · areas in m²" },
  { match: /5\s*-?\s*bed.*semi/i, name: "5 Bedroom Semi-Detached", src: "/media/file_SGejjjO2OQks81Gk3Pm6mVGZ-trim.jpg", note: "Ground and first floor plans, room dimensions in metres." },
];

export const SBC_SITE_UPDATES: { match: RegExp; typology: string; date: string; photos: string[] }[] = [
  { match: /6\s*-?\s*bed.*terrace/i, typology: "6 Bedroom Terrace Duplex", date: "October 2026", photos: ["mExxar93f8Fk3x6l51JFz31x.webp", "zm1dFDIK8XP8KGf2IcZ3NFOM.webp", "Nf0Y4ZZTO93zcPvax0PaFfzt.webp", "kaPk9CQEX1sIUNoGMYwZpa0r.webp", "kpxiOnxdqycxSPzieKHoxFbW.webp", "CcBKrkqPololULOoAuQOnMlc.webp"].map((i) => CDN + "file_" + i) },
  { match: /5\s*-?\s*bed.*semi/i, typology: "5 Bedroom Semi-Detached", date: "October 2026", photos: ["9YXS1hHerLss5xwydcczgQJA.webp", "SGpmkhzZR76GbmX1hLlStCy4.webp", "SD0CG9Z6qlpPRty6K35Z7FVf.webp", "05UgSBdIoRSJ2RFKpUHVQaz0.webp", "rec93Ujh03sZMuXPxHDIYt0T.webp", "4YKBF0YpoKc0Ey3Xi2oMRmis.webp", "5Dn7DFUAkXSNjcVKKygTPAOF.webp", "9X9NEkRuxCefVm6fztAPS4cx.webp", "BXr1mnXb1aJM43PphMqx9BHR.webp", "GNA25L6sg29MNERWmH51mz2P.webp", "9oLIDlhbw3fDPQXuSWH6TTx7.webp", "pHcy21DeTZO068xr5RbnjXOV.webp", "ScZgHYmYWky36BwdDAWxprMu.webp"].map((i) => CDN + "file_" + i) },
  { match: /4\s*-?\s*bed.*semi/i, typology: "4 Bedroom Semi-Detached", date: "October 2026", photos: ["L4DJh06pYt9Zd5TIc325Hgxc.webp", "N9bC2hqjXbn16gOOcvHDCTyA.webp", "RtmnbMX8DZVEsQ4JnlQqkcxT.webp", "8HDoJ23pWcbnwygC73gD1R0o.webp", "pvq1eU3gy0vRl8O8pGGfRfCU.webp", "3D0ufFur7HVFZTVV6XWlFtP4.webp"].map((i) => CDN + "file_" + i) },
  { match: /4\s*-?\s*bed.*terrace/i, typology: "4 Bedroom Terrace Duplex", date: "October 2026", photos: ["d3w8lhdDIH7LoR6aCoMOO4Ob.webp", "nRgILKu6T3X547hZFXHuWR5m.webp", "qPz8Tlh2jpb9hJawu9zLeGi1.webp", "XTpEd4MTXm214WssSUgn7e8t.webp", "PRW0YgxyxbzpsPx8geM5LQnG.webp"].map((i) => CDN + "file_" + i) },
  { match: /4\s*-?\s*bed.*(block|flat)/i, typology: "4 Bedroom Block of Flats", date: "October 2026", photos: ["sdMPS6NW5X67AhL7cgKmrRdG.webp", "GX50s9jD47NDg8sZS446NnhT.webp", "Yx60cio7L6w3JEVbVX1oJrzX.webp"].map((i) => CDN + "file_" + i) },
];
export const SBC_VIDEOS: { match: RegExp; src: string }[] = [{ match: /4\s*-?\s*bed.*(block|flat)/i, src: "https://res.cloudinary.com/drort9cs1/video/upload/v1794339014/4bof_Compressed_aejd6t.mp4" }, { match: /4\s*-?\s*bed.*semi/i, src: "https://res.cloudinary.com/drort9cs1/video/upload/v1794341438/4-BEDROOM_SEMI_2_Compressed_zanmsu.mp4" }, { match: /5\s*-?\s*bed.*semi/i, src: "https://res.cloudinary.com/drort9cs1/video/upload/v1794397054/4-BEDROOM_SEMI-DETACHED_2_Compressed_2_stjpwp.mp4" }, { match: /6\s*-?\s*bed.*terrace/i, src: "https://res.cloudinary.com/drort9cs1/video/upload/v1794340218/6-BEDROOM_TERRACE_Compressed_g9dplv.mp4" }];

export function UpdatesPage() {
  const serif = { fontFamily: "'Fraunces', Georgia, serif" };
  const [zoom, setZoom] = useState<string | null>(null);

  useSeo({
    title: "Site Updates | Southern Bridge City | Geodata World Services",
    description: "Photos from active Geodata construction sites at Southern Bridge City, Idu, Abuja, published as work progresses.",
    canonicalPath: "/updates",
  });

  return (
    <div className="min-h-screen bg-[#fafaf7] text-[#0a1628]">
      <Navbar />
      <main>
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">From the sites</p>
            <h1 className="text-5xl md:text-7xl font-normal tracking-[-0.03em] mb-6" style={serif}>Updates.</h1>
            <p className="max-w-2xl text-lg text-[#5c6b7e] mb-16">
Videos and photos from our building sites, posted as the work moves forward.
            </p>
            <div className="space-y-20">
              {SBC_SITE_UPDATES.map((u) => (
                <article key={u.typology} className="border-t border-[#e5e0d5] pt-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#a93340] mb-2">Southern Bridge City · {u.date}</p>
                      <h2 className="text-3xl md:text-4xl font-normal tracking-[-0.02em]" style={serif}>{u.typology}</h2>
                    </div>
                    <Link to="/southern-bridge-city" className="text-xs uppercase tracking-[0.15em] font-medium hover:text-[#a93340]">
                      Development status &rarr;
                    </Link>
                  </div>
                  {SBC_VIDEOS.filter((x) => x.match.test(u.typology)).map((x) => (<video key={x.src} src={x.src} controls playsInline preload="metadata" className="w-full aspect-video bg-black mb-4" />))}
<div className="grid grid-cols-2 gap-2 md:gap-4">
                    {u.photos.map((src, i) => (
                      <button key={src} type="button" onClick={() => setZoom(src)} className="group block overflow-hidden bg-[#f4f2ec] cursor-zoom-in">
                        <img src={src} alt={`${u.typology}, site photo ${i + 1}`} loading="lazy" className="w-full aspect-[4/3] object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      {zoom && (
        <button type="button" onClick={() => setZoom(null)} className="fixed inset-0 z-[100] bg-[#0a1628]/90 flex items-center justify-center p-6 cursor-zoom-out" aria-label="Close photo">
          <img src={zoom} alt="" className="max-h-full max-w-full object-contain" />
        </button>
      )}
      <Footer />
    </div>
  );
}
