import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useReveal, vimg } from "@/pages/home/RealEstateLandingPage.tsx";

// ─────────────────────────────────────────────────────────────────────────────
// Projects (portfolio): data and the /projects list page, ported from the
// Next.js site. The detail page lives in ./detail.tsx.
// ─────────────────────────────────────────────────────────────────────────────

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
  heroVideoUrl?: string;      // mp4 URL, if set, hero plays video instead of image
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

// PLACEHOLDER IMAGERY, Unsplash architectural references
// Search "PLACEHOLDER" in this file to find every image to swap

export const PROJECTS: Project[] = [
  // -------------------------------------------------------------------------
  // RESIDENTIAL, Ongoing
  // -------------------------------------------------------------------------
  {
    slug: "southern-bridge-city",
    name: "Southern Bridge City",
subtitle: "A gated estate of over 1,850 homes in Idu, Abuja",
    category: "Residential",
    status: "Ongoing",
    year: 2024,
    location: "Idu, Abuja",
    scope: "1,850+ residences · 12 typologies · M&E infrastructure",
    coverImage: "/SBC-poster.png",
    gallery: [
      { src: "/SBC-poster.png", alt: "Southern Bridge City, site overview" },
      { src: "/Aerial+1.webp", alt: "Southern Bridge City, aerial view 1" },
      { src: "/Aerial+2.webp", alt: "Southern Bridge City, aerial view 2" },
      { src: "/Aerial+view+3.webp", alt: "Southern Bridge City, aerial view 3" },
      { src: "/Drone10.webp", alt: "Southern Bridge City, drone perspective" },
    ],
    overview: [
      "Southern Bridge City is Geodata's flagship development, a 1,850+ unit gated community under construction at Idu, Abuja, a short drive from the Idu Industrial District and the Abuja–Kaduna rail terminal. The masterplan sets blocks of flats, terraces, semi-detached and fully detached homes along a connected street grid.",
      "Every residence qualifies under the Ministry of Finance Incorporated Real Estate Investment Fund (MREIF) for fixed-rate mortgage financing at 9.75% over 20 years, terms no commercial lender in Nigeria currently matches.",
      "The architecture is drawn around proportion, daylight, and the way a family actually uses a home. Materials are specified to age: lime render, brushed limestone, matte clay tile. All utilities run underground. Independent quantity surveyors verify monthly progress against programme.",
    ],
    keyFacts: [
      { label: "Total units", value: "1,850+" },
      { label: "Phase 1 status", value: "78 roofed · 89% structural" },
      { label: "Typologies", value: "12 unit types" },
      { label: "Mortgage", value: "MREIF qualified" },
      { label: "Site area", value: "Idu, Abuja FCT" },
      { label: "Completion", value: "2026 (Phase 1)" },
    ],
  },
  {
    slug: "cool-army-estate",
    name: "Cool Army Estate",
subtitle: "20 homes in five styles in Owerri, Imo State",
    category: "Residential",
    status: "Ongoing",
    year: 2024,
    location: "Owerri, Imo State",
    scope: "20 residences · five housing typologies",
    coverImage: "/media/file_a0vz1fXHfhZ6aIknWcCC6HjK.jpg",
    gallery: [
      { src: "/Cool.png", alt: "Cool Army Estate, site overview" },
      { src: "/construction/structure-cool-army-estate-1778773244315.jpg", alt: "Cool Army Estate, structural progress" },
      { src: "/construction/structure-cool-army-estate-1778773244331.jpg", alt: "Cool Army Estate, construction detail" }, { src: "/media/file_mgLgZeDkjFQEFJ2u87JYXt2M.jpg", alt: "Cool Army Estate, corner block under construction" }, { src: "/media/file_IWcqj4VBSghBAMF7YpmNnv37.jpg", alt: "Cool Army Estate, row of blocks along the estate road" }, { src: "/media/file_BG1BUAfyugztCiTW4iC4vMWt.jpg", alt: "Cool Army Estate, site progress" },
    ],
    overview: [
      "Cool Army Estate is Geodata's first project in the South-East, twenty residences across five typologies, designed and built on behalf of Cool Real Estate to serve army officers and middle-income families in Owerri.",
      "Construction is active on site. The build follows Geodata's standard specification, reinforced concrete frame, underground utilities, paved internal roads, adapted to Owerri's climate and ground conditions.",
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
subtitle: "A 23-room student hostel in Abuja",
    category: "Residential",
status: "Completed",
    year: 2025,
    location: "Abuja, FCT",
    scope: "23 rooms · 50 bed spaces · student housing",
    coverImage: "/ize-hostel/Exterior.JPG", heroVideoUrl: "https://res.cloudinary.com/drort9cs1/video/upload/v1793213435/IZE_HOSTEL_b7t4z0.mp4",
    gallery: [
      { src: "/ize-hostel/Exterior.JPG", alt: "Ize Hostel exterior" },
      { src: "/ize-hostel/common-area.JPG", alt: "Common area" },
      { src: "/ize-hostel/pool.JPG", alt: "Swimming pool" },
      { src: "/ize-hostel/1-bed.JPG", alt: "1-bed room" },
      { src: "/ize-hostel/2-bed.JPG", alt: "2-bed room" },
    ],
    overview: [
      "Ize Hostel is a purpose-built residence for students at Nile University and Baze University in Abuja. 23 rooms, 50 bed spaces, planned around how students actually use their day, study, rest, and time with friends.",
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
  // RESIDENTIAL, Completed
  // -------------------------------------------------------------------------
  {
    slug: "southern-bridge-estate",
    name: "Southern Bridge Estate",
subtitle: "27 homes in a gated estate in Jabi, Abuja",
    category: "Residential",
status: "Ongoing",
    year: 2023,
completionYear: 0,
    location: "Jabi, Abuja",
    scope: "27 units · full infrastructure",
    coverImage: "/media/file_fpQMG9dBSvYZRVhx7HeWY8GV.webp", heroVideoUrl: "https://res.cloudinary.com/drort9cs1/video/upload/v1793213441/SOUTHERN_BRIDGE_ESTATE_ua0nht.mp4", heroVideoPoster: "/media/file_fpQMG9dBSvYZRVhx7HeWY8GV.webp",
    gallery: [ { src: "/media/file_fpQMG9dBSvYZRVhx7HeWY8GV.webp", alt: "Southern Bridge Estate, aerial view of the completed blocks and courtyard" }, { src: "/media/file_3TTfxTayHkFAjAQw9jMXmcOY.webp", alt: "Southern Bridge Estate, estate setting and surrounding area from above" }, { src: "/media/file_zOL3x16msZS58DZc7lXjMS6U.webp", alt: "Southern Bridge Estate, blocks in finishing stages around the courtyard" }, { src: "/media/file_2qgMSplJrWqRFlgTbhx3nQMr.webp", alt: "Southern Bridge Estate, front elevation of the finished semi-detached homes" }, { src: "/media/file_merSTENMAKiIEv73IsDKcJHZ.webp", alt: "Southern Bridge Estate, completed homes and driveways" }, { src: "/media/file_DJGVLF4ogOYMBwgC0cKqFzrs.webp", alt: "Southern Bridge Estate, side view of the completed homes" },
      { src: "/SBDrone2.webp", alt: "Southern Bridge Estate, aerial overview" },
      { src: "/SBDrone5.webp", alt: "Southern Bridge Estate, roofline" },
      { src: "/SBDrone6.webp", alt: "Southern Bridge Estate, streetscape" },
      { src: "/SBDrone7.webp", alt: "Southern Bridge Estate, estate aerial" },
      { src: "/properties/SBE/SBE-VIEWS.jpeg", alt: "Southern Bridge Estate, street view" },
      { src: "/properties/SBE/SBE0.jpeg", alt: "Southern Bridge Estate, frontage" },
    ],
    overview: [
      "Southern Bridge Estate is Geodata's gated residential development in Jabi, twenty-seven residences across multiple typologies, delivered with the full estate infrastructure: paved roads, drainage, perimeter security, every utility underground.",
"Phase One is complete and Phase Two is at finishing stage. The estate proved the design and construction approach now scaling to 1,850+ residences at Southern Bridge City.",
    ],
    keyFacts: [
      { label: "Units", value: "27" },
{ label: "Available", value: "9" },
      { label: "Location", value: "Jabi, Abuja" },
{ label: "Status", value: "Mostly delivered" },
    ],
  },
  {
    slug: "country-court-estate",
    name: "Country Court Estate",
subtitle: "24 homes of three types in Abuja",
    category: "Residential",
    status: "Completed",
    year: 2020,
    completionYear: 2022,
    location: "Abuja, FCT",
    scope: "24 units · mixed housing types · full infrastructure",
    coverImage: "/media/file_xDJ2uZYE9PtHFnFwfZ7sb5cX.webp",
    heroVideoUrl: "https://res.cloudinary.com/drort9cs1/video/upload/v1793213447/COUNTRY_COURT_cztyzu.mp4",
    heroVideoPoster: "/media/file_xDJ2uZYE9PtHFnFwfZ7sb5cX.webp",
    gallery: [ { src: "/media/file_xDJ2uZYE9PtHFnFwfZ7sb5cX.webp", alt: "Country Court Estate, aerial view of the estate" }, { src: "/media/file_f2xqGf2DU5IKdlr3fYKl7Z3z.webp", alt: "Country Court Estate, front aerial view" }, { src: "/media/file_ZZpYd89pkeSjOAZCQZnzeS8h.webp", alt: "Country Court Estate, access road and estate" }, { src: "/media/file_m7nwK2dcWkFbB9YKlFnXSW4T.webp", alt: "Country Court Estate, street facade" }, { src: "/media/file_mbj6y7816ZGzT2IaIo6bw6Ac.webp", alt: "Country Court Estate, rooftops from above" }, { src: "/media/file_ISfOS2OBYm3K9Uhi0wg7YTmo.webp", alt: "Country Court Estate, estate and site" },
      { src: "/DRONECC2.webp", alt: "Country Court Estate aerial view" },
      { src: "/DRONECC3.webp", alt: "Country Court Estate drone overview" },
      { src: "/DRONECC4.webp", alt: "Country Court Estate site perspective" },
      { src: "/DRONECC5.webp", alt: "Country Court Estate rooftop view" },
      { src: "/DRONECC6.webp", alt: "Country Court Estate streetscape" },
      { src: "/DRONECC7.webp", alt: "Country Court Estate compound" },
      { src: "/DRONECC8.webp", alt: "Country Court Estate estate overview" },
    ],
    overview: [
      "Country Court Estate is a 24-unit gated residential development completed in Abuja in 2022. The project blended three housing typologies, semi-detached, terrace, and detached, into a single coherent estate plan, with shared infrastructure and a managed estate office.",
"Every home in the estate is sold and lived in. We built all three home types in under two years.",
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
    name: "Kashere Bungalows",
    subtitle: "20 three-bedroom bungalows in Kashere, Gombe State",
    category: "Federal Government",
    status: "Completed",
    year: 2017,
    completionYear: 2018,
    location: "Kashere, Gombe State",
    client: "Federal Government",
    scope: "20 three-bedroom bungalows with BQ",
    coverImage: "/media/file_TyN2Ir7jQEsL8Xt1xETKfMsA.jpg",
    gallery: [
      { src: "/media/file_TyN2Ir7jQEsL8Xt1xETKfMsA.jpg", alt: "Bungalow row at Kashere, Gombe State" },
      { src: "/media/file_s3EyUtWrQH5bS2gFaLVwuxFy.jpg", alt: "Site works and foundations at Kashere" },
      { src: "/media/file_Y80ZwGoJ6td5q3MPMuhh15qn.jpg", alt: "Construction crew carrying out site works at Kashere" },
    ],
    overview: [
      "Construction of 20 units of 3-bedroom bungalows with BQ in Kashere, Gombe State.",
    ],
    keyFacts: [
      { label: "Units", value: "20" },
      { label: "Type", value: "3-bedroom bungalows with BQ" },
      { label: "Client", value: "Federal Government" },
      { label: "Completed", value: "2018" },
    ],
  },
  {
    slug: "sil-estate",
    name: "SIL Estate",
subtitle: "Over 180 homes in Abuja",
    category: "Residential",
    status: "Completed",
    year: 2013,
    completionYear: 2015,
    location: "Abuja, FCT",
    scope: "180+ units",
    coverImage: "/media/file_hzbEBxtKSk6rU7pzzbdU1GFj.webp", heroVideoUrl: "https://res.cloudinary.com/drort9cs1/video/upload/v1793213439/SIL_ESATATE_drzduw.mp4", heroVideoPoster: "/media/file_hzbEBxtKSk6rU7pzzbdU1GFj.webp",
    gallery: [ { src: "/media/file_hzbEBxtKSk6rU7pzzbdU1GFj.webp", alt: "SIL Estate, aerial view along the main estate road" }, { src: "/media/file_aE1REspFoBK0pK1gIuwuGIlr.webp", alt: "SIL Estate, estate skyline and surrounding hills" }, { src: "/media/file_PSav2Bmdi0UOpexmSt6LzSEn.webp", alt: "SIL Estate, homes along the street" }, { src: "/media/file_Bs5HgQOUjc7fuIuUpZN9TeR6.webp", alt: "SIL Estate, residences and roads from above" }, { src: "/media/file_59fISzMFIh7g6ab2WamR63Bj.webp", alt: "SIL Estate, residential plots and access roads" }, { src: "/media/file_lN2Qee2V0L7MLRmrgbAD4Bpi.webp", alt: "SIL Estate, aerial view of completed homes" }, { src: "/media/file_bnvgUShp7rb9dHKyNpALhVpd.webp", alt: "SIL Estate, estate streetscape" }, { src: "/media/file_9aH7y4cGZPkx5ZaiJcUnHe2t.webp", alt: "SIL Estate, completed homes and estate roads" },
      { src: "/sil/sil-estate-overview.jpg", alt: "SIL Estate overview" },
      { src: "/sil/sil-estate-area-view.jpg", alt: "SIL Estate area view" },
      { src: "/sil/sil-estate-access-road.jpg", alt: "SIL Estate access road" },
      { src: "/sil/sil-estate-bridge-construction.jpg", alt: "SIL Estate bridge construction" },
      { src: "/sil/sil-estate-construction-site.jpg", alt: "SIL Estate construction site" },
    ],
    overview: [
      "SIL Estate remains the largest single residential project Geodata has delivered to date, over 180 housing units, completed in 2015. The development demonstrates the firm's capacity to manage and deliver large-scale housing programmes against fixed timelines.",
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
    coverImage: "/media/file_lKcCqORLD7rAQyGOteN4e0Va.webp", heroVideoUrl: "https://res.cloudinary.com/drort9cs1/video/upload/v1793213421/MABUSHI_MALL_hcdk6r.mp4", heroVideoPoster: "/media/file_lKcCqORLD7rAQyGOteN4e0Va.webp",
    gallery: [ { src: "/media/file_lKcCqORLD7rAQyGOteN4e0Va.webp", alt: "Mabushi Shopping Complex, aerial view of the structure and surrounding site" }, { src: "/media/file_E2X2xPzp835xn7Be16Xnm9d0.webp", alt: "Mabushi Shopping Complex, aerial view from the roadside" }, { src: "/media/file_Qf5uEsZvl7z7PzAkUjLCXrhk.webp", alt: "Mabushi Shopping Complex, rear aerial view" }, { src: "/media/file_XmgQDaqknWYwbVkaQqaB25X6.webp", alt: "Mabushi Shopping Complex, scaffolded structural frame" }, { src: "/media/file_3ePkqlzTN2yQLrR3X3Duf1xs.webp", alt: "Mabushi Shopping Complex, aerial view of the building and neighbouring estates" }, { src: "/media/file_fTjJTPxONTblhJ7NZdnjsspw.webp", alt: "Mabushi Shopping Complex, building frame in the city skyline" }, { src: "/media/file_bUPXCI2HY43e5npqL6VIv2C4.webp", alt: "Mabushi Shopping Complex, front elevation during construction" }, { src: "/media/file_x52MI8KxOWC8eRsljBOOM4eo.webp", alt: "Mabushi Shopping Complex, upper floors and roof slab" },
      { src: "/mabushi/scaffolded-building-aerial.jpg", alt: "Mabushi Shopping Complex under construction, aerial" },
      { src: "/mabushi/building-frame-aerial.jpg", alt: "Mabushi Shopping Complex structural frame, aerial" },
      { src: "/mabushi/roadside-building-aerial.jpg", alt: "Mabushi Shopping Complex roadside view, aerial" },
    ],
    overview: [
      "A six-storey commercial complex currently under construction in Mabushi District, Abuja. The development represents Geodata's first standalone commercial building project, designed to serve retail, food and beverage, and small office tenants.",
      "Construction follows the same engineering and finish standards as the firm's residential portfolio, reinforced concrete frame, architectural concrete cladding, fully underground utilities, scaled appropriately for commercial loads and tenant fit-out flexibility.",
    ],
    keyFacts: [
      { label: "Storeys", value: "Six" },
      { label: "Type", value: "Mixed commercial" },
      { label: "Status", value: "Ongoing" },
      { label: "Location", value: "Mabushi, Abuja" },
    ],
  },

  // -------------------------------------------------------------------------
  // INSTITUTIONAL, federal agencies, banks, universities
  // -------------------------------------------------------------------------
  {
    slug: "firs-office-programme",
    name: "FIRS office programme",
subtitle: "Renovation and remodelling of FIRS offices in Abuja",
    category: "Federal Government",
    status: "Completed",
    year: 2014,
    completionYear: 2018,
    location: "Abuja",
    client: "Federal Inland Revenue Service",
    scope: "Two sites · retrofit, renovation and remodelling",
    coverImage: "/media/file_PTXc3ELY9IFqxaet8LrRyF01.jpg",
    gallery: [
      { src: "/media/file_JTUoJPGHM9DunvwIPiUJk7j8.jpg", alt: "Before: FIRS office, No. 12 Sokode Crescent, Wuse Zone 5" },
      { src: "/media/file_PTXc3ELY9IFqxaet8LrRyF01.jpg", alt: "After: FIRS office, No. 12 Sokode Crescent, Wuse Zone 5" },
      { src: "/media/file_yOKw2j9YG3i2Y5gTibwZ6LcH.jpg", alt: "Before: FIRS Investigation and Enforcement Unit warehouse, Njamena Crescent, Wuse II" },
      { src: "/media/file_TH52w6uAq5ovGnDFgcxeLQqi.jpg", alt: "After: FIRS Investigation and Enforcement Unit warehouse, Njamena Crescent, Wuse II" },
      { src: "/media/file_bTcmQMk9SYDoT6GL6dvYM1Ay.jpg", alt: "Before: warehouse interior works, Njamena Crescent, Wuse II" },
      { src: "/media/file_YfY95vkNS5k1cQ71Ih4W26q1.jpg", alt: "After: remodelled warehouse, Njamena Crescent, Wuse II" },
    ],
    overview: [
      "Retrofitting, renovation and remodelling of Federal Inland Revenue Service facilities in Abuja.",
      "Retrofitting and renovation of the FIRS office at No. 12 Sokode Crescent, Wuse Zone 5, Abuja.",
      "Remodelling of the warehouse for the FIRS Investigation and Enforcement Unit at Njamena Crescent, Wuse II, Abuja.",
    ],
    keyFacts: [
      { label: "Client", value: "Federal Inland Revenue Service" },
      { label: "Completed", value: "2018" },
      { label: "Sites", value: "Sokode Crescent, Wuse Zone 5 · Njamena Crescent, Wuse II" },
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
    subtitle: "Upgrade of 33.56 km of rural roads across Lots 1 and 2",
    category: "World Bank",
    status: "Ongoing",
    year: 2024,
    location: "Kogi State",
    client: "World Bank / Kogi State Government, KOGI RAAMP",
    scope: "33.56 km rural roads · Lots 1 and 2",
    coverImage: "/media/file_CN5VpGfpgG74R3NFkxgfc6pd.jpg",
    gallery: [
      { src: "/media/file_CN5VpGfpgG74R3NFkxgfc6pd.jpg", alt: "Asphalt paver laying a new road surface, Kogi RAAMP" },
      { src: "/media/file_0EE7uzxtXlY9zF71U7dd5m6o.jpg", alt: "Freshly paved rural road section" },
      { src: "/media/file_U7IiB74BCYGcN1a569y4xnkv.jpg", alt: "Rural road under construction" },
      { src: "/media/file_245331FxEiSoEWGIgJSrxkHG.jpg", alt: "Compaction roller finishing fresh asphalt" },
      { src: "/media/file_V06SfIw2xITAJ7tp49i5X3yY.jpg", alt: "Night asphalt crew working under floodlights" },
      { src: "/media/file_nykAXyPZDZbgD4EUJ2C7QMaq.jpg", alt: "Asphalt temperature inspection on the paver" },
      { src: "/media/file_KzdtwYaGaBeoPnj5R3dse6D3.jpg", alt: "Concrete roadside drainage channel" },
      { src: "/media/file_oaYnB56CdX76Ja86q9iwIHlF.jpg", alt: "Graded road base ready for surfacing" },
    ],
    overview: [
      "Upgrade of 33.56 km of rural roads across Lots 1 and 2, funded by the World Bank with the Kogi State Government.",
      "Delivered under the Kogi State Rural Access and Agricultural Marketing Project (KOGI RAAMP) to expand connectivity for farming communities in central Nigeria.",
      "The upgraded roads link smallholder farmers to markets and post-harvest infrastructure, reducing the cost of moving produce across the state.",
    ],
    keyFacts: [
      { label: "Roads upgraded", value: "33.56 km" },
      { label: "Scope", value: "Lots 1 and 2" },
      { label: "Funder", value: "World Bank" },
      { label: "Status", value: "Ongoing since 2024" },
    ],
  },
];


/** All slugs, used by generateStaticParams */
export function getAllProjectSlugs(): string[] {
  return PROJECTS.map((p) => p.slug);
}

/** Get a single project by slug */
export function getProjectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

/** Get related projects, same category, excluding current */
export function getRelatedProjects(currentSlug: string, category: ProjectCategory, limit = 3): Project[] {
  return PROJECTS.filter(
    (p) => p.slug !== currentSlug && p.category === category
  ).slice(0, limit);
}

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

/** Where a project's page lives (Southern Bridge City has its own sales page). */
export function projectPath(slug: string) {
  return slug === "southern-bridge-city" ? "/southern-bridge-city" : `/projects/${slug}`;
}

export default function ProjectsPage() {
  const [filter, setFilter] = useState<"All" | ProjectCategory>("All");

  useSeo({
    title: "Projects | Geodata World Services",
    description: `${PROJECTS.length} projects across residential, commercial, institutional and infrastructure work in Nigeria, including federal government and Central Bank of Nigeria contracts.`,
    canonicalPath: "/projects",
  });

  const sorted = useMemo(() => {
    const list = filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.category === filter);
    return [...list].sort((a, b) => {
      if (a.status === "Ongoing" && b.status !== "Ongoing") return -1;
      if (a.status !== "Ongoing" && b.status === "Ongoing") return 1;
      return (b.completionYear ?? b.year) - (a.completionYear ?? a.year);
    });
  }, [filter]);

  return (
    <div className="min-h-screen bg-bone">
      <Navbar />
      <main data-v2>
        <ProjectsHeader activeCategory={filter} onCategoryChange={setFilter} count={sorted.length} />
        <ProjectsGrid projects={sorted} />
      </main>
      <Footer />
    </div>
  );
}

function ProjectsHeader({
  activeCategory,
  onCategoryChange,
  count,
}: {
  activeCategory: "All" | ProjectCategory;
  onCategoryChange: (c: "All" | ProjectCategory) => void;
  count: number;
}) {
  const root = useRef<HTMLElement>(null);
  useReveal(root, [
    { sel: ".prh-eyebrow", from: { y: 16 }, duration: 0.8, delay: 0.1, immediate: true },
    { sel: ".prh-title", from: { y: 30 }, duration: 1, delay: 0.4, immediate: true },
    { sel: ".prh-sub", from: { y: 16 }, duration: 0.8, delay: 0.8, immediate: true },
    { sel: ".prh-filter", from: { y: 12 }, duration: 0.7, delay: 1.2, stagger: 0.05, immediate: true },
  ]);

  return (
    <section ref={root} className="relative bg-bone pt-24 pb-16 md:pt-32 md:pb-20 border-b border-hairline">
      <div className="container-editorial">
        <p className="prh-eyebrow eyebrow mb-6">Projects</p>
        <div className="grid grid-cols-12 gap-12 items-end">
          <div className="col-span-12 lg:col-span-8">
<h1 className="prh-title text-display-xl font-display text-navy-950 tracking-tightest font-light">Our projects.</h1>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:pb-3">
            <p className="prh-sub text-lg leading-relaxed text-ink max-w-md">
Nineteen years of homes, offices, public buildings and roads across Nigeria. Here are some of the projects we have finished and the ones we are building now.

            </p>
          </div>
        </div>
<div className="mt-10 md:mt-16 flex flex-nowrap md:flex-wrap items-center gap-2 md:gap-3 overflow-x-auto [scrollbar-width:none] -mx-6 px-6 md:mx-0 md:px-0 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          {PROJECT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={cx(
                "prh-filter relative px-5 py-2.5 text-xs uppercase tracking-eyebrow font-medium transition-all duration-400 ease-editorial border cursor-pointer",
                activeCategory === cat
                  ? "bg-navy-900 text-bone border-navy-900"
                  : "bg-transparent text-navy-900 border-hairline hover:border-navy-900",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <p className="mt-8 text-sm text-ink-faint">
          {count} {count === 1 ? "project" : "projects"}
        </p>
      </div>
    </section>
  );
}

function ProjectsGrid({ projects }: { projects: Project[] }) {
  const root = useRef<HTMLElement>(null);
  useReveal(root, [{ sel: ".pr-card", from: { y: 60 }, duration: 1, stagger: 0.1, start: 85 }], [projects]);

  if (projects.length === 0) {
    return (
      <section className="bg-bone py-32 md:py-48">
        <div className="container-editorial text-center">
          <p className="eyebrow text-ink-faint mb-6">No projects</p>
          <h2 className="font-display text-display-md text-navy-950 tracking-tightest">None in this category, yet.</h2>
        </div>
      </section>
    );
  }

  return (
<section ref={root} className="bg-bone py-12 md:py-32">
      <div className="container-editorial">
<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12 md:gap-y-20 md:pb-24">
          {projects.map((p, i) => (
            <Link key={p.slug} to={projectPath(p.slug)} className={cx("pr-card group block", i % 2 === 1 && "md:translate-y-24")}>
<div className="relative aspect-[4/3] md:aspect-[4/5] overflow-hidden bg-navy-100 mb-6">
                <img
                  src={vimg(p.coverImage)}
                  alt={`${p.name}, ${p.location}`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
                />
                <div
                  className={cx(
                    "absolute top-6 left-6 inline-flex items-center px-3 py-1.5 backdrop-blur-sm",
                    p.status === "Ongoing" ? "bg-coral/95 text-bone" : "bg-bone/95 text-navy-900",
                  )}
                >
                  {p.status === "Ongoing" && <span className="block h-1.5 w-1.5 rounded-full bg-bone mr-2 animate-pulse" />}
                  <span className="text-[10px] uppercase tracking-eyebrow font-medium">{p.status}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-navy-950/60 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <p className="text-[10px] uppercase tracking-eyebrow font-medium text-bone/90">{p.category}</p>
                </div>
              </div>
              <div>
                <p className="eyebrow text-ink-faint mb-2">
                  {p.location}
{p.completionYear ? " · Completed " + p.completionYear : null}
                  {p.status === "Ongoing" && ` · Started ${p.year}`}
                </p>
                <h2 className="font-display text-3xl text-navy-950 leading-tight transition-transform duration-400 ease-editorial group-hover:translate-x-1">
                  {p.name}
                </h2>
                <p className="mt-3 text-base text-ink leading-relaxed">{p.subtitle}</p>
                {p.client && (
                  <p className="mt-4 text-sm text-ink-faint">
                    Client · <span className="text-ink-muted">{p.client}</span>
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
