import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { SEO_PAGES_KEY, parseSeoPages } from "@/lib/seo-settings.ts";

/**
 * Site-wide SEO hooks — the app's only per-route SEO mechanism (no SSR/Helmet).
 * Mirrors the restore-on-unmount pattern in use-document-meta.ts, but also
 * manages the single <link rel="canonical"> tag declared in index.html so
 * every route gets a correct, self-referencing, absolute canonical URL.
 */

const SITE_ORIGIN = "https://geodata.com.ng";

type SeoOptions = {
  title: string;
  /** When omitted, the existing meta description is left untouched. */
  description?: string;
  /** Path used to build the canonical URL, e.g. "/properties". Defaults to the current location. */
  canonicalPath?: string;
};

function buildCanonicalUrl(path: string): string {
  const normalized = path === "/" ? "/" : path.replace(/\/+$/, "");
  return `${SITE_ORIGIN}${normalized}`;
}

/** Sets document title, meta description, and a self-referencing canonical link for the page's lifetime. */
export function useSeo({ title: defaultTitle, description: defaultDescription, canonicalPath }: SeoOptions): void {
  // Admin overrides (SEO page in the admin area) win over the coded defaults
  const rawOverrides = useQuery(api.cms.getSiteSettings, { key: SEO_PAGES_KEY });
  const pathKey = canonicalPath ?? window.location.pathname;
  const override = parseSeoPages(rawOverrides)[pathKey];
  const title = override?.title || defaultTitle;
  const description = override?.description || defaultDescription;

  useEffect(() => {
    const previousTitle = document.title;
    const descEl = document.querySelector('meta[name="description"]');
    const previousDescription = descEl?.getAttribute("content") ?? null;

    document.title = title;
    if (descEl && description) descEl.setAttribute("content", description);

    const canonicalUrl = buildCanonicalUrl(canonicalPath ?? window.location.pathname);
    let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousCanonical = canonicalEl?.getAttribute("href") ?? null;
    const createdCanonical = !canonicalEl;
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", canonicalUrl);

    // __ogSync: keep social preview tags in step with the page title, description and URL
    const ogPairs: [string, string, string][] = [
      ["property", "og:title", title],
      ["property", "og:description", description ?? ""],
      ["property", "og:url", canonicalUrl],
      ["name", "twitter:title", title],
      ["name", "twitter:description", description ?? ""],
    ];
    const ogPrev: [Element, string | null][] = [];
    for (const [attr, key, val] of ogPairs) {
      const el = document.querySelector(`meta[${attr}="${key}"]`);
      if (el && val) {
        ogPrev.push([el, el.getAttribute("content")]);
        el.setAttribute("content", val);
      }
    }

    return () => {
      for (const [el, prev] of ogPrev) { if (prev !== null) el.setAttribute("content", prev); }
      document.title = previousTitle;
      if (previousDescription !== null && descEl) descEl.setAttribute("content", previousDescription);
      if (canonicalEl) {
        if (createdCanonical) canonicalEl.remove();
        else if (previousCanonical !== null) canonicalEl.setAttribute("href", previousCanonical);
      }
    };
  }, [title, description, canonicalPath]);
}

/**
 * Injects a <script type="application/ld+json"> tag with the given id for the
 * page's lifetime, removing it on unmount. Pass `null` to skip injection
 * (e.g. while data is still loading).
 */
export function useJsonLd(id: string, data: Record<string, unknown> | null): void {
  useEffect(() => {
    if (!data) return;
    let script = document.getElementById(id) as HTMLScriptElement | null;
    const created = !script;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);

    return () => {
      if (created) script?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, JSON.stringify(data)]);
}
