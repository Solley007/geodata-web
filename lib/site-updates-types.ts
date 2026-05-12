// ---------------------------------------------------------------------------
// Site Update types — published updates from active construction sites
// Used in both server (admin API) and client (gallery, feed page).
// ---------------------------------------------------------------------------

export type UpdateMediaType = "photo" | "video" | "gallery";

export interface SiteUpdate {
  id:          string;          // unique generated id
  slug:        string;          // URL slug (e.g. "2026-05-11-sbc-columns-complete")
  date:        string;          // ISO YYYY-MM-DD
  title:       string;
  body:        string;          // plain text, line breaks preserved
  projectSlug: string;          // links to a project in projects-data.ts
  mediaType:   UpdateMediaType;

  // All assets are Cloudinary URLs (or in some cases external photos for testing)
  coverImage:  string;          // always required — used as card thumbnail
  videoUrl?:   string;          // Cloudinary video URL if mediaType === "video"
  gallery?:    string[];        // additional photo URLs if mediaType === "gallery"
}

/** Convert a title + date to a URL-safe slug */
export function generateSlug(title: string, date: string): string {
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${date}-${titleSlug}`;
}

/** Format YYYY-MM-DD to "11 May 2026" */
export function formatUpdateDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Cloudinary video URLs need this transform for in-browser playback */
export function cloudinaryVideoPoster(videoUrl: string): string {
  // https://res.cloudinary.com/{cloud}/video/upload/{path}.mp4
  // becomes
  // https://res.cloudinary.com/{cloud}/video/upload/so_0/{path}.jpg
  return videoUrl
    .replace(/\.(mp4|mov|webm|avi)$/i, ".jpg")
    .replace("/upload/", "/upload/so_0/");
}
