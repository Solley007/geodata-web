import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { X, ZoomIn, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import Navbar from "../home/_components/Navbar.tsx";
import Footer from "../home/_components/Footer.tsx";
import WhatsAppButton from "../home/_components/WhatsAppButton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";

const CATS = ["All", "Residential", "Luxury", "Commercial", "Estates", "Interior", "Land"];

function isYouTubeUrl(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function getYouTubeEmbedUrl(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url;
}

export default function GalleryPage() {
  const items = useQuery(api.gallery.list);
  const [cat, setCat] = useState("All");
  const [lightbox, setLightbox] = useState<number | null>(null);

  useSeo({
    title: "Property Gallery | Geodata World Services",
    description:
      "View photos and videos of Geodata estates, homes, and commercial developments across Nigeria — from Abuja to Lagos and Port Harcourt.",
    canonicalPath: "/gallery",
  });

  const filtered = items
    ? (cat === "All" ? items : items.filter((i) => i.category === cat))
        .slice()
        .sort((a, b) => a.order - b.order)
    : [];

  const prev = () => setLightbox((l) => (l !== null ? (l - 1 + filtered.length) % filtered.length : null));
  const next = () => setLightbox((l) => (l !== null ? (l + 1) % filtered.length : null));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero header */}
      <div className="bg-[var(--brand)] py-14 px-6 sm:px-10 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-blue-200 text-sm mb-3">
            <Link to="/" className="hover:text-white">Home</Link><span>/</span>
            <span className="text-white">Gallery</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Property Gallery
          </h1>
          <p className="text-blue-100">Explore our portfolio of exceptional properties and developments.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-10">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-5 py-2 rounded-xl text-sm font-medium border transition-colors ${
                cat === c ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand)]/40"
              }`}>
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        {items === undefined ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-48 rounded-2xl break-inside-avoid mb-4" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No gallery items in this category yet.</div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item._id} layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="break-inside-avoid group relative cursor-pointer rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
                onClick={() => setLightbox(i)}>

                {item.mediaType === "video" ? (
                  <div className="w-full aspect-video bg-gray-900 flex items-center justify-center relative">
                    <Play size={40} className="text-white/80 group-hover:text-white transition-colors" />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-3 left-3 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-lg">
                      Video
                    </div>
                  </div>
                ) : (
                  <img src={item.src} alt={item.title}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-400" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <div className="text-white font-semibold text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{item.title}</div>
                  <div className="text-white/70 text-xs">{item.category}{item.caption ? ` · ${item.caption}` : ""}</div>
                </div>
                <div className="absolute top-3 right-3 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.mediaType === "video" ? <Play size={16} className="text-white" /> : <ZoomIn size={16} className="text-white" />}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && filtered[lightbox] && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}>

            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center z-10 cursor-pointer">
              <X size={20} />
            </button>

            {filtered.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10 cursor-pointer">
                  <ChevronLeft size={22} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); next(); }}
                  className="absolute right-16 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10 cursor-pointer">
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            <div className="text-center" onClick={(e) => e.stopPropagation()}>
              <motion.div key={lightbox} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
                {filtered[lightbox].mediaType === "video" ? (
                  isYouTubeUrl(filtered[lightbox].src || filtered[lightbox].videoUrl || "") ? (
                    <iframe
                      src={getYouTubeEmbedUrl(filtered[lightbox].videoUrl || filtered[lightbox].src)}
                      className="w-[80vw] max-w-3xl aspect-video rounded-2xl"
                      allowFullScreen allow="autoplay; encrypted-media" />
                  ) : (
                    <video
                      src={filtered[lightbox].videoUrl || filtered[lightbox].src}
                      controls autoPlay
                      className="max-w-[85vw] max-h-[80vh] rounded-2xl" />
                  )
                ) : (
                  <img src={filtered[lightbox].src} alt={filtered[lightbox].title}
                    className="max-w-[85vw] max-h-[78vh] object-contain rounded-2xl" />
                )}
              </motion.div>
              <div className="mt-3 text-white font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
                {filtered[lightbox].title}
              </div>
              {filtered[lightbox].caption && (
                <div className="text-white/60 text-sm mt-1">{filtered[lightbox].caption}</div>
              )}
              <div className="text-white/40 text-xs mt-1">{lightbox + 1} / {filtered.length}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
