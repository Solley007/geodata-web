import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Leaf, Recycle, Users2 } from "lucide-react";

const COMMITMENTS = [
  { icon: Leaf, title: "Responsible Development", description: "Our construction and materials businesses are built to minimize environmental impact as they grow." },
  { icon: Recycle, title: "Resource Efficiency", description: "From quarrying to concrete batching, we aim to use materials and equipment efficiently across every project." },
  { icon: Users2, title: "Community Impact", description: "Every business in the Group is measured by the value it creates for the people and places it operates in." },
];

export default function GroupSustainability() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="sustainability" ref={ref} className="py-24 bg-white border-t border-[#01378D]/8">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="text-[#01378D] text-sm font-semibold tracking-widest uppercase block mb-3">Sustainability</span>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Building Responsibly, For the Long Term
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6">
          {COMMITMENTS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center bg-[#F7F9FC] border border-[#01378D]/10 rounded-2xl p-7"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <c.icon size={22} className="text-emerald-600" />
              </div>
              <h4 className="font-bold text-[#111111] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{c.title}</h4>
              <p className="text-[#111111]/55 text-sm leading-relaxed">{c.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
