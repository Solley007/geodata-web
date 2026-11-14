import { motion } from "motion/react";
import { ArrowRight, ArrowDown } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { HERO_SETTINGS_KEY, parseHeroContent } from "../_lib/hero-content.ts";

export default function GroupHero() {
  const raw = useQuery(api.cms.getSiteSettings, { key: HERO_SETTINGS_KEY });
  const hero = parseHeroContent(raw);

  return (
    <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-[#01378D]">
      {/* Layered gradient + grid backdrop, brand blue anchoring */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.10) 0%, transparent 55%), radial-gradient(circle at 85% 75%, rgba(255,255,255,0.08) 0%, transparent 50%)" }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="group-grid" width="56" height="56" patternUnits="userSpaceOnUse">
              <path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#group-grid)" />
        </svg>
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-white/[0.08]"
          animate={{ rotate: 360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-20 text-center w-full">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-block bg-white/15 border border-white/30 text-white text-xs font-semibold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full mb-6"
        >
          {hero.badge}
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {hero.headingLine1}
          <br />
          <span className="text-white/80">{hero.headingHighlight}</span> {hero.headingRest}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="text-white/75 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10"
        >
          {hero.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href="#businesses"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-[#01378D] font-semibold text-sm px-6 py-3.5 rounded-xl transition-colors cursor-pointer"
          >
            {hero.primaryButtonLabel} <ArrowRight size={16} />
          </a>
          <a
            href="#about"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-sm px-6 py-3.5 rounded-xl border border-white/25 transition-colors cursor-pointer"
          >
            {hero.secondaryButtonLabel}
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{ delay: 1, duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="mt-16 flex justify-center"
        >
          <ArrowDown size={20} className="text-white/50" />
        </motion.div>
      </div>
    </section>
  );
}
