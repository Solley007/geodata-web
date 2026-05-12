import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import DevelopmentsStrip from "@/components/home/DevelopmentsStrip";
import ImageCollage from "@/components/home/ImageCollage";
import StatsCounter from "@/components/home/StatsCounter";
import FeaturedProperties from "@/components/home/FeaturedProperties";
import HomeUpdates from "@/components/home/HomeUpdates";
import BriefAboutUs from "@/components/home/BriefAboutUs";
import MreifSection from "@/components/home/MreifSection";

export const metadata: Metadata = {
  title: "Premium Real Estate in Abuja", // template adds " | Geodata World Services"
  description:
    "320 MREIF-eligible residences at Southern Bridge City, Idu — Abuja. Backed by ARM Investment Managers, financed by Zenith Bank. 9.75% fixed mortgage for 20 years.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Premium Real Estate in Abuja",
    description:
      "320 MREIF-eligible residences at Southern Bridge City, Idu — Abuja. 9.75% fixed mortgage for 20 years.",
    url: "/",
    images: [
      {
        url: `/api/og?eyebrow=${encodeURIComponent("Southern Bridge City")}&title=${encodeURIComponent("Reimagining urban living in Abuja.")}&subtitle=${encodeURIComponent("320 residences, MREIF-eligible. 9.75% fixed mortgage for 20 years.")}`,
        width: 1200,
        height: 630,
        alt: "Geodata World Services — Reimagining urban living in Abuja",
      },
    ],
  },
};

export default function HomePage() {
  // Site-wide Organization schema — what populates Google's knowledge panel
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: "Geodata World Services Limited",
    alternateName: "Geodata",
    url: "https://geodata.com.ng",
    logo: "https://geodata.com.ng/icon-512.png",
    foundingDate: "2007",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Plot 93, 94, 95 B10 Cadastral Zone, Utako, Dakibiyu",
      addressLocality: "Abuja",
      addressRegion: "Federal Capital Territory",
      postalCode: "900108",
      addressCountry: "NG",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+234-704-762-0492",
      contactType: "sales",
      email: "hello@geodata.com.ng",
      areaServed: "NG",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <Hero />
      <DevelopmentsStrip />
      <ImageCollage />
      <StatsCounter />
      <FeaturedProperties />
      <HomeUpdates />
      <BriefAboutUs />
      <MreifSection />
    </>
  );
}
