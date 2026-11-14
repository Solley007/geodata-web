/**
 * Geodata ReadyMix — World-class animated coming-soon / portal landing page.
 * Styled to match the Geodata blue & white brand identity.
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight, Phone, Mail, MapPin, CheckCircle2, Truck, Factory, Clock, Award, ChevronDown, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const HERO_BG = "/media/file_wcLHoqM7Udr9X7f795p5vtbp.jpg";
const CONCRETE_IMG = "/media/file_ugIWXl5Awpnf8VZLFdm2SU3d.jpg";
const LOGO = "/media/file_hqjYSAKlVBBRqljHrAkEnfVn.png";
const LAUNCH_DATE = new Date("2026-12-01T09:00:00.000Z");

// ── Brand colours ─────────────────────────────────────────────────────────────
// Primary:   #0B4DBB  (brand blue)
// Dark:      #0940a0
// Navy bg:   #04132e
// Mid-navy:  #071e47
// Accent:    #3b82f6 (bright blue for highlights)

const STATS = [
  { value: "500+", label: "m³/hr Capacity" },
  { value: "24/7", label: "Operations" },
  { value: "30+",  label: "Mix Designs" },
  { value: "99%",  label: "On-Time Delivery" },
];

const FEATURES: { icon: React.ElementType; title: string; desc: string }[] = [
  { icon: Factory, title: "State-of-the-Art Plant",   desc: "Fully automated batching plant with precision weighing for consistent mix quality every pour." },
  { icon: Truck,   title: "Fleet of Mixer Trucks",    desc: "Modern drum mixer fleet serving Abuja, Lagos, and surrounding regions with same-day delivery." },
  { icon: Award,   title: "NAFDAC & SON Certified",   desc: "Every mix design is lab-tested and compliant with Nigerian and international concrete standards." },
  { icon: Clock,   title: "Just-in-Time Delivery",    desc: "Real-time tracking ensures your concrete arrives exactly when your crew is ready." },
];

const PRODUCTS = [
  { grade: "C20",  desc: "General purpose — foundations, kerbs, floor slabs",           bg: "from-[#0a2d6e] to-[#071e47]" },
  { grade: "C25",  desc: "Reinforced slabs, beams & columns for residential builds",    bg: "from-[#0B4DBB] to-[#0a2d6e]" },
  { grade: "C30",  desc: "Commercial structures, high-traffic pavements",               bg: "from-[#0940a0] to-[#072380]" },
  { grade: "C35+", desc: "High-rise, bridges & specialised structural elements",        bg: "from-[#071e47] to-[#04132e]" },
];

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(target.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const total = Math.max(0, diff);
  return {
    days:    Math.floor(total / 86400000),
    hours:   Math.floor((total % 86400000) / 3600000),
    minutes: Math.floor((total % 3600000) / 60000),
    seconds: Math.floor((total % 60000) / 1000),
  };
}

function CountBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-sm border border-white/25 rounded-2xl w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-2 shadow-xl shadow-black/30">
        <span className="text-3xl sm:text-4xl font-bold text-white tabular-nums" style={{ fontFamily: "'Playfair Display', serif" }}>
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-blue-200/70 text-xs uppercase tracking-widest font-semibold">{label}</span>
    </div>
  );
}

function NotifyForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const subscribe = useMutation(api.inquiries.subscribe);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await subscribe({ email: email.trim() });
      toast.success("You're on the list! We'll notify you at launch.");
      setEmail("");
    } catch { toast.error("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md">
      <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required
        className="flex-1 bg-white/10 border-white/25 text-white placeholder-white/40 rounded-xl h-12" />
      <Button type="submit" disabled={loading}
        className="bg-white text-[#0B4DBB] hover:bg-blue-50 font-semibold h-12 px-7 rounded-xl gap-2 shrink-0 cursor-pointer shadow-lg">
        <Send size={15} /> {loading ? "Sending…" : "Notify Me"}
      </Button>
    </form>
  );
}

function InquiryModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", grade: "C25", volume: "", site: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const createInquiry = useMutation(api.inquiries.create);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createInquiry({
        name: form.name, email: form.email, phone: form.phone, type: "readymix",
        propertyInterest: `ReadyMix ${form.grade}`,
        message: `ReadyMix Quote\nCompany: ${form.company}\nGrade: ${form.grade}\nVolume: ${form.volume}m³\nSite: ${form.site}\nNotes: ${form.notes}`,
      });
      toast.success("Inquiry sent! Our concrete team will contact you within 2 hours.");
      onClose();
    } catch { toast.error("Failed to send. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal header — brand blue */}
        <div className="bg-gradient-to-br from-[#0B4DBB] to-[#04132e] px-6 py-6 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Request a Quote</h3>
            <p className="text-blue-200 text-sm mt-1">Our concrete team will call you within 2 hours</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white cursor-pointer mt-1"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name *</label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Okafor" /></div>
            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Company</label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="ABC Construction" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Phone *</label>
              <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 800 000 0000" /></div>
            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Email *</label>
              <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Concrete Grade *</label>
              <select required value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {["C20", "C25", "C30", "C35", "C40", "Special Mix"].map((g) => <option key={g}>{g}</option>)}
              </select></div>
            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Volume (m³) *</label>
              <Input required type="number" min="1" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} placeholder="50" /></div>
          </div>
          <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Delivery Site *</label>
            <Input required value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} placeholder="Plot 93, Southern Bridge Estate, Abuja" /></div>
          <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Additional Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
              placeholder="Pour schedule, special requirements…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-[#0B4DBB]" /></div>
          <Button type="submit" disabled={loading}
            className="w-full bg-[#0B4DBB] hover:bg-[#0940a0] text-white h-11 rounded-xl font-semibold gap-2 cursor-pointer">
            <Send size={15} /> {loading ? "Submitting…" : "Submit Quote Request"}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function ReadyMixPage() {
  const { days, hours, minutes, seconds } = useCountdown(LAUNCH_DATE);
  const [showModal, setShowModal] = useState(false);
  const featuresRef = useRef(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: "-80px" });
  const productsRef = useRef(null);
  const productsInView = useInView(productsRef, { once: true, margin: "-80px" });
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-60px" });
  const splitRef = useRef(null);
  const splitInView = useInView(splitRef, { once: true, margin: "-60px" });

  return (
    <div className="min-h-screen bg-[#04132e] text-white overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[700px] flex flex-col overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="Geodata ReadyMix batching plant" className="w-full h-full object-cover" />
          {/* Deep blue gradient overlay — matches Geodata brand */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#04132e]/75 via-[#04132e]/55 to-[#04132e]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#04132e]/70 via-[#04132e]/20 to-transparent" />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 lg:px-20 py-6">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Geodata" className="h-9 w-auto rounded-lg" />
            <div>
              <div className="text-white font-bold text-xs leading-tight tracking-wide uppercase">Geodata World</div>
              <div className="text-blue-300 text-[10px] leading-tight tracking-widest uppercase font-semibold">ReadyMix</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowModal(true)}
              className="bg-[#0B4DBB] hover:bg-[#0940a0] text-white rounded-xl px-5 h-9 text-sm font-semibold gap-1.5 cursor-pointer shadow-lg shadow-blue-900/40">
              Get a Quote <ArrowRight size={14} />
            </Button>
            <Link to="/">
              <Button variant="secondary" className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl px-4 h-9 text-sm cursor-pointer">
                ← Main Site
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero copy */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 -mt-10">
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] as const }}>

            {/* Tag pill */}
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-[#0B4DBB]/30 border border-[#0B4DBB]/60 text-blue-200 text-xs font-bold tracking-[0.2em] uppercase px-5 py-2 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Coming Soon — Geodata ReadyMix
            </motion.div>

            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold text-white leading-[1.0] mb-4 max-w-4xl mx-auto"
              style={{ fontFamily: "'Playfair Display', serif" }}>
              Quality Concrete.<br />
              <span className="text-blue-300">Delivered When</span><br />
              You Need It.
            </h1>

            <p className="text-white/60 text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
              Nigeria's most advanced ready-mix concrete batching plant — engineered for speed, precision, and uncompromising quality.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
              <Button onClick={() => setShowModal(true)} size="lg"
                className="bg-[#0B4DBB] hover:bg-[#0940a0] text-white px-10 h-12 text-base font-semibold gap-2 rounded-2xl shadow-2xl shadow-blue-900/50 cursor-pointer">
                Request a Quote <ArrowRight size={16} />
              </Button>
              <a href="#features" aria-label="Learn more about Geodata ReadyMix features">
                <Button size="lg" variant="secondary"
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white px-10 h-12 text-base rounded-2xl cursor-pointer">
                  Learn More <ChevronDown size={16} />
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Countdown */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
            <p className="text-white/35 text-xs uppercase tracking-widest mb-5 font-semibold">Full portal launching in</p>
            <div className="flex items-start justify-center gap-4 sm:gap-6">
              <CountBlock value={days} label="Days" />
              <span className="text-white/25 text-4xl font-light mt-6">:</span>
              <CountBlock value={hours} label="Hours" />
              <span className="text-white/25 text-4xl font-light mt-6">:</span>
              <CountBlock value={minutes} label="Mins" />
              <span className="text-white/25 text-4xl font-light mt-6">:</span>
              <CountBlock value={seconds} label="Secs" />
            </div>
          </motion.div>
        </div>

        {/* Scroll bounce */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="relative z-10 flex justify-center pb-8">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
            <ChevronDown size={22} className="text-white/25" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS — individual cards on dark bg, clean separation ────────── */}
      <section ref={statsRef} className="py-16 bg-[#04132e]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }}
                animate={statsInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-[#0B4DBB] rounded-2xl px-6 py-8 text-center shadow-lg shadow-blue-900/30 border border-[#1a5fd4]/40">
                <div className="text-4xl sm:text-5xl font-bold text-white mb-2 leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
                <div className="text-blue-200 text-xs font-semibold uppercase tracking-widest leading-tight">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" ref={featuresRef} className="py-24 px-6 sm:px-10 lg:px-20 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={featuresInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-16">
          <span className="text-blue-300 text-sm font-bold tracking-[0.2em] uppercase block mb-3">Why Geodata ReadyMix</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Built for Nigerian Construction
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} initial={{ opacity: 0, y: 30 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.12, duration: 0.55 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-[#0B4DBB]/15 hover:border-[#0B4DBB]/40 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-[#0B4DBB]/20 border border-[#0B4DBB]/30 flex items-center justify-center mb-5 group-hover:bg-[#0B4DBB]/40 transition-colors">
                  <Icon size={22} className="text-blue-300" />
                </div>
                <h3 className="font-bold text-white mb-2 text-base">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── PRODUCTS — shades of brand blue ──────────────────────────────── */}
      <section ref={productsRef} className="py-20 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={productsInView ? { opacity: 1, y: 0 } : {}} className="text-center mb-14">
            <span className="text-blue-300 text-sm font-bold tracking-[0.2em] uppercase block mb-3">Our Mix Designs</span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              A Grade for Every Project
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PRODUCTS.map((p, i) => (
              <motion.div key={p.grade} initial={{ opacity: 0, scale: 0.95 }}
                animate={productsInView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative bg-gradient-to-br ${p.bg} rounded-2xl p-6 overflow-hidden group cursor-pointer border border-white/10 hover:scale-[1.03] hover:border-blue-400/40 transition-all duration-300 shadow-lg shadow-black/30`}
                onClick={() => setShowModal(true)}>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                    <ArrowRight size={12} className="text-[#0B4DBB]" />
                  </div>
                </div>
                {/* Ghost grade watermark */}
                <div className="text-5xl font-black text-white/10 mb-4 leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>{p.grade}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{p.grade}</h3>
                <p className="text-blue-200/70 text-sm leading-relaxed">{p.desc}</p>
                <div className="mt-4 text-blue-300 text-xs font-semibold uppercase tracking-wider">Get Quote →</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPLIT: photo + notify ─────────────────────────────────────────── */}
      <section ref={splitRef} className="py-24 px-6 sm:px-10 lg:px-20 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }}
            animate={splitInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}>
            <div className="relative">
              <img src={CONCRETE_IMG} alt="Fresh concrete pour"
                className="w-full rounded-3xl object-cover max-h-[500px] shadow-2xl shadow-black/60" />
              {/* Blue tint overlay for brand cohesion */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#0B4DBB]/20 via-transparent to-transparent" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 40 }}
            animate={splitInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
            className="space-y-8">
            <div>
              <span className="text-blue-300 text-sm font-bold tracking-[0.2em] uppercase block mb-3">Be First to Know</span>
              <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                The Portal is Almost Ready
              </h2>
              <p className="text-white/55 text-base leading-relaxed">
                Register your interest now and be the first to access real-time ordering, mix scheduling, delivery tracking, invoices, and our full digital concrete portal when we go live.
              </p>
            </div>
            <div className="space-y-3">
              {["Priority access on launch day", "Exclusive early-adopter pricing", "Dedicated concrete coordinator", "Free first-pour lab test report"].map((b) => (
                <div key={b} className="flex items-center gap-3 text-sm text-white/70">
                  <CheckCircle2 size={16} className="text-blue-400 shrink-0" />{b}
                </div>
              ))}
            </div>
            <NotifyForm />
          </motion.div>
        </div>
      </section>

      {/* ── CONTACT STRIP ────────────────────────────────────────────────── */}
      <section className="bg-[#071e47] border-t border-white/10 py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Geodata" className="h-8 w-auto rounded-lg" />
            <div>
              <div className="text-white font-bold text-sm">Geodata ReadyMix</div>
              <div className="text-blue-300 text-xs">A Geodata World Services Limited Company</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/55">
            <a href="tel:+2347047620492" className="flex items-center gap-2 hover:text-blue-300 transition-colors cursor-pointer">
              <Phone size={14} /> (+234) 704 762 0492
            </a>
            <a href="mailto:readymix@geodata.com.ng" className="flex items-center gap-2 hover:text-blue-300 transition-colors cursor-pointer">
              <Mail size={14} /> readymix@geodata.com.ng
            </a>
            <span className="flex items-center gap-2"><MapPin size={14} /> Abuja, Nigeria</span>
          </div>
          <Link to="/">
            <Button variant="secondary" size="sm"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white/80 rounded-xl cursor-pointer">
              ← Back to Main Site
            </Button>
          </Link>
        </div>
      </section>

      <div className="text-center py-5 text-white/20 text-xs border-t border-white/5 bg-[#04132e]">
        © {new Date().getFullYear()} Geodata World Services Limited. All rights reserved.
      </div>

      <AnimatePresence>
        {showModal && <InquiryModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
