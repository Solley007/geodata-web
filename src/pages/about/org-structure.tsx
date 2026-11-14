import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";
import WhatsAppButton from "@/pages/home/_components/WhatsAppButton.tsx";
import { motion } from "motion/react";
import { Users, BarChart2, Settings2, UserCheck, Building2, Scale, Cpu, HardHat } from "lucide-react";

// ── Data ─────────────────────────────────────────────────────────────────────

const COMMITTEES = [
  {
    icon: BarChart2,
    label: "Audit, Risk &\nCompliance Committee",
    color: "from-blue-600 to-blue-700",
    border: "border-blue-400/30",
  },
  {
    icon: Settings2,
    label: "Investment &\nProjects Committee",
    color: "from-indigo-600 to-indigo-700",
    border: "border-indigo-400/30",
  },
  {
    icon: UserCheck,
    label: "Governance, Remuneration\n& Nominations Committee",
    color: "from-violet-600 to-violet-700",
    border: "border-violet-400/30",
  },
];

const DIRECTORATES = [
  {
    icon: HardHat,
    name: "Project Development\n& Delivery",
    units: ["Design", "Engineering", "Quantity Surveying", "Construction", "Procurement", "HSE & Quality"],
    gradient: "from-[#0b4dbb] to-[#1a5fd4]",
    accent: "#3b82f6",
  },
  {
    icon: BarChart2,
    name: "Finance &\nInvestment",
    units: ["Accounts", "Treasury", "Budgeting", "Project Finance", "Reporting & Controls"],
    gradient: "from-[#0e6b5e] to-[#0f8c7a]",
    accent: "#14b8a6",
  },
  {
    icon: Users,
    name: "Commercial &\nCustomer Experience",
    units: ["Sales", "Marketing", "Leasing", "Institutional Accounts", "CRM", "After-Sales"],
    gradient: "from-[#0b4dbb] to-[#0e6b5e]",
    accent: "#06b6d4",
  },
  {
    icon: Scale,
    name: "Legal, Company Secretariat\n& Compliance",
    units: ["Titles", "Contracts", "Regulatory Compliance", "Board Secretariat"],
    gradient: "from-[#1e3a6e] to-[#0b4dbb]",
    accent: "#60a5fa",
  },
  {
    icon: Cpu,
    name: "Corporate Services\n& Technology",
    units: ["Human Resources", "Administration", "ICT", "Data Security", "Facilities"],
    gradient: "from-[#0f4c3a] to-[#0e6b5e]",
    accent: "#34d399",
  },
];

