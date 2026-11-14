import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  MapPin, BedDouble, Bath, Expand, Heart, Share2, Eye,
  GitCompare, QrCode, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { cn } from "@/lib/utils.ts";
import FxEquivalents from "@/components/fx/fx-equivalents.tsx";

type Property = Doc<"properties">;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available:          { label: "Available",          className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  sold:               { label: "Sold",               className: "bg-red-100 text-red-700 border-red-200" },
  reserved:           { label: "Reserved",           className: "bg-amber-100 text-amber-700 border-amber-200" },
  under_construction: { label: "Under Construction", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

const TYPE_LABELS: Record<string, string> = {
  residential: "Residential", commercial: "Commercial", land: "Land",
  luxury: "Luxury", apartment: "Apartment", shop: "Shop", warehouse: "Industrial",
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600",
  "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600",
  "https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600",
  "https://images.unsplash.com/photo-1613977257363-707ba9348227?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600",
  "https://images.unsplash.com/photo-1560179707-f14e90ef3623?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600",
];

function formatPrice(price: number): string {
  if (price >= 1_000_000_000) return `₦${(price / 1_000_000_000).toFixed(1)}B`;
  if (price >= 1_000_000) return `₦${(price / 1_000_000).toFixed(1)}M`;
  return `₦${price.toLocaleString()}`;
}

interface PropertyCardProps {
  property: Property;
  index: number;
  viewMode: "grid" | "list";
  isWishlisted: boolean;
  isCompared: boolean;
  onWishlist: (id: string) => void;
  onCompare: (id: string) => void;
}

export default function PropertyCard({
  property, index, viewMode, isWishlisted, isCompared, onWishlist, onCompare,
}: PropertyCardProps) {
  const [imgIdx, setImgIdx] = useState(0);
  // Always use featuredImage as the hero/primary image; fall back to gallery or placeholder
  const primaryImage = property.featuredImage || (property.images?.[0]) || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  // Build gallery with featuredImage first (deduplicated)
  const gallery = property.images?.length > 0 ? property.images : [];
  const images = gallery[0] === primaryImage ? gallery : [primaryImage, ...gallery.filter(i => i !== primaryImage)];
  const status = STATUS_CONFIG[property.status.toLowerCase()] ?? { label: property.status, className: "bg-gray-100 text-gray-700 border-gray-200" };

  const handleShare = () => {
    const ogUrl = `https://watchful-wombat-208.convex.site/og/property?id=${property._id}`;
    navigator.clipboard.writeText(ogUrl).catch(() => {});
    toast.success("Link copied to clipboard!");
  };

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index, 5) * 0.06, duration: 0.4 }}
        className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col sm:flex-row group"
      >
        {/* Image */}
        <div className="relative sm:w-64 h-48 sm:h-auto shrink-0 overflow-hidden">
          <img
            src={images[imgIdx] || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]}
            alt={property.title}
            width={256}
            height={192}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {images.length > 1 && (
            <div className="absolute bottom-2 left-2 flex gap-1">
              {images.slice(0, 4).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    imgIdx === i ? "bg-white w-3" : "bg-white/60"
                  )}
                />
              ))}
            </div>
          )}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            <Badge className={cn("text-xs border", status.className)}>{status.label}</Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-[var(--brand)] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
                {property.title}
              </h2>
              <div className="shrink-0 text-right">
                <div className="text-xl font-bold text-[var(--brand)]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {formatPrice(property.price)}
                </div>
                <FxEquivalents naira={property.price} className="justify-end" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
              <MapPin size={13} className="text-[var(--brand)]" />
              <span>{property.location}, {property.state}</span>
              {property.estate && <span className="text-gray-400">• {property.estate}</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
              {property.bedrooms != null && (
                <span className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1">
                  <BedDouble size={14} className="text-[var(--brand)]" /> {property.bedrooms} Beds
                </span>
              )}
              {property.bathrooms != null && (
                <span className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1">
                  <Bath size={14} className="text-[var(--brand)]" /> {property.bathrooms} Baths
                </span>
              )}
              {property.landSize && (
                <span className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1">
                  <Expand size={14} className="text-[var(--brand)]" /> {property.landSize}
                </span>
              )}
              <Badge variant="secondary" className="text-xs">{TYPE_LABELS[property.propertyType] ?? property.propertyType}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
            <Button size="sm" className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-1.5" asChild>
              <Link to={`/properties/${property._id}`}>View Details <ArrowRight size={14} /></Link>
            </Button>
            <Button size="sm" variant="secondary" className="border border-gray-200 hover:border-[var(--brand)] hover:text-[var(--brand)]" asChild>
              <Link to={`/contact?property=${property._id}&type=inspection`}>Book Inspection</Link>
            </Button>
            <div className="ml-auto flex gap-1.5">
              <button
                onClick={() => onWishlist(property._id)}
                className={cn("w-8 h-8 rounded-lg border flex items-center justify-center transition-colors", isWishlisted ? "bg-red-50 border-red-200 text-red-500" : "border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200")}
              >
                <Heart size={14} className={cn(isWishlisted && "fill-current")} />
              </button>
              <button onClick={handleShare} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-[var(--brand)] flex items-center justify-center transition-colors">
                <Share2 size={14} />
              </button>
              <button
                onClick={() => onCompare(property._id)}
                className={cn("w-8 h-8 rounded-lg border flex items-center justify-center transition-colors", isCompared ? "bg-[var(--brand)]/10 border-[var(--brand)]/30 text-[var(--brand)]" : "border-gray-200 text-gray-400 hover:text-[var(--brand)]")}
              >
                <GitCompare size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid mode
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 5) * 0.07, duration: 0.4 }}
className="group bg-transparent overflow-hidden transition-all duration-400"
    >
      {/* Image */}
