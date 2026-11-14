/**
 * Shared answer options for the Diaspora enquiry flow, aligned with the
 * printed "How would you like to work with us?" lead capture form so online
 * and paper leads arrive in the same shape. Used by both the Opportunity
 * Finder and the registration form so pre-filled answers always match.
 */

export const CONTACT_PREFS = ["WhatsApp", "Email", "Phone call", "Video call"] as const;

export const BUDGET_RANGES = ["Up to ₦130M", "₦130M – ₦180M", "₦180M – ₦220M", "Above ₦220M", "Prefer to discuss"] as const;

export const PAYMENT_ROUTES = ["Outright", "Instalment (50% deposit)", "MREIF mortgage", "Not decided"] as const;

export const TIMELINES = ["Within 3 months", "3–12 months", "Exploring"] as const;

export const PARTNER_TYPES = [
  "Developer",
  "Investor",
  "Landowner",
  "Infrastructure partner",
  "Construction partner",
  "Institutional investor",
  "Other",
] as const;

export const ORGANISATION_NEEDS = [
  "Staff housing",
  "Bulk property acquisition",
  "Institutional housing",
  "Development partnership",
  "Other",
] as const;

export const FORUM_NEXT_STEP = "Meet at the forum (28–29 October)";

export const NEXT_STEPS = [
  "Book a remote briefing",
  "Send me the full price schedule",
  "Send me the sample offer letter",
  "Arrange a site inspection",
  FORUM_NEXT_STEP,
  "Add me to the WhatsApp Diaspora Desk",
] as const;

export const HEARD_ABOUT = ["NBLBF26 forum", "Referral", "Online / social media", "Other"] as const;

export const NOT_SURE_HOME = "Not sure which";

export type EnquiryDetails = {
  homesOfInterest: string[];
  budgetRange: string;
  paymentRoute: string;
  timeline: string;
  partnerTypes: string[];
  partnerOther: string;
  proposal: string;
  organisationNeeds: string[];
  organisationOther: string;
  approxUnits: string;
  nextSteps: string[];
  heardAbout: string;
  heardAboutOther: string;
};

export const EMPTY_DETAILS: EnquiryDetails = {
  homesOfInterest: [], budgetRange: "", paymentRoute: "", timeline: "",
  partnerTypes: [], partnerOther: "", proposal: "",
  organisationNeeds: [], organisationOther: "", approxUnits: "",
  nextSteps: [], heardAbout: "", heardAboutOther: "",
};

/** "₦130M" style short price used on home-of-interest chips. */
export function formatShortNaira(amount: number): string {
  if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(amount % 1_000_000_000 === 0 ? 0 : 1)}B`;
  if (amount >= 1_000_000) return `₦${Math.round(amount / 1_000_000)}M`;
  return `₦${amount.toLocaleString()}`;
}

/** Toggles a value in a string array — used by every multi-select chip group. */
export function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
