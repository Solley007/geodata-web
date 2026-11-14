import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Star, Quote } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const DEMO_TESTIMONIALS = [
  { _id: "t1", name: "Adaeze Okonkwo", role: "Property Owner, Abuja", content: "Geodata World Services made my dream of owning a home a reality. The process was seamless and professional from start to finish. I couldn't be happier!", rating: 5, avatarUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop&crop=faces" },
  { _id: "t2", name: "Emmanuel Chibuike", role: "Real Estate Investor, Lagos", content: "I've invested in three properties through Geodata and each experience has been outstanding. Their documentation and transparency is truly world-class.", rating: 5, avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces" },
  { _id: "t3", name: "Ngozi Adeyemi", role: "First-Time Buyer, Port Harcourt", content: "The team at Geodata held my hand through every step of the process. From property selection to documentation — incredible service!", rating: 5, avatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces" },
  { _id: "t4", name: "Uchenna Nwosu", role: "Commercial Developer, Enugu", content: "Geodata's commercial property portfolio is unmatched. Professional service, prime locations, and excellent after-sales support that continues to impress.", rating: 5, avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces" },
];

const DEFAULT_SECTION = {
  eyebrow: "Client Stories",
  heading: "What Our Clients Say",
  subheading: "Join thousands of satisfied property owners and investors who have trusted Geodata to deliver on their real estate dreams.",
};

type CardItem = { _id: string; name: string; role: string; content: string; rating: number; avatarUrl: string | null; location?: string; propertyType?: string; date?: string };

function TestimonialCard({ item, index }: { item: CardItem; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: index * 0.1, duration: 0.5 }}
      className="bg-white rounded-2xl p-7 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 relative">
      <Quote className="absolute top-5 right-5 text-[var(--brand)]/15" size={40} />
      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: item.rating }).map((_, i) => <Star key={i} size={14} className="fill-amber-400 text-amber-400" />)}
      </div>
      <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">&ldquo;{item.content}&rdquo;</p>
      <div className="flex items-center gap-3">
        {item.avatarUrl ? (
          <img src={item.avatarUrl} alt={item.name} className="w-11 h-11 rounded-full object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-[var(--brand)] flex items-center justify-center text-white font-bold text-sm">{item.name[0]}</div>
        )}
        <div>
          <div className="font-semibold text-gray-900 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{item.name}</div>
          <div className="text-gray-500 text-xs">{item.role}{item.location ? ` · ${item.location}` : ""}</div>
          {item.propertyType && <div className="text-gray-400 text-[11px]">{item.propertyType}</div>}
        </div>
      </div>
    </motion.div>
  );
}

export default function TestimonialsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const dbItems = useQuery(api.cms.listTestimonials);
  const sectionRaw = useQuery(api.cms.getSiteSettings, { key: "testimonials_section" });

  const section = (() => {
    try { return sectionRaw ? { ...DEFAULT_SECTION, ...JSON.parse(sectionRaw) } : DEFAULT_SECTION; }
    catch { return DEFAULT_SECTION; }
  })();

  const featured = dbItems?.filter((t) => t.featured);
  const items: CardItem[] = (featured && featured.length > 0
    ? featured.map((t) => ({ _id: t._id, name: t.name, role: t.role, content: t.content, rating: t.rating, avatarUrl: t.avatarUrl ?? null, location: (t as CardItem).location, propertyType: (t as CardItem).propertyType, date: (t as CardItem).date }))
    : DEMO_TESTIMONIALS);

  return (
    <section ref={ref} className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-center mb-14">
          <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-3">{section.eyebrow}</span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{section.heading}</h2>
          {section.subheading && <p className="text-gray-500 mt-3 max-w-xl mx-auto">{section.subheading}</p>}
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, i) => <TestimonialCard key={item._id} item={item} index={i} />)}
        </div>
      </div>
    </section>
  );
}
