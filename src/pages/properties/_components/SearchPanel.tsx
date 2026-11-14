import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { motion, AnimatePresence } from "motion/react";

const PROPERTY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
];

const STATES = [
  "all", "Abuja", "Imo",
];

const STATUSES = [
  { value: "all", label: "All Status" },
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "under_construction", label: "Under Construction" },
];

const PRICE_RANGES = [
  { label: "Any Price", min: undefined, max: undefined },
  { label: "Below ₦5M", min: undefined, max: 5_000_000 },
  { label: "₦5M – ₦20M", min: 5_000_000, max: 20_000_000 },
  { label: "₦20M – ₦50M", min: 20_000_000, max: 50_000_000 },
  { label: "₦50M – ₦100M", min: 50_000_000, max: 100_000_000 },
  { label: "₦100M – ₦500M", min: 100_000_000, max: 500_000_000 },
  { label: "Above ₦500M", min: 500_000_000, max: undefined },
];

const BEDROOMS = [
  { value: 0, label: "Any" },
  { value: 1, label: "1+" },
  { value: 2, label: "2+" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" },
  { value: 5, label: "5+" },
];

export type SearchFilters = {
  keyword: string;
  propertyType: string;
  state: string;
  status: string;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  bedrooms: number;
  bathrooms: number;
};

interface SearchPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  resultCount: number;
}

function ActiveFilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge className="bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20 gap-1 pr-1.5 text-xs">
      {label}
      <button onClick={onRemove} className="hover:text-red-500 transition-colors">
        <X size={11} />
      </button>
    </Badge>
  );
}

export default function SearchPanel({ filters, onChange, resultCount }: SearchPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [, setSearchParams] = useSearchParams();

  const update = (patch: Partial<SearchFilters>) => {
    const next = { ...filters, ...patch };
    onChange(next);
    // sync to URL
    const params: Record<string, string> = {};
    if (next.keyword) params.q = next.keyword;
    if (next.propertyType !== "all") params.type = next.propertyType;
    if (next.state !== "all") params.state = next.state;
    if (next.status !== "all") params.status = next.status;
    if (next.minPrice !== undefined) params.minPrice = String(next.minPrice);
    if (next.maxPrice !== undefined) params.maxPrice = String(next.maxPrice);
    if (next.bedrooms > 0) params.beds = String(next.bedrooms);
    if (next.bathrooms > 0) params.baths = String(next.bathrooms);
    setSearchParams(params);
  };

  const clearAll = () => {
    onChange({ keyword: "", propertyType: "all", state: "all", status: "all", minPrice: undefined, maxPrice: undefined, bedrooms: 0, bathrooms: 0 });
    setSearchParams({});
  };

  const activeFilters: { label: string; clear: () => void }[] = [];
  if (filters.propertyType !== "all") activeFilters.push({ label: PROPERTY_TYPES.find(t => t.value === filters.propertyType)?.label ?? filters.propertyType, clear: () => update({ propertyType: "all" }) });
  if (filters.state !== "all") activeFilters.push({ label: filters.state, clear: () => update({ state: "all" }) });
  if (filters.status !== "all") activeFilters.push({ label: STATUSES.find(s => s.value === filters.status)?.label ?? filters.status, clear: () => update({ status: "all" }) });
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const range = PRICE_RANGES.find(r => r.min === filters.minPrice && r.max === filters.maxPrice);
    activeFilters.push({ label: range?.label ?? "Price range", clear: () => update({ minPrice: undefined, maxPrice: undefined }) });
  }
  if (filters.bedrooms > 0) activeFilters.push({ label: `${filters.bedrooms}+ Beds`, clear: () => update({ bedrooms: 0 }) });
  if (filters.bathrooms > 0) activeFilters.push({ label: `${filters.bathrooms}+ Baths`, clear: () => update({ bathrooms: 0 }) });
  if (filters.keyword) activeFilters.push({ label: `"${filters.keyword}"`, clear: () => update({ keyword: "" }) });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Main Search Row */}
      <div className="p-4 flex flex-col sm:flex-row gap-3">
        {/* Keyword */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by location, estate, or keyword..."
            value={filters.keyword}
            onChange={(e) => update({ keyword: e.target.value })}
            className="pl-9 h-10 text-sm"
          />
        </div>

        {/* Type */}
        <select
          value={filters.propertyType}
          onChange={(e) => update({ propertyType: e.target.value })}
          className="h-10 px-3 rounded-lg border border-input bg-background text-sm text-gray-700 cursor-pointer outline-none focus:ring-2 focus:ring-ring"
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* State */}
        <select
          value={filters.state}
          onChange={(e) => update({ state: e.target.value })}
          className="h-10 px-3 rounded-lg border border-input bg-background text-sm text-gray-700 cursor-pointer outline-none focus:ring-2 focus:ring-ring"
        >
          {STATES.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All States" : s}</option>
          ))}
        </select>

        {/* Filters toggle */}
        <Button
          variant="secondary"
          size="sm"
          className={cn("h-10 gap-2 border", showAdvanced && "bg-[var(--brand)]/10 border-[var(--brand)]/30 text-[var(--brand)]")}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilters.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-[var(--brand)] text-white text-xs flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
          <ChevronDown size={14} className={cn("transition-transform", showAdvanced && "rotate-180")} />
        </Button>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => update({ status: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm cursor-pointer outline-none focus:ring-2 focus:ring-ring"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Price Range</label>
                <select
                  value={PRICE_RANGES.findIndex(r => r.min === filters.minPrice && r.max === filters.maxPrice)}
                  onChange={(e) => {
                    const range = PRICE_RANGES[Number(e.target.value)];
                    update({ minPrice: range.min, maxPrice: range.max });
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm cursor-pointer outline-none focus:ring-2 focus:ring-ring"
                >
                  {PRICE_RANGES.map((r, i) => (
                    <option key={i} value={i}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Min Bedrooms</label>
                <div className="flex gap-1.5">
                  {BEDROOMS.map((b) => (
                    <button
                      key={b.value}
                      onClick={() => update({ bedrooms: b.value })}
                      className={cn(
                        "flex-1 h-10 rounded-lg text-sm font-medium border transition-colors",
                        filters.bedrooms === b.value
                          ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand)]/50"
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bathrooms */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Min Bathrooms</label>
                <div className="flex gap-1.5">
                  {BEDROOMS.map((b) => (
                    <button
                      key={b.value}
                      onClick={() => update({ bathrooms: b.value })}
                      className={cn(
                        "flex-1 h-10 rounded-lg text-sm font-medium border transition-colors",
                        filters.bathrooms === b.value
                          ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand)]/50"
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters & Results */}
      <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">
            {resultCount} {resultCount === 1 ? "property" : "properties"} found
          </span>
          {activeFilters.map((f) => (
            <ActiveFilterBadge key={f.label} label={f.label} onRemove={f.clear} />
          ))}
          {activeFilters.length > 1 && (
            <button
              onClick={clearAll}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
    </div>
  );
}
