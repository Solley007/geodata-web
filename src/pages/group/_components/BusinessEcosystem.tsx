import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { usePublicBusinesses, type PublicBusiness } from "../_lib/use-public-businesses.ts";
import { getBusinessIcon, IMPLEMENTED_BUSINESS_ROUTES } from "../_lib/business-icons.tsx";
import { cn } from "@/lib/utils.ts";

const STATUS_STYLE: Record<PublicBusiness["status"], string> = {
  live: "bg-emerald-50 text-emerald-700 border-emerald-200",
  coming_soon: "bg-amber-50 text-amber-700 border-amber-200",
  inactive: "bg-gray-100 text-gray-400 border-gray-200",
};
const STATUS_LABEL: Record<PublicBusiness["status"], string> = { live: "Live", coming_soon: "Coming Soon", inactive: "Inactive" };

// Fixed angular positions (degrees, 0 = top, clockwise) for up to 6 nodes
// orbiting the central Geodata Group hub, evenly spaced regardless of count.
function nodePosition(index: number, total: number, radius: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function BusinessLink({ biz, children, className }: { biz: PublicBusiness; children: React.ReactNode; className?: string }) {
  const isImplemented = biz.status === "live" || IMPLEMENTED_BUSINESS_ROUTES.has(biz.slug);

  if (biz.destinationType === "external_url" && biz.destinationUrl) {
    return (
      <a href={biz.destinationUrl} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  if (isImplemented && biz.destinationRoute) {
    return <Link to={biz.destinationRoute} className={className}>{children}</Link>;
  }
  return (
    <button
      type="button"
      onClick={() => toast.info("Coming soon in a future milestone!")}
      className={className}
    >
      {children}
    </button>
  );
}

function EcosystemDesktop({ businesses }: { businesses: PublicBusiness[] }) {
  const [active, setActive] = useState<string | null>(null);
  const total = businesses.length;
  const radius = 240;

  return (
    <div className="relative hidden lg:flex items-center justify-center" style={{ height: 640 }}>
      {/* Orbit ring */}
      <div className="absolute w-[480px] h-[480px] rounded-full border border-dashed border-[#01378D]/15" />

      {/* Center hub — Geodata World */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute z-20 w-40 h-40 rounded-full bg-[#01378D] flex flex-col items-center justify-center text-center shadow-[0_0_60px_rgba(1,55,141,0.35)] border-4 border-white"
      >
        <span className="text-white font-bold text-sm leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
          Geodata
        </span>
        <span className="text-white/70 text-[11px] tracking-widest uppercase mt-0.5">World</span>
      </motion.div>

      {/* Connecting lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="-320 -320 640 640">
        {businesses.map((biz, i) => {
          const { x, y } = nodePosition(i, total, radius);
          const isActive = active === biz._id;
          return (
            <motion.line
              key={biz._id}
              x1={0} y1={0} x2={x} y2={y}
              stroke={isActive ? "#01378D" : "rgba(1,55,141,0.15)"}
              strokeWidth={isActive ? 2 : 1}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.08 }}
            />
          );
        })}
      </svg>

      {/* Orbiting business nodes */}
      {businesses.map((biz, i) => {
        const { x, y } = nodePosition(i, total, radius);
        const Icon = getBusinessIcon(biz.slug);
        return (
          // Outer plain div owns the fixed orbit position (left/top offsets);
          // motion's own transform engine would otherwise overwrite a raw
          // style.transform used for translate, so the entrance scale/opacity
          // animation lives on the nested motion.div instead.
          <div
            key={biz._id}
            className="absolute z-10 top-1/2 left-1/2"
            style={{ marginLeft: x, marginTop: y }}
            onMouseEnter={() => setActive(biz._id)}
            onMouseLeave={() => setActive(null)}
          >
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
            className="-translate-x-1/2 -translate-y-1/2"
          >
            <BusinessLink
              biz={biz}
              className="group flex flex-col items-center gap-2 cursor-pointer"
            >
              <div
                className={cn(
                  "w-20 h-20 rounded-2xl bg-white border border-[#01378D]/15 shadow-sm flex items-center justify-center transition-all duration-300",
                  "group-hover:shadow-md group-hover:border-[#01378D]/50 group-hover:scale-110",
                  biz.status === "live" && "ring-2 ring-emerald-400/50"
                )}
              >
                <Icon size={28} className="text-[#01378D] group-hover:text-[#01378D] transition-colors" />
              </div>
              <span className="text-[#111111] text-xs font-semibold text-center max-w-[110px] leading-tight">{biz.name}</span>
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", STATUS_STYLE[biz.status])}>
                {STATUS_LABEL[biz.status]}
              </span>
            </BusinessLink>

            {/* Hover detail card */}
            <AnimatePresence>
              {active === biz._id && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 bg-white border border-[#01378D]/10 rounded-xl p-3.5 shadow-2xl z-30 pointer-events-none"
                >
                  <p className="text-[#111111]/60 text-[11px] leading-relaxed">{biz.shortDescription}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          </div>
        );
      })}
    </div>
  );
}

// Accessible fallback: an always-present list of every business, usable via
// keyboard/screen reader and shown outright on mobile/tablet where the orbit
// visualization is replaced by this stacked layout.
function BusinessList({ businesses, heading }: { businesses: PublicBusiness[]; heading?: string }) {
  return (
    <div className="space-y-3">
      {heading && <h3 className="sr-only">{heading}</h3>}
      {businesses.map((biz, i) => {
        const Icon = getBusinessIcon(biz.slug);
        return (
          <motion.div
            key={biz._id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
          >
            <BusinessLink
              biz={biz}
              className="w-full flex items-center gap-4 bg-white hover:bg-[#01378D]/[0.03] border border-[#01378D]/10 rounded-2xl p-4 transition-colors text-left cursor-pointer shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-[#01378D]/10 flex items-center justify-center shrink-0">
                <Icon size={20} className="text-[#01378D]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#111111] font-semibold text-sm">{biz.name}</span>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", STATUS_STYLE[biz.status])}>
                    {STATUS_LABEL[biz.status]}
                  </span>
                </div>
                <p className="text-[#111111]/50 text-xs mt-0.5 line-clamp-1">{biz.shortDescription}</p>
              </div>
              {biz.destinationType === "external_url" ? (
                <ExternalLink size={15} className="text-[#111111]/30 shrink-0" />
              ) : biz.status !== "live" && !IMPLEMENTED_BUSINESS_ROUTES.has(biz.slug) ? (
                <Lock size={15} className="text-[#111111]/30 shrink-0" />
              ) : null}
            </BusinessLink>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function BusinessEcosystem() {
  const businesses = usePublicBusinesses();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="businesses" ref={ref} className="py-24 bg-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ background: "radial-gradient(circle at 50% 50%, #01378D 0%, transparent 60%)" }} />
      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-[#01378D] text-sm font-semibold tracking-widest uppercase block mb-3">Business Ecosystem</span>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Six Businesses, One Standard
          </h2>
          <p className="text-[#111111]/55 text-sm mt-3 max-w-xl mx-auto">
            Hover or tap any node to learn more. Every business connects back to the Group&apos;s shared foundation of trust and delivery.
          </p>
        </motion.div>

        {businesses === undefined ? (
          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
          </div>
        ) : businesses.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Lock /></EmptyMedia>
              <EmptyTitle>Business directory not yet configured</EmptyTitle>
              <EmptyDescription>Check back soon — the Group&apos;s businesses are being added.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <EcosystemDesktop businesses={businesses} />
            {/* Mobile/tablet + accessible fallback: always in the DOM, visible
                below lg regardless of JS/hover support. */}
            <div className="lg:hidden max-w-lg mx-auto">
              <BusinessList businesses={businesses} heading="All Geodata Group businesses" />
            </div>
            {/* Desktop: same list, screen-reader/keyboard accessible, visually
                hidden-but-focusable is unnecessary here since it's placed
                right below the interactive viz for full keyboard reach. */}
            <div className="hidden lg:block max-w-2xl mx-auto mt-14">
              <details className="group">
                <summary className="cursor-pointer text-center text-sm text-[#111111]/40 hover:text-[#01378D] transition-colors list-none">
                  View all businesses as a list
                </summary>
                <div className="mt-6">
                  <BusinessList businesses={businesses} heading="All Geodata Group businesses" />
                </div>
              </details>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
