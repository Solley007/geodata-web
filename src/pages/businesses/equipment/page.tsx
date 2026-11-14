import { Truck, Wrench, Settings2 } from "lucide-react";
import BusinessComingSoonPage from "../_components/BusinessComingSoonPage.tsx";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1769629918284-64b191456534?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600";

export default function EquipmentPage() {
  return (
    <BusinessComingSoonPage
      content={{
        slug: "equipment-leasing",
        canonicalPath: "/businesses/equipment",
        sector: "Equipment, Plant and Machinery",
        name: "Equipment Leasing & Plant Services",
        headline: (
          <>
            The Machinery Behind Every <span style={{ color: "#4d8fe6" }}>Major Project.</span>
          </>
        ),
        intro:
          "Geodata's equipment leasing business provides heavy machinery and plant services to support construction and infrastructure projects. Our booking and fleet portal is launching soon.",
        heroImage: HERO_IMAGE,
        heroAlt: "Heavy construction equipment parked on a work site",
        capabilities: [
          { icon: Truck, title: "Equipment Leasing", description: "Heavy machinery available for lease to support construction, infrastructure and quarry operations." },
          { icon: Wrench, title: "Plant Services", description: "Operator and maintenance support so leased equipment stays productive and project-ready." },
          { icon: Settings2, title: "Machinery Support", description: "Servicing the Group's own businesses first, with capacity extended to third-party projects." },
        ],
        seoTitle: "Equipment Leasing & Plant Services – Geodata Group",
        seoDescription: "Geodata Group's equipment leasing business provides heavy machinery and plant services for construction and infrastructure projects. Register your interest for our upcoming portal.",
      }}
    />
  );
}
