import type { Metadata } from "next";
import { PROPERTIES } from "@/lib/properties-list";
import PropertiesListClient from "./PropertiesListClient";

// Count of typology types currently being marketed (excludes Sold Out).
// We use typology count rather than unit count because per-typology
// inventory isn't tracked reliably yet.
const TOTAL_TYPOLOGIES = PROPERTIES.filter(p => p.status !== "Sold Out").length;

export const metadata: Metadata = {
  title: "Southern Bridge City",
  description: `${TOTAL_TYPOLOGIES} residence typologies across Southern Bridge City Phase One. All MREIF-eligible. Prices from ₦130M.`,
  alternates: { canonical: "/properties" },
  openGraph: {
    title: "Southern Bridge City",
    description: `MREIF-eligible residences at Southern Bridge City, Idu — Abuja.`,
    url: "/properties",
    images: [
      {
        url: `/api/og?eyebrow=${encodeURIComponent("Southern Bridge City")}&title=${encodeURIComponent("Currently available.")}&subtitle=${encodeURIComponent(`Residences across Southern Bridge City Phase One.`)}`,
        width: 1200,
        height: 630,
        alt: "Geodata Properties — Southern Bridge City",
      },
    ],
  },
};

export default function PropertiesListPage() {
  return <PropertiesListClient />;
}
