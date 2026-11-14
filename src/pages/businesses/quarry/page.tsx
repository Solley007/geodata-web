import { Mountain, Truck, PackageSearch } from "lucide-react";
import BusinessComingSoonPage from "../_components/BusinessComingSoonPage.tsx";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1637076988526-f7a77037845c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600";

// Quarry & Aggregates gets its own dedicated page and never redirects to
// Concrete & Batching — they are distinct businesses per the Group directory.
export default function QuarryPage() {
  return (
    <BusinessComingSoonPage
      content={{
        slug: "quarry-aggregates",
        canonicalPath: "/businesses/quarry",
        sector: "Quarrying and Construction Materials",
        name: "Quarry & Aggregates",
        headline: (
          <>
            The Foundation Material for <span style={{ color: "#4d8fe6" }}>Every Build.</span>
          </>
        ),
        intro:
          "Geodata's quarry and aggregates business supplies processed stone and construction materials for infrastructure and building projects. Our dedicated ordering and supply portal is launching soon.",
        heroImage: HERO_IMAGE,
        heroAlt: "Gravel and aggregate being loaded for delivery",
        capabilities: [
          { icon: Mountain, title: "Quarrying", description: "Extraction and processing of stone for construction, infrastructure and building materials use." },
          { icon: PackageSearch, title: "Aggregates Processing", description: "Graded aggregates processed to specification for concrete, road works and general construction." },
          { icon: Truck, title: "Materials Supply", description: "Reliable supply to the Group's own construction and concrete businesses, and to third-party clients." },
        ],
        seoTitle: "Quarry & Aggregates – Geodata Group",
        seoDescription: "Geodata Group's quarry and aggregates business supplies processed stone and construction materials across Nigeria. Register your interest for our upcoming portal.",
      }}
    />
  );
}
