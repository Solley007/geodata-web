import { useJsonLd } from "@/hooks/use-seo.ts";
import { useContactInfo } from "@/hooks/use-contact-info.ts";

const SITE_ORIGIN = "https://geodata.com.ng";
const LOGO_URL = "https://hercules-cdn.com/file_hqjYSAKlVBBRqljHrAkEnfVn";

/**
 * Site-wide Organization + WebSite JSON-LD, mounted once at the app root.
 * Only includes sameAs links for social profiles the admin has actually set
 * (contact.* defaults to "#" until configured) so we never invent data.
 */
export default function SiteJsonLd() {
  const contact = useContactInfo();

  const sameAs = [contact.facebook, contact.twitter, contact.instagram, contact.linkedin, contact.youtube].filter(
    (url) => url && url !== "#"
  );

  useJsonLd("ld-organization", {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Geodata World Services Limited",
    url: SITE_ORIGIN,
    logo: LOGO_URL,
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(contact.primaryPhone ? { telephone: contact.primaryPhone } : {}),
    ...(contact.primaryEmail ? { email: contact.primaryEmail } : {}),
  });

  useJsonLd("ld-website", {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Geodata World Services Limited",
    url: SITE_ORIGIN,
  });

  return null;
}