<div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={images[imgIdx] || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]}
          alt={property.title}
          width={400}
          height={208}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.slice(0, 4).map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={cn("h-1.5 rounded-full transition-all", imgIdx === i ? "w-4 bg-white" : "w-1.5 bg-white/60")}
              />
            ))}
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
<span className="bg-[#fafaf7]/95 text-[#0a1628] text-[10px] uppercase tracking-[0.2em] px-2.5 py-1">{status.label}</span>

        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <button
            onClick={() => onWishlist(property._id)}
            className={cn("w-8 h-8 rounded-full shadow flex items-center justify-center transition-all", isWishlisted ? "bg-red-500 text-white" : "bg-white/90 text-gray-600 hover:text-red-500")}
          >
            <Heart size={13} className={cn(isWishlisted && "fill-current")} />
          </button>
          <button onClick={handleShare} className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-600 hover:text-[var(--brand)] transition-colors">
            <Share2 size={13} />
          </button>
          <button
            onClick={() => onCompare(property._id)}
            className={cn("w-8 h-8 rounded-full shadow flex items-center justify-center transition-all", isCompared ? "bg-[var(--brand)] text-white" : "bg-white/90 text-gray-600 hover:text-[var(--brand)]")}
          >
            <GitCompare size={13} />
          </button>
        </div>
<div className="absolute bottom-0 left-0 bg-[#fafaf7] text-[#0a1628] text-base px-4 py-2">
          {formatPrice(property.price)}
        </div>

      </div>

      {/* Content */}
<div className="pt-5 pb-1">
<h2 className="font-display text-xl text-[#0a1628] mb-2 line-clamp-1 group-hover:text-[#a93340] transition-colors">
          {property.title}
        </h2>
<div className="flex items-center gap-1.5 text-[#5c6b7e] text-[11px] uppercase tracking-[0.15em] mb-3">
          <MapPin size={12} className="text-[var(--brand)] shrink-0" />
          <span className="line-clamp-1">{property.location}, {property.state}</span>
        </div>

        <FxEquivalents naira={property.price} className="-mt-1.5 mb-3" />
<div className="flex items-center flex-wrap gap-4 text-xs text-[#5c6b7e] mb-5 pb-5 border-b border-[#e5e0d5]">
          {property.bedrooms != null && (
<span className="flex items-center gap-1">
              <BedDouble size={12} className="text-[var(--brand)]" /> {property.bedrooms} Beds
            </span>
          )}
          {property.bathrooms != null && (
<span className="flex items-center gap-1">
              <Bath size={12} className="text-[var(--brand)]" /> {property.bathrooms} Baths
            </span>
          )}
          {property.landSize && (
<span className="flex items-center gap-1">
              <Expand size={12} className="text-[var(--brand)]" /> {property.landSize}
            </span>
          )}
        </div>

        <div className="flex gap-2">
<Button size="sm" className="flex-1 bg-[#0a1628] hover:bg-[#0f2547] text-white text-xs uppercase tracking-[0.12em] rounded-none gap-1" asChild>
            <Link to={`/properties/${property._id}`}>
              <QrCode size={12} /> View Details
            </Link>
          </Button>
<Button size="sm" variant="secondary" className="flex-1 text-xs uppercase tracking-[0.12em] rounded-none bg-transparent border border-[#0a1628]/20 text-[#0a1628] hover:border-[#0a1628] hover:bg-transparent" asChild>
            <Link to={`/contact?property=${property._id}&type=inspection`}>Book</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
