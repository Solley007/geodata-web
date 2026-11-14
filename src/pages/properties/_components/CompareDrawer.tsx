import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, GitCompare, ArrowRight, Minus } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import FxEquivalents from "@/components/fx/fx-equivalents.tsx";

type Property = Doc<"properties">;

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
];

function formatPrice(price: number): string {
  if (price >= 1_000_000_000) return `₦${(price / 1_000_000_000).toFixed(1)}B`;
  if (price >= 1_000_000) return `₦${(price / 1_000_000).toFixed(1)}M`;
  return `₦${price.toLocaleString()}`;
}

function Row({ label, values }: { label: string; values: (string | number | undefined)[] }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28 shrink-0">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-3 px-4 text-sm text-gray-800 font-medium">
          {v ?? <Minus size={14} className="text-gray-300" />}
        </td>
      ))}
    </tr>
  );
}

interface CompareDrawerProps {
  properties: Property[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function CompareDrawer({ properties, onRemove, onClear }: CompareDrawerProps) {
  const [open, setOpen] = useState(false);

  if (properties.length === 0) return null;

  return (
    <>
      {/* Trigger bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#111111] text-white px-4 py-3 flex items-center gap-3 shadow-2xl"
      >
        <GitCompare size={18} className="text-[var(--brand)] shrink-0" />
        <span className="text-sm font-medium">{properties.length} {properties.length === 1 ? "property" : "properties"} selected to compare</span>
        <div className="flex gap-2 ml-2 flex-1">
          {properties.map((p) => (
            <div key={p._id} className="relative">
              <img
                src={p.featuredImage || FALLBACK_IMAGES[0]}
                alt={p.title}
                className="w-10 h-10 rounded-lg object-cover border-2 border-[var(--brand)]"
              />
              <button
                onClick={() => onRemove(p._id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X size={9} className="text-white" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white text-xs" onClick={onClear}>
            Clear
          </Button>
          <Button
            size="sm"
            className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-xs gap-1.5"
            onClick={() => setOpen(true)}
            disabled={properties.length < 2}
          >
            <GitCompare size={13} />
            Compare {properties.length < 2 ? "(select 2+)" : "Now"}
          </Button>
        </div>
      </motion.div>

      {/* Compare Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Property Comparison
                </h2>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-x-auto">
                {/* Property Images */}
                <div className="flex gap-4 mb-6">
                  <div className="w-28 shrink-0" />
                  {properties.map((p) => (
                    <div key={p._id} className="flex-1 min-w-[180px]">
                      <div className="relative rounded-2xl overflow-hidden h-36 mb-3">
                        <img
                          src={p.featuredImage || FALLBACK_IMAGES[0]}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => onRemove(p._id)}
                          className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors"
                        >
                          <X size={13} className="text-gray-600" />
                        </button>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm line-clamp-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {p.title}
                      </h3>
                      <p className="text-[var(--brand)] font-bold text-lg mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {formatPrice(p.price)}
                      </p>
                      <FxEquivalents naira={p.price} />
                    </div>
                  ))}
                </div>

                {/* Comparison rows */}
                <table className="w-full">
                  <tbody>
                    <Row label="Location" values={properties.map(p => `${p.location}, ${p.state}`)} />
                    <Row label="Type" values={properties.map(p => p.propertyType)} />
                    <Row label="Status" values={properties.map(p => p.status)} />
                    <Row label="Bedrooms" values={properties.map(p => p.bedrooms)} />
                    <Row label="Bathrooms" values={properties.map(p => p.bathrooms)} />
                    <Row label="Land Size" values={properties.map(p => p.landSize)} />
                    <Row label="Estate" values={properties.map(p => p.estate)} />
                    <Row label="Price Type" values={properties.map(p => p.priceType)} />
                  </tbody>
                </table>

                <div className="flex gap-3 mt-6">
                  {properties.map((p) => (
                    <Button key={p._id} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-1.5" asChild>
                      <Link to={`/properties/${p._id}`} onClick={() => setOpen(false)}>
                        View Details <ArrowRight size={14} />
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
