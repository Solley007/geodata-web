import { HardHat, Route, ClipboardCheck } from "lucide-react";
import BusinessComingSoonPage from "../_components/BusinessComingSoonPage.tsx";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1762369879547-bc7699c41e1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600";

export default function InfrastructurePage() {
  return (
    <BusinessComingSoonPage
      content={{
        slug: "infrastructure",
        canonicalPath: "/businesses/infrastructure",
        sector: "Infrastructure and Civil Construction",
        name: "Road & Infrastructure Construction",
        showTrackRecord: true,
        headline: (
          <>
            Building the Roads and Infrastructure That <span style={{ color: "#4d8fe6" }}>Move Nigeria Forward.</span>
          </>
        ),
        intro:
          "Geodata's infrastructure business delivers roads, drainage and civil construction works supporting the Group's development projects and third-party clients. The dedicated portal for project inquiries and updates is launching soon.",
        heroImage: HERO_IMAGE,
        heroAlt: "Aerial view of a highway under construction",
        capabilities: [
          { icon: Route, title: "Roads & Drainage", description: "Construction and rehabilitation of roads, access ways and drainage systems for developments and infrastructure clients." },
          { icon: HardHat, title: "Civil Construction", description: "Site preparation, earthworks and civil works supporting the Group's estates and third-party infrastructure projects." },
          { icon: ClipboardCheck, title: "Project Delivery", description: "The same standard of accountability and delivery that built Geodata's reputation in real estate, applied to infrastructure." },
        ],
        seoTitle: "Road & Infrastructure Construction – Geodata Group",
        seoDescription: "Geodata Group's infrastructure business delivers roads, drainage and civil construction works across Nigeria. Register your interest for our upcoming portal.",
      }}
    />
  );
}
