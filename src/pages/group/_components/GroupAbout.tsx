import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { ShieldCheck, Handshake, Target } from "lucide-react";

const PILLARS = [
  { icon: ShieldCheck, title: "Trust", description: "Every business under the Group operates on the same standard of transparency and accountability that built Geodata's reputation in real estate." },
  { icon: Target, title: "Delivery", description: "From land to structure to the equipment that builds it, the Group is organized around dependable, on-time delivery for every partner and client." },
  { icon: Handshake, title: "Community", description: "Every business exists to strengthen the same communities — creating jobs, infrastructure, and long-term value across Nigeria." },
];

export default function GroupAbout() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="about" ref={ref} className="py-24 bg-[#F7F9FC]">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-14 items-start mb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}>
            <span className="text-[#01378D] text-sm font-semibold tracking-widest uppercase block mb-3">About Geodata Group</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Built From One Company, Growing Into a Group
            </h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.15 }}>
            <p className="text-[#111111]/65 leading-relaxed mb-4">
              Geodata Group began with Geodata World Services Limited, a real estate development
              and property management company serving Nigeria since 2009. As that business grew,
              so did the need for the materials, infrastructure, equipment and technology that
              make development possible.
            </p>
            <p className="text-[#111111]/65 leading-relaxed">
              Today, Geodata Group brings those capabilities together under one shared identity —
              while each business continues to operate with its own focus, expertise and
              accountability to the communities it serves.
            </p>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
              className="bg-white border border-[#01378D]/10 rounded-2xl p-6 shadow-sm"
            >
              <div className="w-11 h-11 rounded-xl bg-[#01378D]/10 flex items-center justify-center mb-4">
                <p.icon size={20} className="text-[#01378D]" />
              </div>
              <h4 className="font-bold text-[#111111] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{p.title}</h4>
              <p className="text-[#111111]/55 text-sm leading-relaxed">{p.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
