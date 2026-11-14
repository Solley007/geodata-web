import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { applyLiveStats, type StatItem } from "@/lib/stats.ts";

const DEFAULT_STATS = [
  { value: "500+", label: "Properties Sold", icon: "🏠" },
  { value: "50+", label: "Premium Estates", icon: "🏙️" },
  { value: "12,000+", label: "Happy Clients", icon: "👥" },
  { value: "₦50B+", label: "Total Transactions", icon: "💰" },
  { value: "15+", label: "Years Experience", icon: "🏆" },
  { value: "26", label: "States Covered", icon: "📍" },
];

function parseStats(raw: string | null | undefined): StatItem[] {
  if (!raw) return DEFAULT_STATS;
  try { return JSON.parse(raw) as StatItem[]; } catch { return DEFAULT_STATS; }
}

export default function StatsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const raw = useQuery(api.cms.getSiteSettings, { key: "stats" });
  const mode = useQuery(api.cms.getSiteSettings, { key: "stats_mode" });
  const auto = mode === "auto";
  // Skip the live query while in manual mode
  const live = useQuery(api.cms.getLiveStats, auto ? {} : "skip");
  const stats = auto ? applyLiveStats(parseStats(raw), live) : parseStats(raw);

  return (
    <section ref={ref} className="py-16 bg-[var(--brand)]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="text-center group"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
              <div className="text-3xl lg:text-4xl font-bold text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                <motion.span initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>{stat.value}</motion.span>
              </div>
              <div className="text-blue-200 text-sm font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
