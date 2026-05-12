// ---------------------------------------------------------------------------
// Properties list data
// ---------------------------------------------------------------------------
// In production this is a CMS query. Hardcoded here so we can iterate on the
// listing UI against real-shaped data.
// ---------------------------------------------------------------------------

export type PropertyType = "Semi-Detached" | "Terrace" | "Block of Flats";
export type PropertyStatus = "Available" | "Limited" | "Sold Out";

export interface PropertyListItem {
  slug: string;
  title: string;
  type: PropertyType;
  status: PropertyStatus;
  location: string;
  price: number; // raw number for sorting/filtering
  priceLabel: string; // formatted display
  beds: number;
  baths: number;
  area: string;
  available: number;
  totalUnits: number;
  image: string;
}

export const PROPERTIES: PropertyListItem[] = [
  {
    slug: "4-bed-semi-detached",
    title: "The Semi-Detached",
    type: "Semi-Detached",
    status: "Limited",
    location: "Southern Bridge City, Idu",
    price: 180_000_000,
    priceLabel: "₦180M",
    beds: 4,
    baths: 5,
    area: "340m²",
    available: 12,
    totalUnits: 64,
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85&auto=format&fit=crop",
  },
  {
    slug: "4-bed-terrace",
    title: "The Terrace",
    type: "Terrace",
    status: "Available",
    location: "Southern Bridge City, Idu",
    price: 150_000_000,
    priceLabel: "₦150M",
    beds: 4,
    baths: 5,
    area: "240m²",
    available: 38,
    totalUnits: 96,
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=85&auto=format&fit=crop",
  },
  {
    slug: "6-bed-terrace",
    title: "The Six",
    type: "Terrace",
    status: "Available",
    location: "Southern Bridge City, Idu",
    price: 220_000_000,
    priceLabel: "₦220M",
    beds: 6,
    baths: 7,
    area: "250m²",
    available: 24,
    totalUnits: 48,
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=85&auto=format&fit=crop",
  },
  {
    slug: "5-bed-semi-detached",
    title: "The Five",
    type: "Semi-Detached",
    status: "Limited",
    location: "Southern Bridge City, Idu",
    price: 220_000_000,
    priceLabel: "₦220M",
    beds: 5,
    baths: 6,
    area: "440m²",
    available: 8,
    totalUnits: 32,
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=85&auto=format&fit=crop",
  },
  {
    slug: "4-bed-block-flats",
    title: "The Pavilion",
    type: "Block of Flats",
    status: "Available",
    location: "Southern Bridge City, Idu",
    price: 130_000_000,
    priceLabel: "₦130M",
    beds: 4,
    baths: 5,
    area: "250m²",
    available: 56,
    totalUnits: 80,
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1600&q=85&auto=format&fit=crop",
  },
];

export const PROPERTY_TYPES: ("All" | PropertyType)[] = [
  "All",
  "Semi-Detached",
  "Terrace",
  "Block of Flats",
];
