import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, ExternalLink, Globe2, Handshake, MapPin, MessageCircle } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";
import WhatsAppButton from "@/pages/home/_components/WhatsAppButton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { PARTNER_CATEGORY_LABELS } from "@/lib/partner-showcase.ts";

const WHATSAPP_URL = "https://wa.me/2347047620492";

export default function PartnerProfilePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const partner = useQuery(api.partnerProfiles.getPublicBySlug, { slug });
  const record = useMutation(api.partnerProfiles.recordShowcaseEvent);

  useSeo({
    title: partner ? `${partner.displayName} | Geodata Partner` : "Partner | Geodata World Services",
    description: partner?.tagline ?? "An approved Geodata World Services partner.",
    canonicalPath: `/partners/${slug}`,
  });

  // Count one view per page visit (sync with an external counter — effect is appropriate)
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (!partner || viewed.current === slug) return;
    viewed.current = slug;
    void record({ slug, event: "profile_view" });
  }, [partner, slug, record]);

  if (partner === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-5xl space-y-6 px-6 py-16">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (partner === null) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-6 py-20">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Handshake /></EmptyMedia>
              <EmptyTitle>Partner not available</EmptyTitle>
              <EmptyDescription>This partner profile isn't listed at the moment.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild size="sm" className="cursor-pointer bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]">
                <Link to="/partners">See all partners</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </main>
        <Footer />
      </div>
    );
  }

  // Every enquiry started from this page carries the partner's referral code
  const ref = `?ref=${encodeURIComponent(partner.referralCode)}`;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <header className="relative overflow-hidden bg-[#061433] px-6 pb-24 pt-10 text-white">
        <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <Link to="/partners" className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white cursor-pointer">
            <ArrowLeft size={14} /> All partners
          </Link>
        </div>
      </header>

      <main className="mx-auto -mt-16 w-full max-w-5xl flex-1 px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg sm:p-10"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:w-52">
              {partner.logoUrl ? (
                <img src={partner.logoUrl} alt={`${partner.displayName} logo`} className="max-h-20 max-w-full object-contain" />
              ) : (
                <Building2 size={36} className="text-gray-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {partner.displayName}
                </h1>
                {partner.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[var(--brand)]">
                    <BadgeCheck size={13} /> Verified Partner
                  </span>
                )}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                <span>{PARTNER_CATEGORY_LABELS[partner.category]}</span>
                {partner.country && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {partner.country}</span>}
              </p>
              {partner.tagline && <p className="mt-3 text-lg text-gray-700">{partner.tagline}</p>}
            </div>
          </div>

          {partner.description && (
            <div className="mt-8 border-t border-gray-100 pt-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">About</h2>
              <p className="whitespace-pre-line leading-relaxed text-gray-700">{partner.description}</p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3 border-t border-gray-100 pt-6">
            <Button asChild className="cursor-pointer gap-2 bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]">
              <Link to={`/properties${ref}`}>Browse properties with this partner <ArrowRight size={15} /></Link>
            </Button>
            <Button asChild variant="secondary" className="cursor-pointer gap-2">
              <a href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Hello, I was referred by ${partner.displayName} (${partner.referralCode}).`)}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={15} /> Talk to Geodata
              </a>
            </Button>
            {partner.website && (
              <Button asChild variant="ghost" className="cursor-pointer gap-2">
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void record({ slug, event: "website_click" })}
                >
                  <Globe2 size={15} /> Visit website <ExternalLink size={12} />
                </a>
              </Button>
            )}
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Listed partners are approved by Geodata World Services Limited. Mention code <span className="font-mono font-semibold text-gray-500">{partner.referralCode}</span> when you get in touch.
        </p>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
