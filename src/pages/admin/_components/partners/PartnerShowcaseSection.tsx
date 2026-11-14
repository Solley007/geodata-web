import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Clock, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import ProfileForm from "@/components/partner-showcase/profile-form.tsx";
import { ProfileVersionCard } from "./ShowcaseReviewsPanel.tsx";

/** Showcase section inside the admin partner drawer — view live, edit directly. */
export default function PartnerShowcaseSection({ partnerId, defaultName }: { partnerId: Id<"partners">; defaultName: string }) {
  const profile = useQuery(api.partnerProfiles.getForPartner, { partnerId });
  const save = useMutation(api.partnerProfiles.adminSaveProfile);
  const [editing, setEditing] = useState(false);

  if (profile === undefined) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Showcase listing</p>
        <Button size="sm" variant="ghost" onClick={() => setEditing((e) => !e)} className="cursor-pointer gap-1.5 text-xs">
          {editing ? <><X size={13} /> Close</> : <><Pencil size={13} /> {profile?.live ? "Edit" : "Create"}</>}
        </Button>
      </div>
      {profile?.reviewStatus === "pending" && (
        <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Clock size={12} /> This partner has changes awaiting review in the Showcase tab.
        </p>
      )}
      {editing ? (
        <div className="rounded-xl border border-gray-100 p-4">
          <ProfileForm
            initial={profile?.live ?? null}
            defaultName={defaultName}
            submitLabel="Save & publish"
            onSubmit={async (content) => {
              try {
                await save({ partnerId, content });
                toast.success("Showcase profile saved and live.");
                setEditing(false);
              } catch (err) {
                toast.error(err instanceof ConvexError ? (err.data as { message: string }).message : "Could not save.");
              }
            }}
          />
        </div>
      ) : (
        <ProfileVersionCard title="Live" content={profile?.live ?? null} tone="live" />
      )}
    </div>
  );
}
