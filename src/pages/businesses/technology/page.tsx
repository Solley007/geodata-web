import { Cpu, LayoutDashboard, Cloud } from "lucide-react";
import BusinessComingSoonPage from "../_components/BusinessComingSoonPage.tsx";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1741795990628-7ec99d7d2044?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600";

export default function TechnologyPage() {
  return (
    <BusinessComingSoonPage
      content={{
        slug: "technology-digital",
        canonicalPath: "/businesses/technology",
        sector: "Technology and Digital Transformation",
        name: "Technology & Digital Solutions",
        headline: (
          <>
            Digital Tools for a <span style={{ color: "#4d8fe6" }}>Built Environment.</span>
          </>
        ),
        intro:
          "Geodata's technology business builds digital solutions supporting the Group's businesses and the broader built-environment sector. Our platform is in development and launching soon.",
        heroImage: HERO_IMAGE,
        heroAlt: "Abstract blue digital technology pattern",
        capabilities: [
          { icon: LayoutDashboard, title: "Digital Transformation", description: "Digitizing operations across the Group's businesses, from real estate to construction and materials." },
          { icon: Cloud, title: "Enterprise Technology", description: "Platforms and tools that help the Group's businesses run more efficiently and transparently." },
          { icon: Cpu, title: "Built-Environment Tech", description: "Purpose-built technology for the property, construction and materials sectors, informed by the Group's own operations." },
        ],
        seoTitle: "Technology & Digital Solutions – Geodata Group",
        seoDescription: "Geodata Group's technology business builds digital solutions for the built environment. Register your interest for our upcoming platform.",
      }}
    />
  );
}
