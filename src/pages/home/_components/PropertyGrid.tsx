import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Link } from "react-router-dom";
import { MapPin, BedDouble, Bath, Expand, Heart, Share2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import FxEquivalents from "@/components/fx/fx-equivalents.tsx";
import { CONVEX_SITE_URL } from "@/lib/convex-site";

type Property = Doc<"properties">;



const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600",
  "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600",
  "https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600",
];

function formatPrice(price: number): string {
  if (price >= 1_000_000_000) return `₦${(price / 1_000_000_000).toFixed(1)}B`;
  if (price >= 1_000_000) return `₦${(price / 1_000_000).toFixed(1)}M`;
  return `₦${price.toLocaleString()}`;
}

function statusColor(status: string): string {
  const s = status.toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-700",
    sold: "bg-red-100 text-red-700",
    reserved: "bg-amber-100 text-amber-700",
    under_construction: "bg-blue-100 text-blue-700",
  };
  return map[s] ?? "bg-gray-100 text-gray-700";
}

function typeLabel(type: string): string {
  const t = type.toLowerCase();
  const map: Record<string, string> = {
    residential: "Residential", commercial: "Commercial", land: "Land",
    luxury: "Luxury", apartment: "Apartment", shop: "Shop", warehouse: "Warehouse",
  };
  return map[t] ?? type;
}

