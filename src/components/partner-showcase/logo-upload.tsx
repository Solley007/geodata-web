import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { LOGO_ACCEPT, LOGO_MAX_BYTES } from "@/lib/partner-showcase.ts";

type Props = {
  label: string;
  hint: string;
  /** Dark preview tile for the white/mono logo */
  dark?: boolean;
  previewUrl: string | null;
  onUploaded: (storageId: Id<"_storage">, previewUrl: string) => void;
  onClear: () => void;
};

export default function LogoUpload({ label, hint, dark, previewUrl, onUploaded, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.partnerProfiles.generateLogoUploadUrl);

  const handleFile = async (file: File) => {
    if (!LOGO_ACCEPT.split(",").includes(file.type)) {
      toast.error("Please upload a PNG, SVG or WebP logo.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("Logo must be 2 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      onUploaded(storageId, URL.createObjectURL(file));
    } catch {
      toast.error("Could not upload the logo. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <div
        className={cn(
          "relative flex h-32 items-center justify-center rounded-xl border-2 border-dashed p-4",
          dark ? "border-slate-600 bg-[#0b1d3f]" : "border-gray-200 bg-white",
        )}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt={`${label} preview`} className="max-h-20 max-w-[80%] object-contain" />
            <button
              type="button"
              onClick={onClear}
              aria-label={`Remove ${label}`}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 cursor-pointer"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center gap-1.5 text-xs cursor-pointer",
              dark ? "text-slate-300" : "text-gray-500",
            )}
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            {uploading ? "Uploading…" : "Upload logo"}
          </button>
        )}
        {previewUrl && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={cn("absolute bottom-2 right-2 text-[11px] underline cursor-pointer", dark ? "text-slate-300" : "text-gray-500")}
          >
            {uploading ? "Uploading…" : "Replace"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={LOGO_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  );
}
