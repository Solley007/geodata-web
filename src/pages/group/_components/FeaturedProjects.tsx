import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { MapPin, ArrowRight, Building2 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import FxEquivalents from "@/components/fx/fx-equivalents.tsx";

type Property = Doc<"properties">;

function formatPrice(price: number): string {
  if (price >= 1_000_000_000) return `₦${(price / 1_000_000_000).toFixed(1)}B`;
  if (price >= 1_000_000) return `₦${(price / 1_000_000).toFixed(1)}M`;
  return `₦${price.toLocaleString()}`;
}

function statusStyle(status: string): string {
  const s = status.toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    available: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sold: "bg-red-50 text-red-700 border-red-200",
    reserved: "bg-amber-50 text-amber-700 border-amber-200",
    under_construction: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return map[s] ?? "bg-gray-100 text-gray-500 border-gray-200";
}

function ProjectCard({ property, index }: { property: Property; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: (index % 3) * 0.1, duration: 0.5 }}
    >
      <Link
        to={`/properties/${property._id}`}
        className="group block bg-white border border-[#01378D]/10 rounded-2xl overflow-hidden hover:border-[#01378D]/40 hover:shadow-lg transition-all cursor-pointer"
      >
        <div className="relative h-48 overflow-hidden">
          <img
            src={property.featuredImage}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <span className={`absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusStyle(property.status)}`}>
            {property.status.replace(/_/g, " ")}
          </span>
          <span className="absolute bottom-3 right-3 bg-[#01378D] text-white text-sm font-bold px-3 py-1 rounded-lg">
            {formatPrice(property.price)}
          </span>
        </div>
        <div className="p-5">
          <h3 className="font-bold text-[#111111] mb-1.5 line-clamp-1 group-hover:text-[#01378D] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
            {property.title}
          </h3>
          <div className="flex items-center gap-1.5 text-[#111111]/50 text-sm mb-4">
            <MapPin size={13} className="text-[#01378D] shrink-0" />
            <span className="line-clamp-1">{property.location}, {property.state}</span>
          </div>
          <FxEquivalents naira={property.price} className="-mt-2 mb-4" />
          <span className="inline-flex items-center gap-1.5 text-[#01378D] text-sm font-semibold group-hover:gap-2.5 transition-all">
            View Details <ArrowRight size={14} />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

// Reuses the existing public property records via the same query the Real
// Estate homepage uses — no duplicate project data, no invented prices or
// completion dates. If no properties are marked featured yet, an empty
// state is shown rather than fabricated projects.
export default function FeaturedProjects() {
  const properties = useQuery(api.properties.listFeatured);
  const rawVisible = useQuery(api.cms.getSiteSettings, { key: "group_featured_projects_visible" });
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  // Admin toggle (Settings → Access Control). Default is visible when unset.
  if (rawVisible === "false") return null;

  return (
    <section className="py-24 bg-white border-t border-[#01378D]/8">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4"
        >
          <div>
            <span className="text-[#01378D] text-sm font-semibold tracking-widest uppercase block mb-3">Featured Projects</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Real Estate Developments From the Group
            </h2>
          </div>
          <Link
            to="/properties"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#111111]/70 hover:text-[#01378D] transition-colors shrink-0"
          >
            View All Properties <ArrowRight size={15} />
          </Link>
        </motion.div>

        {properties === undefined ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-2xl" />)}
          </div>
        ) : properties.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
              <EmptyTitle>No featured projects yet</EmptyTitle>
              <EmptyDescription>Check back soon as new developments are marked featured.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((p, i) => <ProjectCard key={p._id} property={p} index={i} />)}
          </div>
        )}
      </div>
    </section>
  );
}
