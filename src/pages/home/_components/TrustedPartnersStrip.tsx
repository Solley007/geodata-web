import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import PartnerLogoTile from "@/components/partner-showcase/partner-logo-tile.tsx";

// Below this many logos a static row reads better than a marquee
const MARQUEE_MIN = 5;

/** Homepage "Trusted Partners" strip — hidden entirely until partners are listed. */
export default function TrustedPartnersStrip() {
  const partners = useQuery(api.partnerProfiles.listPublic, { placement: "homepage" });
  if (!partners || partners.length === 0) return null;

  const marquee = partners.length >= MARQUEE_MIN;
  // Duplicate the list so the loop is seamless
  const loop = marquee ? [...partners, ...partners] : partners;

  return (
    <section className="overflow-hidden border-y border-gray-100 bg-white py-14">
      <div className="mx-auto mb-8 flex max-w-7xl flex-col items-center justify-between gap-3 px-6 sm:flex-row sm:px-10 lg:px-20">
        <div className="text-center sm:text-left">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--brand)]">Trusted Partners</span>
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Working alongside organisations you know
          </h2>
        </div>
        <Link to="/partners" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand)] hover:underline cursor-pointer">
          View all partners <ArrowRight size={15} />
        </Link>
      </div>

      {marquee ? (
        <div className="relative [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <motion.div
            className="flex w-max gap-5 px-5"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: partners.length * 4, ease: "linear", repeat: Infinity }}
          >
            {loop.map((p, i) => (
              <PartnerLogoTile key={`${p.slug}-${i}`} partner={p} muted />
            ))}
          </motion.div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-5 px-6">
          {partners.map((p) => (
            <PartnerLogoTile key={p.slug} partner={p} muted />
          ))}
        </div>
      )}
    </section>
  );
}
