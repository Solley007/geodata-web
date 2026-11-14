import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { MapPin, BedDouble, Bath, Expand } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Building2 } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.js";
import FxEquivalents from "@/components/fx/fx-equivalents.tsx";

type Property = Doc<"properties">;

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600";

function formatPrice(price: number): string {
  if (price >= 1_000_000_000) return `₦${(price / 1_000_000_000).toFixed(1)}B`;
  if (price >= 1_000_000) return `₦${(price / 1_000_000).toFixed(1)}M`;
  return `₦${price.toLocaleString()}`;
}

/**
 * Property grid for the public Diaspora programme pages. Reads only from
 * `diaspora.properties.listDiasporaVisibleProperties` (real, currently
 * visible properties) — never demo/placeholder listings, since an empty
 * result here means "nothing has been made visible yet", not "the query
 * failed", and showing fake data would misrepresent live inventory to
 * Diaspora investors.
 */
export default function DiasporaPropertyGrid({ properties, emptyLabel }: { properties: Property[] | undefined; emptyLabel: string }) {
  if (properties === undefined) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
          <EmptyTitle>No listings available yet</EmptyTitle>
          <EmptyDescription>{emptyLabel}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" asChild><Link to="/contact">Talk to Our Team</Link></Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property, i) => (
        <motion.div
          key={property._id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: Math.min(i, 5) * 0.06, duration: 0.4 }}
          className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-400 border border-gray-100"
        >
          <div className="relative h-48 overflow-hidden">
            <img
              src={property.featuredImage || property.images?.[0] || FALLBACK_IMAGE}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {property.diasporaFeatured && (
              <div className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-lg">FEATURED</div>
            )}
            <div className="absolute bottom-3 left-3 bg-[var(--brand)] text-white text-sm font-bold px-3 py-1 rounded-xl shadow-lg">
              {formatPrice(property.price)}
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-1 group-hover:text-[var(--brand)] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
              {property.title}
            </h3>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
              <MapPin size={12} className="text-[var(--brand)] shrink-0" />
              <span className="line-clamp-1">{property.location}, {property.state}</span>
            </div>
            <FxEquivalents naira={property.price} className="-mt-1.5 mb-3" />
            <div className="flex items-center flex-wrap gap-2 text-xs text-gray-600 mb-4 pb-4 border-b border-gray-100">
              {property.bedrooms != null && <span className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-0.5"><BedDouble size={12} className="text-[var(--brand)]" /> {property.bedrooms} Beds</span>}
              {property.bathrooms != null && <span className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-0.5"><Bath size={12} className="text-[var(--brand)]" /> {property.bathrooms} Baths</span>}
              {property.landSize && <span className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-0.5"><Expand size={12} className="text-[var(--brand)]" /> {property.landSize}</span>}
              {!property.diasporaEnquiriesOpen && <Badge variant="secondary" className="text-xs">Enquiries Closed</Badge>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-xs" asChild>
                <Link to={`/properties/${property._id}`}>View Details</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