const GOVERNANCE_ITEMS = ["OVERSIGHT", "DIRECTION", "ACCOUNTABILITY", "SUSTAINABLE VALUE"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, delay, ease: "easeOut" as const },
  };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OrgStructurePage() {
  return (
    <div className="min-h-screen bg-[#f0f4fb]">
      <Navbar />

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden py-16 md:py-24"
        style={{ background: "linear-gradient(135deg, #0b2d6e 0%, #0b4dbb 60%, #0e6b5e 100%)" }}
      >
        {/* Decorative rings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/10" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full border border-white/10" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 text-center text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase mb-4"
          >
            <Building2 size={12} /> Company
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="text-3xl md:text-5xl font-black mb-3"
            style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "-0.01em" }}
          >
            Geodata World Services Limited
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-white/75 text-base md:text-lg"
          >
            Ideal Organisational Structure &amp; Strategic Transformation Model
          </motion.p>
        </div>
      </section>

      {/* ── Organogram ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20">

        {/* ── Legend + side panels row ── */}
        <div className="flex flex-col lg:flex-row gap-5 mb-10">

          {/* Governance panel */}
          <motion.div {...fadeUp(0)}
            className="lg:w-44 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          >
            <p className="text-[10px] font-black tracking-widest text-[var(--brand)] mb-3">GOVERNANCE</p>
            <div className="space-y-2">
              {GOVERNANCE_ITEMS.map((g) => (
                <div key={g} className="flex items-start gap-2">
                  <div className="w-3 h-0.5 bg-[var(--brand)] mt-2 shrink-0 rounded-full" />
                  <p className="text-[10px] font-semibold text-gray-700 leading-tight">{g}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Main chart */}
          <div className="flex-1 min-w-0">

            {/* ── Tier 1: Shareholders ── */}
            <div className="flex justify-center">
              <motion.div {...fadeUp(0.05)}
                className="relative text-white rounded-2xl px-8 py-4 text-center shadow-lg min-w-[220px]"
                style={{ background: "linear-gradient(135deg, #0b2d6e, #0b4dbb)" }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Users size={16} className="opacity-80" />
                  <span className="text-xs font-black tracking-widest uppercase opacity-80">Shareholders</span>
                </div>
                <p className="font-black text-lg tracking-wide">SHAREHOLDERS</p>
              </motion.div>
            </div>

            {/* Connector */}
            <Connector />

            {/* ── Tier 2: Board of Directors ── */}
            <div className="flex justify-center">
              <motion.div {...fadeUp(0.1)}
                className="relative text-white rounded-2xl px-8 py-4 text-center shadow-lg min-w-[260px]"
                style={{ background: "linear-gradient(135deg, #0b3a8f, #0b4dbb)" }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Users size={16} className="opacity-80" />
                  <span className="text-xs font-black tracking-widest uppercase opacity-80">Governance</span>
                </div>
                <p className="font-black text-lg tracking-wide">BOARD OF DIRECTORS</p>
              </motion.div>
            </div>

            {/* Connector + committee row */}
            <Connector />

            {/* ── Tier 3: Board Committees ── */}
            <div className="relative flex justify-center">
              {/* Horizontal bar across the 3 committee tops */}
              <div className="absolute top-0 left-[16%] right-[16%] h-0.5 bg-[var(--brand)]/30 hidden md:block" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
                {COMMITTEES.map((c, i) => (
                  <motion.div
                    key={c.label}
                    {...fadeUp(0.13 + i * 0.07)}
                    className={`relative bg-gradient-to-br ${c.color} border ${c.border} text-white rounded-2xl p-4 text-center shadow-md`}
                  >
                    {/* Vertical connector from bar */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-[var(--brand)]/30 hidden md:block" />
                    <c.icon size={18} className="mx-auto mb-2 opacity-80" />
                    <p className="text-[11px] font-bold leading-snug whitespace-pre-line">{c.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Connector */}
            <Connector />

            {/* ── Tier 4: MD / CEO ── */}
            <div className="flex justify-center">
              <motion.div {...fadeUp(0.25)}
                className="relative text-white rounded-2xl px-8 py-5 text-center shadow-xl min-w-[260px] border-2 border-white/20"
                style={{ background: "linear-gradient(135deg, #0b4dbb, #1a6edb)" }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 text-[9px] font-black tracking-widest uppercase px-3 py-0.5 rounded-full shadow">
                  Executive Leadership
                </div>
                <div className="flex items-center justify-center gap-2 mb-1 mt-1">
                  <UserCheck size={18} className="opacity-80" />
                </div>
                <p className="font-black text-lg tracking-wide leading-tight">MANAGING DIRECTOR /</p>
                <p className="font-black text-lg tracking-wide leading-tight">CHIEF EXECUTIVE OFFICER</p>
              </motion.div>
            </div>

            {/* Connector */}
            <Connector />

            {/* ── Tier 5: Directorates label ── */}
            <motion.div {...fadeUp(0.3)} className="flex justify-center mb-3">
              <div
                className="text-white rounded-xl px-6 py-2 text-center text-xs font-black tracking-widest uppercase shadow-md"
                style={{ background: "linear-gradient(90deg, #0b2d6e, #0e6b5e)" }}
              >
                Permanent Geodata Directorates
              </div>
            </motion.div>

            {/* Horizontal connector across directorate tops */}
            <div className="relative flex justify-center">
              <div className="absolute top-0 left-[5%] right-[5%] h-0.5 bg-[var(--brand)]/25 hidden md:block" />

              {/* ── Directorate cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
                {DIRECTORATES.map((d, i) => (
                  <motion.div
                    key={d.name}
                    {...fadeUp(0.33 + i * 0.07)}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className={`relative bg-gradient-to-b ${d.gradient} text-white rounded-2xl p-4 shadow-lg cursor-default overflow-hidden`}
                  >
                    {/* Vertical connector from bar */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-white/20 hidden md:block" />

                    {/* Shimmer accent */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl opacity-60"
                      style={{ background: d.accent }}
                    />

                    <d.icon size={20} className="mb-2 opacity-80" />
                    <p className="text-[11px] font-black leading-snug mb-3 whitespace-pre-line">{d.name}</p>
                    <div className="space-y-1">
                      {d.units.map((u) => (
                        <div key={u} className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: d.accent }} />
                          <span className="text-[10px] text-white/80 leading-tight">{u}</span>
                        </div>
                      ))}
                    </div>

                    {/* Bottom action labels */}
                    <div className="mt-3 pt-2.5 border-t border-white/15 flex flex-wrap gap-1">
                      {["EXECUTE", "MANAGE", "SUPPORT", "DELIVER"].map((tag) => (
                        <span
                          key={tag}
                          className="text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded bg-white/15"
                        >{tag}</span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

          </div>

          {/* Legend + Retains panel */}
          <div className="lg:w-52 shrink-0 space-y-4">
            {/* Legend */}
            <motion.div {...fadeUp(0.05)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
            >
              <p className="text-[10px] font-black tracking-widest text-gray-500 mb-3">LEGEND</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-gray-500 shrink-0" />
                  <p className="text-[10px] text-gray-500">Solid line = reporting</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-px border-t border-dashed border-gray-400 shrink-0" />
                  <p className="text-[10px] text-gray-500">Dotted = advisory / functional</p>
                </div>
              </div>
            </motion.div>


          </div>

        </div>

        {/* ── Bottom: Permanent Geodata Directorates label ── */}
        <motion.div {...fadeUp(0.5)}
          className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
        >
          <div className="shrink-0">
            <p className="text-[10px] font-black tracking-widest uppercase text-[var(--brand)] mb-1">Permanent</p>
            <p className="text-[10px] font-black tracking-widest uppercase text-[var(--brand)]">Geodata Directorates</p>
            <div className="mt-3 flex flex-col gap-1.5">
              {["EXECUTE", "MANAGE", "SUPPORT", "DELIVER"].map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-black tracking-widest text-[var(--brand)] flex items-center gap-2"
                >
                  <span className="w-4 h-0.5 bg-[var(--brand)]/40 rounded-full" /> {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="w-px self-stretch bg-gray-100 hidden sm:block" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-1">
            {DIRECTORATES.map((d, i) => (
              <motion.div
                key={d.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.5 + i * 0.06 }}
                className={`bg-gradient-to-br ${d.gradient} text-white rounded-xl p-3 text-center`}
              >
                <d.icon size={14} className="mx-auto mb-1 opacity-80" />
                <p className="text-[9px] font-bold leading-snug whitespace-pre-line">{d.name}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}

function Connector() {
  return (
    <div className="flex flex-col items-center my-2">
      <motion.div
        initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }}
        transition={{ duration: 0.35, ease: "easeOut" as const }}
        style={{ originY: 0 }}
        className="w-0.5 h-7 bg-gradient-to-b from-[var(--brand)]/50 to-[var(--brand)]/20"
      />
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
        <path d="M7 10L0 0H14L7 10Z" fill="var(--brand)" fillOpacity="0.35" />
      </svg>
    </div>
  );
}
