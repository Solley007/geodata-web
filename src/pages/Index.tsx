import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import RealEstateLandingPage from "./home/RealEstateLandingPage.tsx";
import GroupDirectoryPage from "./group/page.tsx";

// Public "/" route — gated by the "World Corporate Directory"
// feature toggle managed in /admin/settings (Features tab):
//   ON  → shows the Corporate Directory (all six Group businesses)
//   OFF → shows the existing Real Estate landing page (default, unchanged)
// The Real Estate experience is never removed either way — it always stays
// reachable at /real-estate. See convex/featureToggles.ts.
export default function Index() {
  const directoryEnabled = useQuery(api.featureToggles.isCorporateDirectoryEnabled, {});

  // While loading, don't flash the wrong landing experience — show nothing briefly
  if (directoryEnabled === undefined) return null;

  if (directoryEnabled) {
    return <GroupDirectoryPage canonicalPath="/" />;
  }

  return <RealEstateLandingPage canonicalPath="/" />;
}
