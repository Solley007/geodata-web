// Public HTTP actions URL for our Convex deployment (share links, QR codes, webhooks).
export const CONVEX_SITE_URL: string =
  import.meta.env.VITE_CONVEX_SITE_URL ??
  (import.meta.env.VITE_CONVEX_URL ?? "").replace(".convex.cloud", ".convex.site");
