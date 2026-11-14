import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { BadgeCheck, Eye, ExternalLink, ImageOff, LayoutGrid, MousePointerClick, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import { PARTNER_CATEGORY_LABELS } from "@/lib/partner-showcase.ts";

type PlacementField = "showHomepage" | "showDiaspora" | "showDirectory" | "featured" | "verified";

const TOGGLES: Array<{ field: PlacementField; label: string }> = [
  { field: "showHomepage", label: "Homepage" },
  { field: "showDiaspora", label: "Diaspora" },
  { field: "showDirectory", label: "Partners page" },
  { field: "featured", label: "Featured" },
  { field: "verified", label: "Verified" },
];

function SortOrderInput({ profileId, value }: { profileId: Id<"partnerProfiles">; value: number }) {
  const [draft, setDraft] = useState(String(value));
  const update = useMutation(api.partnerProfiles.updatePlacement);
  const commit = () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < 0 || n === value) { setDraft(String(value)); return; }
    update({ profileId, sortOrder: Math.round(n) }).catch(() => {
      toast.error("Could not update order.");
      setDraft(String(value));
    });
  };
  return (
    <Input
      type="number"
      min={0}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      aria-label="Display order"
      className="h-8 w-20 text-sm"
    />
  );
}

/** Admin manager for where each approved partner logo appears. */
export default function ShowcaseListingsPanel() {
  const rows = useQuery(api.partnerProfiles.listAllForAdmin, {});
  const update = useMutation(api.partnerProfiles.updatePlacement);

  const toggle = (profileId: Id<"partnerProfiles">, field: PlacementField, value: boolean) => {
    update({ profileId, [field]: value }).catch((err: unknown) =>
      toast.error(err instanceof ConvexError ? (err.data as { message: string }).message : "Could not update listing."),
    );
  };

  if (rows === undefined) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;
  }
  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><LayoutGrid /></EmptyMedia>
          <EmptyTitle>No showcase listings yet</EmptyTitle>
          <EmptyDescription>Approved partner profiles appear here so you can choose where their logos show.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Lower order numbers show first; Featured partners always lead. Suspended partners are hidden everywhere automatically.
      </p>
      {rows.map((r) => {
        const inactive = r.partnerStatus !== "approved";
        return (
          <div key={r._id} className={cn("rounded-xl border bg-white p-4 shadow-sm", inactive ? "border-red-100 bg-red-50/30" : "border-gray-100")}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 p-2">
                {r.logoUrl ? <img src={r.logoUrl} alt={`${r.displayName} logo`} className="max-h-10 max-w-full object-contain" /> : <ImageOff size={16} className="text-gray-300" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-gray-900">{r.displayName}</p>
                  {r.verified && <BadgeCheck size={14} className="text-[var(--brand)]" />}
                  {r.featured && <Star size={13} className="fill-amber-400 text-amber-400" />}
                  {!r.hasLive && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">Not approved yet</span>}
                  {r.reviewStatus === "pending" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">Changes pending</span>}
                  {r.delisted && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] text-gray-700">Delisted · hidden</span>}
                  {inactive && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-700 capitalize">Partner {r.partnerStatus} · hidden</span>}
                </div>
                <p className="text-xs text-gray-500">{PARTNER_CATEGORY_LABELS[r.category]} · {r.partnerName}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1"><Eye size={11} /> {r.stats.profileViews} views</span>
                  <span className="inline-flex items-center gap-1"><MousePointerClick size={11} /> {r.stats.logoClicks} logo clicks</span>
                  <span className="inline-flex items-center gap-1"><ExternalLink size={11} /> {r.stats.websiteClicks} website clicks</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Order</span>
                <SortOrderInput key={r.sortOrder} profileId={r._id} value={r.sortOrder} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-50 pt-3">
              {TOGGLES.map((t) => (
                <label key={t.field} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <Switch
                    checked={r[t.field]}
                    disabled={!r.hasLive && t.field !== "verified" && t.field !== "featured"}
                    onCheckedChange={(v) => toggle(r._id, t.field, v)}
                    className="cursor-pointer"
                  />
                  {t.label}
                </label>
              ))}
              {r.hasLive && r.showDirectory && !inactive && !r.delisted && (
                <a href={`/partners/${r.slug}`} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--brand)] hover:underline cursor-pointer">
                  View profile <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
