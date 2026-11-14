import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Eye, Globe2, MousePointerClick } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import ProfileForm from "@/components/partner-showcase/profile-form.tsx";
import { PARTNER_CATEGORY_LABELS, type PresentedProfileContent } from "@/lib/partner-showcase.ts";

function LivePreview({ live }: { live: PresentedProfileContent }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-gray-50 p-2">
        {live.logoUrl ? (
          <img src={live.logoUrl} alt={`${live.displayName} logo`} className="max-h-12 max-w-full object-contain" />
        ) : (
          <span className="text-lg font-bold text-gray-400">{live.displayName.charAt(0)}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-gray-900">{live.displayName}</p>
        <p className="text-xs text-gray-500">{PARTNER_CATEGORY_LABELS[live.category]}{live.country ? ` · ${live.country}` : ""}</p>
        {live.tagline && <p className="mt-1 truncate text-sm text-gray-600">{live.tagline}</p>}
      </div>
    </div>
  );
}

export default function ShowcaseProfileTab({ defaultName }: { defaultName: string }) {
  const profile = useQuery(api.partnerProfiles.getMyProfile, {});
  const submit = useMutation(api.partnerProfiles.submitMyProfile);
  const withdraw = useMutation(api.partnerProfiles.withdrawMyChanges);

  if (profile === undefined) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  // Edit the pending draft if one exists, otherwise start from the live version
  const draft = profile?.pending ?? profile?.live ?? null;
  const status = profile?.reviewStatus ?? "none";

  const handleSubmit = async (content: Parameters<typeof submit>[0]["content"]) => {
    try {
      await submit({ content });
      toast.success("Submitted for review. We'll notify you once it's approved.");
    } catch (err) {
      toast.error(err instanceof ConvexError ? (err.data as { message: string }).message : "Could not submit your profile.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Showcase profile:</strong> once approved, your logo can appear in our Trusted Partners section on the
        website and Diaspora page, linking to your own partner profile. Every change is reviewed by our team first —
        your current approved version stays visible until then.
      </div>

      {profile?.delisted && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <strong>Your listing is currently hidden from the website.</strong>
          {profile.delistReason ? ` ${profile.delistReason}.` : ""} You can still update your details — they'll show again once you're relisted.
        </div>
      )}

      {status === "pending" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm text-amber-800">
            <Clock size={16} /> Changes submitted{profile?.submittedAt ? ` on ${format(new Date(profile.submittedAt), "dd MMM yyyy")}` : ""} — awaiting review.
          </p>
          <Button size="sm" variant="ghost" className="cursor-pointer text-amber-800 hover:bg-amber-100" onClick={() => void withdraw({})}>
            Withdraw changes
          </Button>
        </div>
      )}
      {status === "rejected" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> Changes not approved</p>
          {profile?.rejectionReason && <p className="mt-1">{profile.rejectionReason}</p>}
          <p className="mt-1 text-red-600">Update the details below and submit again.</p>
        </div>
      )}

      {profile?.live && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-green-700">
            <CheckCircle2 size={13} /> Approved version
          </p>
          <LivePreview live={profile.live} />
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Profile views", value: profile.stats.profileViews, icon: Eye },
              { label: "Logo clicks", value: profile.stats.logoClicks, icon: MousePointerClick },
              { label: "Website clicks", value: profile.stats.websiteClicks, icon: ExternalLink },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                <s.icon size={14} className="mx-auto mb-1 text-[var(--brand)]" />
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
          <a href={`/partners/${profile.placement.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--brand)] hover:underline cursor-pointer">
            View my public profile <ExternalLink size={11} />
          </a>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
          <Globe2 size={16} className="text-[var(--brand)]" />
          {profile?.live ? "Edit showcase profile" : "Create your showcase profile"}
        </p>
        {/* key resets the form when the server copy changes (e.g. after approval/withdraw) */}
        <ProfileForm
          key={`${status}-${profile?.submittedAt ?? ""}-${profile?.reviewedAt ?? ""}`}
          initial={draft}
          defaultName={defaultName}
          submitLabel={status === "pending" ? "Update submission" : "Submit for review"}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
