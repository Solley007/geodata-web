import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { ExternalLink, EyeOff, FileText, Lock, Plus } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { fileExtension } from "@/lib/public-documents.ts";

/** Pick which uploaded documents appear on the public /diaspora/downloads page. */
export default function DiasporaDownloadsPanel() {
  const docs = useQuery(api.publicDocuments.listAll, {});
  const setVisible = useMutation(api.publicDocuments.setDiasporaVisible);

  const toggle = async (id: Id<"publicDocuments">, on: boolean) => {
    try {
      await setVisible({ documentId: id, diasporaVisible: on });
      toast.success(on ? "Added to Diaspora downloads" : "Removed from Diaspora downloads");
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Could not update document");
    }
  };

  const selected = docs?.filter((d) => d.diasporaVisible).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <p className="font-semibold">Diaspora downloads</p>
          <p className="text-sm text-muted-foreground">
            Switch on the documents visitors should see on the Diaspora downloads page. {docs !== undefined && `${selected} selected.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" asChild className="cursor-pointer">
            <Link to="/diaspora/downloads" target="_blank"><ExternalLink size={14} /> Preview page</Link>
          </Button>
          <Button size="sm" asChild className="cursor-pointer">
            <Link to="/admin/public-documents"><Plus size={14} /> Upload document</Link>
          </Button>
        </div>
      </div>

      {docs === undefined ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : docs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileText /></EmptyMedia>
            <EmptyTitle>No documents uploaded yet</EmptyTitle>
            <EmptyDescription>Upload brochures, price schedules or forms first, then select them here.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" asChild className="cursor-pointer"><Link to="/admin/public-documents">Upload document</Link></Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {docs.map((d) => (
            <div key={d._id} className="flex items-center gap-3 p-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {d.coverUrl ? <img src={d.coverUrl} alt="" className="h-full w-full object-cover" /> : <FileText size={18} className="text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate font-medium">{d.title}</p>
                  {!d.visible && <Badge variant="secondary" className="gap-1"><EyeOff size={10} /> Hidden</Badge>}
                  {d.access === "signin" && <Badge variant="secondary" className="gap-1"><Lock size={10} /> Sign-in only</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {d.category} · {fileExtension(d.fileName).toUpperCase() || "FILE"} · {d.downloadCount} downloads
                  {!d.visible && " · switch on “Visible” in Public Documents for it to appear"}
                </p>
              </div>
              <Switch
                checked={d.diasporaVisible === true}
                onCheckedChange={(c) => void toggle(d._id, c)}
                aria-label={`Show ${d.title} on Diaspora downloads`}
                className="cursor-pointer"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