function PropertyCard({ property, index }: { property: Property; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  // Always use featuredImage as the primary display image
  const img = property.featuredImage || (property.images?.[0]) || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];

  const handleShare = async () => {
    // Use the OG endpoint so WhatsApp/Telegram/Facebook crawlers
    // get the property image & title instead of the site logo.
    const ogUrl = `${CONVEX_SITE_URL}/og/property?id=${property._id}`;
    const cleanUrl = `${window.location.origin}/properties/${property._id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: property.title, text: `Check out this property: ${property.title}`, url: ogUrl });
      } catch {
        // user dismissed — no toast needed
      }
    } else {
      navigator.clipboard.writeText(ogUrl).catch(() => {});
      toast.success("Property link copied!");
    }
    void cleanUrl; // kept for reference; real users who open the OG link get redirected to cleanUrl
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: (index % 3) * 0.1, duration: 0.5 }}
      className="gd-card group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-400 border border-gray-100"
    >
      {/* Image */}
      <div className="gd-card-media relative h-52 overflow-hidden">
        <img
          src={img}
          alt={property.title}
          width={600}
          height={208}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <Badge className={`gd-badge text-xs ${statusColor(property.status)}`}>
            {property.status.replace(/_/g, " ").toUpperCase()}
          </Badge>
          <Badge variant="secondary" className="gd-badge gd-badge--type bg-white/90 text-gray-700 text-xs">
            {typeLabel(property.propertyType)}
          </Badge>
        </div>
        <div className="absolute top-3 right-3 flex gap-1">
          <button className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors shadow-sm">
            <Heart size={14} />
          </button>
          <button onClick={handleShare} className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-gray-600 hover:text-[var(--brand)] transition-colors shadow-sm cursor-pointer">
            <Share2 size={14} />
          </button>
        </div>
        <div className="gd-price-tag absolute bottom-3 right-3 bg-[var(--brand)] text-white text-sm font-bold px-3 py-1 rounded-xl shadow-lg">
          {formatPrice(property.price)}
        </div>
      </div>

      {/* Content */}
      <div className="gd-card-body p-4">
        <h3 className="gd-card-title font-semibold text-gray-900 text-base mb-1 line-clamp-1 group-hover:text-[var(--brand)] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
          {property.title}
        </h3>
        <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
          <MapPin size={13} className="text-[var(--brand)]" />
          <span className="line-clamp-1">{property.location}, {property.state}</span>
        </div>
        <FxEquivalents naira={property.price} className="-mt-1.5 mb-3" />

        {/* Details */}
        <div className="flex items-center gap-3 text-xs text-gray-600 mb-4 pb-4 border-b border-gray-100">
          {property.bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble size={13} className="text-[var(--brand)]" />
              {property.bedrooms} Beds
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath size={13} className="text-[var(--brand)]" />
              {property.bathrooms} Baths
            </span>
          )}
          {property.landSize && (
            <span className="flex items-center gap-1">
              <Expand size={13} className="text-[var(--brand)]" />
              {property.landSize}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 text-gray-400">
            <Eye size={12} />
            {property.views}
          </span>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="gd-btn-primary flex-1 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-xs" asChild>
            <Link to={`/properties/${property._id}`}>View Details</Link>
          </Button>
          <Button size="sm" variant="secondary" className="gd-btn-ghost flex-1 text-xs border border-gray-200 hover:border-[var(--brand)] hover:text-[var(--brand)]" asChild>
            <Link to={`/contact?property=${property._id}&type=inspection`}>Book Inspection</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Demo properties for when DB is empty
const DEMO_PROPERTIES: Partial<Property>[] = [
  {
    _id: "demo1" as Property["_id"],
    title: "Royal Gardens Estate, Abuja",
    price: 45_000_000,
    propertyType: "residential",
    status: "available",
    location: "Gwarimpa",
    state: "Abuja",
    bedrooms: 4,
    bathrooms: 3,
    landSize: "500 sqm",
    featuredImage: FALLBACK_IMAGES[0],
    views: 124,
    featured: true,
  },
  {
    _id: "demo2" as Property["_id"],
    title: "Skyline Commercial Complex",
    price: 250_000_000,
    propertyType: "commercial",
    status: "available",
    location: "Victoria Island",
    state: "Lagos",
    landSize: "2,000 sqm",
    featuredImage: FALLBACK_IMAGES[1],
    views: 89,
    featured: true,
  },
  {
    _id: "demo3" as Property["_id"],
    title: "Palm Court Luxury Villa",
    price: 120_000_000,
    propertyType: "luxury",
    status: "available",
    location: "Asokoro",
    state: "Abuja",
    bedrooms: 6,
    bathrooms: 7,
    landSize: "1,200 sqm",
    featuredImage: FALLBACK_IMAGES[2],
    views: 201,
    featured: true,
  },
  {
    _id: "demo4" as Property["_id"],
    title: "Green Valley Estate Plots",
    price: 8_500_000,
    propertyType: "land",
    status: "available",
    location: "Lugbe",
    state: "Abuja",
    landSize: "300 sqm",
    featuredImage: FALLBACK_IMAGES[3],
    views: 66,
    featured: true,
  },
  {
    _id: "demo5" as Property["_id"],
    title: "Harmony Heights Apartment",
    price: 35_000_000,
    propertyType: "apartment",
    status: "reserved",
    location: "Lekki Phase 1",
    state: "Lagos",
    bedrooms: 3,
    bathrooms: 2,
    featuredImage: FALLBACK_IMAGES[0],
    views: 144,
    featured: false,
  },
  {
    _id: "demo6" as Property["_id"],
    title: "Industrial Warehouse Space",
    price: 180_000_000,
    propertyType: "warehouse",
    status: "available",
    location: "Apapa",
    state: "Lagos",
    landSize: "5,000 sqm",
    featuredImage: FALLBACK_IMAGES[1],
    views: 37,
    featured: false,
  },
];

interface PropertyGridProps {
  properties: Property[] | undefined;
  title: string;
  subtitle: string;
  showAll?: string;
}

export default function PropertyGrid({ properties, title, subtitle, showAll }: PropertyGridProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const displayProperties = (properties && properties.length > 0 ? properties : DEMO_PROPERTIES) as Property[];

  return (
    <section ref={ref} className="gd-section py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4"
        >
          <div>
            <span className="gd-eyebrow text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-2">
              {subtitle}
            </span>
            <h2 className="gd-h2 text-3xl lg:text-4xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              {title}
            </h2>
          </div>
          {showAll && (
            <Button variant="secondary" className="border border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white transition-colors" asChild>
              <Link to={showAll}>View All Properties</Link>
            </Button>
          )}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayProperties.map((property, i) => (
            <PropertyCard key={property._id} property={property} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
