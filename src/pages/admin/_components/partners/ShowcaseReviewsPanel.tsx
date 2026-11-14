import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowRight, Building2, CheckCircle2, ExternalLink, ImageOff, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import { PARTNER_CATEGORY_LABELS, type PresentedProfileContent } from "@/lib/partner-showcase.ts";

function errMsg(err: unknown, fallback: string) {
  return err instanceof ConvexError ? (err.data as { message: string }).message : fallback;
}

/** Side-by-side card for one version (current live or proposed). */
export function ProfileVersionCard({ title, content, tone }: { title: string; content: PresentedProfileContent | null; tone: "live" | "pending" }) {
  return (
    <div className={cn("flex-1 space-y-3 rounded-xl border p-4", tone === "pending" ? "border-amber-200 bg-amber-50/40" : "border-gray-100 bg-gray-50")}>
      <p className={cn("text-xs font-semibold uppercase tracking-wide", tone === "pending" ? "text-amber-700" : "text-gray-500")}>{title}</p>
      {!content ? (
        <p className="text-sm italic text-gray-400">Not listed yet</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex h-20 items-center justify-center rounded-lg border border-gray-100 bg-white p-2">
              {content.logoUrl ? <img src={content.logoUrl} alt="Main logo" className="max-h-14 max-w-full object-contain" /> : <ImageOff size={18} className="text-gray-300" />}
            </div>
            <div className="flex h-20 items-center justify-center rounded-lg bg-[#0b1d3f] p-2">
              {content.logoLightUrl ? <img src={content.logoLightUrl} alt="White logo" className="max-h-14 max-w-full object-contain" /> : <ImageOff size={18} className="text-slate-500" />}
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-gray-900">{content.displayName}</p>
            <p className="text-xs text-gray-500">{PARTNER_CATEGORY_LABELS[content.category]}{content.country ? ` · ${content.country}` : ""}</p>
            {content.tagline && <p className="text-gray-700">{content.tagline}</p>}
            {content.description && <p className="whitespace-pre-line text-xs text-gray-600">{content.description}</p>}
            {content.website && (
              <a href={content.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-xs text-[var(--brand)] hover:underline">
                {content.website} <ExternalLink size={10} />
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RejectDialog({ profileId, onClose }: { profileId: Id<"partnerProfiles"> | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const reject = useMutation(api.partnerProfiles.rejectChanges);
  const handle = async () => {
    if (!profileId) return;
    try {
      await reject({ profileId, reason });
      toast.success("Changes rejected — the partner has been told why.");
      setReason("");
      onClose();
    } catch (err) {
      toast.error(errMsg(err, "Could not reject changes."));
    }
  };
  return (
    <Dialog open={!!profileId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reject showcase changes</DialogTitle></DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Please upload a logo with a transparent background." />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="cursor-pointer">Cancel</Button>
          <Button onClick={() => void handle()} disabled={!reason.trim()} className="cursor-pointer bg-red-600 text-white hover:bg-red-700">Reject</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ShowcaseReviewsPanel() {
  const rows = useQuery(api.partnerProfiles.listPendingReviews, {});
  const approve = useMutation(api.partnerProfiles.approveChanges);
  const [rejecting, setRejecting] = useState<Id<"partnerProfiles"> | null>(null);

  if (rows === undefined) {
    return <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}</div>;
  }
  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Sparkles /></EmptyMedia>
          <EmptyTitle>No showcase changes to review</EmptyTitle>
          <EmptyDescription>When partners submit or update their logo and profile, they'll appear here for approval.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r._id} className="space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{r.partnerName}</p>
              {r.partnerType === "company" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"><Building2 size={10} /> Company</span>
              )}
              <span className="text-xs text-gray-400">{r.live ? "Update to existing listing" : "New listing"}</span>
            </div>
            {r.submittedAt && <span className="text-xs text-gray-400">Submitted {format(new Date(r.submittedAt), "dd MMM yyyy, h:mm a")}</span>}
          </div>
          <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            <ProfileVersionCard title="Currently live" content={r.live} tone="live" />
            <ArrowRight size={18} className="mx-auto shrink-0 rotate-90 text-gray-300 md:rotate-0" />
            <ProfileVersionCard title="Proposed" content={r.pending} tone="pending" />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRejecting(r._id)} className="cursor-pointer gap-1.5 text-red-600 hover:bg-red-50">
              <XCircle size={14} /> Reject
            </Button>
            <Button
              size="sm"
              onClick={() => {
                approve({ profileId: r._id })
                  .then(() => toast.success("Approved — the new version is now live."))
                  .catch((err: unknown) => toast.error(errMsg(err, "Could not approve.")));
              }}
              className="cursor-pointer gap-1.5 bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle2 size={14} /> Approve
            </Button>
          </div>
        </div>
      ))}
      <RejectDialog profileId={rejecting} onClose={() => setRejecting(null)} />
    </div>
  );
}
