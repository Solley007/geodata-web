import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

export type PendingFile = { storageId: Id<"_storage">; fileName: string };

// Uploads chat attachments to Convex file storage and tracks them until sent
export function useTeamUpload() {
  const generateUploadUrl = useMutation(api.cms.generateUploadUrl);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        const url = await generateUploadUrl();
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        if (!res.ok) throw new Error("upload failed");
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        setFiles((f) => [...f, { storageId, fileName: file.name }]);
      }
    } catch {
      toast.error("Could not upload the file");
    } finally {
      setUploading(false);
    }
  };

  return { files, uploading, addFiles, removeFile: (i: number) => setFiles((f) => f.filter((_, x) => x !== i)), clear: () => setFiles([]) };
}
