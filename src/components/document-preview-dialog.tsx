import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ChevronLeft, ChevronRight, Download, FileQuestion } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"]);

function getExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

// Preview a document by its file URL/name. Renders images inline, PDFs with
// a page-by-page react-pdf viewer, and falls back to a download link for any
// other file type (doc, docx, etc) that can't be rendered in-browser.
export function DocumentPreviewDialog({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null | undefined;
  fileName: string;
  title?: string;
}) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const ext = getExtension(fileName);
  const isImage = IMAGE_EXTENSIONS.has(ext);
  const isPdf = ext === "pdf";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) { setNumPages(0); setPageNumber(1); }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{title ?? fileName}</DialogTitle>
        </DialogHeader>

        {!fileUrl ? (
          <Skeleton className="h-96 w-full" />
        ) : isImage ? (
          <div className="flex justify-center bg-gray-50 rounded-lg p-4">
            <img src={fileUrl} alt={fileName} className="max-h-[70vh] w-auto object-contain rounded" />
          </div>
        ) : isPdf ? (
          <div className="space-y-3">
            <div className="max-h-[65vh] overflow-y-auto flex justify-center bg-gray-50 rounded-lg p-2">
              <Document
                file={fileUrl}
                onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPageNumber(1); }}
                loading={<Skeleton className="h-96 w-full" />}
                error={
                  <div className="flex flex-col items-center gap-2 py-12 text-sm text-gray-500">
                    <FileQuestion size={28} className="text-gray-400" />
                    Couldn't preview this file.
                  </div>
                }
              >
                <Page pageNumber={pageNumber} width={600} />
              </Document>
            </div>
            {numPages > 1 && (
              <div className="flex items-center justify-between">
                <Button type="button" variant="secondary" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>
                  <ChevronLeft size={14} /> Previous
                </Button>
                <p className="text-xs text-gray-500">Page {pageNumber} of {numPages}</p>
                <Button type="button" variant="secondary" size="sm" disabled={pageNumber >= numPages} onClick={() => setPageNumber((p) => p + 1)}>
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-gray-500">
            <FileQuestion size={28} className="text-gray-400" />
            Preview isn't available for this file type.
          </div>
        )}

        <a href={fileUrl ?? undefined} target="_blank" rel="noreferrer" className="inline-flex">
          <Button type="button" variant="secondary" size="sm" className="gap-2" disabled={!fileUrl}>
            <Download size={14} /> Download
          </Button>
        </a>
      </DialogContent>
    </Dialog>
  );
}
