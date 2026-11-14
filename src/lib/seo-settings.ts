// Shared types and parsers for the admin-managed SEO settings. Stored as JSON
// strings in the `siteSettings` table under the keys below.

export const SEO_PAGES_KEY = "seo_pages";
export const SEO_ORG_KEY = "seo_organisation";
export const SEO_TRACKING_KEY = "seo_tracking";

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

/** Public pages whose title/description editors can override. */
export const SEO_PAGE_LIST = [
  { path: "/", label: "Home" },
  { path: "/real-estate", label: "Real Estate home" },
  { path: "/about", label: "About" },
  { path: "/contact", label: "Contact" },
  { path: "/services", label: "Services" },
  { path: "/properties", label: "Properties" },
  { path: "/news", label: "News" },
  { path: "/gallery", label: "Gallery" },
  { path: "/track-record", label: "Track record" },
  { path: "/downloads", label: "Downloads" },
  { path: "/group", label: "Group businesses" },
  { path: "/diaspora", label: "Diaspora" },
] as const;

export type SeoPageOverride = { title: string; description: string };
export type SeoPagesMap = Record<string, SeoPageOverride>;

export type SeoOrganisation = {
  name: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
  socials: string[];
};

export type SeoTracking = {
  ga4Id: string;
  gtmId: string;
  metaPixelId: string;
};

export const ORG_DEFAULTS: SeoOrganisation = {
  name: "",
  logoUrl: "",
  phone: "",
  email: "",
  address: "",
  socials: [],
};

export const TRACKING_DEFAULTS: SeoTracking = { ga4Id: "", gtmId: "", metaPixelId: "" };

// Strict formats: IDs are injected into script code, so anything else is rejected.
export const GA4_PATTERN = /^G-[A-Z0-9]{4,20}$/;
export const GTM_PATTERN = /^GTM-[A-Z0-9]{4,20}$/;
export const PIXEL_PATTERN = /^\d{5,20}$/;

function parseJson(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function parseSeoPages(raw: string | null | undefined): SeoPagesMap {
  const obj = parseJson(raw);
  const out: SeoPagesMap = {};
  if (!obj) return out;
  for (const [path, value] of Object.entries(obj)) {
    if (value && typeof value === "object") {
      const rec = value as Record<string, unknown>;
      out[path] = { title: str(rec.title), description: str(rec.description) };
    }
  }
  return out;
}

export function parseOrganisation(raw: string | null | undefined): SeoOrganisation {
  const obj = parseJson(raw);
  if (!obj) return ORG_DEFAULTS;
  return {
    name: str(obj.name),
    logoUrl: str(obj.logoUrl),
    phone: str(obj.phone),
    email: str(obj.email),
    address: str(obj.address),
    socials: Array.isArray(obj.socials) ? obj.socials.filter((s): s is string => typeof s === "string") : [],
  };
}

export function parseTracking(raw: string | null | undefined): SeoTracking {
  const obj = parseJson(raw);
  if (!obj) return TRACKING_DEFAULTS;
  return { ga4Id: str(obj.ga4Id), gtmId: str(obj.gtmId), metaPixelId: str(obj.metaPixelId) };
}

/** Returns an error message for an invalid tracking ID, or null when valid or empty. */
export function validateTracking(t: SeoTracking): string | null {
  if (t.ga4Id && !GA4_PATTERN.test(t.ga4Id)) return "Google Analytics ID should look like G-XXXXXXXXXX";
  if (t.gtmId && !GTM_PATTERN.test(t.gtmId)) return "Tag Manager ID should look like GTM-XXXXXXX";
  if (t.metaPixelId && !PIXEL_PATTERN.test(t.metaPixelId)) return "Meta Pixel ID should be numbers only";
  return null;
}
