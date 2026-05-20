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
  | "Federal Government"
  | "State Government"
  | "World Bank";

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
  "Federal Government",
  "State Government",
  "World Bank",
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
    heroVideoUrl: "https://res.cloudinary.com/drort9cs1/video/upload/v1779272709/Country_court_Edited_jzaily.mov",
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
    slug: "kashere-bungalows",
    name: "Kashere Bungalow Project",
    subtitle: "20 three-bedroom bungalows in Gombe State",
    category: "State Government",
    status: "Completed",
    year: 2017,
    completionYear: 2018,
    location: "Kashere, Gombe State",
    scope: "20 three-bedroom bungalows with BQ",
    coverImage:
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=2000&q=85&auto=format&fit=crop",
    gallery: [
      { src: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1600&q=85&auto=format&fit=crop", alt: "Bungalow frontage" },
      { src: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=85&auto=format&fit=crop", alt: "Compound view" },
    ],
    overview: [
      "Twenty three-bedroom bungalows with attached boys' quarters, delivered at Kashere in Gombe State. The project served institutional residential demand around the Federal University Kashere campus, where Geodata had concurrent construction work.",
      "Built to standard residential specification with concrete frame, blockwork infill, and corrugated steel roofing — adapted for the harsher northern climate.",
    ],
    keyFacts: [
      { label: "Units", value: "20" },
      { label: "Type", value: "3-bedroom bungalow + BQ" },
      { label: "Completed", value: "2018" },
      { label: "Location", value: "Gombe State" },
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
    slug: "cbn-maitama-portfolio",
    name: "Central Bank of Nigeria — Maitama Portfolio",
    subtitle: "Six property renovations across CBN's Maitama estate",
    category: "Federal Government",
    status: "Completed",
    year: 2019,
    completionYear: 2019,
    location: "Maitama, Abuja",
    client: "Central Bank of Nigeria",
    scope: "Six properties · two addresses · multiple scopes of work",
    coverImage:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=2000&q=85&auto=format&fit=crop",
    gallery: [
      { src: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&q=85&auto=format&fit=crop", alt: "Renovated interior" },
      { src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&q=85&auto=format&fit=crop", alt: "Building exterior" },
      { src: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&q=85&auto=format&fit=crop", alt: "Architectural detail" },
    ],
    overview: [
      "Through 2019, Geodata executed a programme of six renovation and improvement contracts across the Central Bank of Nigeria's Maitama property portfolio. Work spanned two addresses — 51A Usuma Street and 14 Vattern Street — with scopes including full property renovation, outdoor kitchen and poolside development, swimming pool facility re-roofing and kitchen installation, balcony tile and POP ceiling replacement, and re-tiling and alteration works.",
      "Engagement by an institution of CBN's standards reflects the firm's regulatory compliance, audit-ready financial systems, and capacity to deliver discreet, high-quality work to government and financial-sector clients. All six contracts were delivered on programme.",
    ],
    keyFacts: [
      { label: "Client", value: "Central Bank of Nigeria" },
      { label: "Properties", value: "Six" },
      { label: "Year", value: "2019" },
      { label: "Locations", value: "Usuma & Vattern, Maitama" },
    ],
  },
  {
    slug: "firs-office-programme",
    name: "Federal Inland Revenue Service — Office Programme",
    subtitle: "Office retrofitting and partitioning across FIRS facilities",
    category: "Federal Government",
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
    slug: "federal-university-kashere",
    name: "Federal University Kashere",
    subtitle: "Construction and furnishing of Schools of Remedial Studies",
    category: "State Government",
    status: "Completed",
    year: 2018,
    completionYear: 2018,
    location: "Kashere, Gombe State",
    client: "Federal University Kashere",
    scope: "Schools of Remedial Studies · construction and furnishing",
    coverImage:
      "https://images.unsplash.com/photo-1562774053-701939374585?w=2000&q=85&auto=format&fit=crop",
    gallery: [
      { src: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1600&q=85&auto=format&fit=crop", alt: "Academic building" },
      { src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=85&auto=format&fit=crop", alt: "Classroom interior" },
    ],
    overview: [
      "Geodata delivered the construction and furnishing of the Schools of Remedial Studies facility at Federal University Kashere in Gombe State. The project encompassed structural construction, internal fit-out, and full furnishing supply for academic use.",
      "The contract was executed alongside Geodata's residential bungalow project in the same location, demonstrating the firm's ability to manage concurrent civil and institutional construction programmes within a single regional engagement.",
    ],
    keyFacts: [
      { label: "Client", value: "Federal University Kashere" },
      { label: "Scope", value: "Construction + furnishing" },
      { label: "Location", value: "Gombe State" },
      { label: "Completed", value: "2018" },
    ],
  },
  {
    slug: "okpella-community-centre",
    name: "Okpella Community Centre",
    subtitle: "Community centre and sporting facilities",
    category: "Federal Government",
    status: "Completed",
    year: 2017,
    completionYear: 2017,
    location: "Okpella, Edo State",
    client: "Federal Ministry of Lands, Housing & Urban Development",
    scope: "Community centre · sporting facilities",
    coverImage:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=2000&q=85&auto=format&fit=crop",
    gallery: [
      { src: "https://images.unsplash.com/photo-1572177812156-58036aae439c?w=1600&q=85&auto=format&fit=crop", alt: "Community building" },
      { src: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&q=85&auto=format&fit=crop", alt: "Sporting facility" },
    ],
    overview: [
      "Construction of a community centre and sporting facilities at Okpella in Edo State, delivered for the Federal Ministry of Lands, Housing and Urban Development. The project served public infrastructure objectives in support of community development in the region.",
    ],
    keyFacts: [
      { label: "Client", value: "Federal Ministry of Lands" },
      { label: "Scope", value: "Community + sporting facilities" },
      { label: "Location", value: "Okpella, Edo State" },
      { label: "Completed", value: "2017" },
    ],
    hideFromNav: true,
  },
  {
    slug: "kogi-raamp-rural-roads",
    name: "Kogi RAAMP Rural Roads",
    subtitle: "World Bank-funded upgrade of 33.56 km of rural roads in Kogi State",
    category: "World Bank",
    status: "Ongoing",
    year: 2024,
    location: "Kogi State",
    client: "World Bank / Kogi State Government — KOGI RAAMP",
    scope: "33.56 km rural roads · Lots 1 and 2",
    coverImage: "/kogi/freshly-paved-road.jpeg",
    gallery: [
      { src: "/kogi/freshly-paved-road.jpeg",         alt: "Freshly paved rural road section, Kogi RAAMP" },
      { src: "/kogi/asphalt-paver.jpeg",              alt: "Asphalt paver laying new road surface" },
      { src: "/kogi/road-roller.jpeg",                alt: "Compaction roller finishing fresh asphalt" },
      { src: "/kogi/night-asphalt-crew.jpeg",         alt: "Night asphalt crew working under floodlights" },
      { src: "/kogi/road-inspection-officials.jpeg",  alt: "Site inspection with project officials" },
      { src: "/kogi/completed-village-drainage.jpeg", alt: "Completed roadside drainage through village" },
      { src: "/kogi/bridge-approach-earthworks.jpeg", alt: "Bridge approach earthworks underway" },
    ],
    overview: [
      "Under the Kogi State Rural Access & Agricultural Marketing Project (KOGI RAAMP) — a World Bank-funded programme delivered in partnership with the Kogi State Government — Geodata is upgrading 33.56 kilometres of rural roads across Lots 1 and 2 to expand connectivity for farming communities in central Nigeria.",
      "The upgraded roads link smallholder farmers to markets and post-harvest infrastructure, reducing the cost of moving produce and strengthening the agricultural value chain across the state.",
    ],
    keyFacts: [
      { label: "Funded by",      value: "The World Bank" },
      { label: "Programme",      value: "KOGI RAAMP" },
      { label: "Roads upgraded", value: "33.56 km" },
      { label: "Lots",           value: "Lots 1 and 2" },
    ],
  },
  {
    slug: "aku-agro-logistic-centre",
    name: "AKU Agro Logistic Centre",
    subtitle: "World Bank-funded agricultural logistics centre in Adavi LGA, Kogi State",
    category: "World Bank",
    status: "Ongoing",
    year: 2024,
    location: "Adavi LGA, Kogi State",
    client: "World Bank / Kogi State Government — KOGI RAAMP",
    scope: "Construction of AKU & Agro Logistic Centre · Contract NG-KOGIRAAMP-459307-CW-RFB/LOT 3",
    coverImage: "/kogi/admin-block.jpeg",
    gallery: [
      { src: "/kogi/admin-block.jpeg",              alt: "AKU Agro Logistic Centre administrative block" },
      { src: "/kogi/warehouse.jpeg",                alt: "Completed warehouse at the logistics centre" },
      { src: "/kogi/open-shed-a.jpeg",              alt: "Open-sided storage shed — type A" },
      { src: "/kogi/open-shed-b-1.jpeg",            alt: "Open-sided storage shed — type B" },
      { src: "/kogi/lockup-shop-row.jpeg",          alt: "Row of completed lockup shops" },
      { src: "/kogi/market-foundation.jpeg",        alt: "Market hall foundation works" },
      { src: "/kogi/processing-1.jpeg",             alt: "Produce processing area" },
      { src: "/kogi/admin-block-construction.jpeg", alt: "Admin block during construction" },
    ],
    overview: [
      "Under the Kogi State Rural Access & Agricultural Marketing Project (KOGI RAAMP) — a World Bank-funded programme — Geodata is constructing and physically improving the AKU and Agro Logistic Centre in Adavi Local Government Area (Contract NG-KOGIRAAMP-459307-CW-RFB/LOT 3).",
      "The centre provides aggregation, sorting, and post-harvest storage capacity for produce from across the state, complementing the rural-roads programme that connects farmers to markets.",
    ],
    keyFacts: [
      { label: "Funded by",      value: "The World Bank" },
      { label: "Programme",      value: "KOGI RAAMP" },
      { label: "Contract",       value: "NG-KOGIRAAMP-459307-CW-RFB/LOT 3" },
      { label: "Location",       value: "Adavi LGA, Kogi State" },
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
