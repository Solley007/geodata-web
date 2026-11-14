import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Link } from "react-router-dom";
import { TrendingUp, Users, Gift, ArrowRight } from "lucide-react";

const perks = [
  { icon: TrendingUp, title: "Earn Up to 10% Commission", desc: "On every verified referral that converts to a sale." },
  { icon: Users, title: "Dual Role Support", desc: "Staff and external partners can both enroll and earn." },
  { icon: Gift, title: "Exclusive Promo Materials", desc: "Branded property links and blog posts ready to share." },
];

export default function PartnerCTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-10 md:py-14 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        <div className="relative rounded-3xl bg-[var(--brand)] overflow-hidden">
          {/* Background grid pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5" />

          <div className="relative z-10 p-8 lg:p-14">
            <div className="lg:flex lg:items-center lg:gap-12">
              {/* Left: copy */}
              <div className="flex-1 mb-10 lg:mb-0">
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4 }}
                  className="inline-block bg-white/20 text-white text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4"
                >
                  Partner Program
                </motion.span>
                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Earn While You Refer
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-blue-100 text-base leading-relaxed mb-8 max-w-lg"
                >
                  Join the Geodata World Partner Program and earn industry-leading
                  commissions by connecting people with their dream properties.
                  Share a link — we handle the rest.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <Link
                    to="/partner/apply"
                    className="inline-flex items-center justify-center gap-2 bg-white text-[var(--brand)] font-semibold text-sm px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    Apply to Become a Partner <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/partner/login"
                    className="inline-flex items-center justify-center gap-2 bg-white/15 text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-white/25 transition-colors border border-white/30 cursor-pointer"
                  >
                    Partner Login
                  </Link>
                </motion.div>
              </div>

              {/* Right: perks */}
              <div className="lg:w-[360px] space-y-4">
                {perks.map((perk, i) => (
                  <motion.div
                    key={perk.title}
                    initial={{ opacity: 0, x: 24 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.2 + i * 0.12, duration: 0.45 }}
                    className="flex items-start gap-4 bg-white/10 border border-white/20 rounded-2xl p-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <perk.icon size={18} className="text-white" />
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm mb-0.5">{perk.title}</div>
                      <div className="text-blue-200 text-xs leading-relaxed">{perk.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
