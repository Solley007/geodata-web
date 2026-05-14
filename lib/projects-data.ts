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
  gallery: ProjectGalleryImage[];
  overview: string[]; // 2-3 paragraphs
  keyFacts: ProjectKeyFact[];
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
    coverImage:
      "/SBC-poster.png",
    gallery: [
      { src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85&auto=format&fit=crop", alt: "Semi-detached residence facade" },
      { src: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=85&auto=format&fit=crop", alt: "Living area with morning light" },
      { src: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1600&q=85&auto=format&fit=crop", alt: "Residential street view" },
      { src: "https://images.unsplash.com/photo-1600566753104-685f4f24cb4d?w=1600&q=85&auto=format&fit=crop", alt: "Master suite interior" },
      { src: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=85&auto=format&fit=crop", alt: "Aerial site progress" },
    ],
    overview: [
      "Southern Bridge City is Geodata's flagship residential development — a 321-unit master-planned community currently under construction at Idu, in Abuja's quiet northern growth corridor. The site spans Phase One of a larger 2,000+ unit vision, organised around five distinct housing typologies and a central park spine.",
      "The development is qualified under the Ministry of Finance Real Estate Investment Fund (MREIF), making every residence eligible for fixed-rate mortgage financing at 9.75% over 20 years — terms unmatched by commercial lenders in Nigeria. ARM Investment Managers serves as fund manager; Zenith Bank provides construction finance.",
      "Architecture is composed around proportion, daylight, and the rituals of family life. Materials were specified for how they age — lime render, brushed limestone, matte clay tile — and infrastructure is fully underground. Independent quantity surveyors verify monthly progress against programme.",
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
    subtitle: "Mixed housing development in Owerri, Imo State",
    category: "Residential",
    status: "Ongoing",
    year: 2024,
    location: "Owerri, Imo State",
    scope: "Mixed housing types",
    coverImage:
      "/SBC-poster.png",
    gallery: [
      { src: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1600&q=85&auto=format&fit=crop", alt: "Site overview" },
      { src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85&auto=format&fit=crop", alt: "Construction progress" },
      { src: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1600&q=85&auto=format&fit=crop", alt: "Architectural detail" },
    ],
    overview: [
      "Cool Army Estate represents Geodata's expansion beyond Abuja into the South-East corridor. The development comprises mixed residential typologies designed for officers and middle-income families in Owerri, Imo State.",
      "Construction is currently in active phase. The project applies the same engineering standards and material specifications as Geodata's Abuja portfolio — reinforced concrete frame, underground utilities, planned road infrastructure — adapted to the regional climate and site conditions of Owerri.",
    ],
    keyFacts: [
      { label: "Status", value: "Ongoing" },
      { label: "Location", value: "Owerri, Imo State" },
      { label: "Type", value: "Mixed residential" },
      { label: "Region", value: "South-East Nigeria" },
    ],
  },

  // -------------------------------------------------------------------------
  // RESIDENTIAL — Completed
  // -------------------------------------------------------------------------
  {
    slug: "southern-bridge-estate",
    name: "Southern Bridge Estate",
    subtitle: "27-unit residential development in Idu, Abuja",
    category: "Residential",
    status: "Completed",
    year: 2023,
    completionYear: 2025,
    location: "Idu, Abuja",
    scope: "27 units · full infrastructure",
    coverImage:
      "",
    gallery: [
      { src: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=85&auto=format&fit=crop", alt: "Completed residence interior" },
      { src: "https://images.unsplash.com/photo-1600566753104-685f4f24cb4d?w=1600&q=85&auto=format&fit=crop", alt: "Bedroom suite" },
      { src: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1600&q=85&auto=format&fit=crop", alt: "Estate streetscape" },
    ],
    overview: [
      "Southern Bridge Estate is the predecessor development to Southern Bridge City and the proof point for the Idu site selection. Twenty-seven residences across multiple typologies, delivered with full estate infrastructure — roads, drainage, perimeter security, and underground utilities.",
      "Completed in 2025, the estate validated the architectural language and construction methodology now scaling to 321 units at Southern Bridge City. Every residence was occupied within six months of handover.",
    ],
    keyFacts: [
      { label: "Units", value: "27" },
      { label: "Completed", value: "2025" },
      { label: "Location", value: "Idu, Abuja" },
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
    coverImage:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=2000&q=85&auto=format&fit=crop",
    gallery: [
      { src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85&auto=format&fit=crop", alt: "Estate frontage" },
      { src: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=85&auto=format&fit=crop", alt: "Internal road" },
      { src: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1600&q=85&auto=format&fit=crop", alt: "Residence detail" },
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
    category: "Residential",
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
    coverImage:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2000&q=85&auto=format&fit=crop",
    gallery: [
      { src: "https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1600&q=85&auto=format&fit=crop", alt: "Estate aerial" },
      { src: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1600&q=85&auto=format&fit=crop", alt: "Residential row" },
      { src: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=85&auto=format&fit=crop", alt: "Streetscape" },
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
    coverImage:
      "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=2000&q=85&auto=format&fit=crop",
    gallery: [
      { src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=85&auto=format&fit=crop", alt: "Commercial interior" },
      { src: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&q=85&auto=format&fit=crop", alt: "Retail space" },
      { src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&q=85&auto=format&fit=crop", alt: "Building facade" },
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
    category: "Institutional",
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
    category: "Institutional",
    status: "Completed",
    year: 2014,
    completionYear: 2018,
    location: "Multiple FIRS offices",
    client: "Federal Inland Revenue Service",
    scope: "Five contracts · office retrofit, partitioning, and survey work",
    coverImage:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=2000&q=85&auto=format&fit=crop",
    gallery: [
      { src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=85&auto=format&fit=crop", alt: "Office interior" },
      { src: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&q=85&auto=format&fit=crop", alt: "Glass partitioning" },
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
  {
    slug: "federal-university-kashere",
    name: "Federal University Kashere",
    subtitle: "Construction and furnishing of Schools of Remedial Studies",
    category: "Institutional",
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

  // -------------------------------------------------------------------------
  // INFRASTRUCTURE
  // -------------------------------------------------------------------------
  {
    slug: "okpella-community-centre",
    name: "Okpella Community Centre",
    subtitle: "Community centre and sporting facilities",
    category: "Infrastructure",
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
  },
  {
    slug: "kogi-state-infrastructure",
    name: "Kogi State Infrastructure Programme",
    subtitle: "Rural road upgrading and agricultural logistics centre",
    category: "Infrastructure",
    status: "Ongoing",
    year: 2024,
    location: "Kogi State",
    client: "Kogi State Government / RAAMP",
    scope: "33.56km rural roads · AKU & Agro Logistic Centre, Adavi LGA",
    coverImage:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=2000&q=85&auto=format&fit=crop",
    gallery: [
      { src: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&q=85&auto=format&fit=crop", alt: "Rural infrastructure" },
      { src: "https://images.unsplash.com/photo-1572177812156-58036aae439c?w=1600&q=85&auto=format&fit=crop", alt: "Logistics centre construction" },
    ],
    overview: [
      "An active two-strand infrastructure programme in Kogi State. The first strand: upgrading of 33.56 kilometres of rural roads under the Rural Access and Agricultural Marketing Project (RAAMP), Lots 1 and 2. The second: construction and physical improvement of the AKU and Agro Logistic Centre at Adavi Local Government Area (Contract NG-KOGIRAAMP-459307-CWRFB/LOT 3).",
      "Together the programmes support agricultural value-chain development and rural connectivity in central Nigeria. Both projects are currently in execution.",
    ],
    keyFacts: [
      { label: "Programme", value: "RAAMP / Kogi State" },
      { label: "Roads", value: "33.56 km" },
      { label: "Status", value: "Ongoing" },
      { label: "Region", value: "Central Nigeria" },
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
