// ---------------------------------------------------------------------------
// Projects (Portfolio) data
// ---------------------------------------------------------------------------
// Distinct from /lib/properties-list.ts (which lists for-sale residences).
// This is the body of work — everything Geodata has built or is building,
// for credibility/portfolio purposes.
//
// All cover and gallery images are PLACEHOLDERS — search this file for
// PLACEHOLDER and swap in real photography when commissioned.
// ---------------------------------------------------------------------------

export type ProjectCategory =
  | "Residential"
  | "Commercial"
  | "Institutional"
  | "Infrastructure";

export type ProjectStatus = "Completed" | "Ongoing";

export interface ProjectKeyFact {
  label: string;
  value: string;
}

export interface ProjectGalleryImage {
  src: string;
  alt: string;
}

export interface Project {
  slug: string;
  name: string;
  subtitle: string;
  category: ProjectCategory;
  status: ProjectStatus;
  year: number;
  completionYear?: number;
  location: string;
  client?: string; // For institutional/government work
  scope: string; // "27 units · full infrastructure"
  coverImage: string;
  heroVideoUrl?: string;      // mp4 URL — if set, hero plays video instead of image
  heroVideoPoster?: string;   // fallback image shown before video loads
  gallery: ProjectGalleryImage[];
  overview: string[]; // 2-3 paragraphs
  keyFacts: ProjectKeyFact[];
  hideFromNav?: boolean; // if true, project stays on /projects but is hidden from nav menus
}

export const PROJECT_CATEGORIES: ("All" | ProjectCategory)[] = [
  "All",
  "Residential",
  "Commercial",
  "Institutional",
  "Infrastructure",
];

// PLACEHOLDER IMAGERY — Unsplash architectural references
// Search "PLACEHOLDER" in this file to find every image to swap

