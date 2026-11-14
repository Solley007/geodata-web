import { useState } from "react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Send, type LucideIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { useSeo } from "@/hooks/use-seo.ts";
import { useContactInfo } from "@/hooks/use-contact-info.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import TrackRecordSection from "@/components/track-record/TrackRecordSection.tsx";

const LOGO = "https://hercules-cdn.com/file_hqjYSAKlVBBRqljHrAkEnfVn";

export type BusinessCapability = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type BusinessComingSoonContent = {
  /** Corporate Directory slug, used as the inquiry "type" so leads route correctly. */
  slug: string;
  /** Public route this page is mounted at, e.g. "/businesses/infrastructure". */
  canonicalPath: string;
  sector: string;
  name: string;
  headline: React.ReactNode;
  intro: string;
  heroImage: string;
  heroAlt: string;
  capabilities: BusinessCapability[];
  seoTitle: string;
  seoDescription: string;
  /** Show the shared Track Record (road projects) under the capabilities. */
  showTrackRecord?: boolean;
};

// Shared "Coming Soon" landing shell for Group businesses that don't yet have
// an operating portal (Infrastructure, Quarry, Equipment, Technology). Reuses
// the existing inquiries.create mutation for lead capture — no new backend
// data model, no invented operational claims, prices, or completion dates.
function RegisterInterestForm({ businessSlug, businessName }: { businessSlug: string; businessName: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [loading, setLoading] = useState(false);
  const createInquiry = useMutation(api.inquiries.create);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createInquiry({
        name: form.name,
        email: form.email,
        phone: form.phone,
        type: businessSlug,
        subject: `${businessName} — Register Interest`,
        message: form.company ? `Company: ${form.company}\n${form.message}` : form.message || "Registering interest in updates.",
      });
      toast.success("Thanks! We'll be in touch as this business launches.");
      setForm({ name: "", email: "", phone: "", company: "", message: "" });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div className="grid sm:grid-cols-2 gap-3.5">
        <Input
          required
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="bg-white border-[#01378D]/15 rounded-xl h-11"
        />
        <Input
          placeholder="Company (optional)"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          className="bg-white border-[#01378D]/15 rounded-xl h-11"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3.5">
        <Input
          required
          type="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="bg-white border-[#01378D]/15 rounded-xl h-11"
        />
        <Input
          required
          placeholder="+234 800 000 0000"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="bg-white border-[#01378D]/15 rounded-xl h-11"
        />
      </div>
      <textarea
        placeholder="Tell us a bit about your interest (optional)"
        rows={3}
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        className="w-full bg-white border border-[#01378D]/15 text-[#111111] placeholder:text-[#111111]/40 rounded-xl px-3.5 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-[#01378D]"
      />
      <Button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto bg-[#01378D] hover:bg-[#01378D]/85 text-white h-11 px-8 rounded-xl font-semibold gap-2 cursor-pointer"
      >
        <Send size={15} /> {loading ? "Sending…" : "Register Interest"}
      </Button>
    </form>
  );
}

export default function BusinessComingSoonPage({ content }: { content: BusinessComingSoonContent }) {
  const contact = useContactInfo();
  const capRef = useRef(null);
  const capInView = useInView(capRef, { once: true, margin: "-80px" });

  useSeo({
    title: content.seoTitle,
    description: content.seoDescription,
    canonicalPath: content.canonicalPath,
  });

  return (
    <div className="min-h-screen bg-white text-[#111111] overflow-x-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#01378D]/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 h-16 lg:h-20 flex items-center justify-between">
          <Link to="/group" className="flex items-center gap-3">
            <img src={LOGO} alt="Geodata Group" className="h-9 lg:h-10 w-auto" />
            <div className="hidden sm:block">
              <div className="font-bold text-sm leading-tight tracking-wide uppercase text-[#01378D]">Geodata Group</div>
              <div className="text-[#111111]/50 text-[11px] leading-tight tracking-widest uppercase">{content.name}</div>
            </div>
          </Link>
          <Link
            to="/group"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#111111]/70 hover:text-[#01378D] transition-colors"
          >
            <ArrowLeft size={15} /> All Businesses
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={content.heroImage} alt={content.heroAlt} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#01378D] via-[#01378D]/75 to-[#01378D]/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#01378D]/85 via-[#01378D]/25 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-20 w-full">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-300/50 text-amber-100 text-xs font-bold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
              Coming Soon
            </div>
            <span className="text-white/70 text-sm font-semibold tracking-widest uppercase block mb-3">{content.sector}</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 max-w-3xl text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              {content.headline}
            </h1>
            <p className="text-white/80 text-base sm:text-lg leading-relaxed max-w-xl mb-10">{content.intro}</p>
            <a
              href="#register"
              className="inline-flex items-center gap-2 bg-white hover:bg-white/90 text-[#01378D] font-semibold text-sm px-7 py-3.5 rounded-xl transition-colors cursor-pointer"
            >
              Register Interest <ArrowRight size={16} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Capabilities ───────────────────────────────────────────────── */}
      <section ref={capRef} className="py-20 lg:py-24 bg-[#F7F9FC]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={capInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <span className="text-[#01378D] text-sm font-semibold tracking-widest uppercase block mb-3">What to Expect</span>
            <h2 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Built on the Same Standard as the Group
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.capabilities.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                animate={capInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white border border-[#01378D]/10 rounded-2xl p-6 shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-[#01378D]/10 flex items-center justify-center mb-5">
                  <c.icon size={22} className="text-[#01378D]" />
                </div>
                <h3 className="font-bold mb-2 text-base">{c.title}</h3>
                <p className="text-[#111111]/55 text-sm leading-relaxed">{c.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {content.showTrackRecord && (
        <TrackRecordSection category="road_infrastructure" preview heading="Roads We Have Delivered" eyebrow="Our Track Record" />
      )}

      {/* ── Register interest ──────────────────────────────────────────── */}
      <section id="register" className="py-20 lg:py-24 bg-white border-t border-[#01378D]/8">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="bg-[#F7F9FC] border border-[#01378D]/10 rounded-3xl p-8 lg:p-10"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                Be First to Know When We Launch
              </h2>
              <p className="text-[#111111]/60 text-sm max-w-md mx-auto">
                Leave your details and our team will reach out as {content.name} becomes available.
              </p>
            </div>
            <RegisterInterestForm businessSlug={content.slug} businessName={content.name} />
          </motion.div>
        </div>
      </section>

      {/* ── Footer strip ───────────────────────────────────────────────── */}
      <footer className="bg-[#111111] py-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <span>&copy; {new Date().getFullYear()} Geodata Group. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <Link to="/group" className="hover:text-white transition-colors">All Businesses</Link>
            <Link to="/real-estate" className="hover:text-white transition-colors">Real Estate Site</Link>
            <a href={`tel:${contact.primaryPhone}`} className="hover:text-white transition-colors">{contact.primaryPhone}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
