import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ArrowRight, ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import DiasporaShell from "../_components/DiasporaShell.tsx";
import DiasporaPropertyGrid from "../_components/DiasporaPropertyGrid.tsx";
import { PROGRAMME_VISUALS, programmeRoute, type ProgrammeKey } from "../_lib/programmeMeta.ts";
import { useDocumentMeta } from "@/hooks/use-document-meta.ts";
import { cn } from "@/lib/utils.ts";

const HERO_IMAGE = "https://images.unsplash.com/photo-1554457606-ed16c39db884?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1600";

/**
 * Campaign landing page (/diaspora/:campaignSlug, e.g. /diaspora/nblbf-2026).
 * Inherits the full permanent platform chrome (DiasporaShell) but scopes its
 * content to the campaign's own hero copy and assigned/enabled programmes —
 * never a separate design or a duplicate of the hub. A "preview" landing
 * page is only reachable by a signed-in staff member with `diaspora.view`
 * (enforced server-side in `getPublicCampaignBySlug`); a "draft" one 404s.
 */
export default function DiasporaCampaignPage() {
  const { campaignSlug } = useParams<{ campaignSlug: string }>();
  const campaign = useQuery(api.diaspora.campaigns.getPublicCampaignBySlug, campaignSlug ? { slug: campaignSlug } : "skip");
  const platformProgrammes = useQuery(api.diaspora.programmes.listPublicProgrammes, {});
  const properties = useQuery(
    api.diaspora.properties.listDiasporaVisibleProperties,
    campaign ? { campaignId: campaign._id } : "skip",
  );

  return (
    <DiasporaShell>
      {campaign === undefined || platformProgrammes === undefined ? (
        <div className="max-w-5xl mx-auto px-6 py-20">
          <Skeleton className="h-10 w-2/3 mb-4" />
          <Skeleton className="h-5 w-full mb-8" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        </div>
      ) : !campaign ? (
        <CampaignNotFound />
      ) : (
        <CampaignContent campaign={campaign} platformProgrammes={platformProgrammes} properties={properties} />
      )}
    </DiasporaShell>
  );
}

function CampaignNotFound() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <h1 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Page not found</h1>
      <p className="text-gray-500 mb-7 text-sm">This campaign landing page doesn&apos;t exist or isn&apos;t published yet.</p>
      <Button className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white" asChild>
        <Link to="/diaspora"><ArrowLeft size={14} className="mr-1.5" /> Back to Diaspora Hub</Link>
      </Button>
    </div>
  );
}

type Campaign = NonNullable<ReturnType<typeof useQuery<typeof api.diaspora.campaigns.getPublicCampaignBySlug>>>;
type PlatformProgrammes = NonNullable<ReturnType<typeof useQuery<typeof api.diaspora.programmes.listPublicProgrammes>>>;

function CampaignContent({
  campaign,
  platformProgrammes,
  properties,
}: {
  campaign: Campaign;
  platformProgrammes: PlatformProgrammes;
  properties: ReturnType<typeof useQuery<typeof api.diaspora.properties.listDiasporaVisibleProperties>>;
}) {
  useDocumentMeta(
    campaign.metaTitle || `${campaign.name} | Geodata Diaspora Platform`,
    campaign.metaDescription || campaign.description,
  );

  // Only programmes both enabled platform-wide AND turned on for this
  // specific campaign are shown — the safe-config rule from milestone-82
  // means this intersection is always the correct, currently-live set.
  const enabledForCampaign = new Set(campaign.programmes.filter((p) => p.enabled).map((p) => p.programmeKey));
  const visibleProgrammes = platformProgrammes.filter((p) => enabledForCampaign.has(p.key));

  const headline = campaign.heroHeadline || campaign.name;
  const subheadline = campaign.heroSubheadline || campaign.description || "Own. Invest. Develop. Partner. From Anywhere.";

  return (
    <>
      {campaign.isPreview && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-700 text-sm px-6 py-2.5 flex items-center justify-center gap-2">
          <Eye size={14} /> Preview only — this campaign landing page is not yet published to the public.
        </div>
      )}

      {/* Hero */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#081a3f]/95 via-[var(--brand)]/90 to-[#081a3f]/95" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/diaspora" className="inline-flex items-center gap-1.5 text-xs text-blue-200 hover:text-white mb-5 transition-colors">
              <ArrowLeft size={13} /> Geodata Diaspora Investment &amp; Property Platform
            </Link>
            <span className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-bold tracking-widest uppercase mb-4">
              {campaign.code}
              {(campaign.city || campaign.country) && ` · ${[campaign.city, campaign.country].filter(Boolean).join(", ")}`}
              {campaign.startDate && ` · ${campaign.startDate}${campaign.endDate ? ` – ${campaign.endDate}` : ""}`}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {headline}
            </h1>
            <p className="text-blue-100 max-w-2xl mx-auto text-sm sm:text-base">{subheadline}</p>
          </motion.div>
        </div>
      </section>

      {/* Assigned programmes */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-2">Available for {campaign.name}</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              What would you like to do in Nigeria?
            </h2>
          </div>

          {visibleProgrammes.length === 0 ? (
            <p className="text-center text-gray-500 text-sm">No programmes are currently active for this campaign. Please check back soon.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleProgrammes.map((p) => {
                const visual = PROGRAMME_VISUALS[p.key as ProgrammeKey];
                return (
                  <Link
                    key={p.key}
                    to={`${programmeRoute(p.key as ProgrammeKey)}?ref=${campaign.code}`}
                    className="relative text-left p-5 rounded-2xl border-2 border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                  >
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br mb-3", visual.gradient)}>
                      <visual.icon size={20} className="text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1.5 flex items-center gap-1.5">
                      {p.ctaLabel} <ArrowRight size={13} className="text-gray-400" />
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Properties tagged to this campaign */}
      {properties !== undefined && properties.length > 0 && (
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-2">Featured for This Campaign</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                Real Properties &amp; Opportunities
              </h2>
            </div>
            <DiasporaPropertyGrid properties={properties} emptyLabel="Contact us and our team will share current opportunities directly." />
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-14 px-6 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-white text-center sm:text-left">
            <h2 className="font-bold text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>Not sure where to start?</h2>
            <p className="text-white/80 text-sm">Use our guided finder and we'll point you to the right programme.</p>
          </div>
          <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-50 gap-2 shrink-0" asChild>
            <Link to={`/diaspora?ref=${campaign.code}`}>Visit the Diaspora Hub <ArrowRight size={16} /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
