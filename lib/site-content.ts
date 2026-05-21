// =============================================================================
//  GEODATA SITE CONTENT
//  ─────────────────────────────────────────────────────────────────────────────
//  This is the ONE file you edit to change text, prices, links, and config
//  across the whole website. It is never overwritten by code updates.
//
//  Sections:
//    1. Company info (name, address, phone, RC number)
//    2. Social & contact links
//    3. Hero section
//    4. Stats counter
//    5. About section (mission, vision)
//    6. MREIF terms
//    7. Property prices & status (nav labels)
// =============================================================================

// ─── 1. Company ──────────────────────────────────────────────────────────────

export const COMPANY = {
  name:        "Geodata World Services Limited",
  shortName:   "Geodata",
  rc:          "RC 688927",
  founded:     "2007",
  tagline:     "Real Estate · Investment · Infrastructure",
  phone:       "+234 704 762 0492",
  email:       "hello@geodata.com.ng",
  address: {
    line1: "Plot 93, Cadastral Zone B10",
    line2: "Dakibiyu, FCT Abuja",
    full:  "Plot 93, Cadastral Zone B10, Dakibiyu, FCT Abuja",
    coords: { lat: 9.047605395407187, lng: 7.4136454589349094 },
  },
  hours: "Mon–Sat · 9:00 AM – 6:00 PM",
};

// ─── 2. Social & contact links ───────────────────────────────────────────────
// Replace placeholder URLs with your real social media pages.

export const SOCIAL = {
  whatsapp:  "https://wa.me/2347047620492",
  whatsappInquiry:
    "https://wa.me/2347047620492?text=Hello%2C%20I%20would%20like%20to%20enquire%20about%20Southern%20Bridge%20City.",
  instagram: "https://instagram.com/geodataworldservices",   // ← update
  facebook:  "https://facebook.com/geodataworldservices",    // ← update
  youtube:   "https://youtube.com/@geodataworldservices",    // ← update
};

// ─── 3. Hero section ─────────────────────────────────────────────────────────

// ─── 3. Hero slideshow ───────────────────────────────────────────────────────
// First slide is the video; add as many image slides as you like below.
// Each slide:  type | background | eyebrow | headline (use \n for line breaks)
//              subheadline | cta1 | cta2 | duration (ms, default 6000)
//
// For image slides, drop photos in /public/ and reference them here.
// Images are NEVER overwritten by code updates.

export type HeroSlide = {
  type:         "video" | "image";
  videoUrl?:    string;
  videoPoster?: string;
  image?:       string;
  eyebrow:      string;
  headline:     string;
  subheadline?: string;
  cta1?:        { label: string; href: string };
  cta2?:        { label: string; href: string };
  duration?:    number;   // milliseconds, default 6000
};

export const HERO_SLIDES: HeroSlide[] = [
  // ── Slide 1, Southern Bridge City (video) ──────────────────────────────
  {
    type:        "video",
    videoUrl:    "https://geodata-wsl.s3.us-east-1.amazonaws.com/Showcase.mp4",
    videoPoster: "/collage-1.jpg",
    eyebrow:     "Southern Bridge City, Phase One",
    headline:    "A new\naddress\nfor Abuja.",
    subheadline: "321 residences at Idu. MREIF-eligible from ₦130M, 9.75% fixed for twenty years, the most competitive home loan in Nigeria.",
    cta1:        { label: "Explore residences",         href: "/properties" },
    cta2:        { label: "View construction progress", href: "/properties/4-bed-semi-detached#progress" },
    duration:    8000,
  },
  // ── Slide 2, Southern Bridge Estate ────────────────────────────────────
  {
    type:        "image",
    image:       "/collage-2.jpg",   // ← replace with a real SBE photo
    eyebrow:     "Southern Bridge Estate, Jabi, Abuja",
    headline:    "Nine residences.\nReady now.",
    subheadline: "Two ready to move into. Seven at finishing stage. All inside a fully delivered, gated estate.",
    cta1:        { label: "View available units", href: "/projects/southern-bridge-estate" },
    duration:    6000,
  },
  // ── Slide 3, Ize Hostel ────────────────────────────────────────────────
  {
    type:        "image",
    image:       "/ize-hostel/Exterior.JPG",
    eyebrow:     "Ize Hostel, Jabi, Abuja",
    headline:    "Built for\nstudents.",
    subheadline: "23 rooms. 50 bed spaces. Designed around how students actually study, rest, and live, minutes from Nile and Baze.",
    cta1:        { label: "Explore the hostel", href: "/projects/ize-hostel" },
    duration:    6000,
  },
  // ── Slide 4, Cool Army Estate ──────────────────────────────────────────
  {
    type:        "image",
    image:       "/Cool.png",
    eyebrow:     "Cool Army Estate, Owerri, Imo State",
    headline:    "Twenty homes.\nDelivered.",
    subheadline: "A 20-residence estate in Owerri, designed and built by Geodata on behalf of Cool Real Estate.",
    cta1:        { label: "See the estate", href: "/projects/cool-army-estate" },
    duration:    6000,
  },
  // ── Add more slides here ─────────────────────────────────────────────────
  // {
  //   type:    "image",
  //   image:   "/your-photo.jpg",
  //   eyebrow: "Project Name, Location",
  //   headline: "Your headline\nhere.",
  //   cta1:    { label: "Learn more", href: "/projects/your-project" },
  // },
];

