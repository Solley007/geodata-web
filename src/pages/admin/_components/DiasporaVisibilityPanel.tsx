import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { Globe2, Home, TrendingUp, Handshake, Users, Building } from "lucide-react";
import { Switch } from "@/components/ui/switch.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

/**
 * Embedded inside the existing property edit form (never a separate property
 * editor). Lets an existing property/opportunity be surfaced on the public
 * Diaspora platform — visibility only, the property record itself is never
 * duplicated. Only rendered when editing an existing property, since the
 * toggles need a saved `propertyId` to patch.
 */

type ProgrammeKey = NonNullable<Doc<"properties">["diasporaProgrammeKeys"]>[number];

const PROGRAMME_OPTIONS: Array<{ key: ProgrammeKey; label: string; icon: React.ElementType }> = [
  { key: "own", label: "Own", icon: Home },
  { key: "invest", label: "Invest", icon: TrendingUp },
  { key: "partner", label: "Partner", icon: Handshake },
  { key: "refer", label: "Refer", icon: Users },
  { key: "corporate", label: "Corporate", icon: Building },
];

export default function DiasporaVisibilityPanel({ propertyId }: { propertyId: Id<"properties"> }) {
  const feature = useQuery(api.diaspora.feature.getFeatureStatus, {});
  const visibility = useQuery(api.diaspora.properties.getPropertyVisibility, { propertyId });
  const campaignOptions = useQuery(api.diaspora.campaigns.listCampaignOptions, {});
  const updateToggle = useMutation(api.diaspora.properties.updatePropertyVisibilityToggle);
  const updateProgrammeKeys = useMutation(api.diaspora.properties.updatePropertyProgrammeKeys);
  const updateCampaignIds = useMutation(api.diaspora.properties.updatePropertyCampaignIds);

  const [savingCampaigns, setSavingCampaigns] = useState(false);

  if (feature === undefined || visibility === undefined) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  if (visibility === null) return null;

  const handleToggle = async (field: "diasporaVisible" | "diasporaFeatured" | "diasporaEnquiriesOpen", value: boolean) => {
    try {
      await updateToggle({ propertyId, field, value });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update this setting");
    }
  };

  const toggleProgramme = async (key: ProgrammeKey) => {
    const next = visibility.diasporaProgrammeKeys.includes(key)
      ? visibility.diasporaProgrammeKeys.filter((k) => k !== key)
      : [...visibility.diasporaProgrammeKeys, key];
    try {
      await updateProgrammeKeys({ propertyId, programmeKeys: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update programmes");
    }
  };

  const toggleCampaign = async (campaignId: Id<"diasporaCampaigns">) => {
    const next = visibility.diasporaCampaignIds.includes(campaignId)
      ? visibility.diasporaCampaignIds.filter((id) => id !== campaignId)
      : [...visibility.diasporaCampaignIds, campaignId];
    setSavingCampaigns(true);
    try {
      await updateCampaignIds({ propertyId, campaignIds: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update campaigns");
    } finally {
      setSavingCampaigns(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Globe2 size={14} className="text-[var(--brand)]" />
        <span className="text-xs font-semibold text-gray-700">Diaspora Platform Visibility</span>
        {!feature.enabled && (
          <span className="text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">Platform is OFF</span>
        )}
      </div>
      <p className="text-[11px] text-gray-400">
        Controls whether this property appears on the public Diaspora Investment &amp; Property Platform. Turning it off never deletes or hides
        it from your regular listings.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
          <span className="text-xs font-medium text-gray-600">Visible</span>
          <Switch checked={visibility.diasporaVisible} onCheckedChange={(v) => handleToggle("diasporaVisible", v)} className="cursor-pointer" />
        </div>
        <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
          <span className="text-xs font-medium text-gray-600">Featured</span>
          <Switch checked={visibility.diasporaFeatured} onCheckedChange={(v) => handleToggle("diasporaFeatured", v)} className="cursor-pointer" />
        </div>
        <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
          <span className="text-xs font-medium text-gray-600">Enquiries Open</span>
          <Switch checked={visibility.diasporaEnquiriesOpen} onCheckedChange={(v) => handleToggle("diasporaEnquiriesOpen", v)} className="cursor-pointer" />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1.5">Show under Programmes</p>
        <div className="flex flex-wrap gap-2">
          {PROGRAMME_OPTIONS.map(({ key, label, icon: Icon }) => {
            const selected = visibility.diasporaProgrammeKeys.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleProgramme(key)}
                className={cn(
                  "text-xs font-medium rounded-full px-3 py-1.5 border cursor-pointer transition-colors flex items-center gap-1.5",
                  selected ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                )}
              >
                <Icon size={12} /> {label}
              </button>
            );
          })}
        </div>
      </div>

      {campaignOptions !== undefined && campaignOptions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1.5">Show under Campaigns</p>
          <div className="flex flex-wrap gap-2">
            {campaignOptions.map((c) => {
              const selected = visibility.diasporaCampaignIds.includes(c._id);
              return (
                <button
                  key={c._id}
                  type="button"
                  disabled={savingCampaigns}
                  onClick={() => toggleCampaign(c._id)}
                  className={cn(
                    "text-xs font-medium rounded-full px-3 py-1.5 border cursor-pointer transition-colors disabled:opacity-60",
                    selected ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                  )}
                >
                  {c.name} ({c.code})
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
