import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";
import WhatsAppButton from "@/pages/home/_components/WhatsAppButton.tsx";
import { motion } from "motion/react";
import { Eye, Compass, ShieldCheck, TrendingUp } from "lucide-react";

const PRINCIPLES = [
  {
    icon: Eye,
    title: "Oversight",
    description:
      "The Board of Directors maintains rigorous oversight of management performance, risk exposure, and compliance with all applicable laws and regulations.",
  },
  {
    icon: Compass,
    title: "Direction",
    description:
      "Strategic direction flows from Shareholders through the Board, ensuring company objectives are aligned with long-term value creation for all stakeholders.",
  },
  {
    icon: ShieldCheck,
    title: "Accountability",
    description:
      "Each tier of the governance structure is accountable to the layer above it, with clear reporting lines from Directorates up to the Board.",
  },
  {
    icon: TrendingUp,
    title: "Sustainable Value",
    description:
      "Our governance framework is designed to build enduring value — balancing profitable growth with responsible stewardship of assets and trust.",
  },
];

const GOVERNANCE_CHAIN = [
  { label: "Shareholders", sub: "Ultimate beneficial owners" },
  { label: "Board of Directors", sub: "Strategic oversight & fiduciary duty" },
  { label: "Board Committees", sub: "Audit, Risk & Compliance  ·  Investment & Projects  ·  Governance, Remuneration & Nominations" },
  { label: "Managing Director / CEO", sub: "Executive leadership & day-to-day operations" },
  { label: "Permanent Directorates", sub: "Project Delivery  ·  Finance  ·  Commercial  ·  Legal  ·  Corporate Services & Technology" },
];

export default function CorporateGovernancePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="bg-[var(--brand)] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6 text-center text-white">
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="text-xs font-bold tracking-widest uppercase text-white/70 mb-3"
          >Company</motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Corporate Governance
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-white/80 text-lg max-w-2xl mx-auto"
          >
            Our governance framework ensures accountability, transparency, and responsible stewardship at every level of the organisation.
          </motion.p>
        </div>
      </section>

      {/* Intro */}
      <section className="max-w-3xl mx-auto px-6 py-14 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>
          How We Are Governed
        </h2>
        <p className="text-gray-600 leading-relaxed text-base">
          Geodata World Services Limited operates under a structured governance model in which authority and accountability flow clearly from Shareholders through the Board of Directors, its Committees, the Managing Director and CEO, and ultimately through five Permanent Directorates that deliver on our mandate.
        </p>
      </section>

      {/* Governance chain */}
      <section className="max-w-2xl mx-auto px-6 pb-14">
        <div className="space-y-0">
          {GOVERNANCE_CHAIN.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="flex items-stretch gap-4"
            >
              {/* Connector line + node */}
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-4 h-4 rounded-full border-2 border-[var(--brand)] mt-5 shrink-0 ${i === 2 ? "bg-[var(--brand)]/20" : i === 3 ? "bg-[var(--brand)]" : "bg-white"}`} />
                {i < GOVERNANCE_CHAIN.length - 1 && (
                  <div className="w-0.5 flex-1 bg-[var(--brand)]/25 mt-1" />
                )}
              </div>

              {/* Content */}
              <div className={`mb-4 flex-1 rounded-xl border p-4 ${i === 3 ? "border-[var(--brand)] bg-blue-50" : "border-gray-100 bg-white"} shadow-sm`}>
                <p className="font-bold text-gray-900 text-sm">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Principles */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              Our Governance Principles
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Four principles underpin everything we do at Geodata World Services Limited.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRINCIPLES.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <p.icon size={22} className="text-[var(--brand)]" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment statement */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="bg-[var(--brand)] rounded-3xl px-8 py-10 text-white">
          <h2 className="text-xl md:text-2xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Our Commitment
          </h2>
          <p className="text-white/85 leading-relaxed text-sm md:text-base">
            We are committed to maintaining the highest standards of corporate governance, ensuring that every decision made at Geodata World Services Limited serves the long-term interests of our shareholders, clients, employees, and the communities in which we operate.
          </p>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
