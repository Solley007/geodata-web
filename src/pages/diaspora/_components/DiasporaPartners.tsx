import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { ArrowRight, Handshake } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import PartnerLogoTile from "@/components/partner-showcase/partner-logo-tile.tsx";

/** Diaspora hub partner logos on dark tiles — hidden until partners are listed. */
export default function DiasporaPartners() {
  const partners = useQuery(api.partnerProfiles.listPublic, { placement: "diaspora" });
  if (!partners || partners.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[#061433] px-6 py-20">
      {/* soft glow for depth */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <span className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-300">
            <Handshake size={14} /> Our Partners
          </span>
          <h2 className="text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Partners who serve Nigerians abroad
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            Associations, finance and advisory partners we work with to make owning and investing at home simpler.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {partners.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(i, 10) * 0.05, ease: "easeOut" }}
            >
              <PartnerLogoTile partner={p} tone="dark" />
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link to="/partners" className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-amber-300 cursor-pointer">
            View all partners <ArrowRight size={15} />
          </Link>
          <span className="text-slate-500">·</span>
          <Link to="/diaspora/partner" className="font-semibold text-amber-300 hover:underline cursor-pointer">
            Become a partner
          </Link>
        </div>
      </div>
    </section>
  );
}
