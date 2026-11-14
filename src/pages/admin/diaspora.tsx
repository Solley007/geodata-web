import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { Globe2, Home, TrendingUp, Handshake, Users, Building, ShieldAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { cn } from "@/lib/utils.ts";
import DiasporaMarketsPanel from "./_components/DiasporaMarketsPanel.tsx";
import DiasporaCampaignsPanel from "./_components/DiasporaCampaignsPanel.tsx";
import DiasporaConsultationsPanel from "./_components/DiasporaConsultationsPanel.tsx";
import DiasporaContentPanel from "./_components/DiasporaContentPanel.tsx";
import DiasporaCtasPanel from "./_components/DiasporaCtasPanel.tsx";
import DiasporaAnalyticsPanel from "./_components/DiasporaAnalyticsPanel.tsx";
import DiasporaFollowUpsPanel from "./_components/DiasporaFollowUpsPanel.tsx";
import DiasporaDownloadsPanel from "./_components/DiasporaDownloadsPanel.tsx";

/**
 * Geodata Diaspora Investment & Property Platform — admin control centre.
 * Permanent, configurable business layer over the existing website/CRM/CMS/
 * IAM. Never a second CRM/property DB/auth system. Gated by the
 * "feature_diaspora_platform" master toggle and the granular `diaspora.*`
 * IAM permissions — both re-checked server-side on every query/mutation.
 */

const PROGRAMME_ICONS: Record<Doc<"diasporaProgrammes">["key"], React.ElementType> = {
  own: Home,
  invest: TrendingUp,
  partner: Handshake,
  refer: Users,
  corporate: Building,
};

export default function AdminDiasporaPlatform() {
  const feature = useQuery(api.diaspora.feature.getFeatureStatus, {});
  const access = useQuery(api.diaspora.feature.getMyAccess, {});

  if (feature === undefined || access === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!access.canView) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia>
          <EmptyTitle>You don't have access to this module</EmptyTitle>
          <EmptyDescription>
            Ask an administrator to grant you the "View Diaspora Platform" permission under Users &amp; Roles.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Globe2 size={22} className="text-[var(--brand)]" /> Geodata Diaspora Investment &amp; Property Platform
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Own. Invest. Develop. Partner. From Anywhere. — a permanent, configurable business layer over the existing Geodata website and CRM.
        </p>
      </div>

      <MasterToggle enabled={feature.enabled} />

      {!feature.enabled && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <span>
            The platform is currently OFF. The public Diaspora experience is hidden, but existing leads, clients, opportunities, transactions and
            documents remain fully intact and visible to staff in their usual modules. You can still configure programmes, markets and campaigns
            below while it's off.
          </span>
        </div>
      )}

      <Tabs defaultValue="programmes" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="programmes" className="cursor-pointer">Programmes</TabsTrigger>
          <TabsTrigger value="followups" className="cursor-pointer">Follow-ups</TabsTrigger>
          <TabsTrigger value="markets" className="cursor-pointer">Markets</TabsTrigger>
          <TabsTrigger value="campaigns" className="cursor-pointer">Campaigns</TabsTrigger>
          <TabsTrigger value="consultations" className="cursor-pointer">Consultations</TabsTrigger>
          <TabsTrigger value="content" className="cursor-pointer">Content</TabsTrigger>
          <TabsTrigger value="downloads" className="cursor-pointer">Downloads</TabsTrigger>
          <TabsTrigger value="ctas" className="cursor-pointer">CTAs</TabsTrigger>
          <TabsTrigger value="analytics" className="cursor-pointer">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="programmes" className="mt-4">
          <ProgrammesPanel />
        </TabsContent>
        <TabsContent value="followups" className="mt-4">
          <DiasporaFollowUpsPanel />
        </TabsContent>
        <TabsContent value="markets" className="mt-4">
          <DiasporaMarketsPanel />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-4">
          <DiasporaCampaignsPanel />
        </TabsContent>
        <TabsContent value="consultations" className="mt-4">
          <DiasporaConsultationsPanel />
        </TabsContent>
        <TabsContent value="content" className="mt-4">
          <DiasporaContentPanel />
        </TabsContent>
        <TabsContent value="downloads" className="mt-4">
          <DiasporaDownloadsPanel />
        </TabsContent>
        <TabsContent value="ctas" className="mt-4">
          <DiasporaCtasPanel />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <DiasporaAnalyticsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Master platform toggle ──────────────────────────────────────────────
function MasterToggle({ enabled }: { enabled: boolean }) {
  const setStatus = useMutation(api.diaspora.feature.setFeatureStatus);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await setStatus({ enabled: checked });
      toast.success(checked
        ? "Diaspora Investment & Property Platform is now ON"
        : "Diaspora Investment & Property Platform is now OFF — existing CRM records are preserved"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update this setting");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Globe2 size={16} className="text-[var(--brand)]" /> Platform Master Setting
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Turning this OFF disables the public Diaspora experience only. It never deletes or hides leads, customers, opportunities, transactions,
          documents or audit history.
        </p>
      </div>

      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4">
        <div>
          <p className="font-medium text-sm text-gray-800">Diaspora Platform</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {enabled
              ? "ON — the public Diaspora hub and programme pages are live"
              : "OFF — public Diaspora pages show a temporarily-unavailable state; existing site and CRM are unaffected"}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={toggling} className="cursor-pointer" />
      </div>

      <div className={cn(
        "flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit",
        enabled ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700",
      )}>
        <div className={cn("w-1.5 h-1.5 rounded-full", enabled ? "bg-green-500" : "bg-amber-500")} />
        {enabled ? "Diaspora Platform is currently ON" : "Diaspora Platform is currently OFF"}
      </div>
    </div>
  );
}

const TOGGLE_FIELDS = [
  { field: "enabled", label: "Enabled" },
  { field: "publicVisible", label: "Public Visibility" },
  { field: "acceptingEnquiries", label: "Accepting Enquiries" },
  { field: "featured", label: "Featured" },
  { field: "registrationOpen", label: "Registration Open" },
] as const;

// ── Programmes panel: 5 fixed programmes, 5 toggles each ────────────────
function ProgrammesPanel() {
  const programmes = useQuery(api.diaspora.programmes.listProgrammes, {});
  const seedProgrammes = useMutation(api.diaspora.programmes.seedProgrammes);
  const updateToggle = useMutation(api.diaspora.programmes.updateProgrammeToggle);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedProgrammes({});
      toast.success(res.inserted > 0 ? `Created ${res.inserted} programmes` : "Programmes already set up");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set up programmes");
    } finally {
      setSeeding(false);
    }
  };

  const handleToggle = async (id: Doc<"diasporaProgrammes">["_id"], field: (typeof TOGGLE_FIELDS)[number]["field"], value: boolean) => {
    try {
      await updateToggle({ id, field, value });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update this setting");
    }
  };

  if (programmes === undefined) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  if (programmes.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Globe2 /></EmptyMedia>
          <EmptyTitle>Programmes not set up yet</EmptyTitle>
          <EmptyDescription>
            Create the five permanent Diaspora programmes (Own, Invest, Partner, Refer, Corporate) to start configuring the platform.
          </EmptyDescription>
        </EmptyHeader>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="mt-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 rounded-lg cursor-pointer disabled:opacity-60"
        >
          {seeding ? "Setting up…" : "Set Up Programmes"}
        </button>
      </Empty>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Programmes</h2>
        <p className="text-sm text-gray-500 mt-1">
          The five permanent Diaspora programmes. Each can be independently enabled, made public, opened to enquiries, featured, and opened for
          registration — no code changes required.
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {programmes.map((p) => {
          const Icon = PROGRAMME_ICONS[p.key];
          return (
            <div key={p._id} className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[var(--brand)]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{p.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {TOGGLE_FIELDS.map(({ field, label }) => (
                  <div key={field} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                    <Switch
                      checked={p[field]}
                      onCheckedChange={(checked) => handleToggle(p._id, field, checked)}
                      className="cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
