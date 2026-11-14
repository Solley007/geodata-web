import { useSeo } from "@/hooks/use-seo.ts";
import GroupHeader from "./_components/GroupHeader.tsx";
import GroupHero from "./_components/GroupHero.tsx";
import BusinessEcosystem from "./_components/BusinessEcosystem.tsx";
import BusinessPortfolio from "./_components/BusinessPortfolio.tsx";
import FeaturedProjects from "./_components/FeaturedProjects.tsx";
import GroupAtAGlance from "./_components/GroupAtAGlance.tsx";
import GroupAbout from "./_components/GroupAbout.tsx";
import GroupSustainability from "./_components/GroupSustainability.tsx";
import GroupCTA from "./_components/GroupCTA.tsx";
import GroupFooter from "./_components/GroupFooter.tsx";

// Geodata Group Corporate Directory — public gateway showcasing all six Group
// businesses. Entirely additive: reads the existing groupBusinesses table and
// existing public property data elsewhere; never duplicates the Real Estate
// app, CMS, or routes. See corporateDirectory.ts and the initiative notes.
//
// Rendered both at "/group" (always reachable) and, when the corporate
// directory toggle is ON, at "/" itself — canonicalPath reflects whichever
// route is currently serving it so SEO/canonical tags stay correct.
export default function GroupDirectoryPage({ canonicalPath = "/group" }: { canonicalPath?: string }) {
  useSeo({
    title: "Geodata Group – Real Estate, Infrastructure, Materials & More",
    description:
      "Geodata Group brings together real estate, infrastructure, construction materials, equipment leasing and technology businesses building Nigeria's communities.",
    canonicalPath,
  });

  return (
    <div className="min-h-screen bg-white">
      <GroupHeader />
      <GroupHero />
      <BusinessEcosystem />
      <BusinessPortfolio />
      <FeaturedProjects />
      <GroupAtAGlance />
      <GroupAbout />
      <GroupSustainability />
      <GroupCTA />
      <GroupFooter />
    </div>
  );
}
