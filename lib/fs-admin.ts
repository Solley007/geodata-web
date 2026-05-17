// ---------------------------------------------------------------------------
// Local filesystem helpers for construction update admin
// ---------------------------------------------------------------------------
// Images are saved to /public/construction/
// Metadata is stored in /public/construction-updates.json
//
// This works in development (local) mode. After adding photos via the admin
// page, commit and push to deploy: git add . && git commit -m "..." && git push
// ---------------------------------------------------------------------------

import fs   from "fs";
import path from "path";
import type { PropertyPhase } from "./property-data";

export interface ConstructionUpdate {
  id:           string;
  phase:        PropertyPhase;
  date:         string;
  caption:      string;
  imageUrl:     string;
  propertySlug: string;
}

const PUBLIC_DIR  = path.join(process.cwd(), "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "construction");
const META_FILE   = path.join(PUBLIC_DIR, "construction-updates.json");

/** Read all updates from the JSON file */
export function readUpdates(): ConstructionUpdate[] {
  try {
    const raw = fs.readFileSync(META_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Write the full updates array to the JSON file */
export function writeUpdates(updates: ConstructionUpdate[]): void {
  fs.mkdirSync(path.dirname(META_FILE), { recursive: true });
  fs.writeFileSync(META_FILE, JSON.stringify(updates, null, 2), "utf-8");
}

/** Save an uploaded image buffer to /public/construction/, return its public path */
export function saveImage(
  buffer: Buffer,
  mimeType: string,
  slug:  string,
  phase: string
): string {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const ext       = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const timestamp = Date.now();
  const filename  = `${phase.toLowerCase()}-${slug}-${timestamp}.${ext}`;
  const filepath  = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return `/construction/${filename}`;
}

/** Delete an image file by its public path */
export function deleteImageFile(publicPath: string): void {
  try {
    const filepath = path.join(PUBLIC_DIR, publicPath);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch {}
}
