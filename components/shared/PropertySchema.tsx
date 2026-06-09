/**
 * PropertySchema — Schema.org JSON-LD for rich Google results.
 *
 * Server component (no "use client"). Drop one per property/project page:
 *
 *   <PropertySchema
 *     name="6-Bedroom Terrace Duplex — Southern Bridge City"
 *     description="MREIF-eligible terrace duplex in Idu, Abuja."
 *     url="https://geodata.com.ng/projects/southern-bridge-city"
 *     image="https://res.cloudinary.com/.../cover.jpg"
 *     priceNGN={220000000}
 *     numberOfRooms={6}
 *     addressLocality="Idu"
 *     addressRegion="FCT Abuja"
 *   />
 *
 * Invisible to users; lets Google show price, availability and images
 * directly in search results.
 */
import React from "react";

interface Props {
  name: string;
  description: string;
  url: string;
  image: string | string[];
  priceNGN?: number;
  numberOfRooms?: number;
  addressLocality?: string; // e.g. "Idu"
  addressRegion?: string;   // e.g. "FCT Abuja"
  availability?: "InStock" | "SoldOut" | "PreOrder";
}

export default function PropertySchema({
  name,
  description,
  url,
  image,
  priceNGN,
  numberOfRooms,
  addressLocality = "Abuja",
  addressRegion = "FCT",
  availability = "InStock",
}: Props) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SingleFamilyResidence",
    name,
    description,
    url,
    image: Array.isArray(image) ? image : [image],
    address: {
      "@type": "PostalAddress",
      addressLocality,
      addressRegion,
      addressCountry: "NG",
    },
  };

  if (numberOfRooms) schema.numberOfRooms = numberOfRooms;

  if (priceNGN) {
    schema.offers = {
      "@type": "Offer",
      price: priceNGN,
      priceCurrency: "NGN",
      availability: `https://schema.org/${availability}`,
      seller: {
        "@type": "Organization",
        name: "Geodata World Services Limited",
        url: "https://geodata.com.ng",
      },
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