export const PROJECTS: Project[] = [
  // -------------------------------------------------------------------------
  // RESIDENTIAL — Ongoing
  // -------------------------------------------------------------------------
  {
    slug: "southern-bridge-city",
    name: "Southern Bridge City",
    subtitle: "A 321-unit residential development in Idu, Abuja",
    category: "Residential",
    status: "Ongoing",
    year: 2024,
    location: "Idu, Abuja",
    scope: "321 units · five housing typologies · M&E infrastructure",
    coverImage: "/SBC-poster.png",
    gallery: [
      { src: "/SBC-poster.png", alt: "Southern Bridge City — site overview" },
      { src: "/Aerial+1.webp", alt: "Southern Bridge City — aerial view 1" },
      { src: "/Aerial+2.webp", alt: "Southern Bridge City — aerial view 2" },
      { src: "/Aerial+view+3.webp", alt: "Southern Bridge City — aerial view 3" },
      { src: "/Drone10.webp", alt: "Southern Bridge City — drone perspective" },
    ],
    overview: [
      "Southern Bridge City is Geodata's flagship development — a 321-unit master-planned community under construction at Idu, in Abuja's northern growth corridor. The site is Phase One of a larger 2,000+ unit vision, organised around five housing typologies and a central park spine.",
      "Every residence qualifies under the Ministry of Finance Incorporated Real Estate Investment Fund (MREIF) for fixed-rate mortgage financing at 9.75% over 20 years — terms no commercial lender in Nigeria currently matches.",
      "The architecture is drawn around proportion, daylight, and the way a family actually uses a home. Materials are specified to age: lime render, brushed limestone, matte clay tile. All utilities run underground. Independent quantity surveyors verify monthly progress against programme.",
    ],
    keyFacts: [
      { label: "Total units", value: "321" },
      { label: "Phase 1 status", value: "78 roofed · 89% structural" },
      { label: "Typologies", value: "5 housing types" },
      { label: "Mortgage", value: "MREIF qualified" },
      { label: "Site area", value: "Idu, Abuja FCT" },
      { label: "Completion", value: "2026 (Phase 1)" },
    ],
  },
  {
    slug: "cool-army-estate",
    name: "Cool Army Estate",
    subtitle: "A 20-residence mixed-typology estate in Owerri, Imo State",
    category: "Residential",
    status: "Ongoing",
    year: 2024,
    location: "Owerri, Imo State",
    scope: "20 residences · five housing typologies",
    coverImage: "/Cool.png",
    gallery: [
      { src: "/Cool.png", alt: "Cool Army Estate — site overview" },
      { src: "/construction/structure-cool-army-estate-1778773244315.jpg", alt: "Cool Army Estate — structural progress" },
      { src: "/construction/structure-cool-army-estate-1778773244331.jpg", alt: "Cool Army Estate — construction detail" },
    ],
    overview: [
      "Cool Army Estate is Geodata's first project in the South-East — twenty residences across five typologies, designed and built on behalf of Cool Real Estate to serve army officers and middle-income families in Owerri.",
      "Construction is active on site. The build follows Geodata's standard specification — reinforced concrete frame, underground utilities, paved internal roads — adapted to Owerri's climate and ground conditions.",
    ],
    keyFacts: [
      { label: "Status", value: "Ongoing" },
      { label: "Location", value: "Owerri, Imo State" },
      { label: "Type", value: "Mixed residential" },
      { label: "Region", value: "South-East Nigeria" },
    ],
  },
  {
    slug: "ize-hostel",
    name: "Ize Hostel",
    subtitle: "A 23-room purpose-built student hostel in Abuja",
    category: "Residential",
    status: "Ongoing",
    year: 2025,
    location: "Abuja, FCT",
    scope: "23 rooms · 50 bed spaces · student housing",
    coverImage: "/ize-hostel/Exterior.JPG",
    gallery: [
      { src: "/ize-hostel/Exterior.JPG", alt: "Ize Hostel exterior" },
      { src: "/ize-hostel/common-area.JPG", alt: "Common area" },
      { src: "/ize-hostel/pool.JPG", alt: "Swimming pool" },
      { src: "/ize-hostel/1-bed.JPG", alt: "1-bed room" },
      { src: "/ize-hostel/2-bed.JPG", alt: "2-bed room" },
    ],
    overview: [
      "Ize Hostel is a purpose-built residence for students at Nile University and Baze University in Abuja. 23 rooms, 50 bed spaces, planned around how students actually use their day — study, rest, and time with friends.",
      "Every room is built to support academic life: proper desks, generous storage, reliable utilities. Managed end-to-end, so off-campus living doesn't add friction to the work that brought students here in the first place.",
    ],
    keyFacts: [
      { label: "Rooms", value: "23" },
      { label: "Bed spaces", value: "50" },
      { label: "Serving", value: "Nile · Baze" },
      { label: "Location", value: "Abuja, FCT" },
    ],
  },

  // -------------------------------------------------------------------------
  // RESIDENTIAL — Completed
  // -------------------------------------------------------------------------
  {
    slug: "southern-bridge-estate",
    name: "Southern Bridge Estate",
    subtitle: "27-unit residential development in Jabi, Abuja",
    category: "Residential",
    status: "Completed",
    year: 2023,
    completionYear: 2025,
    location: "Jabi, Abuja",
    scope: "27 units · full infrastructure",
    coverImage: "/SBDrone2.webp",
    gallery: [
      { src: "/SBDrone2.webp", alt: "Southern Bridge Estate — aerial overview" },
      { src: "/SBDrone5.webp", alt: "Southern Bridge Estate — roofline" },
      { src: "/SBDrone6.webp", alt: "Southern Bridge Estate — streetscape" },
      { src: "/SBDrone7.webp", alt: "Southern Bridge Estate — estate aerial" },
      { src: "/properties/SBE/SBE-VIEWS.jpeg", alt: "Southern Bridge Estate — street view" },
      { src: "/properties/SBE/SBE0.jpeg", alt: "Southern Bridge Estate — frontage" },
    ],
    overview: [
      "Southern Bridge Estate is Geodata's gated residential development in Jabi — twenty-seven residences across multiple typologies, delivered with the full estate infrastructure: paved roads, drainage, perimeter security, every utility underground.",
      "Completed in 2025, the estate proved the design and construction approach now scaling to 321 residences at Southern Bridge City. Every unit was occupied within six months of handover.",
    ],
    keyFacts: [
      { label: "Units", value: "27" },
      { label: "Completed", value: "2025" },
      { label: "Location", value: "Jabi, Abuja" },
      { label: "Status", value: "Fully delivered" },
    ],
  },
  {
    slug: "country-court-estate",
    name: "Country Court Estate",
    subtitle: "24-unit mixed housing development in Abuja",
    category: "Residential",
    status: "Completed",
    year: 2020,
    completionYear: 2022,
    location: "Abuja, FCT",
    scope: "24 units · mixed housing types · full infrastructure",
    coverImage: "/DRONECC3.webp",
    heroVideoUrl: "https://geodata-wsl.s3.us-east-1.amazonaws.com/Country%20court%20Edited.mp4",
    heroVideoPoster: "/DRONECC3.webp",
    gallery: [
      { src: "/DRONECC2.webp", alt: "Country Court Estate aerial view" },
      { src: "/DRONECC3.webp", alt: "Country Court Estate drone overview" },
      { src: "/DRONECC4.webp", alt: "Country Court Estate site perspective" },
      { src: "/DRONECC5.webp", alt: "Country Court Estate rooftop view" },
      { src: "/DRONECC6.webp", alt: "Country Court Estate streetscape" },
      { src: "/DRONECC7.webp", alt: "Country Court Estate compound" },
      { src: "/DRONECC8.webp", alt: "Country Court Estate estate overview" },
    ],
    overview: [
      "Country Court Estate is a 24-unit gated residential development completed in Abuja in 2022. The project blended three housing typologies — semi-detached, terrace, and detached — into a single coherent estate plan, with shared infrastructure and a managed estate office.",
      "The estate is fully sold and occupied. It demonstrated Geodata's capacity to deliver mixed-typology developments to market within 24-month construction windows.",
    ],
    keyFacts: [
      { label: "Units", value: "24" },
      { label: "Completed", value: "2022" },
      { label: "Location", value: "Abuja FCT" },
      { label: "Typologies", value: "3 housing types" },
    ],
  },
  {
    slug: "sil-estate",
    name: "SIL Estate",
    subtitle: "180+ unit residential development",
    category: "Residential",
    status: "Completed",
    year: 2013,
    completionYear: 2015,
    location: "Abuja, FCT",
    scope: "180+ units",
    coverImage: "/sil/sil-estate-overview.jpg",
    gallery: [
      { src: "/sil/sil-estate-overview.jpg", alt: "SIL Estate overview" },
      { src: "/sil/sil-estate-area-view.jpg", alt: "SIL Estate area view" },
      { src: "/sil/sil-estate-access-road.jpg", alt: "SIL Estate access road" },
      { src: "/sil/sil-estate-bridge-construction.jpg", alt: "SIL Estate bridge construction" },
      { src: "/sil/sil-estate-construction-site.jpg", alt: "SIL Estate construction site" },
    ],
    overview: [
      "SIL Estate remains the largest single residential project Geodata has delivered to date — over 180 housing units, completed in 2015. The development demonstrates the firm's capacity to manage and deliver large-scale housing programmes against fixed timelines.",
      "The estate continues to operate as a fully occupied, owner-managed community a decade after handover, validating the construction quality and master-planning decisions made at the project's outset.",
    ],
    keyFacts: [
      { label: "Units", value: "180+" },
      { label: "Completed", value: "2015" },
      { label: "Years occupied", value: "10+" },
      { label: "Status", value: "Fully delivered" },
    ],
  },

  // -------------------------------------------------------------------------
  // COMMERCIAL
  // -------------------------------------------------------------------------
  {
    slug: "mabushi-shopping-complex",
    name: "Mabushi Shopping Complex",
    subtitle: "Six-storey commercial development in Abuja",
    category: "Commercial",
    status: "Ongoing",
    year: 2024,
    location: "Mabushi District, Abuja",
    scope: "Six-storey commercial complex",
    coverImage: "/mabushi/scaffolded-building-aerial.jpg",
    gallery: [
      { src: "/mabushi/scaffolded-building-aerial.jpg", alt: "Mabushi Shopping Complex under construction — aerial" },
      { src: "/mabushi/building-frame-aerial.jpg", alt: "Mabushi Shopping Complex structural frame — aerial" },
      { src: "/mabushi/roadside-building-aerial.jpg", alt: "Mabushi Shopping Complex roadside view — aerial" },
    ],
    overview: [
      "A six-storey commercial complex currently under construction in Mabushi District, Abuja. The development represents Geodata's first standalone commercial building project, designed to serve retail, food and beverage, and small office tenants.",
      "Construction follows the same engineering and finish standards as the firm's residential portfolio — reinforced concrete frame, architectural concrete cladding, fully underground utilities — scaled appropriately for commercial loads and tenant fit-out flexibility.",
    ],
    keyFacts: [
      { label: "Storeys", value: "Six" },
      { label: "Type", value: "Mixed commercial" },
      { label: "Status", value: "Ongoing" },
      { label: "Location", value: "Mabushi, Abuja" },
    ],
  },

  // -------------------------------------------------------------------------
  // INSTITUTIONAL — federal agencies, banks, universities
  // -------------------------------------------------------------------------
  {
    slug: "firs-office-programme",
    name: "Federal Inland Revenue Service — Office Programme",
    subtitle: "Office retrofitting and partitioning across FIRS facilities",
    category: "Institutional",
    status: "Completed",
    year: 2014,
    completionYear: 2018,
    location: "Multiple FIRS offices",
    client: "Federal Inland Revenue Service",
    scope: "Five contracts · office retrofit, partitioning, and survey work",
    coverImage: "/firs/firs-office-renovation.jpg",
    gallery: [
      { src: "/firs/firs-office-renovation.jpg", alt: "FIRS office renovation" },
      { src: "/firs/firs-office-during-renovation.jpg", alt: "FIRS office during renovation" },
      { src: "/firs/firs-warehouse-remodel.jpg", alt: "FIRS warehouse remodel" },
      { src: "/firs/glass-partitioning-tax-office.jpg", alt: "Glass partitioning at FIRS tax office" },
    ],
    overview: [
      "Between 2014 and 2018, Geodata delivered a programme of office construction, retrofit, and surveying work for the Federal Inland Revenue Service. Contracts included retrofitting of the FIRS office building at Wuse Zone 5, glass partitioning of the Katampe FIRS GBTO/MSTO Office, warehouse remodelling for the Investigation and Enforcement Unit at Wuse II, glass partitioning of the Lafia Prototype ITO/MSTO Office, and geophysical surveys for motorised borehole installation in Abuja and Gombe.",
      "The diversity of scopes — from precision interior partitioning to subsurface geophysical work — reflects the breadth of Geodata's in-house technical capability across architecture, civil engineering, M&E, and environmental disciplines.",
    ],
    keyFacts: [
      { label: "Client", value: "Federal Inland Revenue Service" },
      { label: "Contracts", value: "Five" },
      { label: "Period", value: "2014–2018" },
      { label: "Scope", value: "Retrofit, partitioning, surveys" },
    ],
  },


  // -------------------------------------------------------------------------
  // INFRASTRUCTURE
  // -------------------------------------------------------------------------
  {
    slug: "kogi-state-infrastructure",
    name: "Kogi State Infrastructure Programme",
    subtitle: "World Bank-funded rural roads and agricultural logistics in Kogi State",
    category: "Infrastructure",
    status: "Ongoing",
    year: 2024,
    location: "Kogi State",
    client: "World Bank / Kogi State Government — KOGI RAAMP",
    scope: "33.56km rural roads · AKU & Agro Logistic Centre, Adavi LGA",
    coverImage: "/kogi/freshly-paved-road.jpeg",
    gallery: [
      { src: "/kogi/freshly-paved-road.jpeg", alt: "Kogi RAAMP — freshly paved road" },
      { src: "/kogi/asphalt-road-streetlight.jpeg", alt: "Kogi RAAMP — road with streetlights" },
      { src: "/kogi/road-roller.jpeg", alt: "Kogi RAAMP — road compaction" },
      { src: "/kogi/asphalt-paving.jpeg", alt: "Kogi RAAMP — asphalt laying" },
      { src: "/kogi/lockup-shop.jpeg", alt: "Kogi RAAMP — agro logistic centre" },
      { src: "/kogi/warehouse.jpeg", alt: "Kogi RAAMP — warehouse construction" },
    ],
    overview: [
      "Geodata is engaged on two contracts under the Kogi State Rural Access & Agricultural Marketing Project (KOGI RAAMP) — a World Bank-funded programme delivered in partnership with the Kogi State Government to expand rural connectivity and agricultural value-chain infrastructure.",
      "The first contract covers upgrading of 33.56 kilometres of rural roads across Lots 1 and 2. The second is the construction and physical improvement of the AKU and Agro Logistic Centre in Adavi Local Government Area (Contract NG-KOGIRAAMP-459307-CW-RFB/LOT 3). Both projects are currently in execution and support farmer access to markets and post-harvest storage capacity across central Nigeria.",
    ],
    keyFacts: [
      { label: "Funded by",      value: "The World Bank" },
      { label: "Programme",      value: "KOGI RAAMP" },
      { label: "Roads upgraded", value: "33.56 km" },
      { label: "Logistics hub",  value: "Adavi LGA" },
    ],
  },
];


/** All slugs — used by generateStaticParams */
export function getAllProjectSlugs(): string[] {
  return PROJECTS.map((p) => p.slug);
}

/** Get a single project by slug */
export function getProjectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

/** Get related projects — same category, excluding current */
export function getRelatedProjects(currentSlug: string, category: ProjectCategory, limit = 3): Project[] {
  return PROJECTS.filter(
    (p) => p.slug !== currentSlug && p.category === category
  ).slice(0, limit);
}
