// ---------------------------------------------------------------------------
// Property data — Southern Bridge City, Phase One
// ---------------------------------------------------------------------------
// Five typologies, each with its own editorial copy, specs, and gallery.
// Shared data (amenities, location, construction methodology) is factored
// into reusable constants below the type definitions.
//
// PLACEHOLDER images: all Unsplash references. Replace with real
// commissioned photography when available.
//
// PLACEHOLDER coordinates: update coords.lat and coords.lng to the actual
// Southern Bridge City GPS location (right-click the site on Google Maps
// to copy coordinates, paste below).
// ---------------------------------------------------------------------------

export type PropertyPhase =
  | "Launch"
  | "Structure"
  | "Finishing"
  | "Handover";

export interface FloorPlan {
  floor: string;    // "Ground Floor", "First Floor", etc.
  imageUrl: string; // path in /public/floor-plans/[slug]/
}

export interface PropertySpec {
  label: string;
  value: string;
  hint?: string;
}

export interface PropertyAmenity {
  title: string;
  description: string;
}

export interface PropertySection {
  id: string;
  label: string;
}

export interface Property {
  slug: string;
  title: string;
  subtitle: string;
  location: string;
  heroImage: string;
  heroVideo?: string;
  specs: PropertySpec[];
  progress: {
    currentPhase: PropertyPhase;
    percent: number;
  };
  overview: string[];
  details: string[];
  amenities: PropertyAmenity[];
  gallery: { src: string; alt: string; ratio: "tall" | "wide" | "square" }[];
  floorPlans: FloorPlan[];
  floorPlanPdf: string; // single PDF download for the full building floor plan
  locationContext: {
    address: string;
    coords: { lat: number; lng: number };
    travelTimes: { destination: string; time: string }[];
  };
  pricing: {
    from: string;
    to?: string;
  };
}

export const PROPERTY_SECTIONS: PropertySection[] = [
  { id: "overview", label: "Overview" },
  { id: "video", label: "Video" },
  { id: "details", label: "Details" },
  { id: "amenities", label: "Amenities" },
  { id: "gallery", label: "Images" },
  { id: "location", label: "Location" },
];

// ---------------------------------------------------------------------------
// SHARED DATA — same across all five typologies
// ---------------------------------------------------------------------------

// Per-typology plot addresses
const ADDRESSES = {
  "4-bed-semi-detached": "Plot 7258, Southern Bridge City, Idu, Abuja",
  "4-bed-terrace":       "Plot 7253, Southern Bridge City, Idu, Abuja",
  "6-bed-terrace":       "Plot 7270, Southern Bridge City, Idu, Abuja",
  "5-bed-semi-detached": "Plot 7261, Southern Bridge City, Idu, Abuja",
  "4-bed-block-flats":   "Plot 7266, Southern Bridge City, Idu, Abuja",
};

// Per-typology coordinates — each pinned to its specific cluster within
// the Southern Bridge City development.
const COORDS = {
  "4-bed-semi-detached": { lat: 9.0272080689693,    lng: 7.368666226041666  },
  "4-bed-terrace":       { lat: 9.025235567440559,  lng: 7.364539506419074  },
  "6-bed-terrace":       { lat: 9.019900426418593,  lng: 7.370225517733883  },
  "5-bed-semi-detached": { lat: 9.024589794673116,  lng: 7.36888262396079   },
  "4-bed-block-flats":   { lat: 9.024727799022891,  lng: 7.370051250516858  },
};

const TRAVEL_TIMES = [
  { destination: "Abuja City Centre", time: "18 min" },
  { destination: "Nnamdi Azikiwe International Airport", time: "32 min" },
  { destination: "Central Business District", time: "22 min" },
  { destination: "Maitama", time: "15 min" },
];