// Keep HERO for any component that still references it directly
export const HERO = HERO_SLIDES[0];

// ─── 4. Stats counter ────────────────────────────────────────────────────────
// Each stat: value (displayed large) + label (displayed below)

export const STATS = [
  { value: "17+", label: "Years building" },
  { value: "321", label: "Units under construction" },
  { value: "12",  label: "Projects delivered" },
  { value: "4+",  label: "States built in" },
];

// ─── 5. About section ────────────────────────────────────────────────────────

export const ABOUT = {
  manifesto: "We build places that hold their value across generations.",
  mission:
    "We deliver trusted real estate services that prioritize client satisfaction, quality developments and long-term value guided by ethics, expertise and innovation. Our team approaches every project with meticulous planning, market insight and a commitment to excellence, ensuring that each development is both impactful and sustainable.",
  vision:
    "To create enduring homes and vibrant communities, built on integrity and high-quality standards, where people thrive and prosper.",
  values: [
    "Integrity",
    "Innovation",
    "Excellence",
    "Teamwork",
    "Exceptional quality",
    "Client-centric",
  ],
};

// ─── 6. MREIF mortgage terms ─────────────────────────────────────────────────

export const MREIF_TERMS = [
  { label: "Interest rate", value: "9.75%",   note: "Fixed for full term" },
  { label: "Tenor",         value: "20 yrs",  note: "Maximum mortgage term" },
  { label: "Equity",        value: "10%",     note: "Minimum down payment" },
  { label: "Currency",      value: "₦",       note: "Naira denominated" },
];

// ─── 7. Property nav labels ──────────────────────────────────────────────────
// Prices shown in nav mega-menu and mobile drawer.
// Keep in sync with lib/property-data.ts pricing fields.

export const PROPERTY_NAV = [
  {
    slug:   "4-bed-block-flats",
    label:  "The Pavilion",
    sub:    "Block of flats · From ₦130M",
    price:  "From ₦130M",
    status: "For sale",
  },
  {
    slug:   "4-bed-terrace",
    label:  "The Terrace",
    sub:    "4 bed · From ₦150M",
    price:  "From ₦150M",
    status: "For sale",
  },

  {
    slug:   "4-bed-semi-detached",
    label:  "The Semi-Detached",
    sub:    "4 bed · From ₦180M",
    price:  "From ₦180M",
    status: "For sale",
  },
  {
    slug:   "5-bed-semi-detached",
    label:  "The Five",
    sub:    "5 bed · From ₦220M",
    price:  "From ₦220M",
    status: "For sale",
  },
  
  {
    slug:   "6-bed-terrace",
    label:  "The Six",
    sub:    "6 bed · From ₦220M",
    price:  "From ₦220M",
    status: "For sale",
  },

];

// ─── 8. Development strip cards ──────────────────────────────────────────────
// Images and text for the scrolling cards just below the hero.
// Replace image paths with your own photos, they won't be overwritten.

type DevelopmentItem = {
  slug: string;
  name: string;
  location: string;
  description: string;
  image: string;
  status?: "Available" | "Limited" | "Sold Out" | "Selling Soon";
};

export const DEVELOPMENTS: DevelopmentItem[] =  [
  {
    slug:        "southern-bridge-city",
    name:        "Southern Bridge City",
    location:    "Idu, Abuja",
    description: "321 residences across five typologies. MREIF-eligible mortgages from 9.75% fixed.",
    image:       "/SBC-poster.png",
    status:      "Available" as const,
  },
  {
    slug:        "southern-bridge-estate",
    name:        "Southern Bridge Estate",
    location:    "Jabi, Abuja",
    description: "27 semi-detached and terraced homes inside a fully delivered, gated estate.",
    image:       "/SBDrone4.webp",
    status:      "Limited" as const,
  },
  {
    slug:        "country-court-estate",
    name:        "Country Court Estate",
    location:    "Abuja",
    description: "24 homes across three typologies. Delivered, sold, fully occupied.",
    image:       "/DRONECC8.png",
    status:      "Sold Out" as const,
  },
  {
    slug:        "ize-hostel",
    name:        "Ize Hostel",
    location:    "Jabi, Abuja",
    description: "23 rooms and 50 bed spaces, purpose-built for Nile and Baze students.",
    image:       "/ize-hostel/Exterior.JPG",
    status:      "Available" as const,
  },
  {
    slug:        "cool-army-estate",
    name:        "Cool Army Estate",
    location:    "Owerri, Imo State",
    description: "20 residences across five typologies in Owerri. Built for Cool Real Estate.",
    image:       "/Cool.png",
  },
];
