import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import ProgrammeUnavailable from "./ProgrammeUnavailable.tsx";
import DiasporaPropertyGrid from "./DiasporaPropertyGrid.tsx";
import DiasporaRegistrationForm from "./DiasporaRegistrationForm.tsx";
import BookConsultationDialog from "./BookConsultationDialog.tsx";
import ReferralProgrammeCta from "./ReferralProgrammeCta.tsx";
import CorporateEnquiryForm from "./CorporateEnquiryForm.tsx";
import { PROGRAMME_VISUALS, type ProgrammeKey } from "../_lib/programmeMeta.ts";
import { useDocumentMeta } from "@/hooks/use-document-meta.ts";
import { cn } from "@/lib/utils.ts";
import type { ProgrammeContent } from "@/convex/diaspora/content.ts";

/**
 * Shared page shell for the five fixed programme routes
 * (/diaspora/own, /invest, /partner, /refer, /corporate). Each route file
 * only supplies its own `programmeKey` — everything else (copy, toggles,
 * visuals, properties) is read live from the backend.
 */
export default function ProgrammePage({ programmeKey }: { programmeKey: ProgrammeKey }) {
  const programmes = useQuery(api.diaspora.programmes.listPublicProgrammes, {});
  const properties = useQuery(api.diaspora.properties.listDiasporaVisibleProperties, { programmeKey });
  const content = useQuery(api.diaspora.content.getContent, {});
  const testimonials = useQuery(api.cms.listDiasporaTestimonials, { programmeKey });

  // Still loading the platform-wide programme list (DiasporaShell has
  // already confirmed the master toggle is on by the time this renders).
  if (programmes === undefined) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20">
        <Skeleton className="h-10 w-2/3 mb-4" />
        <Skeleton className="h-5 w-full mb-8" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const programme = programmes.find((p) => p.key === programmeKey);

  if (!programme) {
    return <ProgrammeUnavailable label="This programme" />;
  }

  return <ProgrammeContent programme={programme} properties={properties} content={content?.programmes[programmeKey]} testimonials={testimonials} />;
}

type Programme = NonNullable<ReturnType<typeof useQuery<typeof api.diaspora.programmes.listPublicProgrammes>>>[number];

function ProgrammeContent({
  programme,
  properties,
  content,
  testimonials,
}: {
  programme: Programme;
  properties: ReturnType<typeof useQuery<typeof api.diaspora.properties.listDiasporaVisibleProperties>>;
  content: ProgrammeContent | undefined;
  testimonials: ReturnType<typeof useQuery<typeof api.cms.listDiasporaTestimonials>>;
}) {
  const headline = content?.heroHeadline || programme.label;
  const subheadline = content?.heroSubheadline || programme.description;
  useDocumentMeta(`${headline} | Geodata Diaspora Platform`, subheadline);
  const visual = PROGRAMME_VISUALS[programme.key];
  const [searchParams] = useSearchParams();
  const campaignCode = searchParams.get("ref");
  const isRefer = programme.key === "refer";
  const isCorporate = programme.key === "corporate";

  return (
    <>
      {/* Hero */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <Link to="/diaspora" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[var(--brand)] mb-6 transition-colors">
            <ArrowLeft size={13} /> Back to Diaspora Hub
          </Link>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-start gap-4">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shrink-0", visual.gradient)}>
              <visual.icon size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{headline}</h1>
              <p className="text-gray-500 max-w-2xl text-sm sm:text-base">{subheadline}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA band */}
      <section className={cn("py-10 px-6 bg-gradient-to-r", visual.gradient)}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-white text-center sm:text-left">
            <h2 className="font-bold text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>Ready to get started?</h2>
            <p className="text-white/80 text-sm">{isRefer ? "Apply to become a Geodata referral partner and our team will reach out." : isCorporate ? "Tell us about your organisation's requirement and our team will reach out." : "Register your interest and our team will reach out."}</p>
          </div>
          {programme.registrationOpen && programme.acceptingEnquiries ? (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-50 gap-2" asChild>
                {isRefer ? (
                  <Link to={`/partner/apply${campaignCode ? `?ref=${campaignCode}` : ""}`}>{programme.ctaLabel} <ArrowRight size={16} /></Link>
                ) : (
                  <a href="#register">{programme.ctaLabel} <ArrowRight size={16} /></a>
                )}
              </Button>
              <BookConsultationDialog programmeKey={programme.key} />
            </div>
          ) : (
            <Button size="lg" variant="secondary" disabled className="bg-white/20 text-white shrink-0">Registration Currently Closed</Button>
          )}
        </div>
      </section>

      {/* Properties */}
      {programme.key !== "refer" && programme.key !== "corporate" && (
        <section className="py-16 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-2">Available Now</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                Real Properties &amp; Opportunities
              </h2>
            </div>
            <DiasporaPropertyGrid
              properties={properties}
              emptyLabel="We're preparing listings for this programme. Contact us and our team will share current opportunities directly."
            />
          </div>
        </section>
      )}

      {/* Testimonials tagged for this programme */}
      {testimonials !== undefined && testimonials.length > 0 && (
        <section className="py-14 px-6 bg-white border-t border-gray-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-2">What Our Clients Say</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {testimonials.map((t) => (
                <div key={t._id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <p className="text-sm text-gray-600 italic mb-4">&ldquo;{t.content}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    {t.avatarUrl ? (
                      <img src={t.avatarUrl} alt={t.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[var(--brand)] flex items-center justify-center text-white font-bold text-xs">{t.name[0]}</div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Programme-specific FAQs, admin-editable via CMS */}
      {content?.faqs && content.faqs.length > 0 && <ProgrammeFaqs faqs={content.faqs} />}

      {/* Registration / application */}
      <section className="py-16 px-6 bg-gray-50">
        {isRefer ? (
          <ReferralProgrammeCta registrationOpen={programme.registrationOpen && programme.acceptingEnquiries} campaignCode={campaignCode} />
        ) : isCorporate ? (
          <CorporateEnquiryForm registrationOpen={programme.registrationOpen && programme.acceptingEnquiries} campaignCode={campaignCode} />
        ) : (
          <DiasporaRegistrationForm programmeKey={programme.key} registrationOpen={programme.registrationOpen && programme.acceptingEnquiries} />
        )}
      </section>
    </>
  );
}

// ── Simple collapsible FAQ list, admin-editable via the Diaspora CMS content
//    tab. Renders nothing (caller guards) when a programme has no FAQs yet.
function ProgrammeFaqs({ faqs }: { faqs: ProgrammeContent["faqs"] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-14 px-6 bg-gray-50 border-t border-gray-100">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-2">Frequently Asked Questions</span>
        </div>
        <div className="space-y-2.5">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer"
                >
                  <span className="font-medium text-sm text-gray-900">{faq.question}</span>
                  <ChevronDown size={16} className={cn("text-gray-400 shrink-0 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && <p className="px-5 pb-4 text-sm text-gray-500">{faq.answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
