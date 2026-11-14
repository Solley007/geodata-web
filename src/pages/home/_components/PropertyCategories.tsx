import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Link } from "react-router-dom";
import { Building2, Home, Trees, Store, Warehouse, Landmark } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";

// Icon map for category icons stored as strings
const ICON_MAP: Record<string, React.ElementType> = {
  Home, Building2, Trees, Landmark, Store, Warehouse,
};

const DEFAULT_CATEGORIES: Category[] = [
  { icon: "Home", label: "Residential", count: "120+", href: "/properties?type=residential", image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400", mediaType: "image" },
  { icon: "Building2", label: "Commercial", count: "45+", href: "/properties?type=commercial", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400", mediaType: "image" },
];

type Category = {
  icon: string; label: string; count: string; href: string; image: string;
  mediaType?: "image" | "video";
  active?: boolean;
};

function parseCategories(raw: string | null | undefined): Category[] {
  if (!raw) return DEFAULT_CATEGORIES;
  try { return JSON.parse(raw) as Category[]; } catch { return DEFAULT_CATEGORIES; }
}

export default function PropertyCategories() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  // Use resolved query so uploaded storageIds are converted to CDN URLs
  const raw = useQuery(api.cms.getCategoriesResolved);
  const categories = parseCategories(raw).filter((c) => c.active !== false);

  // Hide the whole section if no active categories
  if (raw !== undefined && categories.length === 0) return null;

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-3">
            Browse by Category
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Find Your Property Type
          </h2>
        </motion.div>

        <div className={cn("grid gap-4", categories.length <= 2 ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6")}>
          {categories.map((cat, i) => {
            const Icon = ICON_MAP[cat.icon] ?? Home;
            const isVideo = cat.mediaType === "video";
            return (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.07, duration: 0.4 }}
              >
                <Link
                  to={cat.href}
                  className="group relative block rounded-2xl overflow-hidden aspect-[4/5] shadow-md hover:shadow-xl transition-all duration-400"
                >
                  {/* Background media — image or video */}
                  {isVideo ? (
                    <video
                      src={cat.image}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <img
                      src={cat.image}
                      alt={cat.label}
                      width={400}
                      height={500}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111]/80 via-[#111]/30 to-transparent group-hover:from-[var(--brand)]/80 transition-all duration-400" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 group-hover:bg-white group-hover:scale-110 transition-all duration-300">
                      <Icon size={18} className="text-white group-hover:text-[var(--brand)] transition-colors duration-300" />
                    </div>
                    <div className="text-white font-bold text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{cat.label}</div>
                    <div className="text-white/70 text-xs mt-0.5">{cat.count} Properties</div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