// Estate-wide amenities shared by all residents regardless of typology
const ESTATE_AMENITIES: PropertyAmenity[] = [
  {
    title: "24/7 estate security",
    description:
      "Manned gatehouse, perimeter CCTV, and patrol presence across the development. Facial-recognition resident pass system.",
  },
  {
    title: "Underground utilities",
    description:
      "All power, water, fibre, and drainage routed underground. No overhead poles or visible service infrastructure anywhere on site.",
  },
  {
    title: "On-site clubhouse & gym",
    description:
      "Phase 1 includes a 1,200m² clubhouse with gym, lap pool, co-working lounge, and meeting rooms — accessible to all residents.",
  },
  {
    title: "Boreholes & treated water",
    description:
      "Twin commercial-grade boreholes with multi-stage filtration deliver treated drinking water to every residence as standard.",
  },
  {
    title: "Estate management",
    description:
      "A dedicated on-site estate office manages maintenance schedules, visitor passes, service charges, and resident communication.",
  },
  {
    title: "Paved internal roads",
    description:
      "All internal estate roads are tarmacked to municipal standard with kerbed walkways, drainage channels, and street lighting.",
  },
];

// Construction methodology — shared across all typologies (same contractor,
// same specification, same quality standard) with per-typology variations
// in the individual property records below.
const CONSTRUCTION_DETAILS = [
  "Construction is reinforced concrete frame with infill blockwork, finished externally in lime render and architectural concrete. The roof structure is steel truss with insulated standing-seam aluminium covering — engineered for Abuja's climate and rated for a 50-year service life.",
  "The principal living spaces are 3.2 metres clear floor-to-ceiling, with north-facing glazing scaled to control solar gain. Mechanical ventilation with heat recovery reduces dependence on AC; underfloor cooling is offered as a configurable upgrade.",
  "Bathrooms are specified to international standard with thermostatic mixers, full-height tile, and dedicated extract. Kitchens are German-engineered modular cabinetry with quartz worktops; integrated appliance packages are configurable at fit-out stage.",
  "All units are wired for fibre internet, structured Cat-6, and a managed smart-home backbone. Solar-ready roof structure permits future PV installation without reroofing.",
];

// Current construction status — same across Phase 1 (all under same contractor)
const CURRENT_PROGRESS = {
  currentPhase: "Structure" as PropertyPhase,
  percent: 78,
};

// ---------------------------------------------------------------------------
// THE FIVE TYPOLOGIES
// ---------------------------------------------------------------------------

