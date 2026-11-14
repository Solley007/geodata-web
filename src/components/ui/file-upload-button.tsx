import { useRef, useState } from "react";
import { useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Upload, X, ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { cn } from "@/lib/utils.ts";

type FileUploadButtonProps = {
  accept?: string;
  label?: string;
  currentStorageId?: Id<"_storage"> | null;
  currentUrl?: string | null;
  onUpload: (storageId: Id<"_storage">, url?: string, fileName?: string) => void;
  onClear?: () => void;
  variant?: "button" | "dropzone";
  mediaType?: "image" | "video" | "any";
  /** Allow picking several files at once (button variant) */
  multiple?: boolean;
  className?: string;
};

export function FileUploadButton({
  accept,
  label = "Upload File",
  currentStorageId,
  currentUrl,
  onUpload,
  onClear,
  variant = "button",
  mediaType = "any",
  multiple = false,
  className,
}: FileUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.cms.generateUploadUrl);
  const convex = useConvex();

  const resolvedAccept = accept ?? (
    mediaType === "image" ? "image/*" :
    mediaType === "video" ? "video/*" :
    "image/*,video/*"
  );

  const uploadOne = async (file: File) => {
    const uploadUrl = await generateUploadUrl();
    const res = await fetch(uploadUrl, {
      method: "POST",
      // Some formats (e.g. .dwg, .heic) report no type, so fall back to a generic one
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) throw new Error("Upload failed");
    const { storageId } = await res.json() as { storageId: Id<"_storage"> };
    // Fetch the CDN URL immediately so callers can show a preview
    const url = await convex.query(api.cms.getFileUrl, { storageId });
    onUpload(storageId, url ?? undefined, file.name);
  };

  // Files upload one after another; a failure skips that file and continues
  const handleFiles = async (files: File[]) => {
    setUploading(true);
    let done = 0;
    for (const file of files) {
      try {
        await uploadOne(file);
        done++;
      } catch {
        toast.error(`Upload failed for ${file.name}`);
      }
    }
    if (done > 0) toast.success(done === 1 ? "Uploaded successfully" : `${done} files uploaded`);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) void handleFiles(multiple ? files : files.slice(0, 1));
  };

  const icon = mediaType === "video" ? <Video size={14} /> : <ImageIcon size={14} />;

  if (variant === "dropzone") {
    return (
      <div className={cn("relative", className)}>
        <input
          ref={inputRef}
          type="file"
          accept={resolvedAccept}
          onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          disabled={uploading}
        />
        {currentUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
            {mediaType === "video" || (currentUrl && currentUrl.includes("video")) ? (
              <video src={currentUrl} className="w-full h-40 object-cover" />
            ) : (
              <img src={currentUrl} alt="Preview" className="w-full h-40 object-cover" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <span className="text-white text-xs font-medium z-20 relative">Click to replace</span>
            </div>
            {onClear && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow z-20"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ) : (
          <div className={cn(
            "border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 py-8 text-sm text-gray-400 hover:border-[var(--brand)]/50 hover:text-[var(--brand)] transition-colors cursor-pointer",
            uploading && "opacity-60 pointer-events-none"
          )}>
            {uploading ? <Spinner className="size-5" /> : icon}
            <span>{uploading ? "Uploading…" : label}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={resolvedAccept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
        disabled={uploading}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="gap-1.5"
      >
        {uploading ? <Spinner className="size-3" /> : <Upload size={13} />}
        {uploading ? "Uploading…" : label}
      </Button>
      {(currentUrl || currentStorageId) && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-red-500 hover:text-red-700 transition-colors"
          title="Remove"
        >
          <X size={15} />
        </button>
      )}
      {currentUrl && (
        <span className="text-xs text-gray-400 truncate max-w-[120px]">File attached</span>
      )}
    </div>
  );
}
