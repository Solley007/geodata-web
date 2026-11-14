import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Shield, Award, MapPin, Users, TrendingUp, Clock, Star, CheckCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const ICONS = [Shield, MapPin, Users, TrendingUp, Clock];

const DEFAULT_ABOUT = {
  heading: "Nigeria's Premier Real Estate Development Company",
  tagline: "Who We Are",
  para1: "Geodata World Services Limited is a leading real estate development and property management company with over 19 years of experience transforming Nigeria's built environment. We specialize in residential estates, commercial complexes, luxury homes, land allocation, and strategic investment properties.",
  para2: "Our mission is to make quality real estate ownership accessible, transparent, and rewarding for every Nigerian — from first-time buyers to institutional investors. From our base in Abuja, we bring world-class infrastructure to every community we serve.",
  badgeText: "19 Years",
  badgeSub: "Of Trusted Real Estate Excellence",
  imageUrl: "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
  imageStorageId: null as string | null,
  services: ["Property Sales & Leasing","Estate Development","Land Acquisition","Construction Management","Property Management","Investment Advisory","Legal Documentation","Valuation Services"],
};

const DEFAULT_FEATURES = [
  { title: "Trusted & Secure", description: "Every transaction is secured with comprehensive legal documentation, registered titles, and verified ownership." },
  { title: "Prime Locations", description: "Strategic developments in Abuja and Owerri, Imo State." },
{ title: "Quality Construction", description: "Gated estates built with full infrastructure: paved roads, drainage, perimeter security and underground utilities." },
  { title: "Flexible Payment Plans", description: "Accessible installment plans, mortgage partnerships, and financing options for every budget." },
];

type AboutData = typeof DEFAULT_ABOUT;

function parse(raw: string | null | undefined): AboutData {
  if (!raw) return DEFAULT_ABOUT;
  try { return { ...DEFAULT_ABOUT, ...(JSON.parse(raw) as Partial<AboutData>) }; } catch { return DEFAULT_ABOUT; }
}

export default function AboutSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const raw = useQuery(api.cms.getSiteSettings, { key: "about" });
const parsed = parse(raw); const fixText = (s: string) => s.replace(/15\+? years/gi, "19 years").replace(/With operations spanning \d+ states, we bring/g, "From our base in Abuja, we bring"); const data = { ...parsed, badgeText: "19 Years", para1: fixText(parsed.para1), para2: fixText(parsed.para2) };

  // Resolve stored image: if storageId present, get URL from storage
  const storedImageUrl = useQuery(
    api.cms.getSettingsImageUrl,
    data.imageStorageId ? { storageId: data.imageStorageId } : { storageId: undefined }
  );
  const imageUrl = storedImageUrl ?? data.imageUrl;

  return (
    <section ref={ref} className="py-12 md:py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        {/* Top Row */}
        <div className="grid lg:grid-cols-2 gap-10 items-center mb-12 md:mb-16">
          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img src={imageUrl ?? undefined} alt="Geodata Development" width={800} height={480} className="w-full h-[480px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand)]/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[var(--brand)] rounded-xl flex items-center justify-center shrink-0">
                      <Star className="text-white" size={22} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[var(--brand)]" style={{ fontFamily: "'Playfair Display', serif" }}>{data.badgeText}</div>
                      <div className="text-sm text-gray-600">{data.badgeSub}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-[var(--brand)]/10 rounded-3xl -z-10" />
            <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-[var(--brand)]/20 rounded-2xl -z-10" />
          </motion.div>

          {/* Text side */}
          <motion.div initial={{ opacity: 0, x: 40 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.15 }}>
            <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-3">{data.tagline}</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {data.heading.includes("Premier") ? (
                <>{data.heading.split("Premier")[0]}Premier{" "}<span className="text-[var(--brand)]">{data.heading.split("Premier")[1]}</span></>
              ) : <span className="text-[var(--brand)]">{data.heading}</span>}
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">{data.para1}</p>
            <p className="text-gray-600 leading-relaxed mb-8">{data.para2}</p>
            <div className="grid grid-cols-2 gap-2 mb-8">
              {data.services.map((service) => (
                <div key={service} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle size={15} className="text-[var(--brand)] shrink-0" />{service}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.3 }} className="text-center mb-12">
            <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-3">Why Choose Geodata</span>
            <h3 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>The Geodata Advantage</h3>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEFAULT_FEATURES.map((f, i) => {
              const Icon = ICONS[i] ?? Shield;
              return (
                <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.35 + i * 0.08, duration: 0.5 }}
                  className="bg-gray-50 hover:bg-[var(--brand)]/5 rounded-2xl p-6 border border-gray-100 hover:border-[var(--brand)]/20 transition-all duration-300 group">
                  <div className="w-12 h-12 bg-[var(--brand)]/10 group-hover:bg-[var(--brand)] rounded-xl flex items-center justify-center mb-4 transition-colors duration-300">
                    <Icon size={22} className="text-[var(--brand)] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{f.title}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
