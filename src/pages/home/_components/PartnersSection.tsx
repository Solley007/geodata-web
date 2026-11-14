import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const DEFAULT_PARTNERS = {
  partners: ["Access Bank","GTBank","Zenith Bank","First Bank","UBA","Stanbic IBTC","FMBN","Family Homes Fund"],
  awards: [
    { year: "2023", award: "Best Real Estate Company – Nigeria Property Awards" },
    { year: "2022", award: "Excellence in Estate Development – West Africa Real Estate Summit" },
    { year: "2021", award: "Top 10 Property Developers – Housing Finance Africa" },
    { year: "2020", award: "Customer Excellence Award – Nigerian Institute of Estate Surveyors" },
  ],
};
type PartnersData = typeof DEFAULT_PARTNERS;

function parse(raw: string | null | undefined): PartnersData {
  if (!raw) return DEFAULT_PARTNERS;
  try { return { ...DEFAULT_PARTNERS, ...(JSON.parse(raw) as Partial<PartnersData>) }; } catch { return DEFAULT_PARTNERS; }
}

export default function PartnersSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const raw = useQuery(api.cms.getSiteSettings, { key: "partners" });
  const data = parse(raw);

  return (
    <section ref={ref} className="py-20 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-center mb-10">
          <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-3">Finance Partners</span>
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Our Mortgage & Banking Partners</h2>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-4 mb-20">
          {data.partners.filter(Boolean).map((p, i) => (
            <motion.div key={p + i} initial={{ opacity: 0, scale: 0.9 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: i * 0.06, duration: 0.4 }}
              className="bg-white rounded-2xl px-8 py-5 shadow-sm border border-gray-100 hover:border-[var(--brand)]/30 hover:shadow-md transition-all duration-300 min-w-[120px] text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--brand)]/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-[var(--brand)] font-bold text-sm">{p[0]}</span>
              </div>
              <div className="text-sm font-semibold text-gray-700">{p}</div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3, duration: 0.5 }} className="bg-[var(--brand)] rounded-3xl p-8 lg:p-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Awards & Recognition</h3>
            <p className="text-blue-200 mt-2 text-sm">Our commitment to excellence has been nationally recognized.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.awards.filter((a) => a.year || a.award).map((award, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                className="bg-white/10 rounded-2xl p-5 text-center border border-white/20">
                <div className="text-3xl font-bold text-blue-200 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{award.year}</div>
                <div className="text-white text-xs leading-relaxed">{award.award}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
