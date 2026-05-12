import type { Metadata } from "next";
import { PROPERTIES } from "@/lib/properties-list";
import PropertiesListClient from "./PropertiesListClient";

export const metadata: Metadata = {
  title: "Southern Bridge City",
  description: `${PROPERTIES.length} residences currently available across Southern Bridge City Phase One. All MREIF-eligible. Prices from ₦130M.`,
  alternates: { canonical: "/properties" },
  openGraph: {
    title: "Southern Bridge City",
    description: `${PROPERTIES.length} MREIF-eligible residences at Southern Bridge City, Idu — Abuja.`,
    url: "/properties",
    images: [
      {
        url: `/api/og?eyebrow=${encodeURIComponent("Southern Bridge City")}&title=${encodeURIComponent("Currently available.")}&subtitle=${encodeURIComponent(`${PROPERTIES.length} residences across Southern Bridge City Phase One.`)}`,
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
