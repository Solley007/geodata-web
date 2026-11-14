import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Public base URL of the deployed app. Used to build absolute, self-referencing
// canonical URLs since this is a client-rendered SPA with no per-route SSR.
const SITE_URL = "https://geodata.com.ng";

/**
 * Keeps the document's <link rel="canonical"> in sync with the current route.
 * Runs on every navigation so each page declares an absolute canonical URL
 * pointing to itself, instead of the static one baked into index.html.
 */
export function useCanonicalUrl(): void {
  const location = useLocation();

  useEffect(() => {
    // Strip trailing slashes (except root) and any query/hash so the canonical
    // always points to the page's clean, preferred URL.
    const path = location.pathname === "/" ? "" : location.pathname.replace(/\/+$/, "");
    const href = `${SITE_URL}${path}`;

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.setAttribute("href", href);
  }, [location.pathname]);
}
