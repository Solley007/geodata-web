import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { ArrowRight, Lock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { usePublicBusinesses, type PublicBusiness } from "../_lib/use-public-businesses.ts";
import { getBusinessIcon, IMPLEMENTED_BUSINESS_ROUTES } from "../_lib/business-icons.tsx";
import { cn } from "@/lib/utils.ts";

// Immersive full-bleed alternating panels — one per business, each driven
// entirely by its Corporate Directory record (cover image, description,
// capabilities). No hardcoded business data lives here.
function PortfolioRow({ biz, index }: { biz: PublicBusiness; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const Icon = getBusinessIcon(biz.slug);
  const reversed = index % 2 === 1;
  const isImplemented = biz.status === "live" || IMPLEMENTED_BUSINESS_ROUTES.has(biz.slug);

  const cta = (
    <span className="inline-flex items-center gap-2 font-semibold text-sm">
      {biz.status === "live" ? "Visit Real Estate" : isImplemented ? "Learn More" : "Coming Soon"}
      <ArrowRight size={15} />
    </span>
  );

  return (
    <div ref={ref} className="py-16 lg:py-20 border-b border-[#01378D]/8 last:border-0">
      <div className={cn("grid lg:grid-cols-2 gap-10 lg:gap-16 items-center", reversed && "lg:[&>*:first-child]:order-2")}>
        {/* Image / visual side */}
        <motion.div
          initial={{ opacity: 0, x: reversed ? 40 : -40 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-[#01378D]/5 border border-[#01378D]/10 shadow-sm">
            {biz.coverImageResolvedUrl ? (
              <img src={biz.coverImageResolvedUrl} alt={biz.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon size={64} className="text-[#01378D]/15" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute top-4 left-4">
              <span
                className={cn(
                  "text-[11px] font-semibold px-3 py-1 rounded-full border",
                  biz.status === "live"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}
              >
                {biz.status === "live" ? "Live" : "Coming Soon"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Text side */}
        <motion.div
          initial={{ opacity: 0, x: reversed ? -40 : 40 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <div className="w-12 h-12 rounded-xl bg-[#01378D]/10 flex items-center justify-center mb-5">
            <Icon size={22} className="text-[#01378D]" />
          </div>
          <span className="text-[#01378D] text-xs font-semibold tracking-widest uppercase block mb-2">{biz.sector}</span>
          <h3 className="text-2xl lg:text-3xl font-bold text-[#111111] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            {biz.name}
          </h3>
          {biz.legalEntityName && biz.legalEntityName !== biz.name && (
            <p className="text-[#111111]/40 text-xs mb-3">{biz.legalEntityName}</p>
          )}
          <p className="text-[#111111]/65 leading-relaxed mb-5">{biz.fullDescription ?? biz.shortDescription}</p>

          {biz.capabilities && biz.capabilities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-7">
              {biz.capabilities.map((c) => (
                <span key={c} className="text-xs font-medium text-[#111111]/70 bg-[#01378D]/5 border border-[#01378D]/10 rounded-full px-3 py-1">
                  {c}
                </span>
              ))}
            </div>
          )}

          {biz.destinationType === "external_url" && biz.destinationUrl ? (
            <a href={biz.destinationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[#01378D] hover:text-[#111111] transition-colors cursor-pointer">
              {cta} <ExternalLink size={13} className="opacity-60" />
            </a>
          ) : isImplemented && biz.destinationRoute ? (
            <Link to={biz.destinationRoute} className="inline-flex items-center gap-2 text-[#01378D] hover:text-[#111111] transition-colors cursor-pointer">
              {cta}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => toast.info("Coming soon in a future milestone!")}
              className="inline-flex items-center gap-2 text-[#111111]/50 hover:text-[#111111]/80 transition-colors cursor-pointer"
            >
              <Lock size={13} /> {cta}
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function BusinessPortfolio() {
  const businesses = usePublicBusinesses();

  return (
    <section className="bg-[#F7F9FC]">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-20">
        {businesses === undefined ? (
          <div className="py-16 space-y-6">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-3xl" />)}
          </div>
        ) : (
          businesses.map((biz, i) => <PortfolioRow key={biz._id} biz={biz} index={i} />)
        )}
      </div>
    </section>
  );
}
