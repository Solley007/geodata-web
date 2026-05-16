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
    status: "Available",
    location: "Southern Bridge City, Idu",
    price: 180_000_000,
    priceLabel: "₦180M",
    beds: 4,
    baths: 5,
    area: "340m²",
    available: 0,
    totalUnits: 0,
    image: "/properties/4-bed-semi-detached.jpg",
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
    image: "/properties/4-bed-terrace.jpg",
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
    image: "/properties/6-bed-terrace.jpg",
  },
  {
    slug: "5-bed-semi-detached",
    title: "The Five",
    type: "Semi-Detached",
    status: "Available",
    location: "Southern Bridge City, Idu",
    price: 220_000_000,
    priceLabel: "₦220M",
    beds: 5,
    baths: 6,
    area: "440m²",
    available: 0,
    totalUnits: 0,
    image: "/properties/5-bed-semi-detached.jpg",
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
    image: "/properties/4-bed-block-flats.jpg",
  },

  // ─── Southern Bridge Estate ─────────────────────────────────────────────
  {
    slug: "sbe-6-bed-semi-detached",
    title: "SBE 6-Bedroom Semi-Detached",
    type: "Semi-Detached",
    status: "Limited",
    location: "Southern Bridge Estate, Idu",
    price: 0,
    priceLabel: "Price on request",
    beds: 6,
    baths: 7,
    area: "400m²",
    available: 9,          // 2 Phase One + 7 Phase Two
    totalUnits: 15,        // 8 Phase One + 7 Phase Two
    image: "/properties/SBE/SBE-COMPLETE-2.jpeg",
  },
];

export const PROPERTY_TYPES: ("All" | PropertyType)[] = [
  "All",
  "Semi-Detached",
  "Terrace",
  "Block of Flats",
];
