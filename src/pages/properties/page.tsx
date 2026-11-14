import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { LayoutGrid, List, Heart, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import { useWishlist } from "@/hooks/use-wishlist.ts";
import { useSeo } from "@/hooks/use-seo.ts";
import Navbar from "../home/_components/Navbar.tsx";
import Footer from "../home/_components/Footer.tsx";
import WhatsAppButton from "../home/_components/WhatsAppButton.tsx";
import SearchPanel, { type SearchFilters } from "./_components/SearchPanel.tsx";
import PropertyCard from "./_components/PropertyCard.tsx";
import CompareDrawer from "./_components/CompareDrawer.tsx";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type Property = Doc<"properties">;

const PAGE_SIZE = 9;

const DEMO_PROPERTIES: Partial<Property>[] = [
  { _id: "d1" as Property["_id"], title: "Royal Gardens Estate, Abuja", price: 45_000_000, propertyType: "residential", status: "available", location: "Gwarimpa", state: "Abuja", bedrooms: 4, bathrooms: 3, landSize: "500 sqm", featuredImage: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", images: [], amenities: [], views: 124, featured: true, priceType: "outright", description: "", lga: "Gwagwalada" },
  { _id: "d2" as Property["_id"], title: "Skyline Commercial Complex", price: 250_000_000, propertyType: "commercial", status: "available", location: "Victoria Island", state: "Lagos", landSize: "2,000 sqm", featuredImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", images: [], amenities: [], views: 89, featured: true, priceType: "outright", description: "", lga: "Eti-Osa" },
  { _id: "d3" as Property["_id"], title: "Palm Court Luxury Villa", price: 120_000_000, propertyType: "luxury", status: "available", location: "Asokoro", state: "Abuja", bedrooms: 6, bathrooms: 7, landSize: "1,200 sqm", featuredImage: "https://images.unsplash.com/photo-1613977257363-707ba9348227?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", images: [], amenities: [], views: 201, featured: true, priceType: "outright", description: "", lga: "Abuja Municipal" },
  { _id: "d4" as Property["_id"], title: "Green Valley Estate Plots", price: 8_500_000, propertyType: "land", status: "available", location: "Lugbe", state: "Abuja", landSize: "300 sqm", featuredImage: "https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", images: [], amenities: [], views: 66, featured: false, priceType: "installment", description: "", lga: "Abuja Municipal" },
  { _id: "d5" as Property["_id"], title: "Harmony Heights Apartment", price: 35_000_000, propertyType: "apartment", status: "reserved", location: "Lekki Phase 1", state: "Lagos", bedrooms: 3, bathrooms: 2, featuredImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", images: [], amenities: [], views: 144, featured: false, priceType: "outright", description: "", lga: "Eti-Osa" },
  { _id: "d6" as Property["_id"], title: "Industrial Warehouse Space", price: 180_000_000, propertyType: "warehouse", status: "available", location: "Apapa", state: "Lagos", landSize: "5,000 sqm", featuredImage: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", images: [], amenities: [], views: 37, featured: false, priceType: "outright", description: "", lga: "Apapa" },
  { _id: "d7" as Property["_id"], title: "Golden Gate Duplex", price: 65_000_000, propertyType: "residential", status: "available", location: "Jahi", state: "Abuja", bedrooms: 5, bathrooms: 4, landSize: "700 sqm", featuredImage: "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", images: [], amenities: [], views: 88, featured: true, priceType: "outright", description: "", lga: "Abuja Municipal" },
  { _id: "d8" as Property["_id"], title: "Sunrise Bungalow Estate", price: 22_000_000, propertyType: "residential", status: "under_construction", location: "Kuje", state: "Abuja", bedrooms: 3, bathrooms: 2, landSize: "400 sqm", featuredImage: "https://images.unsplash.com/photo-1670589953882-b94c9cb380f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", images: [], amenities: [], views: 52, featured: false, priceType: "installment", description: "", lga: "Kuje" },
  { _id: "d9" as Property["_id"], title: "Port Harcourt Shopfront", price: 15_000_000, propertyType: "shop", status: "available", location: "GRA Phase 2", state: "Rivers", landSize: "80 sqm", featuredImage: "https://images.unsplash.com/photo-1543414347-1c348021f279?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", images: [], amenities: [], views: 43, featured: false, priceType: "outright", description: "", lga: "Port Harcourt" },
];

export default function PropertiesPage() {
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState<SearchFilters>({
    keyword: searchParams.get("q") ?? "",
    propertyType: searchParams.get("type") ?? "all",
    state: searchParams.get("state") ?? "all",
    status: searchParams.get("status") ?? "all",
    minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
    maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    bedrooms: searchParams.get("beds") ? Number(searchParams.get("beds")) : 0,
    bathrooms: searchParams.get("baths") ? Number(searchParams.get("baths")) : 0,
  });
  const [debouncedKeyword] = useDebounce(filters.keyword, 350);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { isSaved, toggle: toggleWishlist, count: savedCount } = useWishlist();
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const queryArgs = {
    propertyType: filters.propertyType === "all" ? undefined : filters.propertyType,
    state: filters.state === "all" ? undefined : filters.state,
    status: filters.status === "all" ? undefined : filters.status,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    bedrooms: filters.bedrooms > 0 ? filters.bedrooms : undefined,
    bathrooms: filters.bathrooms > 0 ? filters.bathrooms : undefined,
    keyword: debouncedKeyword || undefined,
  };

  const {
    rows: dbProperties,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(api.search.searchPaginated, queryArgs, PAGE_SIZE);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, filters.propertyType, filters.state, filters.status, filters.minPrice, filters.maxPrice, filters.bedrooms, filters.bathrooms]);

  // Show demo listings only when the catalog is entirely empty on the first page
  const showDemo = !isLoading && pageIndex === 0 && dbProperties.length === 0 && !debouncedKeyword && filters.propertyType === "all" && filters.state === "all" && filters.status === "all";
  const allProperties: Property[] = showDemo ? (DEMO_PROPERTIES as Property[]) : dbProperties;

  const compareProperties = allProperties.filter((p) => compareIds.includes(p._id));

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        toast.error("You can compare up to 3 properties at once.");
        return prev;
      }
      toast.success("Added to comparison");
      return [...prev, id];
    });
  };

  // Page type label from URL
  const typeParam = searchParams.get("type");
  const pageTitle = typeParam
    ? { residential: "Residential Properties", commercial: "Commercial Properties", land: "Land & Plots", luxury: "Luxury Homes", apartment: "Apartments", shop: "Shops & Retail", warehouse: "Industrial" }[typeParam] ?? "All Properties"
    : "All Properties";

  useSeo({
    title: "Properties for Sale in Nigeria | Geodata",
    description:
      "Browse homes, apartments, land, and commercial properties for sale across Nigeria. Filter by location, price, and type with Geodata World Services.",
    canonicalPath: "/properties",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Page Hero */}
      <div className="bg-[var(--brand)] py-12 px-6 sm:px-10 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
<div className="flex items-center gap-2 text-[#fafaf7]/60 text-[11px] uppercase tracking-[0.2em] mb-5">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <span className="text-white">Properties</span>
              {typeParam && <><span>/</span><span className="text-white capitalize">{typeParam}</span></>}
            </div>
<h1 className="font-display text-5xl md:text-6xl font-light text-white tracking-tight">
              {pageTitle}
            </h1>
<p className="text-[#fafaf7]/75 mt-4 text-lg">
Homes you can buy from Geodata today, with prices, sizes and photos for each one.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Panel */}
        <div className="mb-6">
          <SearchPanel
            filters={filters}
            onChange={setFilters}
            resultCount={allProperties.length}
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isLoading ? (
              <Loader2 size={15} className="animate-spin text-[var(--brand)]" />
            ) : (
              <span>
                Showing <strong>{allProperties.length}</strong> {allProperties.length === 1 ? "property" : "properties"} · Page <strong>{pageIndex + 1}</strong>
              </span>
            )}
            {savedCount > 0 && (
              <Link
                to="/properties/saved"
                className="flex items-center gap-1.5 text-xs text-red-500 font-medium bg-red-50 px-3 py-1 rounded-full border border-red-100 hover:bg-red-100 transition-colors"
              >
                <Heart size={12} className="fill-current" /> {savedCount} saved
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("w-9 h-9 flex items-center justify-center transition-colors", viewMode === "grid" ? "bg-[var(--brand)] text-white" : "bg-white text-gray-500 hover:text-[var(--brand)]")}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("w-9 h-9 flex items-center justify-center transition-colors border-l border-gray-200", viewMode === "list" ? "bg-[var(--brand)] text-white" : "bg-white text-gray-500 hover:text-[var(--brand)]")}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Property Grid / List */}
        {isLoading ? (
          <div className={cn(viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" : "space-y-4")}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={viewMode === "grid" ? "h-80 rounded-2xl" : "h-44 rounded-2xl"} />
            ))}
          </div>
        ) : allProperties.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
              <EmptyTitle>No properties found</EmptyTitle>
              <EmptyDescription>Try adjusting your filters or search terms to find more properties.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white" asChild>
                <Link to="/properties">Clear Filters</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <AnimatePresence mode="wait">
            <div className={cn(viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" : "space-y-4")}>
              {allProperties.map((property, i) => (
                <PropertyCard
                  key={property._id}
                  property={property}
                  index={i}
                  viewMode={viewMode}
                  isWishlisted={isSaved(property._id)}
                  isCompared={compareIds.includes(property._id)}
                  onWishlist={(id) => toggleWishlist(id, property.title)}
                  onCompare={toggleCompare}
                />
              ))}
              {(filters.state === "all" || filters.state === "Abuja") && /^(all|residential)$/i.test(filters.propertyType) && filters.bedrooms <= 6 && !hasPrevPage && <SbeCard list={viewMode === "list"} />}
            </div>
          </AnimatePresence>
        )}

        {/* Numbered pagination */}
        {!isLoading && !showDemo && allProperties.length > 0 && (hasNextPage || hasPrevPage) && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <Button
              variant="secondary"
              disabled={!hasPrevPage}
              onClick={prevPage}
              className="gap-1 border border-[var(--brand)] text-[var(--brand)] disabled:opacity-40"
            >
              <ChevronLeft size={15} /> Prev
            </Button>
            <span className="h-10 min-w-10 px-3 rounded-lg bg-[var(--brand)] text-white font-semibold flex items-center justify-center">
              {pageIndex + 1}
            </span>
            <Button
              variant="secondary"
              disabled={!hasNextPage}
              onClick={nextPage}
              className="gap-1 border border-[var(--brand)] text-[var(--brand)] disabled:opacity-40"
            >
              Next <ChevronRight size={15} />
            </Button>
          </div>
        )}
      </div>

      {/* Compare Drawer */}
      <AnimatePresence>
        {compareIds.length > 0 && (
          <CompareDrawer
            properties={compareProperties}
            onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))}
            onClear={() => setCompareIds([])}
          />
        )}
      </AnimatePresence>

      <div className={cn(compareIds.length > 0 && "pb-16")}>
        <Footer />
      </div>
      <WhatsAppButton />
    </div>
  );
}


function SbeCard({ list }: { list: boolean }) { return (<Link to="/projects/southern-bridge-estate" className={cn("group block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow", list && "sm:flex")}><div className={cn("relative overflow-hidden", list ? "sm:w-72 shrink-0 h-56 sm:h-auto" : "h-56")}><img src="https://hercules-cdn.com/cdn-cgi/image/w=900,q=80,format=auto/file_aoQ2XjlUJgULi5JDSlw3oXFV" alt="Southern Bridge Estate 6-Bedroom Semi-Detached" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /><span className="absolute top-3 left-3 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">9 available</span></div><div className="p-5"><p className="text-xs uppercase tracking-wider text-gray-500">Southern Bridge Estate, Jabi, Abuja</p><h3 className="mt-1 text-lg font-semibold text-gray-900">6-Bedroom Semi-Detached</h3><p className="mt-1 text-sm text-gray-500">6 bed · 7 bath · 400 m² · Phase One and Phase Two</p><p className="mt-3 text-xl font-bold text-[var(--brand)]">From ₦500M</p></div></Link>); }