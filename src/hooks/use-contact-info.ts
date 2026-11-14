/**
 * Shared hook + types for site-wide contact information.
 * All public components (Navbar, Footer, Contact page, WhatsAppButton) use this.
 */
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

export type Office = {
  city: string;
  address: string;
  phone: string;
  email: string;
  mapEmbedUrl?: string;
};

export type ContactData = {
  primaryPhone: string;
  primaryEmail: string;
  whatsappNumber: string; // digits only, e.g. 2347047620492
  whatsappMessage: string;
  offices: Office[];
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
};

export const CONTACT_DEFAULTS: ContactData = {
  primaryPhone: "(+234) 704 762 0492",
  primaryEmail: "hello@geodata.com.ng",
  whatsappNumber: "2347047620492",
  whatsappMessage: "Hello, I am interested in your properties.",
  offices: [
    {
      city: "Abuja (HQ)",
      address: "Southern Bridge Estate, Plot 93, Dakibiyu, FCT, Abuja",
      phone: "(+234) 704 762 0492",
      email: "hello@geodata.com.ng",
      mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126093.83272748246!2d7.399722!3d9.057853!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x104e745f4cd62fd9%3A0x53bd17b4a20ea12b!2sAbuja!5e0!3m2!1sen!2sng!4v1700000000000!5m2!1sen!2sng",
    },
    {
      city: "Lagos",
      address: "12 Marina Street, Lagos Island, Lagos State",
      phone: "+234 800 000 0001",
      email: "lagos@geodata.com.ng",
      mapEmbedUrl: "",
    },
    {
      city: "Port Harcourt",
      address: "45 Rumuola Road, Port Harcourt, Rivers State",
      phone: "+234 800 000 0002",
      email: "portharcourt@geodata.com.ng",
      mapEmbedUrl: "",
    },
  ],
  facebook: "#",
  twitter: "#",
  instagram: "#",
  linkedin: "#",
  youtube: "#",
};

export function parseContact(raw: string | null | undefined): ContactData {
  if (!raw) return CONTACT_DEFAULTS;
  try { return { ...CONTACT_DEFAULTS, ...(JSON.parse(raw) as Partial<ContactData>) }; }
  catch { return CONTACT_DEFAULTS; }
}

/** Reactive hook — returns live contact data */
export function useContactInfo(): ContactData {
  const raw = useQuery(api.cms.getSiteSettings, { key: "contact" });
  return parseContact(raw);
}
