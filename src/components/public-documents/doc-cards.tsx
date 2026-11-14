import { toast } from "sonner";
import { Copy, Download, Eye, FileText, Lock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { fileExtension, previewKind, shareTargets, shareUrl, type PublicDoc } from "@/lib/public-documents.ts";

// Shared by /downloads and /diaspora/downloads. `basePath` decides where share links point.

export function ShareMenu({ doc, basePath }: { doc: PublicDoc; basePath: string }) {
  const url = shareUrl(doc._id, basePath);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    catch { toast.error("Could not copy the link"); }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="cursor-pointer"><Share2 size={14} /> Share</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copy} className="cursor-pointer"><Copy size={14} /> Copy link</DropdownMenuItem>
        {shareTargets(url, doc.title).map((t) => (
          <DropdownMenuItem key={t.label} asChild className="cursor-pointer">
            <a href={t.href} target="_blank" rel="noopener noreferrer">{t.label}</a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type CardProps = { doc: PublicDoc; basePath: string; onView: () => void; onDownload: () => void };

export function DocCard({ doc, basePath, onView, onDownload }: CardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex h-36 items-center justify-center bg-muted">
        {doc.coverUrl ? <img src={doc.coverUrl} alt={doc.title} className="h-full w-full object-cover" /> : <FileText size={40} className="text-muted-foreground" />}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{doc.category}</Badge>
          <Badge variant="secondary" className="uppercase">{fileExtension(doc.fileName) || "file"}</Badge>
          {doc.featured && <Badge>Featured</Badge>}
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-semibold">{doc.title}</h3>
          {doc.description && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{doc.description}</p>}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-1 pt-2">
          {doc.locked ? (
            <div className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock size={12} /> Sign in to open</span>
              <SignInButton />
            </div>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={onView} className="cursor-pointer"><Eye size={14} /> View</Button>
              <Button size="sm" onClick={onDownload} className="cursor-pointer"><Download size={14} /> Download</Button>
              <ShareMenu doc={doc} basePath={basePath} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type ViewerProps = { doc: PublicDoc | null; basePath: string; onClose: () => void; onDownload: () => void };

export function DocViewer({ doc, basePath, onClose, onDownload }: ViewerProps) {
  const kind = doc ? previewKind(doc.fileName) : "none";
  return (
    <Dialog open={!!doc} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle className="pr-6">{doc?.title}</DialogTitle></DialogHeader>
        {doc?.fileUrl && kind === "pdf" && <iframe src={doc.fileUrl} title={doc.title} className="h-[70vh] w-full rounded-lg border" />}
        {doc?.fileUrl && kind === "image" && <img src={doc.fileUrl} alt={doc.title} className="max-h-[70vh] w-full rounded-lg object-contain" />}
        {kind === "none" && (
          <p className="py-8 text-center text-sm text-muted-foreground">This file type cannot be previewed here. Please download it to open it.</p>
        )}
        <div className="flex justify-end gap-2">
          {doc && <ShareMenu doc={doc} basePath={basePath} />}
          <Button onClick={onDownload} className="cursor-pointer"><Download size={14} /> Download</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
