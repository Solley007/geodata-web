/**
 * BrandingProvider
 * Reads the "branding" key from siteSettings and injects CSS variables
 * onto the <html> element so the entire app reacts instantly to brand changes.
 *
 * --brand       : primary brand color (default #0B4DBB)
 * --brand-dark  : darker shade for hover states (auto-computed if not set)
 */
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

export type BrandingData = {
  primaryColor: string;   // hex e.g. "#0B4DBB"
  companyName?: string;
  logoUrl?: string;
  logoStorageId?: string | null;
  faviconUrl?: string;
};

export const BRANDING_DEFAULTS: BrandingData = {
  primaryColor: "#0B4DBB",
  companyName: "Geodata World Services Limited",
  logoUrl: "https://hercules-cdn.com/file_hqjYSAKlVBBRqljHrAkEnfVn",
  logoStorageId: null,
};

export function parseBranding(raw: string | null | undefined): BrandingData {
  if (!raw) return BRANDING_DEFAULTS;
  try { return { ...BRANDING_DEFAULTS, ...(JSON.parse(raw) as Partial<BrandingData>) }; }
  catch { return BRANDING_DEFAULTS; }
}

/** Hex color → slightly darker hex for hover states */
function darkenHex(hex: string, amount = 20): string {
  try {
    const clean = hex.replace("#", "");
    const num = parseInt(clean, 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  } catch {
    return hex;
  }
}

/** Apply branding vars to <html> element */
export function applyBranding(data: BrandingData) {
  const root = document.documentElement;
  root.style.setProperty("--brand", data.primaryColor);
  root.style.setProperty("--brand-dark", darkenHex(data.primaryColor, 20));
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const raw = useQuery(api.cms.getSiteSettings, { key: "branding" });
  const data = parseBranding(raw);

  useEffect(() => {
    applyBranding(data);
  }, [data.primaryColor]);

  return <>{children}</>;
}
