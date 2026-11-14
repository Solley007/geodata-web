import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

/** Shape returned by api.corporateDirectory.listPublicBusinesses / getBusinessBySlug */
export type PublicBusiness = {
  _id: string;
  _creationTime: number;
  slug: string;
  name: string;
  legalEntityName?: string;
  entityType: "group" | "company" | "operating_business" | "business_unit" | "division" | "business_vertical" | "strategic_partner";
  sector: string;
  shortDescription: string;
  fullDescription?: string;
  capabilities?: string[];
  status: "live" | "coming_soon" | "inactive";
  destinationType: "internal_route" | "external_url";
  destinationRoute?: string;
  destinationUrl?: string;
  displayOrder: number;
  featured: boolean;
  publicVisibility: boolean;
  logoUrl: string | null;
  coverImageResolvedUrl: string | null;
  galleryUrls: string[];
};

/** Live, reactive list of publicly-visible Corporate Directory businesses, ordered for display. */
export function usePublicBusinesses(): PublicBusiness[] | undefined {
  return useQuery(api.corporateDirectory.listPublicBusinesses) as PublicBusiness[] | undefined;
}