const ALL_PROPERTIES: Property[] = [
  // -------------------------------------------------------------------------
  // 1. THE SEMI-DETACHED — 4 bed · ₦180M
  // -------------------------------------------------------------------------
  {
    slug: "4-bed-semi-detached",
    title: "The Semi-Detached",
    subtitle: "A four-bedroom residence at Southern Bridge City",
    location: "Idu, Abuja — Federal Capital Territory",
    heroImage:
      "/properties/4-bed-semi-detached.jpg",
    specs: [
      { label: "Type", value: "Semi-Detached", hint: "4 bedroom" },
      { label: "Available", value: "12 of 64", hint: "Phase One" },
      { label: "Price", value: "₦180M", hint: "From" },
      { label: "Bedrooms", value: "4" },
      { label: "Bathrooms", value: "5" },
      { label: "Built area", value: "340m²" },
    ],
    progress: CURRENT_PROGRESS,
    overview: [
      "The Semi-Detached is the most considered residence at Southern Bridge City — a four-bedroom home composed around proportion, light, and the rituals of family life. Each unit anchors a quiet corner of the development, set back from the main avenue and oriented to capture morning light through the principal rooms.",
      "The plan reads as three volumes joined by a generous double-height entry: a public ground floor for living and gathering, an intimate first floor for the family, and a private guest suite tucked above. The result is architecture that adapts to the household — formal when it needs to be, quietly informal the rest of the time.",
      "Materials were selected for how they age. Untreated timber, brushed limestone, and matte clay tile carry the palette inside; landscaped courtyards thread daylight through the heart of the plan.",
    ],
    details: [
      ...CONSTRUCTION_DETAILS,
      "Each semi-detached benefits from dual-aspect orientation, with windows on two sides of the principal rooms. The shared party wall is acoustically isolated — 200mm dense blockwork with 50mm mineral wool cavity — delivering near-detached acoustic performance.",
    ],
    amenities: [
      {
        title: "Private courtyard garden",
        description:
          "Each residence is delivered with a landscaped 60m² garden enclosed by a 2.4m perimeter wall, with mature plant material established before handover.",
      },
      {
        title: "Two-bay covered parking",
        description:
          "Secure parking under a perforated steel canopy, with EV charging conduit installed and ready for future activation.",
      },
      ...ESTATE_AMENITIES,
    ],
    gallery: [
      {
        src: "/properties/7258/approach_elevation_3d.png",
        alt: "The Semi-Detached front facade at Southern Bridge City",
        ratio: "tall",
      },
      {
        src: "/properties/7258/site_masterplan_3d.png",
        alt: "Open-plan living area with north-facing glazing",
        ratio: "wide",
      },
      {
        src: "/properties/7258/roof_massing_3d.png",
        alt: "Kitchen and dining with quartz worktops",
        ratio: "square",
      },
      {
        src: "/properties/7258/rear_side_exterior_3d.png",
        alt: "Master bedroom suite",
        ratio: "tall",
      },
      {
        src: "/properties/7258/first.png",
        alt: "Aerial view of Southern Bridge City development",
        ratio: "wide",
      },
      {
        src: "/properties/7258/ground.jpg",
        alt: "Landscaped private courtyard garden",
        ratio: "square",
      },
    ],
    // PLACEHOLDER — add images to /public/floor-plans/4-bed-semi-detached/
    floorPlans: [
      { floor: "Ground Floor", imageUrl: "/floor-plans/4-bed-semi-detached/ground.jpg" },
      { floor: "First Floor", imageUrl: "/floor-plans/4-bed-semi-detached/first.jpg" },
    ],
    floorPlanPdf: "/floor-plans/4-bed-semi-detached/floor-plan.pdf",
    locationContext: {
      address: ADDRESSES["4-bed-semi-detached"],
      coords: COORDS["4-bed-semi-detached"],
      travelTimes: TRAVEL_TIMES,
    },
    pricing: { from: "₦180,000,000" },
  },

  // -------------------------------------------------------------------------
  // 2. THE TERRACE — 4 bed · ₦150M
  // -------------------------------------------------------------------------
  {
    slug: "4-bed-terrace",
    title: "The Terrace",
    subtitle: "A four-bedroom terrace residence at Southern Bridge City",
    location: "Idu, Abuja — Federal Capital Territory",
    heroImage: "/properties/4-bed-terrace.jpg",
    specs: [
      { label: "Type", value: "Terrace", hint: "4 bedroom" },
      { label: "Available", value: "18 of 80", hint: "Phase One" },
      { label: "Price", value: "₦150M", hint: "From" },
      { label: "Bedrooms", value: "4" },
      { label: "Bathrooms", value: "4" },
      { label: "Built area", value: "280m²" },
    ],
    progress: CURRENT_PROGRESS,
    overview: [
      "The Terrace is the entry point to Southern Bridge City — a four-bedroom residence designed for families who understand that quality and scale are not the same thing. At 280m², it is precisely sized: no wasted circulation, no rooms that exist for status rather than use.",
      "The ground floor opens generously from a covered entrance to a connected kitchen, dining, and living zone that extends to a private walled garden at the rear. The first floor holds three bedrooms and a family bathroom arranged around a landing that doubles as a reading nook. The second floor is the master suite — the whole floor, with a dressing room, a double-aspect bathroom, and its own small terrace.",
      "The Terrace is also the most MREIF-accessible typology at Southern Bridge City. At ₦150M, the required 10% equity contribution is ₦15M, with a monthly repayment on MREIF terms that compares favourably to the equivalent rent in the surrounding area.",
    ],
    details: [
      ...CONSTRUCTION_DETAILS,
      "Terrace units share party walls on both sides, with acoustic isolation specified to a higher standard than statutory minimum: 250mm dense blockwork with 75mm mineral wool achieves Rw 58dB — comparable to high-quality European apartment construction.",
    ],
    amenities: [
      {
        title: "Private rear garden",
        description:
          "Each terrace unit has a walled rear garden of approximately 40m², delivered with a laid lawn and perimeter planting. Direct access from the kitchen and dining zone.",
      },
      {
        title: "Single covered parking bay",
        description:
          "One dedicated covered parking space per unit, with EV charging conduit ready for future activation.",
      },
      ...ESTATE_AMENITIES,
    ],
    gallery: [
      {
        src: "/properties/7253/wide-view.png",
        alt: "The Terrace street frontage at Southern Bridge City",
        ratio: "tall",
      },
      {
        src: "/properties/7253/7253-full-view.png",
        alt: "Open-plan kitchen and dining area",
        ratio: "wide",
      },

      {
        src: "/properties/7253/elevation-approach.png",
        alt: "Rear garden with terrace paving",
        ratio: "wide",
      },
      {
        src: "/properties/7253/7253-estate-view.png",
        alt: "Bathroom with full-height tile",
        ratio: "square",
      },
      {
        src: "/properties/7253/ground-floor.png",
        alt: "Living room with garden aspect",
        ratio: "square",
      },
      {
        src: "/properties/7253/first-floor.png",
        alt: "Master bedroom top floor suite",
        ratio: "tall",
      },
    ],
    // PLACEHOLDER — add images to /public/floor-plans/4-bed-terrace/
    floorPlans: [
      { floor: "Ground Floor", imageUrl: "/floor-plans/4-bed-terrace/ground.jpg" },
      { floor: "First Floor", imageUrl: "/floor-plans/4-bed-terrace/first.jpg" },
    ],
    floorPlanPdf: "/floor-plans/4-bed-terrace/floor-plan.pdf",
    locationContext: {
      address: ADDRESSES["4-bed-terrace"],
      coords: COORDS["4-bed-terrace"],
      travelTimes: TRAVEL_TIMES,
    },
    pricing: { from: "₦150,000,000" },
  },

  // -------------------------------------------------------------------------
  // 3. THE SIX — 6 bed · ₦220M
  // -------------------------------------------------------------------------
  {
    slug: "6-bed-terrace",
    title: "The Six",
    subtitle: "A six-bedroom terrace residence at Southern Bridge City",
    location: "Idu, Abuja — Federal Capital Territory",
    heroImage:
      "/properties/6-bed-terrace.jpg",
    specs: [
      { label: "Type", value: "Terrace", hint: "6 bedroom" },
      { label: "Available", value: "6 of 32", hint: "Phase One" },
      { label: "Price", value: "₦220M", hint: "From" },
      { label: "Bedrooms", value: "6" },
      { label: "Bathrooms", value: "6" },
      { label: "Built area", value: "420m²" },
    ],
    progress: CURRENT_PROGRESS,
    overview: [
      "The Six is the largest typology at Southern Bridge City — a six-bedroom terrace residence for households that need space without sacrificing the close-knit feeling of a well-planned home. At 420m² across four floors, it is more house than most Abuja neighbourhoods can offer at any price.",
      "The plan is organised by generation: the ground floor hosts guests and formal gatherings; the first floor is the family heart — open kitchen, double-height living space, a breakfast room that becomes a homework room by afternoon. The second and third floors divide cleanly into two zones, each with its own bathrooms and adequate natural light, so parents and children each have a floor that feels like theirs.",
      "For those who work from home, The Six includes a dedicated study on the ground floor — a room that closes properly, with acoustic separation from the main living spaces, independent air conditioning, and its own WC. It reads as a proper office, not an afterthought.",
    ],
    details: [
      ...CONSTRUCTION_DETAILS,
      "The Six spans four storeys, requiring a stiffer structural frame than the three-storey typologies. The concrete frame is uprated accordingly — 400mm columns at the lower levels — and the stair core is designed as a structural shear wall, providing lateral stability without visible cross-bracing.",
      "A dedicated study on the ground floor is acoustically isolated from the main living space: 150mm acoustic partition, independent HVAC zone, and Cat-6/fibre terminated at a dedicated server shelf.",
    ],
    amenities: [
      {
        title: "Dedicated home study",
        description:
          "A fully enclosed ground-floor office with acoustic isolation, independent air conditioning, structured cabling, and its own WC — designed for professionals working from home.",
      },
      {
        title: "Double rear garden",
        description:
          "The largest private garden of any typology — approximately 80m² — with a separate utility area and a children's lawn zone delivered with mature planting.",
      },
      {
        title: "Three covered parking bays",
        description:
          "Three dedicated covered parking spaces, with EV charging conduit at all three bays.",
      },
      ...ESTATE_AMENITIES,
    ],
    gallery: [
      {
        src: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=85&auto=format&fit=crop",
        alt: "The Six — four-storey facade at Southern Bridge City",
        ratio: "tall",
      },
      {
        src: "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=1600&q=85&auto=format&fit=crop",
        alt: "Double-height living space",
        ratio: "wide",
      },
      {
        src: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=85&auto=format&fit=crop",
        alt: "Open kitchen and breakfast room",
        ratio: "square",
      },
      {
        src: "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=1600&q=85&auto=format&fit=crop",
        alt: "Ground floor home study",
        ratio: "tall",
      },
      {
        src: "https://images.unsplash.com/photo-1600566753104-685f4f24cb4d?w=1600&q=85&auto=format&fit=crop",
        alt: "Principal master suite — third floor",
        ratio: "wide",
      },
      {
        src: "https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1600&q=85&auto=format&fit=crop",
        alt: "Rear garden with mature planting",
        ratio: "square",
      },
    ],
    // PLACEHOLDER — add images to /public/floor-plans/6-bed-terrace/
    floorPlans: [
      { floor: "Ground Floor", imageUrl: "/floor-plans/6-bed-terrace/ground.jpg" },
      { floor: "First Floor", imageUrl: "/floor-plans/6-bed-terrace/first.jpg" },
      { floor: "Second Floor", imageUrl: "/floor-plans/6-bed-terrace/second.jpg" },
    ],
    floorPlanPdf: "/floor-plans/6-bed-terrace/floor-plan.pdf",
    locationContext: {
      address: ADDRESSES["6-bed-terrace"],
      coords: COORDS["6-bed-terrace"],
      travelTimes: TRAVEL_TIMES,
    },
    pricing: { from: "₦220,000,000" },
  },

  // -------------------------------------------------------------------------
  // 4. THE FIVE — 5 bed · ₦220M
  // -------------------------------------------------------------------------
  {
    slug: "5-bed-semi-detached",
    title: "The Five",
    subtitle: "A five-bedroom semi-detached residence at Southern Bridge City",
    location: "Idu, Abuja — Federal Capital Territory",
    heroImage:
      "/properties/5-bed-semi-detached.jpg",
    specs: [
      { label: "Type", value: "Semi-Detached", hint: "5 bedroom" },
      { label: "Available", value: "5 of 48", hint: "Phase One" },
      { label: "Price", value: "₦220M", hint: "From" },
      { label: "Bedrooms", value: "5" },
      { label: "Bathrooms", value: "5" },
      { label: "Built area", value: "380m²" },
    ],
    progress: CURRENT_PROGRESS,
    overview: [
      "The Five is the premium semi-detached — the typology that offers the most generous balance of indoor and outdoor space across the Phase One portfolio. Five bedrooms across three floors, with one positioned on the ground floor as a proper guest suite: separate entrance from the covered walkway, its own bathroom, independently air-conditioned.",
      "The upper floors follow a clear logic: the first holds three family bedrooms around a generous landing with a study alcove, sharing two bathrooms. The second floor is the master — the full footprint of the plan, with a dressing room equal in size to a fourth bedroom, a freestanding bath in the en-suite, and a private roof terrace looking back into the estate's landscaped spine.",
      "Unlike the terrace typologies, The Five has windows on three sides of the structure. The dual aspect at the rear floods the kitchen and main living space with changing light across the day, making the rooms feel larger than their floor area suggests.",
    ],
    details: [
      ...CONSTRUCTION_DETAILS,
      "The Five includes a ground-floor guest suite with acoustic isolation from the main house: a full party wall separation rather than a standard internal partition. The suite has its own air-conditioning unit, structured cabling, and an independently metered electricity connection — suitable for use as a home office, a dependent relative's accommodation, or a revenue-generating short-let.",
      "The master-level roof terrace is waterproofed and delivered with drainage, a tap, and a power socket. Balustrade is powder-coated steel — maintenance-free, rated for Abuja's climate.",
    ],
    amenities: [
      {
        title: "Ground-floor guest suite",
        description:
          "An acoustically isolated bedroom with its own bathroom and separate external door — suitable as a guest suite, a home office, or an annexed living unit for a dependent relative.",
      },
      {
        title: "Master-level roof terrace",
        description:
          "A private outdoor terrace off the master suite on the third floor, delivered with waterproofing, drainage, a power socket, and a tap. Overlooking the estate's landscaped spine.",
      },
      {
        title: "Double covered parking",
        description:
          "Two dedicated covered parking spaces, with EV charging conduit installed at both bays.",
      },
      {
        title: "Side courtyard garden",
        description:
          "The semi-detached configuration allows a side passage that becomes a private courtyard — screened from the road, accessible from the kitchen and the guest suite.",
      },
      ...ESTATE_AMENITIES,
    ],
    gallery: [
      {
        src: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=85&auto=format&fit=crop",
        alt: "The Five — semi-detached facade with side courtyard",
        ratio: "tall",
      },
      {
        src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85&auto=format&fit=crop",
        alt: "Triple-aspect living and dining space",
        ratio: "wide",
      },
      {
        src: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=85&auto=format&fit=crop",
        alt: "Ground-floor guest suite",
        ratio: "square",
      },
      {
        src: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1600&q=85&auto=format&fit=crop",
        alt: "Master suite with freestanding bath",
        ratio: "tall",
      },
      {
        src: "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=1600&q=85&auto=format&fit=crop",
        alt: "Private roof terrace off the master level",
        ratio: "wide",
      },
      {
        src: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1600&q=85&auto=format&fit=crop",
        alt: "Side courtyard garden accessed from kitchen",
        ratio: "square",
      },
    ],
    // PLACEHOLDER — add images to /public/floor-plans/5-bed-semi-detached/
    floorPlans: [
      { floor: "Ground Floor", imageUrl: "/floor-plans/5-bed-semi-detached/ground.jpg" },
      { floor: "First Floor", imageUrl: "/floor-plans/5-bed-semi-detached/first.jpg" },
    ],
    floorPlanPdf: "/floor-plans/5-bed-semi-detached/floor-plan.pdf",
    locationContext: {
      address: ADDRESSES["5-bed-semi-detached"],
      coords: COORDS["5-bed-semi-detached"],
      travelTimes: TRAVEL_TIMES,
    },
    pricing: { from: "₦220,000,000" },
  },

  // -------------------------------------------------------------------------
  // 5. THE PAVILION — 4 bed · ₦130M
  // -------------------------------------------------------------------------
  {
    slug: "4-bed-block-flats",
    title: "The Pavilion",
    subtitle: "A four-bedroom apartment at Southern Bridge City",
    location: "Idu, Abuja — Federal Capital Territory",
    heroImage:
      "/properties/4-bed-block-flats.jpg",
    specs: [
      { label: "Type", value: "Apartment", hint: "4 bedroom" },
      { label: "Available", value: "22 of 96", hint: "Phase One" },
      { label: "Price", value: "₦130M", hint: "From" },
      { label: "Bedrooms", value: "4" },
      { label: "Bathrooms", value: "3" },
      { label: "Built area", value: "220m²" },
    ],
    progress: CURRENT_PROGRESS,
    overview: [
      "The Pavilion is Southern Bridge City's apartment typology — a four-bedroom flat within a low-rise block designed for households who want the full benefit of the estate without the overhead of a standalone house. At ₦130M, it is the most accessible entry to Phase One and the most compelling investment case on the site.",
      "The flat plan is direct: a wide entrance hallway that doubles as a gallery, opening to an L-shaped living and dining space with a kitchen off one arm and a balcony off the other. Three standard bedrooms share a family bathroom and a second shower room; the master bedroom is at the far end of the plan — quiet, with its own bathroom and a balcony facing the estate's landscaped interior.",
      "For investors, The Pavilion is the primary target. The professional rental market in Idu commands ₦5–7M annually for four-bedroom flats; at purchase, this represents a gross yield of between 3.8% and 5.4% before capital appreciation. MREIF financing reduces the equity-in to ₦13M — making this one of the few investment-grade properties in Abuja accessible without significant upfront capital.",
    ],
    details: [
      "The Pavilion block is four storeys with a passenger lift serving all levels. Structural frame is the same reinforced concrete specification as the standalone typologies. Floor-to-ceiling height is 3.0 metres — 200mm lower than the houses, but still markedly above standard apartment construction in Abuja.",
      "Sound isolation between apartments is achieved through concrete slab and screed construction on all floors (no timber joists), with acoustic underlay below finished floor finishes. Party walls are 200mm dense blockwork with mineral wool cavity.",
      "Each apartment has its own utility space within the flat — no shared plant rooms or external metres. Hot water is delivered by an individual high-recovery electric geyser sized for a four-person household. Air conditioning units are individually owned and maintained; the block specification includes concealed condenser positions on the external wall so units are installed without exposed pipework on the facade.",
      "Balconies are 1,200mm deep — usable as an outdoor dining or seating area, not merely a token gesture. Balustrade is structural glass with a powder-coated steel handrail, maintaining the view from inside.",
    ],
    amenities: [
      {
        title: "Private balconies",
        description:
          "Each apartment has at least one 1,200mm-deep usable balcony. The master bedroom and living room each have their own — the living balcony faces the estate garden, the master balcony faces east.",
      },
      {
        title: "Passenger lift",
        description:
          "A six-person passenger lift serves all four floors. Lift maintenance is included in the service charge for the first two years after handover.",
      },
      {
        title: "One covered parking space",
        description:
          "One dedicated ground-level covered parking bay per apartment, with EV conduit installed.",
      },
      {
        title: "Secure bicycle store",
        description:
          "A ground-floor locked bicycle store accommodates two bicycles per apartment.",
      },
      ...ESTATE_AMENITIES,
    ],
    gallery: [
      {
        src: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&q=85&auto=format&fit=crop",
        alt: "The Pavilion block facade at Southern Bridge City",
        ratio: "tall",
      },
      {
        src: "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1600&q=85&auto=format&fit=crop",
        alt: "Open-plan living and dining with balcony",
        ratio: "wide",
      },
      {
        src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=85&auto=format&fit=crop",
        alt: "Kitchen with integrated appliances",
        ratio: "square",
      },
      {
        src: "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=1600&q=85&auto=format&fit=crop",
        alt: "Master bedroom with east-facing balcony",
        ratio: "tall",
      },
      {
        src: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1600&q=85&auto=format&fit=crop",
        alt: "Living balcony overlooking estate garden",
        ratio: "wide",
      },
      {
        src: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1600&q=85&auto=format&fit=crop",
        alt: "Bathroom with thermostatic fittings",
        ratio: "square",
      },
    ],
    // PLACEHOLDER — add images to /public/floor-plans/4-bed-block-flats/
    floorPlans: [
      { floor: "Ground Floor", imageUrl: "/floor-plans/4-bed-block-flats/ground.jpg" },
    ],
    floorPlanPdf: "/floor-plans/4-bed-block-flats/floor-plan.pdf",
    locationContext: {
      address: ADDRESSES["4-bed-block-flats"],
      coords: COORDS["4-bed-block-flats"],
      travelTimes: TRAVEL_TIMES,
    },
    pricing: { from: "₦130,000,000" },
  },
];

// ---------------------------------------------------------------------------
// LOOKUP HELPERS
// ---------------------------------------------------------------------------

/** Get all properties — for listing pages and static generation */
export function getAllProperties(): Property[] {
  return ALL_PROPERTIES;
}

/** Get all slugs — for generateStaticParams */
export function getAllPropertySlugs(): string[] {
  return ALL_PROPERTIES.map((p) => p.slug);
}

/** Get a single property by slug — returns undefined if not found */
export function getPropertyBySlug(slug: string): Property | undefined {
  return ALL_PROPERTIES.find((p) => p.slug === slug);
}

// ---------------------------------------------------------------------------
// BACKWARDS COMPAT — kept so any existing import of SAMPLE_PROPERTY doesn't
// break until the detail page is updated. Remove once [slug]/page.tsx is done.
// ---------------------------------------------------------------------------
export const SAMPLE_PROPERTY = ALL_PROPERTIES[0];
