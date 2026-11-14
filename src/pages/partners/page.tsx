import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { BadgeCheck, Handshake, MapPin, Search, Star } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { cn } from "@/lib/utils.ts";
import { PARTNER_CATEGORY_LABELS, type PartnerCategory } from "@/lib/partner-showcase.ts";
import type { PublicPartner } from "@/components/partner-showcase/partner-logo-tile.tsx";
import { useMutation } from "convex/react";

function DirectoryCard({ partner, index }: { partner: PublicPartner; index: number }) {
  const record = useMutation(api.partnerProfiles.recordShowcaseEvent);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 12) * 0.04, ease: "easeOut" }}
    >
      <Link
        to={`/partners/${partner.slug}`}
        onClick={() => void record({ slug: partner.slug, event: "logo_click" })}
        className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--brand)]/30 hover:shadow-md cursor-pointer"
      >
        <div className="relative mb-4 flex h-24 items-center justify-center rounded-xl bg-gray-50 p-4">
          {partner.featured && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              <Star size={9} /> Featured
            </span>
          )}
          {partner.logoUrl ? (
            <img src={partner.logoUrl} alt={`${partner.displayName} logo`} loading="lazy" className="max-h-14 max-w-full object-contain" />
          ) : (
            <span className="text-2xl font-bold text-gray-300">{partner.displayName.charAt(0)}</span>
          )}
        </div>
        <div className="flex items-start gap-1.5">
          <p className="min-w-0 flex-1 truncate font-semibold text-gray-900 group-hover:text-[var(--brand)]">{partner.displayName}</p>
          {partner.verified && <BadgeCheck size={16} aria-label="Verified partner" className="shrink-0 text-[var(--brand)]" />}
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{PARTNER_CATEGORY_LABELS[partner.category]}</p>
        {partner.tagline && <p className="mt-2 line-clamp-2 text-sm text-gray-600">{partner.tagline}</p>}
        {partner.country && (
          <p className="mt-auto flex items-center gap-1 pt-3 text-xs text-gray-400"><MapPin size={11} /> {partner.country}</p>
        )}
      </Link>
    </motion.div>
  );
}

export default function PartnersDirectoryPage() {
  useSeo({
    title: "Our Partners | Geodata World Services",
    description: "Agencies, mortgage and finance providers, builders, diaspora associations and advisers who work with Geodata World Services.",
    canonicalPath: "/partners",
  });
  const partners = useQuery(api.partnerProfiles.listPublic, { placement: "directory" });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<PartnerCategory | "all">("all");

  // Only offer category chips that actually have partners
  const categories = useMemo(() => {
    const set = new Set((partners ?? []).map((p) => p.category));
    return (Object.keys(PARTNER_CATEGORY_LABELS) as PartnerCategory[]).filter((c) => set.has(c));
  }, [partners]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (partners ?? []).filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!q || [p.displayName, p.tagline, p.country].some((f) => f?.toLowerCase().includes(q))),
    );
  }, [partners, search, category]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <header className="relative overflow-hidden bg-[#061433] px-6 py-16 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <span className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-300">
            <Handshake size={14} /> Partner Network
          </span>
          <h1 className="text-balance text-3xl font-bold sm:text-5xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            The organisations we build with
          </h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Agencies, finance providers, builders, diaspora associations and advisers — each one approved by our team.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["all", ...categories] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                  category === c ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                )}
              >
                {c === "all" ? "All partners" : PARTNER_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="relative md:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search partners" className="bg-white pl-9" />
          </div>
        </div>

        {partners === undefined ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Handshake /></EmptyMedia>
              <EmptyTitle>{partners.length === 0 ? "Our partner directory is coming soon" : "No partners match your search"}</EmptyTitle>
              <EmptyDescription>
                {partners.length === 0 ? "Approved partners will be listed here." : "Try a different name or category."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild size="sm" className="cursor-pointer bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]">
                <Link to="/partner/apply">Become a partner</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((p, i) => <DirectoryCard key={p.slug} partner={p} index={i} />)}
          </div>
        )}
      </main>

      <section className="border-t border-gray-100 bg-white px-6 py-14 text-center">
        <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Want your organisation listed here?</h2>
        <p className="mx-auto mt-2 max-w-xl text-gray-500">Join our partner programme as an individual or a company and earn commission on every successful referral.</p>
        <Button asChild size="lg" className="mt-6 cursor-pointer bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]">
          <Link to="/partner/apply">Apply to partner with us</Link>
        </Button>
      </section>
      <Footer />
    </div>
  );
}
