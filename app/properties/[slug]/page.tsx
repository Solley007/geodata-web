import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllPropertySlugs,
  getPropertyBySlug,
} from "@/lib/property-data";
import { ActiveSectionProvider } from "@/lib/ActiveSectionContext";
import PropertyHero from "@/components/property/PropertyHero";
import StickySubNav from "@/components/property/StickySubNav";
import SpecGrid from "@/components/property/SpecGrid";
import ProgressBar from "@/components/property/ProgressBar";
import ScrollSpyContent from "@/components/property/ScrollSpyContent";
import PropertyEnquire from "@/components/property/PropertyEnquire";

interface PageProps {
  params: { slug: string };
}

// Tell Next.js which slugs to pre-render at build time.
// All five property slugs are generated as static pages.
export function generateStaticParams() {
  return getAllPropertySlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const property = getPropertyBySlug(params.slug);
  if (!property) return { title: "Property not found" };

  return {
    title: `${property.title} — ${property.location}`,
    description: property.subtitle,
    alternates: { canonical: `/properties/${params.slug}` },
    openGraph: {
      title: `${property.title} — Southern Bridge City`,
      description: property.subtitle,
      url: `/properties/${params.slug}`,
      type: "website",
      images: [
        {
          url: property.heroImage,
          width: 1200,
          height: 630,
          alt: `${property.title} at Southern Bridge City, Idu Abuja`,
        },
      ],
    },
  };
}

export default function PropertyDetailPage({ params }: PageProps) {
  const property = getPropertyBySlug(params.slug);

  // Slug not in our list → proper 404 page, not a blank or error
  if (!property) notFound();

  // Structured data — RealEstateListing schema for Google rich results
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.subtitle,
    url: `https://geodata.com.ng/properties/${params.slug}`,
    image: property.heroImage,
    address: {
      "@type": "PostalAddress",
      streetAddress: property.locationContext.address,
      addressLocality: "Abuja",
      addressRegion: "Federal Capital Territory",
      addressCountry: "NG",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: property.locationContext.coords.lat,
      longitude: property.locationContext.coords.lng,
    },
    offers: {
      "@type": "Offer",
      price: property.pricing.from.replace(/[^\d]/g, ""),
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
    },
    numberOfRooms: property.specs.find((s) => s.label === "Bedrooms")?.value,
    numberOfBathroomsTotal: property.specs.find((s) => s.label === "Bathrooms")?.value,
    floorSize: {
      "@type": "QuantitativeValue",
      value: property.specs.find((s) => s.label === "Built area")?.value,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ActiveSectionProvider>
        <PropertyHero property={property} />
        <StickySubNav property={property} />
        <SpecGrid property={property} />
        <ProgressBar property={property} />
        <ScrollSpyContent property={property} />
        <PropertyEnquire property={property} />
      </ActiveSectionProvider>
    </>
  );
}
