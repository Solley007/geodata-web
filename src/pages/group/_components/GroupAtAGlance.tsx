import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Layers, CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { usePublicBusinesses } from "../_lib/use-public-businesses.ts";

// Every figure here is either derived live from real directory data (business
// count) or a fact already stated elsewhere in the live app (founding year in
// the Real Estate footer, HQ location in contact info) — never an invented
// operational claim, price, or completion count.
export default function GroupAtAGlance() {
  const businesses = usePublicBusinesses();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const liveCount = businesses?.filter((b) => b.status === "live").length ?? 0;
  const totalCount = businesses?.length ?? 0;

  const stats = [
    { icon: Layers, value: totalCount > 0 ? `${totalCount}` : "—", label: "Group Businesses" },
    { icon: ShieldCheck, value: liveCount > 0 ? `${liveCount} Live` : "—", label: "Operating Now" },
    { icon: CalendarDays, value: "2009", label: "Founded" },
    { icon: MapPin, value: "Abuja, Nigeria", label: "Headquarters" },
  ];

  return (
    <section ref={ref} className="py-20 bg-[#01378D]">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-blue-200 text-sm font-semibold tracking-widest uppercase block mb-3">Geodata at a Glance</span>
          <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>The Group, By the Numbers</h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                <s.icon size={20} className="text-white" />
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                {s.value}
              </div>
              <div className="text-blue-200 text-xs font-medium tracking-wide uppercase">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
