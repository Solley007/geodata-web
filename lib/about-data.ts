// ---------------------------------------------------------------------------
// About page content
// ---------------------------------------------------------------------------
// Sourced from GEODATA_COMPANY_BACKGROUND.pdf — translated into editorial
// language. The receipts (CBN portfolio, regulatory registrations, completed
// projects) do the trust-building. The copy stays restrained.
// ---------------------------------------------------------------------------

export const COMPANY_FACTS = {
  founded: 2007,
  rcNumber: "RC 688927",
  staff: "80+",
  disciplines: "Architecture · Civil · M&E · Building · Quantity Surveying · ICT",
};

// ---------------------------------------------------------------------------
// NOTE: COMPLETED_PROJECTS and ONGOING_PROJECTS used to live here.
// They have been consolidated into lib/projects-data.ts (the canonical
// portfolio source) which the TrackRecord component now reads from.
// ---------------------------------------------------------------------------


// Institutional client work — reframed as proof, not a list.
export interface InstitutionalClient {
  client: string;
  context: string;
  projects: { year: number; description: string }[];
}

export const INSTITUTIONAL_WORK: InstitutionalClient[] = [
  {
    client: "Central Bank of Nigeria",
    context: "Multiple property renovations across CBN's Maitama portfolio",
    projects: [
      { year: 2019, description: "Renovation of CBN property, 51A Usuma Street, Maitama" },
      { year: 2019, description: "Outdoor kitchen and poolside development, Usuma Street" },
      { year: 2019, description: "Re-roofing and kitchen installation, swimming pool facility" },
      { year: 2019, description: "Renovation of CBN property, 14 Vattern Street, Maitama" },
      { year: 2019, description: "Re-roofing, balcony tiles and POP ceiling replacement" },
      { year: 2019, description: "Re-tiling and alteration works, Vattern Street, Maitama" },
    ],
  },
  {
    client: "Federal Inland Revenue Service",
    context: "Office retrofitting and partitioning across multiple FIRS facilities",
    projects: [
      { year: 2014, description: "Retrofit of FIRS office building, Wuse Zone 5, Abuja" },
      { year: 2014, description: "Glass partitioning, Katampe FIRS GBTO/MSTO Office" },
      { year: 2014, description: "Warehouse remodelling, Investigation & Enforcement Unit, Wuse II" },
      { year: 2014, description: "Glass partitioning, Lafia Prototype ITO/MSTO Office" },
      { year: 2018, description: "Geophysical surveys for motorised borehole, Abuja and Gombe" },
    ],
  },
  {
    client: "Federal Ministries & Universities",
    context: "Public infrastructure across education and rural development",
    projects: [
      { year: 2026, description: "33.56km rural road upgrading, Kogi State (ongoing)" },
      { year: 2026, description: "AKU and Agro Logistic Centre, Adavi LGA, Kogi State (ongoing)" },
      { year: 2018, description: "Federal University Kashere — Schools of Remedial Studies" },
      { year: 2017, description: "Federal Ministry of Lands — Community Centre, Okpella, Edo State" },
    ],
  },
];

export interface LeadershipMember {
  name: string;
  title: string;
  prefix?: string;
}

export const LEADERSHIP: LeadershipMember[] = [
  {
    prefix: "Engr.",
    name: "Usman Dauda Abere",
    title: "Managing Director & Chief Executive",
  },
  {
    name: "Farida Yunusa Abere",
    title: "Deputy Managing Director",
  },
  {
    prefix: "Engr.",
    name: "Owuda Aminu Salihu",
    title: "Director of Operations",
  },
  {
    name: "Habib Uba",
    title: "Administration & Welfare Manager",
  },
  {
    name: "Garba Okeke Chamber",
    title: "Company Secretary & Legal Counsel",
  },
];

// Regulatory compliance — the trust-signal grid.
// Order matters: most recognisable / highest-stakes first.
export const COMPLIANCE: { name: string; detail?: string }[] = [
  { name: "Corporate Affairs Commission", detail: "RC 688927" },
  { name: "Real Estate Developers Association of Nigeria", detail: "REDAN Member" },
  { name: "Bureau of Public Procurement", detail: "BPP Registered" },
  { name: "Federal Inland Revenue Service", detail: "Tax Clearance Current" },
  { name: "Pension Commission", detail: "PENCOM Compliant" },
  { name: "Industrial Training Fund", detail: "ITF Registered" },
  { name: "Nigeria Social Insurance Trust Fund", detail: "NSITF Registered" },
  { name: "Financial Reporting Council of Nigeria", detail: "FRCN Registered" },
  { name: "National Health Insurance Scheme", detail: "NHIS Compliant" },
  { name: "VAT Registration", detail: "Active" },
  { name: "Statutory Life Insurance", detail: "In place" },
];
