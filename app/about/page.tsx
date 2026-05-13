import type { Metadata } from "next";
import AboutHero from "@/components/about/AboutHero";
import TrackRecord from "@/components/about/TrackRecord";
import InstitutionalClients from "@/components/about/InstitutionalClients";
import Leadership from "@/components/about/Leadership";
import Compliance from "@/components/about/Compliance";

export const metadata: Metadata = {
  title: "About",
  description:
    "An 18-year track record in Nigerian real estate, infrastructure, and federal construction. RC 688927. REDAN member. Federal government clients including CBN, FIRS, and the Federal Ministry of Lands.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Geodata World Services",
    description:
      "Building, slowly, since 2007. CBN and FIRS contractor. REDAN member. RC 688927.",
    url: "/about",
    images: [
      {
        url: `/api/og?eyebrow=${encodeURIComponent("About")}&title=${encodeURIComponent("Building, slowly, since 2007.")}&subtitle=${encodeURIComponent("Real estate, infrastructure, and institutional construction across Nigeria.")}`,
        width: 1200,
        height: 630,
        alt: "About Geodata World Services",
      },
    ],
  },
};

// Organization-level structured data — used site-wide.
// This is what Google uses to populate the knowledge panel
// for "Geodata World Services" searches.
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: "Geodata World Services Limited",
  alternateName: "Geodata",
  url: "https://geodata.com.ng",
  logo: "https://geodata.com.ng/icon-512.png",
  foundingDate: "2007",
  description:
    "Real estate development, investment, and infrastructure construction company based in Abuja, Nigeria.",
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
    availableLanguage: ["English"],
  },
  sameAs: [
    "https://www.instagram.com/geodata.limited/",
    // Add other verified social profiles here
  ],
  identifier: {
    "@type": "PropertyValue",
    propertyID: "Registration Number",
    value: "RC 688927",
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <AboutHero />
      <TrackRecord />
      <InstitutionalClients />
      <Leadership />
      <Compliance />
    </>
  );
}
