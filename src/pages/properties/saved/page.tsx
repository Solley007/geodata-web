import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Heart, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import Navbar from "../../home/_components/Navbar.tsx";
import Footer from "../../home/_components/Footer.tsx";
import WhatsAppButton from "../../home/_components/WhatsAppButton.tsx";
import PropertyCard from "../_components/PropertyCard.tsx";
import { useWishlist } from "@/hooks/use-wishlist.ts";

export default function SavedPropertiesPage() {
  const { saved, isSaved, toggle } = useWishlist();
  const savedIds = [...saved] as Id<"properties">[];

  const properties = useQuery(
    api.properties.getManyByIds,
    savedIds.length > 0 ? { ids: savedIds } : "skip"
  );

  const isLoading = savedIds.length > 0 && properties === undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-[var(--brand)] py-12 px-6 sm:px-10 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-blue-200 text-sm mb-2">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Saved Properties</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            <Heart size={30} className="fill-current" /> Saved Properties
          </h1>
          <p className="text-blue-100 mt-2 text-sm">Properties you've saved for later, stored on this device.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {savedIds.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Heart /></EmptyMedia>
              <EmptyTitle>No saved properties yet</EmptyTitle>
              <EmptyDescription>Tap the heart icon on any property to save it here for quick access later.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white" asChild>
                <Link to="/properties">Browse Properties</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: savedIds.length }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : properties && properties.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
              <EmptyTitle>These properties are no longer available</EmptyTitle>
              <EmptyDescription>The properties you saved may have been removed or updated.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white" asChild>
                <Link to="/properties">Browse Properties</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-5">
              <strong>{properties?.length ?? 0}</strong> {properties?.length === 1 ? "property" : "properties"} saved
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {properties?.map((property, i) => (
                <PropertyCard
                  key={property._id}
                  property={property}
                  index={i}
                  viewMode="grid"
                  isWishlisted={isSaved(property._id)}
                  isCompared={false}
                  onWishlist={(id) => toggle(id, property.title)}
                  onCompare={() => {}}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
