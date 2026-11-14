import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { CheckCircle2, ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import DiasporaShell from "./_components/DiasporaShell.tsx";
import OpportunityFinder, { type FinderAnswers } from "./_components/OpportunityFinder.tsx";
import { DiasporaHero, HereAndThere, HowItWorksAbroad, TrustStrip, FinalCta } from "./_components/HubSections.tsx";
import DiasporaDownloads from "./_components/DiasporaDownloads.tsx";
import DiasporaPartners from "./_components/DiasporaPartners.tsx";
import { PROGRAMME_VISUALS, NOT_SURE_VISUAL, programmeRoute, type ProgrammeKey } from "./_lib/programmeMeta.ts";
import { useSeo } from "@/hooks/use-seo.ts";
import { cn } from "@/lib/utils.ts";

/**
 * The public Diaspora Investment & Property Platform hub — photo-led hero,
 * "here and there" story, "What would you like to do in Nigeria?" (spec section 18), an optional guided
 * Opportunity Finder (section 19). Only ever reads live toggle state from
 * `diaspora.programmes.listPublicProgrammes`; never a hardcoded programme list.
 */
export default function DiasporaHub() {
  const content = useQuery(api.diaspora.content.getContent, {});
  // Fixed, length-safe title/description (CMS headline can be any length) and an
  // explicit self-referencing canonical for /diaspora.
  useSeo({
    title: "Diaspora Property & Investment in Nigeria | Geodata",
    description: "Connect with property, investment, development and partnership opportunities across Nigeria, built for Diaspora Nigerians and returning residents.",
    canonicalPath: "/diaspora",
  });

  const programmes = useQuery(api.diaspora.programmes.listPublicProgrammes, {});
  const [selected, setSelected] = useState<ProgrammeKey[]>([]);
  const [showFinder, setShowFinder] = useState(false);
  const navigate = useNavigate();

  const toggle = (key: ProgrammeKey) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleContinue = () => {
    if (selected.length === 1) { navigate(programmeRoute(selected[0])); return; }
    setShowFinder(true);
  };

  const handleFinderComplete = (answers: FinderAnswers) => {
    // Answers are carried into the registration flow (milestone-85) via
    // session storage — no backend persistence yet, per this milestone's scope.
    sessionStorage.setItem("diaspora_finder_answers", JSON.stringify(answers));
    const primary = answers.objectives[0] ?? selected[0];
    navigate(primary ? programmeRoute(primary) : "/diaspora");
  };

  return (
    <DiasporaShell>
      {showFinder ? (
        <section className="py-16 px-6 bg-gray-50">
          <OpportunityFinder onComplete={handleFinderComplete} />
        </section>
      ) : (
        <>
          <DiasporaHero
            headline={content?.hub.heroHeadline}
            subheadline={content?.hub.heroSubheadline}
            onFindOpportunity={() => document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth" })}
          />

          <HereAndThere />

          {/* What would you like to do */}
          <section id="get-started" className="py-20 px-6 bg-white scroll-mt-20">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-2">Get Started</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                  What would you like to do in Nigeria?
                </h2>
                <p className="text-gray-500 text-sm mt-2">Select one or more — you can always explore other programmes later.</p>
              </div>

              {programmes === undefined ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {programmes.map((p) => {
                    const visual = PROGRAMME_VISUALS[p.key];
                    const isSelected = selected.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => toggle(p.key)}
                        className={cn(
                          "relative text-left p-5 rounded-2xl border-2 transition-all cursor-pointer",
                          isSelected ? "border-[var(--brand)] bg-[var(--brand)]/5 shadow-md" : "border-gray-100 hover:border-gray-200 hover:shadow-sm",
                        )}
                      >
                        {isSelected && <CheckCircle2 size={18} className="absolute top-4 right-4 text-[var(--brand)]" />}
                        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br mb-3", visual.gradient)}>
                          <visual.icon size={20} className="text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{p.ctaLabel}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                      </button>
                    );
                  })}
                  {/* Not sure option — always available, routes to the Opportunity Finder */}
                  <button
                    type="button"
                    onClick={() => setShowFinder(true)}
                    className="relative text-left p-5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br mb-3", NOT_SURE_VISUAL.gradient)}>
                      <NOT_SURE_VISUAL.icon size={20} className="text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1.5">Not Sure Yet</h3>
                    <p className="text-xs text-gray-500">Let our short guided finder point you in the right direction.</p>
                  </button>
                </div>
              )}

              {selected.length > 0 && (
                <div className="flex justify-center mt-8">
                  <Button size="lg" onClick={handleContinue} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2">
                    Continue <ArrowRight size={16} />
                  </Button>
                </div>
              )}

              <div className="flex justify-center mt-4">
                <button onClick={() => setShowFinder(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[var(--brand)] transition-colors cursor-pointer">
                  <Compass size={13} /> Or use the guided Opportunity Finder instead
                </button>
              </div>
            </div>
          </section>

          <HowItWorksAbroad />
          <TrustStrip />
          <DiasporaPartners />
          <DiasporaDownloads />
          <FinalCta onFindOpportunity={() => document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth" })} />

          {/* Programme links footer strip */}
          {programmes && programmes.length > 0 && (
            <section className="py-10 px-6 bg-gray-50 border-t border-gray-100">
              <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-3">
                {programmes.map((p) => (
                  <Link
                    key={p.key}
                    to={programmeRoute(p.key)}
                    className="text-sm font-medium text-gray-600 hover:text-[var(--brand)] px-4 py-2 rounded-full bg-white border border-gray-100 hover:border-[var(--brand)]/30 transition-colors"
                  >
                    {p.ctaLabel}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </DiasporaShell>
  );
}
