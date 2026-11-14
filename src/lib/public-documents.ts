export const DOC_CATEGORIES = [
  "Company Profile",
  "Brochures",
  "Price Lists",
  "Estate Maps",
  "Policies",
  "Annual Reports",
  "Forms",
  "Other",
] as const;

export type DocAccess = "public" | "signin";

export type PublicDoc = {
  _id: string;
  title: string;
  description: string | null;
  category: string;
  fileName: string;
  access: DocAccess;
  featured: boolean;
  fileUrl: string | null;
  coverUrl: string | null;
  locked: boolean;
};

export function fileExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i + 1).toLowerCase() : "";
}

// Only PDFs and images can be previewed inside the page; others are download-only
export function previewKind(fileName: string): "pdf" | "image" | "none" {
  const ext = fileExtension(fileName);
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  return "none";
}

export function shareUrl(docId: string, basePath = "/downloads"): string {
  return `${window.location.origin}${basePath}?doc=${docId}`;
}

export function shareTargets(url: string, title: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return [
    { label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { label: "Email", href: `mailto:?subject=${t}&body=${u}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  ];
}

// Fetch then save so the file keeps its proper name; fall back to opening the link
export async function downloadFile(url: string, fileName: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blobUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}
