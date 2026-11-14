import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion } from "motion/react";
import {
  Home, Building2, Info, Newspaper, Phone, Image as ImageIcon,
  Wrench, HelpCircle, Shield, FileText, MapPin, Users, Handshake
} from "lucide-react";
import Navbar from "../home/_components/Navbar.tsx";
import Footer from "../home/_components/Footer.tsx";
import WhatsAppButton from "../home/_components/WhatsAppButton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";

type SitemapSection = {
  label: string;
  icon: React.ElementType;
  color: string;
  links: { label: string; href: string; desc?: string }[];
};

const SITEMAP_SECTIONS: SitemapSection[] = [
  {
    label: "Main Pages",
    icon: Home,
    color: "bg-blue-50 text-blue-700 border-blue-100",
    links: [
      { label: "Home", href: "/", desc: "Welcome to Geodata World Services" },
      { label: "About Us", href: "/about", desc: "Our story, team, and values" },
      { label: "Contact Us", href: "/contact", desc: "Get in touch with our team" },
    ],
  },
  {
    label: "Properties",
    icon: Building2,
    color: "bg-green-50 text-green-700 border-green-100",
    links: [
      { label: "All Properties", href: "/properties", desc: "Browse our full catalogue" },
      { label: "Residential", href: "/properties?type=residential", desc: "Houses, flats, and apartments" },
      { label: "Commercial", href: "/properties?type=commercial", desc: "Offices and commercial spaces" },
    ],
  },
  {
    label: "Services",
    icon: Wrench,
    color: "bg-purple-50 text-purple-700 border-purple-100",
    links: [
      { label: "Our Services", href: "/services", desc: "Full range of real estate services" },
      { label: "FAQs", href: "/faqs", desc: "Answers to common questions" },
    ],
  },
  {
    label: "News & Media",
    icon: Newspaper,
    color: "bg-amber-50 text-amber-700 border-amber-100",
    links: [
      { label: "News & Blog", href: "/news", desc: "Market insights and company news" },
      { label: "Gallery", href: "/gallery", desc: "Photos of our estates and properties" },
    ],
  },
  {
    label: "Partner Program",
    icon: Handshake,
    color: "bg-rose-50 text-rose-700 border-rose-100",
    links: [
      { label: "Become a Partner", href: "/partner/apply", desc: "Join our referral partner programme" },
      { label: "Partner Portal", href: "/partner", desc: "Partner login and dashboard" },
    ],
  },
  {
    label: "Legal",
    icon: Shield,
    color: "bg-gray-50 text-gray-700 border-gray-100",
    links: [
      { label: "Privacy Policy", href: "/privacy", desc: "How we handle your data" },
      { label: "Terms of Service", href: "/terms", desc: "Terms governing use of our services" },
      { label: "Sitemap", href: "/sitemap", desc: "Full directory of all pages" },
    ],
  },
];

function SitemapCard({ section, index }: { section: SitemapSection; index: number }) {
  const Icon = section.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className={`flex items-center gap-3 px-5 py-4 border-b ${section.color}`}>
        <Icon size={18} />
        <span className="font-semibold text-sm">{section.label}</span>
      </div>
      <ul className="divide-y divide-gray-50">
        {section.links.map((link) => (
          <li key={link.href}>
            <Link
              to={link.href}
              className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] mt-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-[var(--brand)] transition-colors">{link.label}</p>
                {link.desc && <p className="text-xs text-gray-400 mt-0.5">{link.desc}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function SitemapPage() {
  const properties = useQuery(api.properties.listFeatured);
  const totalProps = properties?.length ?? 0;

  useSeo({
    title: "Site Directory | Geodata World Services",
    description: "A complete directory of every page on the Geodata World Services website, from property listings to services and legal pages.",
    canonicalPath: "/sitemap",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-[var(--brand)] py-14 px-6 sm:px-10 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-blue-200 text-sm mb-3">
            <Link to="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-white">Sitemap</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Site Directory
          </h1>
          <p className="text-blue-100 text-sm">A complete map of all pages on the Geodata World Services website.</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-14">
        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Sections", value: SITEMAP_SECTIONS.length.toString() },
            { label: "Total Pages", value: SITEMAP_SECTIONS.reduce((acc, s) => acc + s.links.length, 0).toString() + "+" },
            { label: "Property Listings", value: `${totalProps}+` },
            { label: "Last Updated", value: new Date().toLocaleDateString("en-NG", { month: "short", year: "numeric" }) },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-[var(--brand)]" style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sections grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SITEMAP_SECTIONS.map((section, i) => (
            <SitemapCard key={section.label} section={section} index={i} />
          ))}
        </div>
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
