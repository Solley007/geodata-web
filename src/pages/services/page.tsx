import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Building2, TrendingUp, Shield, FileText, MapPin, Wrench, Users, BarChart2, ArrowRight } from "lucide-react";
import Navbar from "../home/_components/Navbar.tsx";
import Footer from "../home/_components/Footer.tsx";
import WhatsAppButton from "../home/_components/WhatsAppButton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";

const SERVICES = [
{ icon: Building2, title: "Estate Development", desc: "We plan and build whole estates, with roads, water, power, security and places to relax, all in place before you move in.", link: "/properties?type=residential" },
{ icon: TrendingUp, title: "Property Investment Advice", desc: "Honest advice on where and what to buy, what it should earn you, and how to look after it.", link: "/contact" },
{ icon: Shield, title: "Construction", desc: "We build homes and commercial buildings from start to finish, with good materials and qualified engineers.", link: "/contact" },
{ icon: MapPin, title: "Land Acquisition", desc: "We help you find and buy land in good locations across Nigeria, and we check the title properly before you pay.", link: "/properties?type=land" },
{ icon: FileText, title: "Legal Documentation", desc: "We handle the paperwork for you, from your allocation letter to your Deed of Assignment and C of O.", link: "/contact" },
{ icon: Wrench, title: "Property Management", desc: "We look after your property for you: finding good tenants, keeping it in repair and collecting the rent.", link: "/contact" },
{ icon: Users, title: "Agent & Referral Program", desc: "Introduce buyers to us and earn a commission on every sale that goes through.", link: "/contact" },
{ icon: BarChart2, title: "Valuation Services", desc: "Independent valuations that tell you what a property is really worth, whether you are buying, borrowing or insuring.", link: "/contact" },
];

export default function ServicesPage() {
  useSeo({
    title: "Real Estate Services | Geodata World Services",
    description:
      "Estate development, land acquisition, construction, legal documentation, and property management services from Geodata World Services in Nigeria.",
    canonicalPath: "/services",
  });

  return (
<div className="min-h-screen bg-[#fafaf7]">
      <Navbar />
<div className="bg-[#0a1628] pt-16 pb-14 px-6 sm:px-10 lg:px-20">
        <div className="max-w-7xl mx-auto">
<div className="flex items-center gap-2 text-[#fafaf7]/60 text-[11px] uppercase tracking-[0.2em] mb-5">
            <Link to="/" className="hover:text-white">Home</Link><span>/</span><span className="text-white">Services</span>
          </div>
<h1 className="font-display text-5xl md:text-6xl font-light text-white mb-4 tracking-tight">Our services.</h1>
<p className="text-[#fafaf7]/75 max-w-2xl text-lg">Everything you need to buy, build, own and look after property, in one place.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
        <h2 className="sr-only">Our Service Offerings</h2>
<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
          {SERVICES.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
className="bg-transparent border-t border-[#0a1628]/15 pt-6 group flex flex-col">
<div className="w-10 h-10 border border-[#0a1628]/15 flex items-center justify-center mb-5 transition-colors duration-300 group-hover:bg-[#0a1628]">
<s.icon size={18} className="text-[#0a1628] group-hover:text-white transition-colors duration-300" />
              </div>
<h3 className="font-display text-xl text-[#0a1628] mb-3">{s.title}</h3>
<p className="text-sm text-[#5c6b7e] leading-relaxed flex-1">{s.desc}</p>
<Link to={s.link} aria-label={"Learn more about " + s.title} className="mt-5 inline-flex items-center gap-1 text-[#0a1628] text-xs uppercase tracking-[0.15em] hover:gap-2 transition-all">
                Explore {s.title} <ArrowRight size={14} />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-[#111111] rounded-3xl p-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Ready to Get Started?</h2>
<p className="text-gray-400 mb-6 max-w-xl mx-auto">Tell us what you need and a member of our team will get back to you within one working day.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/contact" className="px-8 py-3 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white rounded-xl font-semibold transition-colors">Contact Our Team</Link>
            <Link to="/properties" className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors border border-white/20">Browse Properties</Link>
          </div>
        </div>
      </div>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
