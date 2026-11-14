import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useLocation } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import { useJsonLd } from "@/hooks/use-seo.ts";
import {
  SEO_ORG_KEY,
  SEO_TRACKING_KEY,
  GA4_PATTERN,
  GTM_PATTERN,
  PIXEL_PATTERN,
  parseOrganisation,
  parseTracking,
} from "@/lib/seo-settings.ts";

const SITE_ORIGIN = "https://geodata.com.ng";

function addScript(id: string, code: string, src?: string): void {
  if (document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  if (src) {
    el.async = true;
    el.src = src;
  } else {
    el.textContent = code;
  }
  document.head.appendChild(el);
}

/**
 * Renders nothing. Adds, from admin-managed settings (Admin > SEO):
 *  - Organisation structured data so Google knows the company name, logo, contact and social profiles
 *  - Analytics / Tag Manager / Meta Pixel scripts (public pages only, never the admin area)
 * IDs are re-validated here so a bad stored value can never be injected as code.
 */
export default function SiteSeoInjector() {
  const { pathname } = useLocation();
  const rawOrg = useQuery(api.cms.getSiteSettings, { key: SEO_ORG_KEY });
  const rawTracking = useQuery(api.cms.getSiteSettings, { key: SEO_TRACKING_KEY });
  const org = parseOrganisation(rawOrg);
  const tracking = parseTracking(rawTracking);
  const isAdminArea = pathname.startsWith("/admin");

  useJsonLd(
    "ld-organisation",
    org.name
      ? {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: org.name,
          url: SITE_ORIGIN,
          ...(org.logoUrl ? { logo: org.logoUrl } : {}),
          ...(org.phone ? { telephone: org.phone } : {}),
          ...(org.email ? { email: org.email } : {}),
          ...(org.address ? { address: org.address } : {}),
          ...(org.socials.length ? { sameAs: org.socials } : {}),
        }
      : null,
  );

  useEffect(() => {
    if (isAdminArea) return;
    const { ga4Id, gtmId, metaPixelId } = tracking;

    if (GTM_PATTERN.test(gtmId)) {
      addScript(
        "tracking-gtm",
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
      );
    }
    if (GA4_PATTERN.test(ga4Id)) {
      addScript("tracking-ga4-lib", "", `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`);
      addScript(
        "tracking-ga4",
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');`,
      );
    }
    if (PIXEL_PATTERN.test(metaPixelId)) {
      addScript(
        "tracking-meta-pixel",
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src='https://connect.facebook.net/en_US/fbevents.js';s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script');fbq('init','${metaPixelId}');fbq('track','PageView');`,
      );
    }
  }, [tracking.ga4Id, tracking.gtmId, tracking.metaPixelId, isAdminArea]);

  return null;
}
