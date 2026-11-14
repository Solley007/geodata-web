import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SEO_ORG_KEY, SEO_PAGES_KEY, SEO_TRACKING_KEY } from "@/lib/seo-settings.ts";
import PagesTab from "./_components/PagesTab.tsx";
import OrganisationTab from "./_components/OrganisationTab.tsx";
import TrackingTab from "./_components/TrackingTab.tsx";

export default function AdminSeo() {
  const rawPages = useQuery(api.cms.getSiteSettings, { key: SEO_PAGES_KEY });
  const rawOrg = useQuery(api.cms.getSiteSettings, { key: SEO_ORG_KEY });
  const rawTracking = useQuery(api.cms.getSiteSettings, { key: SEO_TRACKING_KEY });

  const loading = rawPages === undefined || rawOrg === undefined || rawTracking === undefined;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>SEO</h1>
        <p className="text-sm text-gray-500">Control how the site appears on Google, and add visitor tracking</p>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Tabs defaultValue="pages" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pages" className="cursor-pointer">Pages</TabsTrigger>
            <TabsTrigger value="organisation" className="cursor-pointer">Organisation</TabsTrigger>
            <TabsTrigger value="tracking" className="cursor-pointer">Tracking</TabsTrigger>
          </TabsList>
          <TabsContent value="pages"><PagesTab raw={rawPages} /></TabsContent>
          <TabsContent value="organisation"><OrganisationTab raw={rawOrg} /></TabsContent>
          <TabsContent value="tracking"><TrackingTab raw={rawTracking} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
