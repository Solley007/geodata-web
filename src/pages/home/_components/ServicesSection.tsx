import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Link } from "react-router-dom";
import { Building2, TrendingUp, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const ICONS = [Building2, TrendingUp, Shield];

const DEFAULT_SERVICES = [
  { title: "Estate Development", description: "Master-planned residential and commercial estates with full infrastructure — roads, water, electricity, and security.", imageUrl: "https://images.unsplash.com/photo-1543414347-1c348021f279?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", imageStorageId: null as string | null },
  { title: "Property Investment", description: "Expert advisory on high-yield real estate investments with proven returns across Nigeria's fastest-growing cities.", imageUrl: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", imageStorageId: null as string | null },
  { title: "Construction Services", description: "End-to-end construction management for residential and commercial projects, delivered on time and on budget.", imageUrl: "https://images.unsplash.com/photo-1515263487990-61b07816b324?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", imageStorageId: null as string | null },
];

type ServiceItem = { title: string; description: string; imageUrl: string; imageStorageId: string | null };

function parse(raw: string | null | undefined): ServiceItem[] {
  if (!raw) return DEFAULT_SERVICES;
  try { return JSON.parse(raw) as ServiceItem[]; } catch { return DEFAULT_SERVICES; }
}

function ServiceImage({ item }: { item: ServiceItem }) {
  const url = useQuery(
    api.cms.getSettingsImageUrl,
    item.imageStorageId ? { storageId: item.imageStorageId } : { storageId: undefined }
  );
  return (
    <img
      src={url ?? item.imageUrl}
      alt={item.title}
      width={600}
      height={208}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
    />
  );
}

export default function ServicesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const raw = useQuery(api.cms.getSiteSettings, { key: "services" });
  const services = parse(raw);

  return (
    <section ref={ref} className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-center mb-10">
          <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-3">What We Do</span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Our Core Services</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">From land acquisition to construction and property management — a full suite of real estate services under one roof.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, i) => {
            const Icon = ICONS[i] ?? Building2;
            return (
              <motion.div key={service.title} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.12, duration: 0.5 }}
                className="group rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-400 border border-gray-100">
                <div className="relative h-52 overflow-hidden">
                  <ServiceImage item={service} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111]/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <div className="w-10 h-10 bg-[var(--brand)] rounded-xl flex items-center justify-center">
                      <Icon size={20} className="text-white" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>{service.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{service.description}</p>
                  <Link to="/services" aria-label={`Learn more about ${service.title}`} className="inline-flex items-center gap-1.5 text-[var(--brand)] text-sm font-semibold hover:gap-3 transition-all duration-200">Explore {service.title} <ArrowRight size={15} /></Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.5, duration: 0.5 }} className="mt-12 text-center">
          <Button size="lg" className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white px-10 shadow-lg gap-2" asChild>
            <Link to="/services">View All Services <ArrowRight size={18} /></Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
