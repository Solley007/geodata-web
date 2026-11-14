import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { partnerProfileContent } from "./schema/partnerProfile.ts";

// Convex Auth tables (sessions, accounts, codes). Our own `users` table below
// replaces authTables.users and includes its fields.
const { users: _authUsers, ...convexAuthTables } = authTables;

export default defineSchema({
  ...convexAuthTables,
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("super_admin"), v.literal("admin"), v.literal("manager"), v.literal("agent"), v.literal("client"))),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    department: v.optional(v.string()),
    staffId: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    preRegistered: v.optional(v.boolean()), // true = created by admin, not yet signed in
    // Convex Auth fields
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"])
    .index("by_email", ["email"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["role"] }),

  properties: defineTable({
    title: v.string(),
    description: v.string(),
    price: v.number(),
    priceType: v.string(),
    propertyType: v.string(),
    status: v.string(),
    location: v.string(),
    state: v.string(),
    lga: v.string(),
    estate: v.optional(v.string()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    landSize: v.optional(v.string()),
    images: v.array(v.string()),
    featuredImage: v.string(),
    featuredImageStorageId: v.optional(v.id("_storage")),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    amenities: v.array(v.string()),
    featured: v.boolean(),
    agentId: v.optional(v.id("users")),
    mapLat: v.optional(v.number()),
    mapLng: v.optional(v.number()),
    qrCode: v.optional(v.string()),
    views: v.number(),
    videoUrl: v.optional(v.string()),
    yearBuilt: v.optional(v.number()),
    floors: v.optional(v.number()),
    parkingSpaces: v.optional(v.number()),
    plotNumber: v.optional(v.string()),
    // Optional editor-set search listing text; public pages fall back to generated text when empty
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    // ── Diaspora Investment & Property Platform visibility (additive/optional
    //    — never required, never breaks existing property queries/UI). Lets
    //    an existing property/opportunity be surfaced on the public Diaspora
    //    experience without duplicating the record. See convex/diaspora/.
    diasporaVisible: v.optional(v.boolean()),
    diasporaFeatured: v.optional(v.boolean()),
    diasporaEnquiriesOpen: v.optional(v.boolean()),
    diasporaProgrammeKeys: v.optional(
      v.array(v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate"))),
    ),
    diasporaCampaignIds: v.optional(v.array(v.id("diasporaCampaigns"))),
  })
    .index("by_status", ["status"])
    .index("by_type", ["propertyType"])
    .index("by_featured", ["featured"])
    .index("by_state", ["state"])
    .index("by_agent", ["agentId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status", "propertyType", "state"],
    }),

  estates: defineTable({
    name: v.string(),
    description: v.string(),
    state: v.string(),
    lga: v.string(),
    location: v.string(),
    totalPlots: v.number(),
    availablePlots: v.number(),
    soldPlots: v.number(),
    reservedPlots: v.number(),
    pricePerPlot: v.number(),
    image: v.string(),
    status: v.string(),
    features: v.array(v.string()),
    createdBy: v.optional(v.id("users")),
    // ── Diaspora Investment & Property Platform visibility (additive/optional)
    diasporaVisible: v.optional(v.boolean()),
    diasporaFeatured: v.optional(v.boolean()),
    diasporaEnquiriesOpen: v.optional(v.boolean()),
    diasporaProgrammeKeys: v.optional(
      v.array(v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate"))),
    ),
    diasporaCampaignIds: v.optional(v.array(v.id("diasporaCampaigns"))),
  }).index("by_status", ["status"]),

  testimonials: defineTable({
    name: v.string(),
    role: v.string(),
    content: v.string(),
    rating: v.number(),
    avatar: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    featured: v.boolean(),
    location: v.optional(v.string()),    // e.g. "Lagos, Nigeria"
    propertyType: v.optional(v.string()), // e.g. "Residential Plot"
    date: v.optional(v.string()),         // ISO date for "Client since..."
    order: v.optional(v.number()),        // display order
    // Diaspora Investment & Property Platform reuse (additive/optional) — a
    // testimonial can be tagged for display on a Diaspora programme page
    // without creating a second testimonials table.
    diasporaVisible: v.optional(v.boolean()),
    diasporaProgrammeKey: v.optional(v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate"))),
  }).index("by_featured", ["featured"]),

  newsArticles: defineTable({
    title: v.string(),
    excerpt: v.string(),
    content: v.string(),
    image: v.optional(v.string()),            // legacy URL (kept for migration)
    imageStorageId: v.optional(v.id("_storage")),
    category: v.string(),
    author: v.string(),
    published: v.boolean(),
    featured: v.optional(v.boolean()),
    slug: v.string(),
    tags: v.optional(v.array(v.string())),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  })
    .index("by_published", ["published"])
    .index("by_slug", ["slug"]),

  blogComments: defineTable({
    articleId: v.id("newsArticles"),
    name: v.string(),
    email: v.optional(v.string()),
    content: v.string(),
    approved: v.boolean(),
    tokenIdentifier: v.optional(v.string()),
  })
    .index("by_article", ["articleId"])
    .index("by_approved", ["approved"]),

  inquiries: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    message: v.string(),
    propertyId: v.optional(v.id("properties")),
    propertyInterest: v.optional(v.string()),
    type: v.string(),
    status: v.string(),
    assignedTo: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    subject: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
  }).index("by_status", ["status"]).index("by_email", ["email"]).index("by_assigned", ["assignedTo"]),

  subscribers: defineTable({
    email: v.string(),
    active: v.boolean(),
  }).index("by_email", ["email"]),

  activityLog: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    entity: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
  }).index("by_entity", ["entity"]),

  // ── SALES & LEADS ──────────────────────────────────────────────
  leads: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    source: v.string(), // "walk_in","referral","website","social","cold_call","event","diaspora_platform","qr_code"
    stage: v.string(), // "new","contacted","qualified","proposal","negotiation","won","lost"
    propertyInterest: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    estateInterest: v.optional(v.string()),
    budget: v.optional(v.number()),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    expectedCloseDate: v.optional(v.string()),
    priority: v.string(), // "low","medium","high"
    // Diaspora Investment & Property Platform attribution (additive, optional
    // — every existing lead and every non-Diaspora lead simply omits these).
    // Never a second leads table: the Diaspora platform reuses this one.
    country: v.optional(v.string()),
    diasporaMarketId: v.optional(v.id("diasporaMarkets")),
    programmeInterest: v.optional(v.array(v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate")))),
    diasporaCampaignId: v.optional(v.id("diasporaCampaigns")),
    customerSegment: v.optional(v.string()), // e.g. "Diaspora Nigerian","International Investor","Returning Resident"
    // Purchase intent captured directly from a property page's "Buy Outright"/
    // "Buy With Mortgage" action — lets sales see the buyer's preferred
    // financing method immediately instead of asking from scratch.
    financePreference: v.optional(v.union(v.literal("outright"), v.literal("mortgage"))),
    clientId: v.optional(v.id("clients")), // set when submitted by a signed-in client
  })
    .index("by_stage", ["stage"])
    .index("by_assigned", ["assignedTo"])
    .index("by_client", ["clientId"])
    .index("by_diaspora_campaign", ["diasporaCampaignId"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["stage"] }),

  commissions: defineTable({
    agentId: v.id("users"),
    propertyId: v.optional(v.id("properties")),
    saleAmount: v.number(),
    commissionRate: v.number(), // percentage e.g. 5
    commissionAmount: v.number(),
    status: v.string(), // "pending","approved","paid"
    transactionDate: v.string(),
    notes: v.optional(v.string()),
    approvedBy: v.optional(v.id("users")),
  })
    .index("by_agent", ["agentId"])
    .index("by_status", ["status"]),

  // ── STAFF ──────────────────────────────────────────────────────
  staffProfiles: defineTable({
    userId: v.optional(v.id("users")),
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
    department: v.string(),
    departmentId: v.optional(v.id("departments")), // links to org chart; keeps department name in sync when renamed/moved
    jobTitle: v.string(),
    staffId: v.string(),
    employmentType: v.string(), // "full_time","part_time","contract"
    startDate: v.string(),
    salary: v.optional(v.number()),
    status: v.string(), // "active","inactive","suspended"
    avatarStorageId: v.optional(v.id("_storage")), // passport photograph
    address: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    nin: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    bankName: v.optional(v.string()),
    // ── Nigeria-aligned personal & statutory information ──────────
    dateOfBirth: v.optional(v.string()), // ISO date YYYY-MM-DD
    gender: v.optional(v.string()), // "male","female"
    maritalStatus: v.optional(v.string()), // "single","married","divorced","widowed"
    stateOfOrigin: v.optional(v.string()),
    lgaOfOrigin: v.optional(v.string()),
    gradeLevel: v.optional(v.string()), // public-service style grade level/step, e.g. "GL 10 Step 3"
    qualification: v.optional(v.string()),
    confirmationDate: v.optional(v.string()), // ISO date — date employment was confirmed after probation
    // ── Statutory IDs ───────────────────────────────────────────────
    pensionRsaPin: v.optional(v.string()),
    nhfNumber: v.optional(v.string()),
    nsitfNumber: v.optional(v.string()),
    tin: v.optional(v.string()),
    // ── Next of kin ─────────────────────────────────────────────────
    nextOfKinName: v.optional(v.string()),
    nextOfKinRelationship: v.optional(v.string()),
    nextOfKinPhone: v.optional(v.string()),
    nextOfKinAddress: v.optional(v.string()),
  })
    .index("by_department", ["department"])
    .index("by_departmentId", ["departmentId"])
    .index("by_status", ["status"])
    .index("by_email", ["email"])
    .index("by_user", ["userId"])
    .searchIndex("search_fullName", { searchField: "fullName", filterFields: ["department", "status"] }),

  // Credentials/documents uploaded for a staff member (NIN slip, certificates,
  // CV, contract, etc). One row per uploaded file so the list is unbounded
  // without bloating the staffProfiles document.
  staffDocuments: defineTable({
    staffId: v.id("staffProfiles"),
    docType: v.string(), // "nin_slip","certificate","cv","contract","certificate_of_service","reference_letter","other"
    customLabel: v.optional(v.string()), // user-typed name when docType is "other"
    fileName: v.string(),
    storageId: v.id("_storage"),
    uploadedBy: v.optional(v.id("users")),
  })
    .index("by_staff", ["staffId"]),

  // Employment/offer letters. One current letter per staff member — a new
  // letter (e.g. after a promotion) creates a new row rather than mutating an
  // accepted one, keeping a full history and preserving what was accepted.
  staffEmploymentLetters: defineTable({
    staffId: v.id("staffProfiles"),
    letterType: v.string(), // "offer","confirmation","promotion","contract_renewal"
    position: v.string(),
    department: v.string(),
    startDate: v.string(), // ISO date
    employmentType: v.string(),
    salary: v.optional(v.number()),
    gradeLevel: v.optional(v.string()),
    probationMonths: v.optional(v.number()),
    reportingManager: v.optional(v.string()),
    additionalTerms: v.optional(v.string()),
    status: v.string(), // "pending","accepted"
    generatedBy: v.id("users"),
    acceptedAt: v.optional(v.string()), // ISO datetime
  })
    .index("by_staff", ["staffId"]),

  attendance: defineTable({
    staffId: v.id("staffProfiles"),
    date: v.string(), // ISO date YYYY-MM-DD
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    status: v.string(), // "present","absent","late","half_day"
    notes: v.optional(v.string()),
    recordedBy: v.optional(v.id("users")),
  })
    .index("by_staff", ["staffId"])
    .index("by_date", ["date"]),

  leaveRequests: defineTable({
    staffId: v.id("staffProfiles"),
    leaveType: v.string(), // "annual","sick","maternity","emergency","unpaid"
    startDate: v.string(),
    endDate: v.string(),
    reason: v.string(),
    status: v.string(), // "pending","approved","rejected"
    approvedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  })
    .index("by_staff", ["staffId"])
    .index("by_status", ["status"]),

  // ── CONSTRUCTION ───────────────────────────────────────────────
  constructionSites: defineTable({
    name: v.string(),
    estateId: v.optional(v.id("estates")),
    location: v.string(),
    projectManager: v.optional(v.string()),
    startDate: v.string(),
    expectedEndDate: v.string(),
    status: v.string(), // "planning","active","on_hold","completed"
    completionPercent: v.number(),
    budget: v.number(),
    spent: v.number(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    // Public "Ongoing projects" page: only sites switched on here are shown
    published: v.optional(v.boolean()),
  }).index("by_status", ["status"]).searchIndex("search_name", { searchField: "name", filterFields: ["status"] }),

  materials: defineTable({
    siteId: v.id("constructionSites"),
    name: v.string(),
    category: v.string(), // "cement","steel","wood","sand","tiles","paint","electrical","plumbing"
    unit: v.string(), // "bags","tonnes","pieces","litres","metres"
    quantityOrdered: v.number(),
    quantityDelivered: v.number(),
    quantityUsed: v.number(),
    unitCost: v.number(),
    supplier: v.optional(v.string()),
    deliveryDate: v.optional(v.string()),
    expectedDeliveryDate: v.optional(v.string()),
    status: v.string(), // "ordered","delivered","in_use","depleted"
  })
    .index("by_site", ["siteId"])
    .index("by_status", ["status"]),

  suppliers: defineTable({
    name: v.string(),
    contactPerson: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    category: v.string(), // what they supply
    rating: v.optional(v.number()),
    status: v.string(), // "active","inactive"
    notes: v.optional(v.string()),
  }).index("by_status", ["status"]),

  siteReports: defineTable({
    siteId: v.id("constructionSites"),
    reportDate: v.string(),
    reportedBy: v.string(),
    workDone: v.string(),
    challenges: v.optional(v.string()),
    nextSteps: v.optional(v.string()),
    workersPresent: v.optional(v.number()),
    weatherCondition: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    // Uploaded progress photos and videos (links are YouTube/Vimeo)
    photoStorageIds: v.optional(v.array(v.id("_storage"))),
    videos: v.optional(v.array(v.object({ link: v.optional(v.string()), storageId: v.optional(v.id("_storage")) }))),
    // Only published reports appear on the public project page
    published: v.optional(v.boolean()),
  }).index("by_site", ["siteId"]),

  // ── CLIENTS ────────────────────────────────────────────────────
  clients: defineTable({
    userId: v.optional(v.id("users")),
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    state: v.optional(v.string()),
    lga: v.optional(v.string()),
    occupation: v.optional(v.string()),
    nin: v.optional(v.string()),
    bvn: v.optional(v.string()),
    kycStatus: v.string(), // "pending","verified","rejected"
    source: v.string(), // "walk_in","referral","website","agent"
    assignedAgent: v.optional(v.id("users")),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    avatar: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_kyc", ["kycStatus"])
    .index("by_agent", ["assignedAgent"])
    .searchIndex("search_fullName", { searchField: "fullName", filterFields: ["kycStatus"] }),

  clientDocuments: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    docType: v.string(), // "id_card","passport","utility_bill","contract","receipt","other"
    url: v.string(),
    status: v.string(), // "pending","approved","rejected"
    uploadedBy: v.optional(v.id("users")),
  }).index("by_client", ["clientId"]),

  clientNotes: defineTable({
    clientId: v.id("clients"),
    note: v.string(),
    authorName: v.string(),
    authorId: v.optional(v.id("users")),
  }).index("by_client", ["clientId"]),

  followUps: defineTable({
    clientId: v.id("clients"),
    dueDate: v.string(),
    type: v.string(), // "call","email","meeting","site_visit"
    description: v.string(),
    status: v.string(), // "pending","done","overdue"
    assignedTo: v.optional(v.id("users")),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  invoices: defineTable({
    clientId: v.id("clients"),
    propertyId: v.optional(v.id("properties")),
    invoiceNumber: v.string(),
    amount: v.number(),
    paid: v.number(),
    balance: v.number(),
    status: v.string(), // "draft","sent","partial","paid","overdue"
    dueDate: v.string(),
    items: v.array(v.object({ description: v.string(), amount: v.number() })),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  paymentPlans: defineTable({
    clientId: v.id("clients"),
    propertyId: v.optional(v.id("properties")),
    title: v.string(),
    totalAmount: v.number(),
    initialDeposit: v.number(),
    balance: v.number(),
    durationMonths: v.number(),
    startDate: v.string(),
    status: v.string(), // "active","completed","defaulted","cancelled"
    createdBy: v.optional(v.id("users")),
  }).index("by_client", ["clientId"]),

  installments: defineTable({
    paymentPlanId: v.id("paymentPlans"),
    clientId: v.id("clients"),
    dueDate: v.string(),
    amount: v.number(),
    paidDate: v.optional(v.string()),
    status: v.string(), // "pending","paid","overdue"
    reference: v.optional(v.string()),
    recordedBy: v.optional(v.id("users")),
  })
    .index("by_plan", ["paymentPlanId"])
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  // ── GALLERY ───────────────────────────────────────────────────────
  galleryItems: defineTable({
    title: v.string(),
    category: v.string(), // "Residential","Luxury","Commercial","Estates","Interior","Land"
    mediaType: v.union(v.literal("image"), v.literal("video")),
    src: v.string(),           // CDN/Unsplash/external URL (resolved for display)
    storageId: v.optional(v.id("_storage")),
    videoUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    order: v.number(),
    active: v.boolean(),
  })
    .index("by_active", ["active"])
    .index("by_category", ["category"])
    .index("by_order", ["order"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["category", "active"] }),

  // ── CMS ───────────────────────────────────────────────────────────
  heroSlides: defineTable({
    mediaType: v.union(v.literal("image"), v.literal("video")),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaUrl: v.optional(v.string()), // external URL fallback
    tag: v.string(),
    headline: v.string(),
    subheadline: v.string(),
    body: v.string(),
    order: v.number(),
    active: v.boolean(),
  }).index("by_order", ["order"]),

  siteSettings: defineTable({
    key: v.string(),
    value: v.string(), // JSON-stringified value
  }).index("by_key", ["key"]),

  // ── PLOT ALLOCATION ───────────────────────────────────────────────
  estateBlocks: defineTable({
    estateId: v.id("estates"),
    name: v.string(), // e.g. "Block A"
    description: v.optional(v.string()),
    totalPlots: v.number(),
  }).index("by_estate", ["estateId"]),

  plots: defineTable({
    estateId: v.id("estates"),
    blockId: v.optional(v.id("estateBlocks")),
    plotNumber: v.string(), // e.g. "A-001"
    size: v.string(), // e.g. "500sqm", "1 acre"
    price: v.number(),
    status: v.string(), // "available","reserved","allocated","sold"
    features: v.optional(v.array(v.string())),
    coordinates: v.optional(v.string()), // optional lat/lng or survey desc
    notes: v.optional(v.string()),
  })
    .index("by_estate", ["estateId"])
    .index("by_status", ["status"])
    .index("by_block", ["blockId"])
    .searchIndex("search_plotNumber", { searchField: "plotNumber", filterFields: ["status", "estateId"] }),

  allocations: defineTable({
    plotId: v.id("plots"),
    estateId: v.id("estates"),
    clientId: v.id("clients"),
    allocationNumber: v.string(), // e.g. "GWS-ALLOC-0012"
    allocatedDate: v.string(),
    purchasePrice: v.number(),
    paymentType: v.string(), // "outright","installment"
    paymentPlanId: v.optional(v.id("paymentPlans")),
    status: v.string(), // "pending","active","completed","revoked"
    deedIssued: v.boolean(),
    offerLetterIssued: v.boolean(),
    receiptIssued: v.boolean(),
    contractIssued: v.boolean(),
    allocationLetterIssued: v.boolean(),
    qrCode: v.optional(v.string()), // QR data string for verification
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_plot", ["plotId"])
    .index("by_client", ["clientId"])
    .index("by_estate", ["estateId"])
    .index("by_status", ["status"])
    .searchIndex("search_allocationNumber", { searchField: "allocationNumber", filterFields: ["status", "estateId"] }),

  ownershipHistory: defineTable({
    plotId: v.id("plots"),
    clientId: v.id("clients"),
    allocationId: v.id("allocations"),
    transferDate: v.string(),
    transferType: v.string(), // "initial_sale","resale","inheritance","gift"
    previousOwnerName: v.optional(v.string()),
    newOwnerName: v.string(),
    salePrice: v.optional(v.number()),
    notes: v.optional(v.string()),
    recordedBy: v.optional(v.id("users")),
  })
    .index("by_plot", ["plotId"])
    .index("by_client", ["clientId"]),

  // ── PARTNER PROGRAM ──────────────────────────────────────────────
  partners: defineTable({
    userId: v.optional(v.id("users")), // set once approved & signed-in
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    address: v.optional(v.string()),
    bankName: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
    referralCode: v.string(), // unique short code e.g. "GWS-PART-A3X9"
    commissionRate: v.number(), // e.g. 5 = 5%
    status: v.string(), // "pending","approved","suspended","rejected"
    applicationId: v.optional(v.id("partnerApplications")),
    totalReferrals: v.number(),
    totalCommissionEarned: v.number(),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
    suspendReason: v.optional(v.string()),
    isStaff: v.optional(v.boolean()), // true if internal staff acting as partner
    // Company partners: fullName holds the contact person, companyName the business
    partnerType: v.optional(v.union(v.literal("individual"), v.literal("company"))),
    companyName: v.optional(v.string()),
    rcNumber: v.optional(v.string()), // CAC registration number
    companyWebsite: v.optional(v.string()),
    contactRole: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"])
    .index("by_referral_code", ["referralCode"])
    .index("by_user", ["userId"])
    .searchIndex("search_fullName", { searchField: "fullName", filterFields: ["status"] }),

  // Public-facing showcase profile for a partner (logo listing).
  // `live` is what the website shows; `pending` holds an edit awaiting admin
  // approval so the live version stays up until the change is approved.
  partnerProfiles: defineTable({
    partnerId: v.id("partners"),
    live: v.optional(partnerProfileContent),
    pending: v.optional(partnerProfileContent),
    reviewStatus: v.union(v.literal("none"), v.literal("pending"), v.literal("rejected")),
    submittedAt: v.optional(v.string()),
    reviewedAt: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
    // Public URL slug for /partners/:slug
    slug: v.string(),
    // Admin placement controls
    showHomepage: v.boolean(),
    showDiaspora: v.boolean(),
    showDirectory: v.boolean(),
    featured: v.boolean(),
    verified: v.boolean(), // CAC registration checked
    sortOrder: v.number(), // lower shows first
    // Delisting hides the logo/profile only — the partner keeps dashboard & earnings
    delisted: v.optional(v.boolean()),
    delistSource: v.optional(v.union(v.literal("manual"), v.literal("auto"))),
    delistReason: v.optional(v.string()),
    delistedAt: v.optional(v.string()),
    delistedBy: v.optional(v.id("users")),
    // Derived: live version AND a placement on AND not delisted. Kept in sync on every write.
    listed: v.boolean(),
  })
    .index("by_partner", ["partnerId"])
    .index("by_review_status", ["reviewStatus"])
    .index("by_slug", ["slug"])
    .index("by_listed_and_sort_order", ["listed", "sortOrder"]),

  // High-churn view/click counters, kept apart from the profile so public
  // listings don't re-run on every click.
  partnerShowcaseStats: defineTable({
    partnerId: v.id("partners"),
    profileViews: v.number(),
    logoClicks: v.number(),
    websiteClicks: v.number(),
  }).index("by_partner", ["partnerId"]),

  // One partnership agreement per partner. Dates are calendar days (YYYY-MM-DD, Lagos).
  partnerContracts: defineTable({
    partnerId: v.id("partners"),
    startDate: v.string(),
    endDate: v.string(),
    graceDays: v.number(), // days after endDate before automatic delisting
    autoDelist: v.boolean(),
    delistOn: v.string(), // endDate + graceDays
    // True while an automatic delist is still due — lets the daily job read only open work
    autoDelistPending: v.boolean(),
    remindersSent: v.array(v.number()), // which of 30/7/1-day reminders went out for this endDate
    agreementStorageId: v.optional(v.id("_storage")),
    agreementFileName: v.optional(v.string()),
    notes: v.optional(v.string()),
    updatedAt: v.string(),
  })
    .index("by_partner", ["partnerId"])
    .index("by_end_date", ["endDate"])
    .index("by_auto_delist_pending_and_delist_on", ["autoDelistPending", "delistOn"]),

  // Singleton: currency conversion display settings + latest live rates (NGN per 1 unit)
  fxSettings: defineTable({
    key: v.literal("main"),
    enabled: v.boolean(),
    round: v.boolean(),
    liveRates: v.optional(v.object({ USD: v.number(), EUR: v.number(), GBP: v.number() })),
    liveFetchedAt: v.optional(v.string()),
    liveSource: v.optional(v.string()),
    lastError: v.optional(v.string()),
    lastErrorAt: v.optional(v.string()),
    manualRates: v.optional(v.object({ USD: v.optional(v.number()), EUR: v.optional(v.number()), GBP: v.optional(v.number()) })),
    useManual: v.optional(v.object({ USD: v.optional(v.boolean()), EUR: v.optional(v.boolean()), GBP: v.optional(v.boolean()) })),
    updatedAt: v.string(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  // Audit trail: contract created/edited/extended, delisted/relisted (manual or automatic)
  partnerContractEvents: defineTable({
    partnerId: v.id("partners"),
    type: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("extended"),
      v.literal("delisted"),
      v.literal("relisted"),
      v.literal("auto_delisted"),
    ),
    fromEndDate: v.optional(v.string()),
    toEndDate: v.optional(v.string()),
    reason: v.optional(v.string()),
    byUserId: v.optional(v.id("users")), // absent for automatic actions
    at: v.string(),
  }).index("by_partner", ["partnerId"]),

  partnerApplications: defineTable({
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    address: v.optional(v.string()),
    country: v.optional(v.string()), // captured when applying from the Diaspora Refer programme
    motivation: v.string(), // why they want to become a partner
    experience: v.optional(v.string()),
    howHeard: v.optional(v.string()), // "social","referral","website","other"
    status: v.string(), // "pending","approved","rejected"
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
    commissionRate: v.optional(v.number()), // set on approval
    partnerId: v.optional(v.id("partners")), // created on approval
    diasporaCampaignId: v.optional(v.id("diasporaCampaigns")), // attribution when applied via a Diaspora campaign link/QR
    partnerType: v.optional(v.union(v.literal("individual"), v.literal("company"))),
    companyName: v.optional(v.string()),
    rcNumber: v.optional(v.string()),
    companyWebsite: v.optional(v.string()),
    contactRole: v.optional(v.string()),
    bankName: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"])
    .index("by_diaspora_campaign", ["diasporaCampaignId"])
    .searchIndex("search_fullName", { searchField: "fullName", filterFields: ["status"] }),

  partnerReferrals: defineTable({
    partnerId: v.id("partners"),
    referralCode: v.string(),
    resourceType: v.string(), // "property","article"
    resourceId: v.string(),
    resourceTitle: v.string(),
    clientName: v.optional(v.string()),
    clientPhone: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    country: v.optional(v.string()), // Diaspora-sourced referrals may carry the client's country
    status: v.string(), // "click","inquiry","converted"
    commissionId: v.optional(v.id("partnerCommissions")),
    notes: v.optional(v.string()),
    diasporaCampaignId: v.optional(v.id("diasporaCampaigns")), // attribution when the referred client originated from a Diaspora campaign
  })
    .index("by_partner", ["partnerId"])
    .index("by_code", ["referralCode"])
    .index("by_status", ["status"]),

  partnerCommissions: defineTable({
    partnerId: v.id("partners"),
    referralId: v.optional(v.id("partnerReferrals")),
    description: v.string(),
    saleAmount: v.number(),
    commissionRate: v.number(),
    commissionAmount: v.number(),
    status: v.string(), // "pending","approved","paid","voided"
    approvedBy: v.optional(v.id("users")),
    paidAt: v.optional(v.string()),
    notes: v.optional(v.string()),
    voidReason: v.optional(v.string()),
  })
    .index("by_partner", ["partnerId"])
    .index("by_status", ["status"]),

  // ── TRANSACTIONS ─────────────────────────────────────────────────────────
  transactions: defineTable({
    transactionRef: v.string(),               // e.g. "GWS-TXN-0001"
    clientId: v.id("clients"),
    propertyId: v.optional(v.id("properties")),
    estateId: v.optional(v.id("estates")),
    plotId: v.optional(v.id("plots")),
    inquiryId: v.optional(v.id("inquiries")),
    leadId: v.optional(v.id("leads")),
    allocationId: v.optional(v.id("allocations")),
    bulkAcquisitionId: v.optional(v.id("corporateBulkAcquisitions")), // set when converted from an Institutional/Bulk Acquisition (never a second transaction concept)
    assignedStaff: v.optional(v.id("users")),
    salesOfficer: v.optional(v.id("users")),
    purchasePrice: v.optional(v.number()),
    discount: v.optional(v.number()),
    amountPaid: v.optional(v.number()),
    outstandingBalance: v.optional(v.number()),
    paymentPlanId: v.optional(v.id("paymentPlans")),
    financeMethod: v.optional(v.string()),     // "outright","installment","mortgage","external_finance"
    // Sub-statuses (each module updates its own field)
    kycStatus: v.string(),                     // "not_started","pending","submitted","under_review","more_info_required","approved","rejected"
    financeStatus: v.string(),                 // "not_started","application_submitted","under_review","approved","rejected"
    paymentStatus: v.string(),                 // "not_started","pending","partial","fully_paid","failed"
    agreementStatus: v.string(),               // "not_started","draft","sent","signed","completed","expired","declined"
    signatureStatus: v.string(),               // "not_started","sent","viewed","signed","completed","expired","declined"
    // Main lifecycle status
    status: v.string(),                        // see TRANSACTION_STATUSES
    priority: v.optional(v.string()),          // "low","medium","high","urgent"
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    lastUpdatedBy: v.optional(v.id("users")),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_assigned", ["assignedStaff"])
    .searchIndex("search_ref", { searchField: "transactionRef", filterFields: ["status"] }),

  transactionEvents: defineTable({
    transactionId: v.id("transactions"),
    fromStatus: v.optional(v.string()),
    toStatus: v.string(),
    changedBy: v.optional(v.id("users")),
    changedByName: v.optional(v.string()),
    note: v.optional(v.string()),
    timestamp: v.string(),                     // ISO 8601
  }).index("by_transaction", ["transactionId"]),

  // ── KYC & COMPLIANCE ─────────────────────────────────────────────────────
  kycSubmissions: defineTable({
    submissionRef: v.string(),            // e.g. "GWS-KYC-0001"
    clientId: v.id("clients"),
    transactionId: v.optional(v.id("transactions")),
    status: v.string(),                   // "not_started"|"pending_customer"|"submitted"|"under_review"|"more_info_required"|"approved"|"rejected"
    kycType: v.string(),                  // "individual"|"corporate"
    // Personal info
    legalName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    nationality: v.optional(v.string()),
    placeOfBirth: v.optional(v.string()),
    residentialAddress: v.optional(v.string()),
    stateOfResidence: v.optional(v.string()),
    occupation: v.optional(v.string()),
    employerName: v.optional(v.string()),
    sourceOfFunds: v.optional(v.string()),
    // ID numbers
    nin: v.optional(v.string()),
    bvn: v.optional(v.string()),
    passportNumber: v.optional(v.string()),
    driversLicense: v.optional(v.string()),
    // Corporate fields
    companyName: v.optional(v.string()),
    rcNumber: v.optional(v.string()),
    // Review metadata
    assignedReviewer: v.optional(v.id("users")),
    reviewNotes: v.optional(v.string()),
    moreInfoRequest: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    // Timestamps
    submittedAt: v.optional(v.string()),
    reviewStartedAt: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    rejectedAt: v.optional(v.string()),
    // Risk / priority
    priority: v.optional(v.string()),     // "low"|"medium"|"high"|"urgent"
    riskLevel: v.optional(v.string()),    // "low"|"medium"|"high"
    createdBy: v.optional(v.id("users")),
    lastUpdatedBy: v.optional(v.id("users")),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_transaction", ["transactionId"])
    .index("by_reviewer", ["assignedReviewer"])
    .searchIndex("search_ref", { searchField: "submissionRef", filterFields: ["status"] }),

  kycDocuments: defineTable({
    kycSubmissionId: v.id("kycSubmissions"),
    clientId: v.id("clients"),
    docType: v.string(),                  // "nin_slip"|"passport"|"drivers_license"|"utility_bill"|"bank_statement"|"photo"|"cac_document"|"memorandum"|"board_resolution"|"other"
    name: v.string(),
    url: v.string(),                      // CDN URL
    storageId: v.optional(v.id("_storage")),
    status: v.string(),                   // "pending"|"verified"|"rejected"
    rejectionReason: v.optional(v.string()),
    uploadedBy: v.optional(v.id("users")),
    verifiedBy: v.optional(v.id("users")),
    verifiedAt: v.optional(v.string()),
  })
    .index("by_submission", ["kycSubmissionId"])
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  kycEvents: defineTable({
    kycSubmissionId: v.id("kycSubmissions"),
    fromStatus: v.optional(v.string()),
    toStatus: v.string(),
    changedBy: v.optional(v.id("users")),
    changedByName: v.optional(v.string()),
    note: v.optional(v.string()),
    timestamp: v.string(),                // ISO 8601
  }).index("by_submission", ["kycSubmissionId"]),

  // ── FINANCE & MORTGAGE ───────────────────────────────────────────────────
  financeApplications: defineTable({
    applicationRef: v.string(),              // e.g. "GWS-FIN-0001"
    clientId: v.id("clients"),
    transactionId: v.optional(v.id("transactions")),
    financeMethod: v.string(),               // "outright"|"instalment"|"mortgage"|"external_finance"
    status: v.string(),                      // "not_started"|"application_submitted"|"under_review"|"more_info_required"|"approved"|"rejected"
    purchasePrice: v.optional(v.number()),
    amountRequested: v.optional(v.number()), // for mortgage/external_finance
    initialDeposit: v.optional(v.number()),
    balanceOwed: v.optional(v.number()),
    instalmentCount: v.optional(v.number()), // number of instalments
    instalmentAmount: v.optional(v.number()),// per-instalment amount
    instalmentFrequency: v.optional(v.string()), // "monthly"|"quarterly"|"bi_annual"|"annual"
    externalLender: v.optional(v.string()),  // name of external bank/lender for external_finance
    // Review metadata
    assignedReviewer: v.optional(v.id("users")),
    reviewNotes: v.optional(v.string()),
    moreInfoRequest: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    // Timestamps per stage
    submittedAt: v.optional(v.string()),
    reviewStartedAt: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    rejectedAt: v.optional(v.string()),
    // Priority
    priority: v.optional(v.string()),        // "low"|"medium"|"high"|"urgent"
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    lastUpdatedBy: v.optional(v.id("users")),
  })
    .index("by_client", ["clientId"])
    .index("by_transaction", ["transactionId"])
    .index("by_status", ["status"])
    .index("by_reviewer", ["assignedReviewer"]),

  mortgageDetails: defineTable({
    applicationId: v.id("financeApplications"),
    clientId: v.id("clients"),
    lenderName: v.optional(v.string()),
    loanAmount: v.optional(v.number()),
    tenureMonths: v.optional(v.number()),
    interestRate: v.optional(v.number()),    // annual % e.g. 18.5
    monthlyRepayment: v.optional(v.number()),
    ltv: v.optional(v.number()),             // loan-to-value % e.g. 70
    offerLetterUrl: v.optional(v.string()),
    approvalLetterUrl: v.optional(v.string()),
    valuerName: v.optional(v.string()),
    valuationAmount: v.optional(v.number()),
    mortgageStatus: v.string(),              // "pending"|"conditional_offer"|"formal_offer"|"completed"|"declined"
    notes: v.optional(v.string()),
  }).index("by_application", ["applicationId"]).index("by_client", ["clientId"]),

  financeEvents: defineTable({
    financeApplicationId: v.id("financeApplications"),
    fromStatus: v.optional(v.string()),
    toStatus: v.string(),
    changedBy: v.optional(v.id("users")),
    changedByName: v.optional(v.string()),
    note: v.optional(v.string()),
    timestamp: v.string(),                   // ISO 8601
  }).index("by_application", ["financeApplicationId"]),

  // ── PAYMENT GATEWAY CONTROL CENTRE ───────────────────────────────────────
  paymentGateways: defineTable({
    gatewayKey: v.string(),         // "paystack"|"flutterwave"|"interswitch"|"remita"|"stripe"|"paypal"
    displayName: v.string(),        // e.g. "Paystack"
    isEnabled: v.boolean(),
    mode: v.string(),               // "sandbox"|"live"
    priority: v.number(),           // 1 = highest; used for routing fallback order
    supportedCurrencies: v.array(v.string()), // e.g. ["NGN","USD"]
    supportedTxnTypes: v.array(v.string()),   // e.g. ["deposit","instalment","full_payment"]
    // Credential key names (the actual values live in Convex env vars/secrets)
    publicKeyEnvVar: v.optional(v.string()),  // e.g. "PAYSTACK_PUBLIC_KEY"
    secretKeyEnvVar: v.optional(v.string()),  // e.g. "PAYSTACK_SECRET_KEY"
    webhookSecretEnvVar: v.optional(v.string()),
    // Config notes (non-sensitive, stored here for reference)
    webhookUrl: v.optional(v.string()),       // the URL to register at the provider
    callbackUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Routing metadata
    minAmount: v.optional(v.number()),        // minimum transaction amount in kobo/cents
    maxAmount: v.optional(v.number()),
    // Audit
    lastTestedAt: v.optional(v.string()),
    lastTestResult: v.optional(v.string()),   // "success"|"failed"
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.string()),
  })
    .index("by_key", ["gatewayKey"])
    .index("by_enabled", ["isEnabled"])
    .index("by_priority", ["priority"]),

  geoPayments: defineTable({
    paymentRef: v.string(),               // e.g. "GWS-PAY-0001"
    clientId: v.id("clients"),
    transactionId: v.optional(v.id("transactions")),
    financeApplicationId: v.optional(v.id("financeApplications")),
    gatewayKey: v.string(),               // which gateway processed this
    gatewayRef: v.optional(v.string()),   // provider's own reference/ID
    gatewayOrderId: v.optional(v.string()),
    currency: v.string(),                 // "NGN"|"USD"|"GBP"
    amountKobo: v.number(),               // amount in smallest unit (kobo, cents)
    amountDisplay: v.number(),            // human-readable amount (e.g. 50000.00)
    txnType: v.string(),                  // "deposit"|"instalment"|"full_payment"|"fee"|"refund"
    status: v.string(),                   // "initiated"|"pending"|"processing"|"successful"|"failed"|"reversed"|"abandoned"|"disputed"
    mode: v.string(),                     // "sandbox"|"live"
    webhookReceived: v.boolean(),
    webhookPayload: v.optional(v.string()), // raw JSON string of last webhook
    // Idempotency
    idempotencyKey: v.optional(v.string()),
    // Metadata
    description: v.optional(v.string()),
    channel: v.optional(v.string()),      // "card"|"bank_transfer"|"ussd"|"qr"|"mobile_money"
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    paidAt: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    // Reversal / dispute
    reversalRef: v.optional(v.string()),
    disputeRef: v.optional(v.string()),
    // Reconciliation
    reconciledAt: v.optional(v.string()),
    reconciledBy: v.optional(v.id("users")),
    // Created by
    initiatedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  })
    .index("by_client", ["clientId"])
    .index("by_transaction", ["transactionId"])
    .index("by_status", ["status"])
    .index("by_gateway", ["gatewayKey"])
    .index("by_ref", ["paymentRef"]),

  // ── PAYMENTS, RECONCILIATION & RECEIPTS ──────────────────────────────────
  paymentReceipts: defineTable({
    receiptRef: v.string(),               // GWS-RCP-NNNN
    paymentId: v.id("geoPayments"),
    clientId: v.id("clients"),
    transactionId: v.optional(v.id("transactions")),
    amountDisplay: v.number(),
    currency: v.string(),
    paidAt: v.string(),                   // ISO copied from geoPayments
    gatewayKey: v.string(),
    gatewayRef: v.optional(v.string()),
    txnType: v.string(),
    description: v.optional(v.string()),
    generatedAt: v.string(),              // ISO when receipt was created
    generatedBy: v.optional(v.id("users")),
    generatedByName: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    emailedAt: v.optional(v.string()),
    emailedTo: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_payment", ["paymentId"])
    .index("by_client", ["clientId"])
    .index("by_transaction", ["transactionId"])
    .index("by_ref", ["receiptRef"])
    .searchIndex("search_ref", { searchField: "receiptRef" }),

  reconciliationBatches: defineTable({
    batchRef: v.string(),                 // GWS-REC-NNNN
    title: v.string(),
    description: v.optional(v.string()),
    periodStart: v.string(),              // YYYY-MM-DD
    periodEnd: v.string(),
    gatewayKey: v.optional(v.string()),
    status: v.string(),                   // draft|in_progress|completed|disputed
    totalItems: v.number(),
    matchedCount: v.number(),
    unmatchedCount: v.number(),
    disputedCount: v.number(),
    totalAmount: v.number(),
    createdBy: v.id("users"),
    createdByName: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    completedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_creator", ["createdBy"]),

  reconciliationItems: defineTable({
    batchId: v.id("reconciliationBatches"),
    paymentId: v.id("geoPayments"),
    clientId: v.id("clients"),
    transactionId: v.optional(v.id("transactions")),
    expectedAmount: v.optional(v.number()),
    actualAmount: v.number(),
    currency: v.string(),
    matchStatus: v.string(),              // pending|matched|unmatched|disputed|overpaid|underpaid
    discrepancy: v.optional(v.number()),
    notes: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedByName: v.optional(v.string()),
    reviewedAt: v.optional(v.string()),
    actionTaken: v.optional(v.string()),
  })
    .index("by_batch", ["batchId"])
    .index("by_payment", ["paymentId"])
    .index("by_match_status", ["matchStatus"]),

  // ── COMMUNICATIONS CENTRE ─────────────────────────────────────────────────
  tickerMessages: defineTable({
    text: v.string(),
    link: v.optional(v.string()),       // optional CTA URL
    linkLabel: v.optional(v.string()),  // optional CTA label
    bgColor: v.optional(v.string()),    // hex or tailwind token, defaults to brand blue
    textColor: v.optional(v.string()),
    isActive: v.boolean(),
    order: v.number(),                  // display order in the ticker
    createdBy: v.optional(v.id("users")),
  }).index("by_active", ["isActive"]).index("by_order", ["order"]),

  popNotifications: defineTable({
    title: v.string(),
    message: v.string(),
    type: v.string(), // "info" | "success" | "warning" | "promo" | "alert"
    link: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    icon: v.optional(v.string()),       // emoji or icon name
    isActive: v.boolean(),
    showOnce: v.boolean(),              // if true, cookie-gated: only show once per browser
    delay: v.number(),                  // ms delay after page load before showing
    position: v.string(),               // "bottom-right" | "bottom-left" | "top-right" | "top-left"
    startAt: v.optional(v.string()),    // ISO date, optional scheduling
    endAt: v.optional(v.string()),      // ISO date, optional expiry
    createdBy: v.optional(v.id("users")),
  }).index("by_active", ["isActive"]),

  // ── DOCUMENT VAULT ──────────────────────────────────────────────────────────
  vaultDocuments: defineTable({
    docRef: v.string(),                      // GWS-DOC-NNNN
    title: v.string(),
    description: v.optional(v.string()),
    docType: v.string(),                     // "kyc_doc"|"id_doc"|"offer_letter"|"allocation_letter"|"contract"|"deed"|"receipt"|"invoice"|"agreement"|"finance_doc"|"payment_proof"|"legal_notice"|"other"
    fileUrl: v.string(),                     // CDN URL or Convex storage URL
    storageId: v.optional(v.id("_storage")),
    fileName: v.string(),
    fileSizeBytes: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    version: v.number(),                     // starts at 1
    parentDocId: v.optional(v.id("vaultDocuments")), // for versioning chain
    // Linked entities (any combination)
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    kycSubmissionId: v.optional(v.id("kycSubmissions")),
    financeApplicationId: v.optional(v.id("financeApplications")),
    agreementId: v.optional(v.id("agreements")),
    paymentId: v.optional(v.id("geoPayments")),
    // Visibility & security
    isConfidential: v.boolean(),             // if true, only staff with explicit access see it
    tags: v.optional(v.array(v.string())),
    // Access log (last 20 kept as array — bounded)
    uploadedBy: v.optional(v.id("users")),
    uploadedAt: v.string(),                  // ISO 8601
    lastAccessedBy: v.optional(v.id("users")),
    lastAccessedAt: v.optional(v.string()),
    // ── Enhanced Document Management (additive; gated by "feature_enhanced_documents") ──
    // Version control: every version keeps its own row sharing the same docRef, chained
    // via parentDocId. Never overwritten in place. isLatestVersion marks the current one;
    // undefined is treated as "latest" for legacy rows created before this field existed.
    isLatestVersion: v.optional(v.boolean()),
    supersededBy: v.optional(v.id("vaultDocuments")),
    // Review/approval reuses the existing approvals/tasks engine — never a second workflow.
    reviewStatus: v.optional(v.string()),    // "not_required"|"pending_review"|"approved"|"rejected"
    approvalId: v.optional(v.id("approvals")),
    // Placeholders synced by the E-Signature (milestone-104) and Official E-Stamp
    // (milestone-105) modules. Not read/written by this milestone.
    signatureStatus: v.optional(v.string()),
    eStampStatus: v.optional(v.string()),
  })
    .index("by_client", ["clientId"])
    .index("by_transaction", ["transactionId"])
    .index("by_type", ["docType"])
    .index("by_agreement", ["agreementId"])
    .index("by_ref", ["docRef"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["docType", "clientId"] }),

  // Configurable document types for the Enhanced Document Management feature.
  // The hardcoded DOC_TYPES list in the frontend remains the fallback so the
  // vault keeps working unchanged when the feature is OFF.
  documentTypes: defineTable({
    key: v.string(),                         // e.g. "kyc_doc" — stored on vaultDocuments.docType
    label: v.string(),
    description: v.optional(v.string()),
    requiresReview: v.boolean(),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.string(),
  }).index("by_key", ["key"]),

  // ── E-SIGNATURE (additive; gated by "feature_esignature") ─────────────────
  // Optional, workflow-controlled signing of a document already stored in the
  // EXISTING vaultDocuments table — never a second document repository. This
  // is distinct from the pre-existing `agreements` table (a separate,
  // lighter-weight sale-contract signing flow) and from
  // `corporateEsignatureRequests` (the corporate/institutional variant) —
  // this table is the general-purpose vault-document signature request used
  // by /admin/documents. Multi-signer with explicit order; only a user
  // holding the explicit SIGN permission may record a signature — never
  // inferred from role or job title.
  signatureRequests: defineTable({
    requestRef: v.string(),                  // GWS-SIG-NNNN
    vaultDocumentId: v.id("vaultDocuments"),  // the exact document VERSION being signed
    docRef: v.string(),                       // denormalized for quick lookup/audit display
    title: v.string(),
    status: v.union(
      v.literal("not_required"), v.literal("pending"), v.literal("sent"), v.literal("viewed"),
      v.literal("signed"), v.literal("declined"), v.literal("expired"), v.literal("cancelled"),
      v.literal("completed"),
    ),
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    requestedBy: v.id("users"),
    requestedAt: v.string(),                  // ISO 8601, server time only
    expiresAt: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    cancelledAt: v.optional(v.string()),
    cancelReason: v.optional(v.string()),
    // Final fully-executed copy, once every signer has signed — a NEW
    // vaultDocuments version (never an overwrite of the original).
    finalSignedVaultDocumentId: v.optional(v.id("vaultDocuments")),
  })
    .index("by_document", ["vaultDocumentId"])
    .index("by_docRef", ["docRef"])
    .index("by_status", ["status"])
    .index("by_client", ["clientId"])
    .index("by_transaction", ["transactionId"]),

  // One row per required signer on a signatureRequest — an unbounded list, so
  // it is its own table rather than an array on signatureRequests.
  signatureSigners: defineTable({
    requestId: v.id("signatureRequests"),
    signingOrder: v.number(),                 // 1-based; enforced sequentially when > 1 signer
    signerType: v.union(v.literal("internal"), v.literal("external")),
    userId: v.optional(v.id("users")),         // set when signerType = "internal"
    name: v.string(),
    email: v.string(),
    role: v.optional(v.string()),              // e.g. "client","vendor","witness","director"
    status: v.union(
      v.literal("pending"), v.literal("sent"), v.literal("viewed"),
      v.literal("signed"), v.literal("declined"), v.literal("expired"),
    ),
    sentAt: v.optional(v.string()),
    viewedAt: v.optional(v.string()),
    signedAt: v.optional(v.string()),          // server time only, never client-supplied
    signedByUserId: v.optional(v.id("users")), // who actually clicked "sign" — must hold SIGN permission
    declinedAt: v.optional(v.string()),
    declineReason: v.optional(v.string()),
    signatureRef: v.string(),                  // unique verifiable token for this signing event
    ipAddress: v.optional(v.string()),
  })
    .index("by_request", ["requestId"])
    .index("by_request_and_order", ["requestId", "signingOrder"])
    .index("by_signature_ref", ["signatureRef"]),

  // ── OFFICIAL CORPORATE E-STAMP (additive; gated by "feature_corporate_estamp") ──
  // A system-generated, tamper-evident mark of authenticity linked to one
  // exact vaultDocuments VERSION. Never user-entered content or dates —
  // appliedAt/revokedAt are always server clock values. Publicly verifiable
  // by stampRef alone; the public query returns a small, explicit whitelist
  // of fields — never the underlying document, client, transaction, staff,
  // or audit data. Historical stamps remain valid/queryable forever, even if
  // "feature_corporate_estamp" is later turned OFF (OFF only hides the
  // apply/revoke UI — it is never destructive).
  eStamps: defineTable({
    stampRef: v.string(),                     // public reference, e.g. "GWSL-2026-00124"
    vaultDocumentId: v.id("vaultDocuments"),   // the exact document VERSION stamped
    docRef: v.string(),                        // denormalized for lookup/audit — never returned publicly
    version: v.number(),
    docType: v.string(),                       // denormalized category, safe to surface publicly
    docHash: v.string(),                       // SHA-256 of docRef+version+fileUrl, tamper-evidence
    status: v.union(
      v.literal("applied"), v.literal("revoked"), v.literal("superseded"), v.literal("invalid"),
    ),
    appliedBy: v.id("users"),
    appliedAt: v.string(),                     // server time only, never client-supplied
    revokedBy: v.optional(v.id("users")),
    revokedAt: v.optional(v.string()),
    revokeReason: v.optional(v.string()),       // internal only — never surfaced to the public verifier
    supersededByStampId: v.optional(v.id("eStamps")), // set when a newer document version is stamped
    invalidatedBy: v.optional(v.id("users")),
    invalidatedAt: v.optional(v.string()),
    invalidateReason: v.optional(v.string()),
  })
    .index("by_document", ["vaultDocumentId"])
    .index("by_docRef", ["docRef"])
    .index("by_stampRef", ["stampRef"])
    .index("by_status", ["status"]),

  dataRooms: defineTable({
    roomRef: v.string(),                     // GWS-DRM-NNNN
    name: v.string(),
    description: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    status: v.string(),                      // "active"|"locked"|"archived"
    expiresAt: v.optional(v.string()),       // ISO 8601
    allowDownload: v.boolean(),
    requireNDA: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.string(),
  })
    .index("by_client", ["clientId"])
    .index("by_transaction", ["transactionId"])
    .index("by_status", ["status"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["status"] }),

  dataRoomDocuments: defineTable({
    dataRoomId: v.id("dataRooms"),
    vaultDocumentId: v.id("vaultDocuments"),
    addedBy: v.optional(v.id("users")),
    addedAt: v.string(),
  }).index("by_room", ["dataRoomId"]),

  dataRoomAccess: defineTable({
    dataRoomId: v.id("dataRooms"),
    clientId: v.optional(v.id("clients")),
    userId: v.optional(v.id("users")),
    grantedBy: v.optional(v.id("users")),
    grantedAt: v.string(),
    revokedAt: v.optional(v.string()),
    lastViewedAt: v.optional(v.string()),
    viewCount: v.number(),
    downloadCount: v.number(),
    ndaSigned: v.boolean(),
    ndaSignedAt: v.optional(v.string()),
  })
    .index("by_room", ["dataRoomId"])
    .index("by_client", ["clientId"]),

  agreements: defineTable({
    agreementRef: v.string(),               // GWS-AGR-NNNN
    title: v.string(),
    agreementType: v.string(),              // "sale_contract"|"deed_of_assignment"|"offer_letter"|"nda"|"installment_plan"|"mortgage_agreement"|"lease"|"other"
    clientId: v.id("clients"),
    transactionId: v.optional(v.id("transactions")),
    status: v.string(),                     // "draft"|"pending_review"|"approved"|"sent"|"viewed"|"signed"|"completed"|"expired"|"declined"
    // Document
    pdfUrl: v.optional(v.string()),
    vaultDocumentId: v.optional(v.id("vaultDocuments")),
    // Signature tracking
    signatories: v.array(v.object({
      name: v.string(),
      email: v.string(),
      role: v.string(),                     // "client"|"vendor"|"witness"|"legal_officer"
      signedAt: v.optional(v.string()),
      signatureRef: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
    })),
    // Lifecycle dates
    draftedAt: v.optional(v.string()),
    sentAt: v.optional(v.string()),
    viewedAt: v.optional(v.string()),
    signedAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    declinedAt: v.optional(v.string()),
    declineReason: v.optional(v.string()),
    // Meta
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    lastUpdatedBy: v.optional(v.id("users")),
  })
    .index("by_client", ["clientId"])
    .index("by_transaction", ["transactionId"])
    .index("by_status", ["status"])
    .index("by_ref", ["agreementRef"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["status", "clientId"] }),

  agreementEvents: defineTable({
    agreementId: v.id("agreements"),
    fromStatus: v.optional(v.string()),
    toStatus: v.string(),
    changedBy: v.optional(v.id("users")),
    changedByName: v.optional(v.string()),
    note: v.optional(v.string()),
    timestamp: v.string(),
  }).index("by_agreement", ["agreementId"]),

  tasks: defineTable({
    taskRef: v.string(),                        // GWS-TSK-NNNN
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.string(),                       // "low"|"medium"|"high"|"urgent"
    status: v.string(),                         // "todo"|"in_progress"|"blocked"|"done"|"cancelled"
    category: v.string(),                       // "kyc"|"finance"|"transaction"|"payment"|"legal"|"admin"|"construction"|"other"
    assignedTo: v.optional(v.id("users")),
    createdBy: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),            // ISO date string
    completedAt: v.optional(v.string()),
    // Related entities (optional)
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    kycSubmissionId: v.optional(v.id("kycSubmissions")),
    financeApplicationId: v.optional(v.id("financeApplications")),
    paymentId: v.optional(v.id("geoPayments")),
    agreementId: v.optional(v.id("agreements")),
    corporateOrganisationId: v.optional(v.id("corporateOrganisations")),
    corporateOpportunityId: v.optional(v.id("corporateOpportunities")),
    // Metadata
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  })
    .index("by_assigned", ["assignedTo"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_client", ["clientId"])
    .index("by_transaction", ["transactionId"])
    .index("by_corporate_opportunity", ["corporateOpportunityId"])
    .index("by_corporate_organisation", ["corporateOrganisationId"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["status", "priority", "category"] }),

  taskComments: defineTable({
    taskId: v.id("tasks"),
    authorId: v.id("users"),
    content: v.string(),
    timestamp: v.string(),
  }).index("by_task", ["taskId"]),

  approvals: defineTable({
    approvalRef: v.string(),                    // GWS-APR-NNNN
    approvalType: v.string(),                   // "kyc"|"finance"|"payment_exception"|"reservation"|"allocation"|"refund"|"transaction_completion"|"other"
    status: v.string(),                         // "pending"|"approved"|"rejected"|"escalated"|"withdrawn"
    priority: v.string(),                       // "low"|"medium"|"high"|"urgent"
    // What is being approved
    summary: v.string(),
    requestNote: v.optional(v.string()),
    // Linked entities
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    kycSubmissionId: v.optional(v.id("kycSubmissions")),
    financeApplicationId: v.optional(v.id("financeApplications")),
    paymentId: v.optional(v.id("geoPayments")),
    relatedRef: v.optional(v.string()),         // human-readable ref for display
    // People
    requestedBy: v.optional(v.id("users")),
    requestedAt: v.string(),
    assignedTo: v.optional(v.id("users")),      // reviewer
    // Decision
    decision: v.optional(v.string()),           // "approved"|"rejected"
    decisionNote: v.optional(v.string()),
    decisionBy: v.optional(v.id("users")),
    decisionAt: v.optional(v.string()),
    // Escalation
    escalatedTo: v.optional(v.id("users")),
    escalationNote: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_type", ["approvalType"])
    .index("by_assigned", ["assignedTo"])
    .index("by_client", ["clientId"])
    .searchIndex("search_summary", { searchField: "summary", filterFields: ["status", "approvalType"] }),

  auditLog: defineTable({
    action: v.string(),                         // "create"|"update"|"delete"|"status_change"|"login"|"export"|"view"|"approve"|"reject"
    entity: v.string(),                         // table name: "transactions"|"kyc"|"payments" etc
    entityId: v.optional(v.string()),
    entityRef: v.optional(v.string()),          // human-readable ref
    userId: v.optional(v.id("users")),
    userName: v.optional(v.string()),
    userRole: v.optional(v.string()),
    description: v.string(),
    before: v.optional(v.string()),             // JSON snapshot
    after: v.optional(v.string()),              // JSON snapshot
    metadata: v.optional(v.string()),           // JSON extra info
    timestamp: v.string(),                      // ISO 8601
    ipAddress: v.optional(v.string()),
  })
    .index("by_entity", ["entity"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"])
    .index("by_entity_and_action", ["entity", "action"])
    .searchIndex("search_description", {
      searchField: "description",
      filterFields: ["entity", "action"],
    }),

  backupJobs: defineTable({
    jobRef: v.string(),                          // GWS-BAK-0001
    type: v.union(v.literal("manual"), v.literal("scheduled")),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
    tables: v.array(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileSizeBytes: v.optional(v.number()),
    recordCounts: v.optional(v.string()),        // JSON: { [table]: count }
    totalRecords: v.optional(v.number()),
    error: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdByName: v.optional(v.string()),
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_startedAt", ["startedAt"]),

  restoreJobs: defineTable({
    restoreRef: v.string(),                      // GWS-RST-0001
    backupJobId: v.id("backupJobs"),
    tables: v.array(v.string()),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
    recordsWritten: v.optional(v.number()),
    error: v.optional(v.string()),
    performedBy: v.optional(v.id("users")),
    performedByName: v.optional(v.string()),
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
  })
    .index("by_backup", ["backupJobId"])
    .index("by_startedAt", ["startedAt"]),

  // ── External backup destinations (S3/Dropbox/Google Drive/Email) ──────────
  backupDestinations: defineTable({
    provider: v.union(v.literal("s3"), v.literal("dropbox"), v.literal("gdrive"), v.literal("email")),
    label: v.string(),
    enabled: v.boolean(),
    // Non-secret configuration only. Credentials live in Secrets (process.env).
    config: v.string(), // JSON: provider-specific settings (bucket, folder, recipients, etc.)
    lastSyncAt: v.optional(v.string()),
    lastSyncStatus: v.optional(v.union(v.literal("success"), v.literal("failed"))),
    lastSyncError: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_provider", ["provider"])
    .index("by_enabled", ["enabled"]),

  backupSyncLogs: defineTable({
    backupJobId: v.id("backupJobs"),
    destinationId: v.id("backupDestinations"),
    provider: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    detail: v.optional(v.string()),
    syncedAt: v.string(),
  })
    .index("by_backupJob", ["backupJobId"])
    .index("by_destination", ["destinationId"]),

  supportTickets: defineTable({
    clientId: v.id("clients"),
    subject: v.string(),
    message: v.string(),
    status: v.string(), // "open","in_progress","resolved","closed"
    priority: v.string(), // "low","medium","high"
    assignedTo: v.optional(v.id("users")),
    response: v.optional(v.string()),
    respondedBy: v.optional(v.id("users")),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  // ══════════════════════════════════════════════════════════════════════════
  // ENTERPRISE IAM / RBAC / ORGANISATION / PARTNER ENGAGEMENT
  // Additive extension. The existing `users.role` enum keeps working exactly
  // as-is (it still gates admin.requireAdmin()). These tables layer a
  // configurable, granular authorization + organisation model on top,
  // without touching or duplicating existing identity/auth.
  // ══════════════════════════════════════════════════════════════════════════

  // ── Configurable roles (separate from users.role legacy enum; this is the
  //    granular RBAC layer used by the new IAM centre) ────────────────────
  iamRoles: defineTable({
    key: v.string(),                 // stable slug e.g. "director", "auditor"
    name: v.string(),                // display name e.g. "Director"
    description: v.optional(v.string()),
    inheritsFromKey: v.optional(v.string()), // e.g. "manager" inherits "officer"
    isSystem: v.boolean(),           // true for the 12 initial roles — cannot delete, can edit
    dashboardProfileKey: v.string(), // which of the 8 dashboard profiles this role maps to
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"])
    .index("by_status", ["status"]),

  // ── Granular, module-aware permissions catalogue ─────────────────────────
  iamPermissions: defineTable({
    key: v.string(),                 // e.g. "properties.approve", "payments.export"
    module: v.string(),              // e.g. "properties","payments","users","documents"
    action: v.string(),              // VIEW|CREATE|EDIT|SUBMIT|REVIEW|APPROVE|REJECT|ASSIGN|SIGN|EXPORT|DELETE|ADMIN|AUDIT|COMMENT
    label: v.string(),
    sensitive: v.boolean(),          // true for APPROVE/SIGN/ADMIN/DELETE-class permissions
  })
    .index("by_module", ["module"])
    .index("by_key", ["key"]),

  // ── Role → permission grants (many-to-many) ──────────────────────────────
  iamRolePermissions: defineTable({
    roleKey: v.string(),
    permissionKey: v.string(),
    grantedBy: v.optional(v.id("users")),
    grantedAt: v.string(), // ISO
  })
    .index("by_role", ["roleKey"])
    .index("by_permission", ["permissionKey"])
    .index("by_role_and_permission", ["roleKey", "permissionKey"]),

  // ── Direct user → permission overrides (rare; explicit restriction or grant
  //    that overrides the role's inherited permission) ─────────────────────
  iamUserPermissions: defineTable({
    userId: v.id("users"),
    permissionKey: v.string(),
    effect: v.union(v.literal("grant"), v.literal("deny")), // explicit deny always wins
    reason: v.optional(v.string()),
    grantedBy: v.optional(v.id("users")),
    effectiveFrom: v.optional(v.string()),
    effectiveTo: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_permission", ["userId", "permissionKey"]),

  // ── Organisation: Directorates → Departments → Units → Positions.
  //    Stable IDs; renaming never breaks references elsewhere. ─────────────
  directorates: defineTable({
    name: v.string(),
    code: v.optional(v.string()),   // short stable code, independent of name
    description: v.optional(v.string()),
    colorTheme: v.optional(v.string()), // for organogram rendering
    order: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_status", ["status"])
    .index("by_order", ["order"]),

  departments: defineTable({
    directorateId: v.id("directorates"),
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_directorate", ["directorateId"])
    .index("by_status", ["status"]),

  units: defineTable({
    departmentId: v.id("departments"),
    name: v.string(),
    description: v.optional(v.string()),
    order: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_department", ["departmentId"])
    .index("by_status", ["status"]),

  positions: defineTable({
    unitId: v.optional(v.id("units")),
    departmentId: v.optional(v.id("departments")),
    directorateId: v.optional(v.id("directorates")),
    title: v.string(),               // job title — NOT the same as iamRoles
    reportsToPositionId: v.optional(v.id("positions")),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_unit", ["unitId"])
    .index("by_department", ["departmentId"])
    .index("by_directorate", ["directorateId"])
    .index("by_status", ["status"]),

  // ── User's organisational + role assignment (time-bound) ─────────────────
  userOrgAssignments: defineTable({
    userId: v.id("users"),
    directorateId: v.optional(v.id("directorates")),
    departmentId: v.optional(v.id("departments")),
    unitId: v.optional(v.id("units")),
    positionId: v.optional(v.id("positions")),
    jobTitle: v.optional(v.string()),  // free-text job title, distinct from iamRoles
    roleKey: v.optional(v.string()),   // iamRoles.key — the system RBAC role
    isPrimary: v.boolean(),            // one primary assignment per user
    effectiveFrom: v.string(),
    effectiveTo: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("ended")),
    assignedBy: v.optional(v.id("users")),
    reason: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_directorate", ["directorateId"])
    .index("by_department", ["departmentId"])
    .index("by_status", ["status"]),

  // ── Data scopes (server-enforced query narrowing) ────────────────────────
  iamDataScopes: defineTable({
    userId: v.id("users"),
    scope: v.union(
      v.literal("own"), v.literal("assigned"), v.literal("department"),
      v.literal("directorate"), v.literal("enterprise"), v.literal("governance"), v.literal("audit"),
    ),
    module: v.optional(v.string()), // scope can be module-specific; omit = applies broadly
    assignedBy: v.optional(v.id("users")),
    effectiveFrom: v.optional(v.string()),
    effectiveTo: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_module", ["userId", "module"]),

  // ── Approval authority — explicit, never inferred from role/title ────────
  approvalAuthorities: defineTable({
    userId: v.id("users"),
    approvalType: v.string(),        // matches approvals.approvalType, e.g. "payment_exception","finance"
    directorateId: v.optional(v.id("directorates")),
    departmentId: v.optional(v.id("departments")),
    minAmount: v.optional(v.number()),
    maxAmount: v.optional(v.number()),
    approvalLevel: v.optional(v.number()), // for multi-level chains
    requiresCoApprover: v.optional(v.boolean()),
    effectiveFrom: v.string(),
    effectiveTo: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("revoked")),
    grantedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["approvalType"])
    .index("by_status", ["status"]),

  // ── Segregation of duties rules (configurable conflicts) ─────────────────
  sodRules: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    conflictingPermissionA: v.string(), // permission key
    conflictingPermissionB: v.string(), // permission key
    policy: v.union(v.literal("block"), v.literal("flag_and_route")),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.optional(v.id("users")),
  }).index("by_status", ["status"]),

  sodViolations: defineTable({
    ruleId: v.id("sodRules"),
    userId: v.id("users"),
    context: v.string(),             // free text describing what triggered it
    resolvedAction: v.optional(v.string()), // "blocked"|"routed"|"overridden"
    resolvedBy: v.optional(v.id("users")),
    timestamp: v.string(),
  }).index("by_user", ["userId"]).index("by_rule", ["ruleId"]),

  // ── Temporary access grants (auto-expiring) ───────────────────────────────
  temporaryAccess: defineTable({
    userId: v.id("users"),
    accessType: v.union(v.literal("role"), v.literal("permission"), v.literal("scope")),
    grantedKey: v.string(),          // roleKey | permissionKey | scope value
    reason: v.string(),
    grantedBy: v.id("users"),
    startAt: v.string(),
    endAt: v.string(),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("revoked")),
    revokedBy: v.optional(v.id("users")),
    revokedAt: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_endAt", ["endAt"]),

  // ── Approval delegation (time-bound; delegate ≤ delegator authority) ─────
  approvalDelegations: defineTable({
    delegatorId: v.id("users"),
    delegateId: v.id("users"),
    approvalType: v.string(),
    scopeNote: v.optional(v.string()),
    maxAmount: v.optional(v.number()), // must not exceed delegator's own authority — validated at grant time
    reason: v.string(),
    startAt: v.string(),
    endAt: v.string(),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("revoked")),
    authorizedBy: v.optional(v.id("users")),
  })
    .index("by_delegator", ["delegatorId"])
    .index("by_delegate", ["delegateId"])
    .index("by_status", ["status"]),

  // ── Access reviews ────────────────────────────────────────────────────────
  accessReviews: defineTable({
    userId: v.id("users"),
    reviewedBy: v.id("users"),
    scopeReviewed: v.string(),        // e.g. "roles","permissions","scopes","approval_authority"
    outcome: v.union(v.literal("confirmed"), v.literal("modified"), v.literal("revoked"), v.literal("flagged")),
    notes: v.optional(v.string()),
    reviewedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_reviewer", ["reviewedBy"]),

  // ── Organisational change history (with impact snapshot) ─────────────────
  organizationalChanges: defineTable({
    changeType: v.string(),           // "move_department","rename_directorate","transfer_user", etc.
    entityType: v.string(),           // "directorate"|"department"|"unit"|"position"|"user"
    entityId: v.string(),
    previousState: v.optional(v.string()), // JSON snapshot
    newState: v.optional(v.string()),      // JSON snapshot
    impactSummary: v.optional(v.string()), // JSON: { usersAffected, rolesAffected, ... }
    reason: v.optional(v.string()),
    effectiveDate: v.string(),
    actorId: v.id("users"),
    timestamp: v.string(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_timestamp", ["timestamp"]),

  // ── External strategic partner engagements (e.g. GRBS) — NEVER a
  //    permanent organisational node. Time-bound, advisory alignment only. ──
  externalPartners: defineTable({
    name: v.string(),                 // e.g. "GRBS"
    partnerType: v.string(),          // "technical"|"consulting"|"advisory"|"contractor"|"other"
    description: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.optional(v.id("users")),
  }).index("by_status", ["status"]),

  partnerEngagements: defineTable({
    partnerId: v.id("externalPartners"),
    engagementType: v.string(),       // "strategic_technical_partnership","advisory","consulting"
    status: v.union(
      v.literal("draft"), v.literal("pending_approval"), v.literal("active"),
      v.literal("suspended"), v.literal("expired"), v.literal("terminated"), v.literal("completed"),
    ),
    strategicScope: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.optional(v.string()),   // required for temporary engagements (enforced in mutation)
    liaisonUserId: v.optional(v.id("users")), // Geodata executive sponsor/liaison
    // The external partner's own login account (an External/Restricted-role
    // user). Set only when `dashboardAccess` is granted — this is what lets
    // that account's own dashboard show its Advisory/Functional Alignment,
    // scope, and status without exposing any other engagement's data.
    externalUserId: v.optional(v.id("users")),
    dashboardAccess: v.boolean(),      // defaults false
    documentAccess: v.boolean(),
    workflowAccess: v.boolean(),
    exportAccess: v.boolean(),
    approvalStatus: v.optional(v.string()), // "pending"|"approved"|"rejected"
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.string()),
    terminatedReason: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_partner", ["partnerId"])
    .index("by_status", ["status"])
    .index("by_endDate", ["endDate"])
    .index("by_externalUser", ["externalUserId"]),

  // ── Functional/advisory alignment (dotted-line, NOT reporting) ───────────
  partnerAlignments: defineTable({
    engagementId: v.id("partnerEngagements"),
    alignmentType: v.union(v.literal("directorate"), v.literal("department"), v.literal("unit"), v.literal("project"), v.literal("programme")),
    directorateId: v.optional(v.id("directorates")),
    departmentId: v.optional(v.id("departments")),
    unitId: v.optional(v.id("units")),
    label: v.optional(v.string()),    // free text for project/programme alignment
    relationshipKind: v.literal("advisory_functional"), // explicitly never "reporting"
  })
    .index("by_engagement", ["engagementId"])
    .index("by_directorate", ["directorateId"]),

  partnerEngagementHistory: defineTable({
    engagementId: v.id("partnerEngagements"),
    action: v.string(),               // "created"|"activated"|"suspended"|"expired"|"terminated"|"extended"|"scope_changed"
    fromStatus: v.optional(v.string()),
    toStatus: v.optional(v.string()),
    detail: v.optional(v.string()),
    actorId: v.optional(v.id("users")),
    timestamp: v.string(),
  }).index("by_engagement", ["engagementId"]),

  // ══════════════════════════════════════════════════════════════════════
  // LIVE VIRTUAL INSPECTION — gated end-to-end by the "feature_live_virtual_
  // inspection" siteSettings toggle (default OFF). References existing
  // properties/estates/clients/users records; never duplicates them.
  // ══════════════════════════════════════════════════════════════════════
  liveInspections: defineTable({
    inspectionRef: v.string(),        // GWS-LVI-NNNN
    inspectionType: v.union(v.literal("property"), v.literal("estate"), v.literal("construction")),
    propertyId: v.optional(v.id("properties")),
    estateId: v.optional(v.id("estates")),
    clientId: v.id("clients"),
    assignedOfficer: v.optional(v.id("users")),
    status: v.union(
      v.literal("draft"), v.literal("requested"), v.literal("scheduled"), v.literal("confirmed"),
      v.literal("live"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show"), v.literal("rescheduled"),
    ),
    checklistTemplateKey: v.optional(v.string()), // "exterior"|"interior"|"estate"|"construction"
    scheduledAt: v.optional(v.string()),          // ISO 8601
    startedAt: v.optional(v.string()),
    endedAt: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    cancelReason: v.optional(v.string()),
    outcome: v.optional(v.string()),              // free text summary at completion
    followUpRequired: v.optional(v.boolean()),
    recordingConsentGiven: v.optional(v.boolean()),
    recordingUrl: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_status", ["status"])
    .index("by_client", ["clientId"])
    .index("by_property", ["propertyId"])
    .index("by_estate", ["estateId"])
    .index("by_officer", ["assignedOfficer"])
    .searchIndex("search_ref", { searchField: "inspectionRef", filterFields: ["status", "inspectionType"] }),

  // Session participants — officer(s) and client(s) who joined a live session.
  inspectionParticipants: defineTable({
    inspectionId: v.id("liveInspections"),
    userId: v.optional(v.id("users")),   // staff participant
    clientId: v.optional(v.id("clients")), // client participant
    role: v.union(v.literal("officer"), v.literal("client"), v.literal("observer")),
    joinedAt: v.string(),
    leftAt: v.optional(v.string()),
  }).index("by_inspection", ["inspectionId"]),

  // WebRTC signaling messages (offer/answer/ICE candidates) relayed via
  // Convex — no third-party video SaaS. Rows are short-lived and small.
  inspectionSignals: defineTable({
    inspectionId: v.id("liveInspections"),
    fromUserKey: v.string(),   // opaque per-participant id (userId or client session id)
    toUserKey: v.optional(v.string()), // omit to broadcast to all other participants
    signalType: v.union(v.literal("offer"), v.literal("answer"), v.literal("ice-candidate"), v.literal("leave")),
    payload: v.string(),       // JSON-encoded SDP or ICE candidate
  }).index("by_inspection", ["inspectionId"]),

  // Checklist item completion per inspection (template items are code-defined
  // constants in convex/liveInspections.ts; only completion state is stored).
  inspectionChecklistItems: defineTable({
    inspectionId: v.id("liveInspections"),
    itemKey: v.string(),       // e.g. "exterior.entrance"
    label: v.string(),
    completed: v.boolean(),
    completedBy: v.optional(v.id("users")),
    completedAt: v.optional(v.string()),
    remark: v.optional(v.string()),
  }).index("by_inspection", ["inspectionId"]),

  // Snapshots captured during a live session.
  inspectionSnapshots: defineTable({
    inspectionId: v.id("liveInspections"),
    storageId: v.id("_storage"),
    checklistItemKey: v.optional(v.string()),
    capturedBy: v.id("users"),
    capturedAt: v.string(),
    annotation: v.optional(v.string()),
    clientVisible: v.boolean(),   // false by default — must be explicitly marked presentable
  }).index("by_inspection", ["inspectionId"]),

  // Notes taken during/after an inspection — internal notes are NEVER
  // exposed to the client regardless of their participation.
  inspectionNotes: defineTable({
    inspectionId: v.id("liveInspections"),
    authorId: v.id("users"),
    body: v.string(),
    visibility: v.union(v.literal("internal"), v.literal("client_visible")),
    createdAt: v.string(),
  }).index("by_inspection", ["inspectionId"]),

  // Client requests to view a specific area during the live session.
  inspectionViewRequests: defineTable({
    inspectionId: v.id("liveInspections"),
    requestedArea: v.union(
      v.literal("kitchen"), v.literal("master_bedroom"), v.literal("bedroom"), v.literal("bathroom"),
      v.literal("living_room"), v.literal("exterior"), v.literal("parking"), v.literal("road"),
      v.literal("estate_facility"), v.literal("other"),
    ),
    note: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("fulfilled"), v.literal("declined")),
    requestedAt: v.string(),
    fulfilledAt: v.optional(v.string()),
  }).index("by_inspection", ["inspectionId"]),

  // Live chat exchanged during a session — separate from formal inspection
  // notes (which are staff-authored and may be internal-only).
  inspectionChatMessages: defineTable({
    inspectionId: v.id("liveInspections"),
    senderRole: v.union(v.literal("officer"), v.literal("client")),
    senderName: v.string(),
    senderId: v.optional(v.id("users")),
    senderClientId: v.optional(v.id("clients")),
    body: v.string(),
    createdAt: v.string(),
  }).index("by_inspection", ["inspectionId"]),

  // Links an inspection to existing Documents & Vault records ("documents
  // presented" during the session) — no second document store. Visibility
  // to the client still follows the vault document's own isConfidential
  // flag plus this explicit link, never automatic.
  inspectionDocuments: defineTable({
    inspectionId: v.id("liveInspections"),
    vaultDocumentId: v.id("vaultDocuments"),
    presentedToClient: v.boolean(), // whether it was shown to the client during the session
    linkedBy: v.id("users"),
    linkedAt: v.string(),
  })
    .index("by_inspection", ["inspectionId"])
    .index("by_document", ["vaultDocumentId"]),

  // ══════════════════════════════════════════════════════════════════════
  // GEODATA LIVE INSPECT™ — INTERACTIVE 360°/VR TOUR.
  // Second mode of the LIVE INSPECT product, alongside the existing Live
  // Property/Construction Inspection above. Self-guided (no officer
  // required). Gated by its own siteSettings toggle
  // ("feature_360_vr_tour", default OFF) so it can be switched on/off
  // independently of the live-session feature. References the existing
  // properties table only — never a second property/media store.
  // ══════════════════════════════════════════════════════════════════════
  propertyTours: defineTable({
    propertyId: v.id("properties"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("unpublished")),
    startSceneId: v.optional(v.id("tourScenes")), // first scene shown on launch
    floorPlanStorageId: v.optional(v.id("_storage")), // optional floor-plan reference image
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.string(),
  })
    .index("by_property", ["propertyId"])
    .index("by_status", ["status"]),

  // One 360° panoramic scene (room/location) within a tour.
  tourScenes: defineTable({
    tourId: v.id("propertyTours"),
    name: v.string(),                 // e.g. "Master Bedroom", "Front Exterior"
    sceneType: v.union(v.literal("interior"), v.literal("exterior"), v.literal("estate")),
    panoramaStorageId: v.id("_storage"),
    description: v.optional(v.string()),
    order: v.number(),
    // Default look-at yaw (degrees) when the scene loads — future-ready for
    // deep-linking straight into a specific viewing angle.
    initialYaw: v.optional(v.number()),
  })
    .index("by_tour", ["tourId"])
    .index("by_tour_and_order", ["tourId", "order"]),

  // Hotspots placed on a scene's panorama — either navigate to another scene
  // or show an info popup. Position is stored as normalized spherical
  // coordinates (yaw/pitch degrees) so it is resolution-independent and
  // future-ready for WebXR spatial placement.
  tourHotspots: defineTable({
    sceneId: v.id("tourScenes"),
    kind: v.union(v.literal("navigation"), v.literal("info")),
    yaw: v.number(),   // -180..180
    pitch: v.number(), // -90..90
    label: v.string(),
    targetSceneId: v.optional(v.id("tourScenes")), // required when kind === "navigation"
    infoText: v.optional(v.string()),              // required when kind === "info"
  }).index("by_scene", ["sceneId"]),

  // ══════════════════════════════════════════════════════════════════════
  // IN-APP NOTIFICATIONS
  // A single shared inbox powering the bell icon on every dashboard
  // (client, partner, admin). Created alongside existing email alerts by
  // the same backend actions that already fire them — never a separate
  // trigger system. Recipient is always a `users` row (staff/admin) or a
  // `clients` row (buyers); exactly one of the two is set per notification.
  // ══════════════════════════════════════════════════════════════════════
  notifications: defineTable({
    recipientUserId: v.optional(v.id("users")),
    recipientClientId: v.optional(v.id("clients")),
    type: v.string(), // e.g. "kyc_status", "support_reply", "inspection_update", "document", "transaction_status", "lead_update"
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()), // in-app path to navigate to on click, e.g. "/client?tab=kyc"
    isRead: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_recipientUser_and_isRead", ["recipientUserId", "isRead"])
    .index("by_recipientClient_and_isRead", ["recipientClientId", "isRead"]),

  // ══════════════════════════════════════════════════════════════════════
  // CORPORATE MARKETING & BULK SALES — gated end-to-end by the
  // "feature_corporate_marketing_sales" siteSettings toggle (default OFF),
  // deny-by-default granular IAM permissions (module "corporate_marketing").
  // Extends the existing CRM/Sales/Documents/Tasks/Payments/Allocations/
  // Transactions architecture; never a second CRM or sales system. Never
  // stores duplicate individual-client records — this models institutional
  // organisations only, distinct from `clients` (individual buyers) and
  // `directorates`/`departments` (Geodata's own internal org chart).
  // ══════════════════════════════════════════════════════════════════════

  // ── Configurable organisation types (Government Agency, Bank, NGO, etc.) ─
  corporateOrgTypes: defineTable({
    name: v.string(),
    order: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.optional(v.id("users")),
  }).index("by_status", ["status"]).index("by_order", ["order"]),

  // ── Institutional/corporate organisation record ──────────────────────────
  corporateOrganisations: defineTable({
    orgRef: v.string(),                    // GWS-CORG-NNNN
    name: v.string(),
    orgTypeKey: v.optional(v.string()),    // corporateOrgTypes — configurable, never hard-coded
    industry: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    officialEmail: v.optional(v.string()),
    phone: v.optional(v.string()),
    relationshipOwner: v.optional(v.id("users")),
    assignedOfficer: v.optional(v.id("users")),
    source: v.optional(v.string()),
    campaignId: v.optional(v.id("corporateCampaigns")),
    // Attribution when this organisation originated from the Diaspora
    // Investment & Property Platform's Corporate programme (a distinct
    // concept from `campaignId` above, which points to corporate
    // marketing's own campaigns table) — additive/optional, never required.
    diasporaCampaignId: v.optional(v.id("diasporaCampaigns")),
    status: v.union(v.literal("prospect"), v.literal("active"), v.literal("dormant"), v.literal("disengaged")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    // Lightweight billing/legal proxy into the EXISTING `clients` table —
    // never a duplicate customer record. Created lazily (once per
    // organisation) the first time a commitment/payment/allocation needs a
    // `clientId` to flow through the existing Payments/Allocations/
    // Transactions systems. Real decision-makers stay tracked via
    // `corporateContacts`; this proxy is purely a billing anchor.
    linkedClientId: v.optional(v.id("clients")),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_status", ["status"])
    .index("by_owner", ["relationshipOwner"])
    .index("by_officer", ["assignedOfficer"])
    .index("by_campaign", ["campaignId"])
    .index("by_diaspora_campaign", ["diasporaCampaignId"])
    .index("by_linked_client", ["linkedClientId"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["status", "orgTypeKey"] }),

  // ── Multiple contacts per organisation ───────────────────────────────────
  corporateContacts: defineTable({
    organisationId: v.id("corporateOrganisations"),
    name: v.string(),
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    preferredChannel: v.optional(v.string()), // "email"|"phone"|"whatsapp"|"in_person"
    isPrimary: v.boolean(),
    isAuthorised: v.boolean(),
    isDecisionMaker: v.boolean(),
    isProcurementContact: v.boolean(),
    isFinanceContact: v.boolean(),
    isLegalContact: v.boolean(),
    isHrContact: v.boolean(),
    isExecutiveContact: v.boolean(),
    notes: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_organisation", ["organisationId"])
    .index("by_status", ["status"]),

  // ── Configurable pipeline stages for corporate opportunities ─────────────
  corporatePipelineStages: defineTable({
    key: v.string(),                       // stable slug, never renamed once referenced
    label: v.string(),
    order: v.number(),
    requiresApproval: v.optional(v.boolean()),
    isClosedWon: v.optional(v.boolean()),
    isClosedLost: v.optional(v.boolean()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.optional(v.id("users")),
  }).index("by_status", ["status"]).index("by_order", ["order"]).index("by_key", ["key"]),

  // ── Marketing campaigns targeting corporate organisations ────────────────
  corporateCampaigns: defineTable({
    campaignRef: v.string(),               // GWS-CCMP-NNNN
    name: v.string(),
    description: v.optional(v.string()),
    targetSector: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
    status: v.union(v.literal("planned"), v.literal("active"), v.literal("completed"), v.literal("paused")),
    budget: v.optional(v.number()),
    objectives: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  }).index("by_status", ["status"]).searchIndex("search_name", { searchField: "name", filterFields: ["status"] }),

  // ── Corporate opportunity — the central bulk-acquisition record ─────────
  corporateOpportunities: defineTable({
    opportunityRef: v.string(),            // GWS-COPP-NNNN
    organisationId: v.id("corporateOrganisations"),
    name: v.string(),
    opportunityType: v.optional(v.string()), // "staff_housing"|"investment_portfolio"|"off_take"|"cooperative"|"institutional"|"other"
    relationshipOwner: v.optional(v.id("users")),
    assignedOfficer: v.optional(v.id("users")),
    campaignId: v.optional(v.id("corporateCampaigns")),
    // Attribution when this opportunity originated from the Diaspora
    // Investment & Property Platform's Corporate programme — see the same
    // field on `corporateOrganisations` above. Additive/optional only.
    diasporaCampaignId: v.optional(v.id("diasporaCampaigns")),
    source: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    stageKey: v.string(),                  // corporatePipelineStages.key
    // Acquisition requirement (aggregate free-text; per-property detail lives on line items)
    preferredLocation: v.optional(v.string()),
    intendedUse: v.optional(v.string()),
    requirementNotes: v.optional(v.string()),
    // Commercial summary (also derivable from line items — kept for opportunity-level override/negotiated terms)
    paymentStructure: v.optional(v.string()),
    proposedDeposit: v.optional(v.number()),
    instalmentStructure: v.optional(v.string()),
    commercialNotes: v.optional(v.string()),
    // Approval
    approvalStatus: v.optional(v.union(v.literal("not_required"), v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    approvalId: v.optional(v.id("approvals")), // links to existing Tasks & Approvals record
    // Closure
    expectedCloseDate: v.optional(v.string()),
    actualCloseDate: v.optional(v.string()),
    lostReason: v.optional(v.string()),
    competitorNote: v.optional(v.string()),
    isNurture: v.optional(v.boolean()),
    nurtureDate: v.optional(v.string()),
    closingNotes: v.optional(v.string()),
    // Next action (follow-up tracking, feeds existing Tasks)
    nextActionTaskId: v.optional(v.id("tasks")),
    // Conversion to existing Transaction system
    transactionId: v.optional(v.id("transactions")),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_organisation", ["organisationId"])
    .index("by_stage", ["stageKey"])
    .index("by_owner", ["relationshipOwner"])
    .index("by_officer", ["assignedOfficer"])
    .index("by_campaign", ["campaignId"])
    .index("by_diaspora_campaign", ["diasporaCampaignId"])
    .index("by_transaction", ["transactionId"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["stageKey"] }),

  // ── Per-property-type bulk line items within one opportunity ─────────────
  corporateOpportunityLineItems: defineTable({
    opportunityId: v.id("corporateOpportunities"),
    // Optional link into the operational fulfilment layer (Institutional /
    // Bulk Acquisition Management enhancement). A line item created before
    // that layer existed simply has no acquisition yet — never required,
    // never migrated, never a second line-item table.
    bulkAcquisitionId: v.optional(v.id("corporateBulkAcquisitions")),
    propertyId: v.optional(v.id("properties")),
    estateId: v.optional(v.id("estates")),
    propertyType: v.optional(v.string()),
    description: v.optional(v.string()),
    // Quantity tracking
    quantityRequired: v.number(),
    quantityEoi: v.number(),
    quantityProposed: v.number(),
    quantityNegotiated: v.number(),
    quantityCommitted: v.number(),
    quantityPaid: v.number(),
    quantityAllocated: v.number(),
    // Pricing — each stage is a distinct field, never overwritten, so the
    // full pricing history (standard → bulk → proposed → negotiated →
    // approved) stays visible on the same row at all times (Institutional /
    // Bulk Acquisition Management enhancement, spec section 9).
    standardPrice: v.optional(v.number()),
    bulkPrice: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    proposedPrice: v.optional(v.number()),
    negotiatedPrice: v.optional(v.number()),
    approvedPrice: v.optional(v.number()),
    discountPercent: v.optional(v.number()),
    allocationStatus: v.union(v.literal("not_started"), v.literal("partial"), v.literal("completed")),
    // Commitment tracking (Commitment Received pipeline stage)
    committedAt: v.optional(v.string()),
    committedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  }).index("by_opportunity", ["opportunityId"]),

  // ── Partnership letters ───────────────────────────────────────────────────
  corporatePartnershipLetters: defineTable({
    letterRef: v.string(),                 // GWS-CLTR-NNNN
    organisationId: v.id("corporateOrganisations"),
    opportunityId: v.optional(v.id("corporateOpportunities")),
    contactId: v.optional(v.id("corporateContacts")),
    subject: v.string(),
    status: v.union(
      v.literal("draft"), v.literal("in_review"), v.literal("approved"),
      v.literal("sent"), v.literal("delivered"), v.literal("acknowledged"), v.literal("cancelled"),
    ),
    vaultDocumentId: v.optional(v.id("vaultDocuments")), // the actual letter document — no second doc store
    approvalId: v.optional(v.id("approvals")),
    preparedBy: v.optional(v.id("users")),
    reviewedBy: v.optional(v.id("users")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.string()),
    sentAt: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_organisation", ["organisationId"])
    .index("by_opportunity", ["opportunityId"])
    .index("by_status", ["status"]),

  // ── Delivery / proof of delivery for a partnership letter ────────────────
  corporateDeliveries: defineTable({
    letterId: v.id("corporatePartnershipLetters"),
    deliveryMethod: v.union(v.literal("hand_delivery"), v.literal("courier"), v.literal("email"), v.literal("other")),
    deliveredBy: v.optional(v.string()),
    receivedBy: v.optional(v.string()),
    recipientDesignation: v.optional(v.string()),
    deliveryDate: v.string(),
    status: v.union(v.literal("pending"), v.literal("delivered"), v.literal("failed")),
    proofVaultDocumentId: v.optional(v.id("vaultDocuments")),
    notes: v.optional(v.string()),
    recordedBy: v.optional(v.id("users")),
  }).index("by_letter", ["letterId"]),

  // ── Acknowledgement — explicitly separate from e-signature ───────────────
  corporateAcknowledgements: defineTable({
    letterId: v.id("corporatePartnershipLetters"),
    ackType: v.union(v.literal("physical"), v.literal("electronic")),
    dateReceived: v.string(),
    receivedByName: v.optional(v.string()),
    receivedByDesignation: v.optional(v.string()),
    // Electronic-specific
    senderEmail: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    communicationReference: v.optional(v.string()),
    proofVaultDocumentId: v.optional(v.id("vaultDocuments")),
    notes: v.optional(v.string()),
    recordedBy: v.optional(v.id("users")),
  }).index("by_letter", ["letterId"]),

  // ── E-signature requests — separate concept from acknowledgement ────────
  corporateEsignatureRequests: defineTable({
    vaultDocumentId: v.id("vaultDocuments"),
    organisationId: v.id("corporateOrganisations"),
    opportunityId: v.optional(v.id("corporateOpportunities")),
    letterId: v.optional(v.id("corporatePartnershipLetters")),
    status: v.union(
      v.literal("not_required"), v.literal("pending"), v.literal("sent"), v.literal("viewed"),
      v.literal("partially_signed"), v.literal("fully_signed"), v.literal("declined"),
      v.literal("expired"), v.literal("cancelled"),
    ),
    signatories: v.array(v.object({
      name: v.string(),
      email: v.string(),
      role: v.optional(v.string()),
      signingOrder: v.optional(v.number()),
      signedAt: v.optional(v.string()),
      signatureRef: v.optional(v.string()),
    })),
    requestedAt: v.string(),
    expiresAt: v.optional(v.string()),
    signedAt: v.optional(v.string()),
    finalSignedVaultDocumentId: v.optional(v.id("vaultDocuments")),
    requestedBy: v.optional(v.id("users")),
  })
    .index("by_organisation", ["organisationId"])
    .index("by_opportunity", ["opportunityId"])
    .index("by_status", ["status"])
    .index("by_letter", ["letterId"]),

  // ── Corporate meetings / presentations ────────────────────────────────────
  corporateMeetings: defineTable({
    organisationId: v.id("corporateOrganisations"),
    opportunityId: v.optional(v.id("corporateOpportunities")),
    meetingDate: v.string(),
    location: v.optional(v.string()),
    isVirtual: v.optional(v.boolean()),
    participants: v.optional(v.string()),
    agenda: v.optional(v.string()),
    presentationVaultDocumentId: v.optional(v.id("vaultDocuments")),
    outcome: v.optional(v.string()),
    decisions: v.optional(v.string()),
    nextActionDate: v.optional(v.string()),
    responsibleOfficer: v.optional(v.id("users")),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_organisation", ["organisationId"])
    .index("by_opportunity", ["opportunityId"]),

  // ── Lightweight corporate activity/communication log feeding the
  //    organisation/opportunity timeline. Distinct from `communications.ts`
  //    (which manages public ticker/pop content, not CRM activity). ─────────
  corporateActivities: defineTable({
    organisationId: v.id("corporateOrganisations"),
    opportunityId: v.optional(v.id("corporateOpportunities")),
    contactId: v.optional(v.id("corporateContacts")),
    activityType: v.string(), // "call"|"email"|"meeting"|"presentation"|"letter"|"follow_up"|"eoi"|"proposal"|"negotiation"|"inspection"|"other"
    subject: v.optional(v.string()),
    notes: v.optional(v.string()),
    outcome: v.optional(v.string()),
    nextActionDate: v.optional(v.string()),
    performedBy: v.optional(v.id("users")),
    occurredAt: v.string(),
  })
    .index("by_organisation", ["organisationId"])
    .index("by_opportunity", ["opportunityId"]),

  // ── Expression of Interest ────────────────────────────────────────────────
  corporateEois: defineTable({
    eoiRef: v.string(),                    // GWS-CEOI-NNNN
    opportunityId: v.id("corporateOpportunities"),
    status: v.union(v.literal("requested"), v.literal("received"), v.literal("expired")),
    requestedDate: v.optional(v.string()),
    deadline: v.optional(v.string()),
    receivedDate: v.optional(v.string()),
    contactId: v.optional(v.id("corporateContacts")),
    requirements: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    vaultDocumentId: v.optional(v.id("vaultDocuments")),
    responsibleOfficer: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  }).index("by_opportunity", ["opportunityId"]).index("by_status", ["status"]),

  // ── Proposals / offers ────────────────────────────────────────────────────
  corporateProposals: defineTable({
    proposalRef: v.string(),               // GWS-CPRO-NNNN
    opportunityId: v.id("corporateOpportunities"),
    validityPeriodDays: v.optional(v.number()),
    terms: v.optional(v.string()),
    status: v.union(
      v.literal("draft"), v.literal("under_review"), v.literal("pending_approval"), v.literal("approved"),
      v.literal("submitted"), v.literal("accepted"), v.literal("negotiation"), v.literal("rejected"),
      v.literal("expired"), v.literal("withdrawn"),
    ),
    vaultDocumentId: v.optional(v.id("vaultDocuments")),
    approvalId: v.optional(v.id("approvals")),
    preparedBy: v.optional(v.id("users")),
    reviewedBy: v.optional(v.id("users")),
    approvedBy: v.optional(v.id("users")),
    submittedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  }).index("by_opportunity", ["opportunityId"]).index("by_status", ["status"]),

  // ── Structured negotiation ────────────────────────────────────────────────
  corporateNegotiations: defineTable({
    negotiationRef: v.string(),            // GWS-CNEG-NNNN
    opportunityId: v.id("corporateOpportunities"),
    lineItemId: v.optional(v.id("corporateOpportunityLineItems")),
    startingQuantity: v.optional(v.number()),
    proposedQuantity: v.optional(v.number()),
    negotiatedQuantity: v.optional(v.number()),
    startingPrice: v.optional(v.number()),
    proposedPrice: v.optional(v.number()),
    negotiatedPrice: v.optional(v.number()),
    discountRequested: v.optional(v.number()),
    discountApproved: v.optional(v.number()),
    paymentTerms: v.optional(v.string()),
    allocationTerms: v.optional(v.string()),
    otherTerms: v.optional(v.string()),
    negotiationNotes: v.optional(v.string()),
    negotiatedBy: v.optional(v.id("users")),
    approvalStatus: v.union(v.literal("not_required"), v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvalId: v.optional(v.id("approvals")),
    negotiatedAt: v.string(),
  }).index("by_opportunity", ["opportunityId"]).index("by_lineitem", ["lineItemId"]),

  // ── Bulk payment linkage — traceability rollup only. The actual money
  //    movement is a real row in the EXISTING `geoPayments` table (against
  //    the organisation's proxy `clients` record); this table just links
  //    that payment back to the corporate opportunity/line item it was for,
  //    never a second ledger. ─────────────────────────────────────────────
  corporateBulkPayments: defineTable({
    opportunityId: v.id("corporateOpportunities"),
    lineItemId: v.optional(v.id("corporateOpportunityLineItems")),
    // Optional link to the payment-schedule row this payment was recorded
    // against (Institutional / Bulk Acquisition Management enhancement,
    // milestone 76). A payment made before a schedule existed, or one that
    // isn't tied to any specific schedule line, simply leaves this unset.
    scheduleId: v.optional(v.id("corporatePaymentSchedules")),
    paymentId: v.id("geoPayments"),               // the EXISTING payment record
    quantityCovered: v.optional(v.number()),      // units this payment counts toward, for split/partial bulk payments
    recordedBy: v.optional(v.id("users")),
    recordedAt: v.string(),
  }).index("by_opportunity", ["opportunityId"]).index("by_lineitem", ["lineItemId"]).index("by_payment", ["paymentId"]),

  // ── Bulk allocation linkage — same pattern as corporateBulkPayments, but
  //    for the EXISTING `allocations` table. `corporateOpportunityLineItems.
  //    quantityAllocated`/`allocationStatus` stay a rollup for visibility;
  //    the real allocation event lives in `allocations`. ──────────────────
  corporateBulkAllocations: defineTable({
    opportunityId: v.id("corporateOpportunities"),
    lineItemId: v.id("corporateOpportunityLineItems"),
    allocationId: v.id("allocations"),            // the EXISTING allocation record
    // Optional link to the allocation batch this allocation was made under
    // (Institutional / Bulk Acquisition Management enhancement, milestone
    // 77). Unset for allocations recorded before batches existed, or ones
    // made directly outside a batch.
    batchId: v.optional(v.id("corporateAllocationBatches")),
    recordedBy: v.optional(v.id("users")),
    recordedAt: v.string(),
  })
    .index("by_opportunity", ["opportunityId"])
    .index("by_lineitem", ["lineItemId"])
    .index("by_allocation", ["allocationId"]),

  // ══════════════════════════════════════════════════════════════════════════
  // INSTITUTIONAL / BULK ACQUISITION MANAGEMENT — enhancement to Corporate
  // Marketing & Bulk Sales. Operational fulfilment layer starting from
  // Commitment: Bulk Acquisition → Line Items (existing table, linked via
  // bulkAcquisitionId) → Commercial Terms → Payment Schedule → Payments →
  // Allocation Batches → Transaction → Fulfilment → Closed Won. Never a
  // second CRM/opportunity/payment/allocation/transaction system — see the
  // governing comments throughout convex/corporateMarketing/.
  // ══════════════════════════════════════════════════════════════════════════

  // ── Configurable acquisition lifecycle statuses — same pattern as
  //    corporatePipelineStages. Never hard-coded so the workflow can evolve. ─
  corporateAcquisitionStatuses: defineTable({
    key: v.string(),                       // stable slug, never renamed once referenced
    label: v.string(),
    order: v.number(),
    isFulfilled: v.optional(v.boolean()),
    isCancelled: v.optional(v.boolean()),
    isOnHold: v.optional(v.boolean()),
    isDisputed: v.optional(v.boolean()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.optional(v.id("users")),
  }).index("by_status", ["status"]).index("by_order", ["order"]).index("by_key", ["key"]),

  // ── Institutional / Bulk Acquisition — the operational fulfilment parent
  //    record. Sits below a corporateOpportunity once it reaches Commitment.
  //    One opportunity may spawn more than one acquisition (e.g. phased
  //    programmes), though most will have exactly one. ─────────────────────
  corporateBulkAcquisitions: defineTable({
    acquisitionRef: v.string(),            // GWS-CBAQ-NNNN
    organisationId: v.id("corporateOrganisations"),
    opportunityId: v.id("corporateOpportunities"),
    campaignId: v.optional(v.id("corporateCampaigns")),
    name: v.string(),
    acquisitionType: v.optional(v.string()), // "staff_housing"|"investment_portfolio"|"off_take"|"cooperative"|"institutional"|"other"
    developmentEstateId: v.optional(v.id("estates")),
    relationshipOwner: v.optional(v.id("users")),
    assignedOfficer: v.optional(v.id("users")),
    statusKey: v.string(),                 // corporateAcquisitionStatuses.key
    // Commercial status sub-fields (each module updates its own — mirrors
    // the transactions.ts convention of independent sub-statuses)
    commitmentStatus: v.optional(v.string()),
    commercialApprovalStatus: v.optional(v.union(v.literal("not_required"), v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    agreementStatus: v.optional(v.union(v.literal("not_started"), v.literal("pending"), v.literal("executed"))),
    paymentStatus: v.optional(v.union(v.literal("not_started"), v.literal("partial"), v.literal("fully_paid"))),
    allocationStatus: v.optional(v.union(v.literal("not_started"), v.literal("partial"), v.literal("fully_allocated"))),
    fulfilmentStatus: v.optional(v.union(v.literal("not_started"), v.literal("partial"), v.literal("fulfilled"))),
    // Set once this acquisition is converted into its own EXISTING
    // transactions row (Institutional / Bulk Acquisition Management
    // enhancement, spec section 20-21) — never a second transaction concept.
    // Distinct from corporateOpportunities.transactionId: one opportunity may
    // spawn several acquisitions, each converting to its own transaction.
    transactionId: v.optional(v.id("transactions")),
    // Value rollups (recomputed from line items/payments/allocations — never
    // hand-entered ledgers; see bulkAcquisitions.ts recomputeRollups)
    originalEstimatedValue: v.optional(v.number()),
    approvedValue: v.optional(v.number()),
    negotiatedValue: v.optional(v.number()),
    committedValue: v.optional(v.number()),
    paidValue: v.optional(v.number()),
    allocatedValue: v.optional(v.number()),
    outstandingValue: v.optional(v.number()),
    // Quantity rollups
    requiredQuantity: v.optional(v.number()),
    eoiQuantity: v.optional(v.number()),
    negotiatedQuantity: v.optional(v.number()),
    committedQuantity: v.optional(v.number()),
    paidQuantity: v.optional(v.number()),
    allocatedQuantity: v.optional(v.number()),
    outstandingQuantity: v.optional(v.number()),
    // Allocation eligibility rule for this acquisition (spec section 14) —
    // never a single hard-coded percentage across the whole app.
    allocationEligibilityRule: v.optional(v.union(v.literal("full_payment"), v.literal("min_percentage"), v.literal("management_exception_only"))),
    allocationEligibilityPercent: v.optional(v.number()),
    expectedCompletionDate: v.optional(v.string()),
    actualCompletionDate: v.optional(v.string()),
    // Cancellation (soft state — never physically deleted)
    cancellationReason: v.optional(v.string()),
    cancellationRequestedBy: v.optional(v.id("users")),
    cancelledBy: v.optional(v.id("users")),
    cancelledAt: v.optional(v.string()),
    financialImpactNotes: v.optional(v.string()),
    allocationImpactNotes: v.optional(v.string()),
    refundStatus: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_organisation", ["organisationId"])
    .index("by_opportunity", ["opportunityId"])
    .index("by_status", ["statusKey"])
    .index("by_owner", ["relationshipOwner"])
    .index("by_officer", ["assignedOfficer"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["statusKey"] }),

  // ── Commercial terms — versioned, never patched over (Institutional / Bulk
  // Acquisition Management enhancement, spec sections 10-11). Each proposed
  // change inserts a brand-new row with an incremented `version` and a
  // `supersedes` pointer to the row it replaces; the previous row's status
  // flips to "superseded" but is never edited or deleted, so the full
  // commercial-terms history stays visible. A discount above the configured
  // threshold routes through the EXISTING approvals table (see
  // iam/approvalAuthority.ts hasApprovalAuthority) before the version can
  // become "active" — never auto-approved by the requesting officer.
  corporateCommercialTerms: defineTable({
    bulkAcquisitionId: v.id("corporateBulkAcquisitions"),
    version: v.number(),
    supersedes: v.optional(v.id("corporateCommercialTerms")),
    status: v.union(v.literal("draft"), v.literal("pending_approval"), v.literal("active"), v.literal("rejected"), v.literal("superseded")),
    totalUnits: v.optional(v.number()),
    totalPlots: v.optional(v.number()),
    pricePerUnit: v.optional(v.number()),
    totalContractValue: v.optional(v.number()),
    discountPercent: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    discountJustification: v.optional(v.string()),
    depositPercent: v.optional(v.number()),
    depositAmount: v.optional(v.number()),
    instalmentStructure: v.optional(v.string()),   // free text e.g. "Quarterly over 18 months"
    instalmentFrequency: v.optional(v.union(v.literal("monthly"), v.literal("quarterly"), v.literal("biannually"), v.literal("annually"), v.literal("custom"))),
    instalmentDurationMonths: v.optional(v.number()),
    gracePeriodDays: v.optional(v.number()),
    allocationConditions: v.optional(v.string()),
    completionConditions: v.optional(v.string()),
    offTakeTerms: v.optional(v.string()),
    agreementConditions: v.optional(v.string()),
    specialTerms: v.optional(v.string()),
    // Approval routing for a discount/exception beyond the requesting
    // officer's own authority — same `approvals` table used everywhere else.
    approvalId: v.optional(v.id("approvals")),
    approvalRequired: v.boolean(),
    proposedBy: v.optional(v.id("users")),
    proposedAt: v.string(),
    decidedBy: v.optional(v.id("users")),
    decidedAt: v.optional(v.string()),
    decisionNote: v.optional(v.string()),
    activatedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_acquisition", ["bulkAcquisitionId"])
    .index("by_status", ["status"]),

  // ── Payment schedule — one row per due date (deposit/instalment N/final)
  //    for a bulk acquisition (Institutional / Bulk Acquisition Management
  //    enhancement, spec section 12-13). `amountPaid`/`balance`/`status` are
  //    rollups recomputed whenever a payment links against this row via
  //    `corporateBulkPayments.scheduleId` — the actual money movement still
  //    goes through the EXISTING `geoPayments` table (commitments.ts
  //    recordBulkPayment), never a second ledger. `status` intentionally
  //    excludes "overdue": that is derived at read time from `dueDate` vs
  //    "today" so it never goes stale without a cron job.
  corporatePaymentSchedules: defineTable({
    bulkAcquisitionId: v.id("corporateBulkAcquisitions"),
    sequence: v.number(),                  // 1-based display order
    label: v.string(),                     // "Deposit" | "Instalment 1" | "Final Payment" | custom
    scheduleType: v.union(v.literal("deposit"), v.literal("instalment"), v.literal("final")),
    dueDate: v.string(),
    amountDue: v.number(),
    amountPaid: v.number(),
    balance: v.number(),                   // amountDue - amountPaid, never negative
    status: v.union(v.literal("upcoming"), v.literal("partially_paid"), v.literal("paid")),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_acquisition", ["bulkAcquisitionId"])
    .index("by_status", ["status"]),

  // ── Allocation Batches — a controlled unit of work for allocating plots to
  //    an institutional/bulk acquisition (Institutional / Bulk Acquisition
  //    Management enhancement, spec section 14). A batch groups one or more
  //    individual allocation events (each still a real row in the EXISTING
  //    `allocations` table, linked via `corporateBulkAllocations.batchId`) so
  //    officers can allocate in controlled tranches rather than one plot at a
  //    time with no record of the tranche itself. Eligibility (how many units
  //    are currently allowed to be allocated) is computed from the
  //    acquisition's configured `allocationEligibilityRule` — never a single
  //    hard-coded percentage — and re-checked against live `plots`/`estates`
  //    availability before any allocation inside the batch is made, so
  //    unavailable inventory is never silently allocated.
  corporateAllocationBatches: defineTable({
    batchRef: v.string(),                  // GWS-CBAT-NNNN
    bulkAcquisitionId: v.id("corporateBulkAcquisitions"),
    lineItemId: v.optional(v.id("corporateOpportunityLineItems")), // unset = spans multiple line items
    batchDate: v.string(),
    requestedQuantity: v.number(),         // units this batch intends to allocate
    status: v.union(
      v.literal("draft"), v.literal("pending_approval"), v.literal("approved"),
      v.literal("in_progress"), v.literal("completed"), v.literal("cancelled"),
    ),
    // Set only when the batch is proceeding under a management-exception
    // eligibility override rather than the acquisition's normal rule — the
    // EXISTING approvals table gates it, never auto-approved by the
    // requesting officer (see iam/approvalAuthority.ts hasApprovalAuthority).
    isException: v.optional(v.boolean()),
    exceptionReason: v.optional(v.string()),
    approvalId: v.optional(v.id("approvals")),
    responsibleOfficer: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_acquisition", ["bulkAcquisitionId"])
    .index("by_status", ["status"]),

  // ── Exceptions register — a unified log of every controlled exception
  //    raised anywhere in Institutional / Bulk Acquisition Management (spec
  //    section 25): price/discount overages, payment exceptions, allocation
  //    eligibility overrides, quantity overrides, contract/commercial-term
  //    deviations. Each exception path (commercial terms discount, allocation
  //    batch exception, etc) inserts its OWN approvals row as it always has —
  //    this table adds a second, cross-cutting pointer to that same approval
  //    so the whole register can be viewed and reported on in one place,
  //    never a second approval engine. Never deleted.
  corporateExceptions: defineTable({
    bulkAcquisitionId: v.id("corporateBulkAcquisitions"),
    exceptionType: v.union(
      v.literal("price"), v.literal("discount"), v.literal("payment"),
      v.literal("allocation"), v.literal("quantity"), v.literal("contract"),
      v.literal("commercial_term"),
    ),
    reason: v.string(),
    requestedBy: v.optional(v.id("users")),
    requestedAt: v.string(),
    // Points at the SAME approvals row created by whichever module raised
    // this exception (commercialTerms.ts / allocationBatches.ts / etc) —
    // status here always mirrors that approval, never decided independently.
    approvalId: v.optional(v.id("approvals")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    relatedRef: v.optional(v.string()),  // human-readable ref of the thing the exception is on (batch/terms version/etc)
    notes: v.optional(v.string()),
  })
    .index("by_acquisition", ["bulkAcquisitionId"])
    .index("by_type", ["exceptionType"])
    .index("by_status", ["status"]),

  // ── On Hold / Disputed history — an acquisition can be placed on hold or
  //    disputed without ever deleting it (spec section 26). While an
  //    unresolved hold exists, the acquisition's statusKey flips to the
  //    configured "on_hold"/"disputed" status; resolving the hold reverts it
  //    to whatever status is recorded on the hold row itself as
  //    `statusBeforeHold`, never guessed.
  corporateAcquisitionHolds: defineTable({
    bulkAcquisitionId: v.id("corporateBulkAcquisitions"),
    holdType: v.union(v.literal("on_hold"), v.literal("disputed")),
    reason: v.string(),
    raisedBy: v.optional(v.id("users")),
    raisedAt: v.string(),
    responsiblePerson: v.optional(v.id("users")),
    statusBeforeHold: v.string(),          // acquisition.statusKey at the moment the hold was raised
    supportingVaultDocumentId: v.optional(v.id("vaultDocuments")),
    resolved: v.boolean(),
    resolutionAction: v.optional(v.string()),
    resolutionDate: v.optional(v.string()),
    resolvedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  })
    .index("by_acquisition", ["bulkAcquisitionId"])
    .index("by_resolved", ["resolved"]),

  // ══════════════════════════════════════════════════════════════════════════
  // GEODATA DIASPORA INVESTMENT & PROPERTY PLATFORM — a permanent, configurable
  // business layer over the EXISTING website/CRM/CMS/IAM. Never a second CRM,
  // property DB, or auth system. The five programmes below are fixed
  // (own/invest/partner/refer/corporate) and seeded once; admins only
  // configure their toggles, never create/delete programme rows themselves.
  // ══════════════════════════════════════════════════════════════════════════
  diasporaProgrammes: defineTable({
    key: v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate")),
    label: v.string(),
    description: v.string(),
    ctaLabel: v.string(),
    enabled: v.boolean(),
    publicVisible: v.boolean(),
    acceptingEnquiries: v.boolean(),
    featured: v.boolean(),
    registrationOpen: v.boolean(),
    order: v.number(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  // Markets = countries the Diaspora Platform operates in. Admin-created only
  // (never auto-seeded) — avoids inventing country data that wasn't provided.
  diasporaMarkets: defineTable({
    country: v.string(),
    enabled: v.boolean(),
    publicVisible: v.boolean(),
    acceptingLeads: v.boolean(),
    featured: v.boolean(),
    assignedTeam: v.optional(v.array(v.id("users"))),
    supportedProgrammeKeys: v.array(v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate"))),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  }).index("by_enabled", ["enabled"]).searchIndex("search_country", { searchField: "country", filterFields: ["enabled"] }),

  // Campaigns are activations of the permanent platform (e.g. NBLBF2026) —
  // never the platform's identity. Fully editable/renameable/archivable.
  diasporaCampaigns: defineTable({
    name: v.string(),
    code: v.string(), // unique short code, e.g. "NBLBF2026"
    slug: v.optional(v.string()), // URL segment for /diaspora/:campaignSlug, e.g. "nblbf-2026" — unique when set
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    marketId: v.optional(v.id("diasporaMarkets")),
    campaignType: v.optional(v.string()), // e.g. "business_forum","roadshow","webinar","exhibition"
    description: v.optional(v.string()),
    startDate: v.optional(v.string()), // ISO 8601
    endDate: v.optional(v.string()), // ISO 8601
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("archived"),
    ),
    assignedTeam: v.optional(v.array(v.id("users"))),
    qrEnabled: v.boolean(),
    landingPagePublished: v.union(v.literal("draft"), v.literal("preview"), v.literal("published")),
    leadCount: v.number(), // denormalized write-time counter — never scan leads to compute this
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    // CMS content overrides for this campaign's own landing page
    // (/diaspora/:campaignSlug) — falls back to the platform-wide content
    // block (diaspora_content in siteSettings) when left blank.
    heroHeadline: v.optional(v.string()),
    heroSubheadline: v.optional(v.string()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_code", ["code"])
    .index("by_slug", ["slug"])
    .index("by_market", ["marketId"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["status"] }),

  // Per-campaign programme assignment matrix — a campaign can only turn ON a
  // programme that is itself enabled platform-wide (safe-config rule).
  diasporaCampaignProgrammes: defineTable({
    campaignId: v.id("diasporaCampaigns"),
    programmeKey: v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate")),
    enabled: v.boolean(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_campaign_and_programme", ["campaignId", "programmeKey"]),

  // Consultation requests booked from a Diaspora programme page. Always links
  // back into the existing CRM via `leadId` — never a parallel booking
  // system. Staff manage these from the Diaspora admin section and assign an
  // officer/status, same conceptually as `liveInspections` for property visits.
  diasporaConsultations: defineTable({
    leadId: v.id("leads"),
    consultationType: v.union(
      v.literal("property"), v.literal("investment"), v.literal("advisory"),
      v.literal("development"), v.literal("partnership"), v.literal("corporate"), v.literal("virtual_presentation"),
    ),
    programmeKey: v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate")),
    diasporaCampaignId: v.optional(v.id("diasporaCampaigns")),
    scheduledAt: v.optional(v.string()), // ISO 8601 — set once staff schedule it
    assignedOfficer: v.optional(v.id("users")),
    status: v.union(
      v.literal("requested"), v.literal("scheduled"), v.literal("completed"), v.literal("no_show"), v.literal("cancelled"),
    ),
    notes: v.optional(v.string()), // visitor-supplied context at booking time
    outcome: v.optional(v.string()), // staff-entered summary at completion
    followUpDate: v.optional(v.string()), // ISO 8601 date
    createdBy: v.optional(v.id("users")), // set when staff books on a client's behalf
  })
    .index("by_status", ["status"])
    .index("by_lead", ["leadId"])
    .index("by_officer", ["assignedOfficer"])
    .index("by_campaign", ["diasporaCampaignId"]),

  // QR scan events — recorded when a visitor lands on a campaign page via a
  // `?ref=CODE` link/QR. Purely additive analytics rows, never gates access
  // and never blocks a scan from also becoming a lead.
  diasporaQrScans: defineTable({
    campaignId: v.id("diasporaCampaigns"),
    landingPath: v.string(),
    scannedAt: v.string(), // ISO 8601
  }).index("by_campaign", ["campaignId"]),

  // Admin-configurable CTA catalogue for the Diaspora platform — public pages
  // read these instead of hard-coding button labels/destinations. A CTA can
  // optionally be scoped to one programme and/or one campaign; when
  // unscoped it is a platform-wide default (e.g. the hub's primary CTA).
  diasporaCtas: defineTable({
    key: v.string(), // stable identifier referenced by frontend code, e.g. "hub_primary"
    label: v.string(),
    destinationType: v.union(v.literal("programme"), v.literal("campaign"), v.literal("external")),
    destinationRef: v.string(), // programme key, campaign code, or external URL depending on destinationType
    enabled: v.boolean(),
    visible: v.boolean(),
    programmeKey: v.optional(v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate"))),
    campaignId: v.optional(v.id("diasporaCampaigns")),
    order: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"])
    .index("by_campaign", ["campaignId"])
    .index("by_programme", ["programmeKey"]),

  // ══════════════════════════════════════════════════════════════════════
  // ENHANCED INTERNAL COMMUNICATIONS — gated by the
  // "feature_enhanced_communications" toggle. Adds staff-to-staff Inbox
  // (direct/group/org channels) and Announcements inside the existing
  // Communications Centre. Reuses directorates/departments/units/
  // userOrgAssignments for audience scoping (never a new org model) and
  // the existing `notifications` table/bell (never a second notification
  // engine). Distinct from tickerMessages/popNotifications above, which
  // remain the PUBLIC-facing landing page channel, untouched.
  // ══════════════════════════════════════════════════════════════════════

  conversations: defineTable({
    kind: v.union(v.literal("direct"), v.literal("group"), v.literal("org")), // org = auto-scoped to a directorate/department/unit
    name: v.optional(v.string()),               // required for group/org, derived for direct
    directorateId: v.optional(v.id("directorates")),
    departmentId: v.optional(v.id("departments")),
    unitId: v.optional(v.id("units")),
    createdBy: v.id("users"),
    lastMessageAt: v.optional(v.string()),       // denormalized for inbox ordering
    lastMessagePreview: v.optional(v.string()),
    archivedAt: v.optional(v.string()),
  })
    .index("by_kind", ["kind"])
    .index("by_directorate", ["directorateId"])
    .index("by_department", ["departmentId"])
    .index("by_unit", ["unitId"])
    .index("by_lastMessageAt", ["lastMessageAt"]),

  conversationParticipants: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    joinedAt: v.string(),
    lastReadAt: v.optional(v.string()),          // messages after this are "unread" for this user
    mutedAt: v.optional(v.string()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_conversation_and_user", ["conversationId", "userId"]),

  conversationMessages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
    attachmentVaultDocumentId: v.optional(v.id("vaultDocuments")), // reuses Documents & Vault, never a second file store
    editedAt: v.optional(v.string()),
    deletedAt: v.optional(v.string()),           // soft-delete only — content is blanked from UI, row never removed
  })
    .index("by_conversation", ["conversationId"]),

  // Org-wide/scoped broadcast announcements — distinct from a conversation
  // message: one-directional, with priority, an optional publish window,
  // and read/acknowledgement tracking rather than a reply thread.
  announcements: defineTable({
    title: v.string(),
    body: v.string(),
    priority: v.union(v.literal("normal"), v.literal("important"), v.literal("urgent")),
    audienceType: v.union(v.literal("all_staff"), v.literal("directorate"), v.literal("department"), v.literal("unit")),
    audienceDirectorateId: v.optional(v.id("directorates")),
    audienceDepartmentId: v.optional(v.id("departments")),
    audienceUnitId: v.optional(v.id("units")),
    requiresAcknowledgement: v.boolean(),
    publishAt: v.optional(v.string()),           // scheduled; if unset, publishes immediately at createdAt
    expiresAt: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("expired"), v.literal("cancelled")),
    createdBy: v.id("users"),
    createdAt: v.string(),
  })
    .index("by_status", ["status"])
    .index("by_audienceType", ["audienceType"]),

  announcementAcknowledgements: defineTable({
    announcementId: v.id("announcements"),
    userId: v.id("users"),
    readAt: v.string(),
    acknowledgedAt: v.optional(v.string()),
  })
    .index("by_announcement", ["announcementId"])
    .index("by_user", ["userId"])
    .index("by_announcement_and_user", ["announcementId", "userId"]),

  // ══════════════════════════════════════════════════════════════════════
  // MANAGEMENT REPORTING — gated by the "feature_management_reporting"
  // toggle. Configurable report types computed from REAL existing data
  // only (tasks, approvals, kyc, finance, transactions, payments, audit) —
  // never invented metrics. Approval reuses the existing Tasks/Approvals
  // engine (`approvals` table, approvalType "report_approval") — no second
  // approval system. The finalized report file is stored as an ordinary
  // vaultDocuments row (docType "report") — the existing Documents & Vault
  // remains the sole archive, never a second repository.
  // ══════════════════════════════════════════════════════════════════════

  reportDefinitions: defineTable({
    key: v.string(),                             // unique slug, e.g. "monthly_transactions_summary"
    name: v.string(),
    description: v.optional(v.string()),
    reportType: v.union(v.literal("operational"), v.literal("commercial"), v.literal("finance"), v.literal("management"), v.literal("governance")),
    // Which built-in metric builder computes this report's data — always a
    // read over real, existing, bounded/indexed tables (see reporting.ts).
    dataSource: v.union(
      v.literal("operational_tasks"),
      v.literal("approvals_overview"),
      v.literal("finance_kyc_overview"),
      v.literal("commercial_transactions"),
      v.literal("governance_compliance"),
    ),
    frequency: v.union(v.literal("on_demand"), v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("quarterly")),
    requiresApproval: v.boolean(),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.string(),
  })
    .index("by_key", ["key"])
    .index("by_type", ["reportType"])
    .index("by_active", ["isActive"]),

  reportRuns: defineTable({
    reportDefinitionId: v.id("reportDefinitions"),
    runRef: v.string(),                           // GWS-RPT-NNNN
    periodLabel: v.optional(v.string()),
    status: v.union(
      v.literal("generating"), v.literal("generated"), v.literal("pending_approval"),
      v.literal("approved"), v.literal("rejected"), v.literal("distributed"), v.literal("failed"),
    ),
    dataSnapshot: v.string(),                     // JSON of the exact real-data metrics computed for this run — audit reproducibility
    vaultDocumentId: v.optional(v.id("vaultDocuments")), // the generated PDF, once ready — stored in the EXISTING vault
    approvalId: v.optional(v.id("approvals")),    // set only when the definition requires approval
    generatedBy: v.id("users"),
    generatedAt: v.string(),
    distributedAt: v.optional(v.string()),
    distributedCount: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index("by_definition", ["reportDefinitionId"])
    .index("by_status", ["status"])
    .index("by_generatedBy", ["generatedBy"]),

  // Who receives a notification (via the EXISTING notifications table/bell)
  // when a report of this definition is generated/distributed. Explicitly
  // separate from Enhanced Internal Communications access — subscribing to
  // or holding comms permissions never implies report access, and vice versa.
  reportSubscriptions: defineTable({
    reportDefinitionId: v.id("reportDefinitions"),
    userId: v.id("users"),
    createdBy: v.id("users"),
    createdAt: v.string(),
  })
    .index("by_definition", ["reportDefinitionId"])
    .index("by_user", ["userId"])
    .index("by_definition_and_user", ["reportDefinitionId", "userId"]),

  // ── Geodata Group Corporate Directory ──────────────────────────────────
  // CMS-driven business-unit records powering the public corporate gateway
  // (business ecosystem + immersive portfolio). Entirely additive: the
  // existing Real Estate app, CMS, routes and data are untouched. Whether
  // the directory is the public entry point at all is controlled separately
  // by the "feature_corporate_directory" flag in the existing siteSettings
  // table (see corporateDirectory.ts), so this table can be seeded/edited
  // long before (or after) the directory is switched on.
  groupBusinesses: defineTable({
    slug: v.string(), // stable key, e.g. "real-estate" — used for routing & seeding idempotency
    name: v.string(),
    legalEntityName: v.optional(v.string()),
    entityType: v.union(
      v.literal("group"), v.literal("company"), v.literal("operating_business"),
      v.literal("business_unit"), v.literal("division"), v.literal("business_vertical"),
      v.literal("strategic_partner"),
    ),
    sector: v.string(),
    shortDescription: v.string(),
    fullDescription: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    coverImageStorageId: v.optional(v.id("_storage")),
    coverImageUrl: v.optional(v.string()), // fallback/external URL when no upload yet
    galleryStorageIds: v.optional(v.array(v.id("_storage"))),
    capabilities: v.optional(v.array(v.string())), // services/capabilities bullet list
    status: v.union(v.literal("live"), v.literal("coming_soon"), v.literal("inactive")),
    // Destination: either an internal route (e.g. "/", "/readymix", "/businesses/quarry")
    // or an approved external URL. Exactly one of destinationRoute/destinationUrl is set.
    destinationType: v.union(v.literal("internal_route"), v.literal("external_url")),
    destinationRoute: v.optional(v.string()),
    destinationUrl: v.optional(v.string()),
    displayOrder: v.number(),
    featured: v.boolean(),
    publicVisibility: v.boolean(),
    effectiveDate: v.optional(v.string()), // ISO date — content not shown publicly before this date
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_displayOrder", ["displayOrder"]),

  // ── Track Record (completed projects) ───────────────────────────────────
  // Shared showcase of delivered work: real estate estates and road /
  // infrastructure projects. Shown on the Real Estate landing page and the
  // Road & Infrastructure business page. The whole section is switched on/off
  // by the "track_record_visible" entry in siteSettings.
  trackRecordProjects: defineTable({
    slug: v.string(),
    name: v.string(),
    category: v.union(v.literal("real_estate"), v.literal("road_infrastructure")),
    projectType: v.optional(v.string()), // e.g. "Residential Estate", "Asphalt Road"
    location: v.string(),
    state: v.optional(v.string()),
    yearCompleted: v.number(),
    status: v.string(), // e.g. "Completed", "Handed Over"
    shortDescription: v.string(),
    fullDescription: v.optional(v.string()),
    coverImageStorageId: v.optional(v.id("_storage")),
    coverImageUrl: v.optional(v.string()),
    galleryStorageIds: v.optional(v.array(v.id("_storage"))),
    // Optional project video: a YouTube/Vimeo link OR an uploaded file (link wins if both)
    videoLink: v.optional(v.string()),
    videoStorageId: v.optional(v.id("_storage")), // legacy single video
    videos: v.optional(v.array(v.object({ link: v.optional(v.string()), storageId: v.optional(v.id("_storage")) }))),
    // Real estate figures
    unitsBuilt: v.optional(v.number()),
    landSize: v.optional(v.string()),
    familiesHoused: v.optional(v.number()),
    // Road & infrastructure figures
    roadLengthKm: v.optional(v.number()),
    roadType: v.optional(v.string()),
    client: v.optional(v.string()),
    displayOrder: v.number(),
    visible: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_displayOrder", ["displayOrder"]),

  // ── Development status (estates and building types) ────────────────────────────────────────
  // An estate (e.g. Southern Bridge City) holds many building types. Public
  // reads respect the "estates_visible" siteSettings switch (default ON).
  developmentEstates: defineTable({
    slug: v.string(),
    name: v.string(),
    location: v.optional(v.string()),
    intro: v.optional(v.string()),
    coverImageStorageId: v.optional(v.id("_storage")),
    displayOrder: v.number(),
    visible: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_displayOrder", ["displayOrder"]),

  developmentBuildingTypes: defineTable({
    estateId: v.id("developmentEstates"),
    name: v.string(),
    groupName: v.optional(v.string()), // e.g. "Terraces", "Duplexes"
    description: v.optional(v.string()),
    coverImageStorageId: v.optional(v.id("_storage")),
    plotsCovered: v.optional(v.string()), // free text, e.g. "Plots 7, 8 and 9"
    stage: v.string(),
    completionPercent: v.number(),
    displayOrder: v.number(),
    published: v.boolean(), // drafts stay private
    archived: v.boolean(),
  }).index("by_estate_and_displayOrder", ["estateId", "displayOrder"]),

  // Company documents library shown on the public /downloads page. Each document
  // is either open to everyone ("public") or needs a signed-in user ("signin").
  publicDocuments: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    coverStorageId: v.optional(v.id("_storage")),
    access: v.union(v.literal("public"), v.literal("signin")),
    featured: v.boolean(),
    visible: v.boolean(),
    publishAt: v.optional(v.string()), // ISO 8601 UTC; hidden until this moment
    diasporaVisible: v.optional(v.boolean()), // also listed in the Diaspora page "Downloads" section
    displayOrder: v.number(),
    viewCount: v.number(),
    downloadCount: v.number(),
  }).index("by_displayOrder", ["displayOrder"]),

  // ── Teams (Microsoft Teams-style collaboration for staff) ──────────────
  teams: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    archived: v.boolean(),
  }),
  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_and_user", ["teamId", "userId"]),
  teamChannels: defineTable({
    teamId: v.id("teams"),
    name: v.string(),
    description: v.optional(v.string()),
    isGeneral: v.boolean(),
    archived: v.boolean(),
    createdBy: v.id("users"),
  }).index("by_team", ["teamId"]),
  // Top-level channel posts. Thread replies live in teamReplies so each list stays cleanly indexed.
  teamMessages: defineTable({
    teamId: v.id("teams"),
    channelId: v.id("teamChannels"),
    authorId: v.id("users"),
    body: v.string(),
    attachments: v.array(v.object({ storageId: v.id("_storage"), fileName: v.string() })),
    replyCount: v.number(),
    pinned: v.boolean(),
    deletedAt: v.optional(v.string()),
  }).index("by_channel", ["channelId"]),
  teamReplies: defineTable({
    messageId: v.id("teamMessages"),
    teamId: v.id("teams"),
    authorId: v.id("users"),
    body: v.string(),
    attachments: v.array(v.object({ storageId: v.id("_storage"), fileName: v.string() })),
    deletedAt: v.optional(v.string()),
  }).index("by_message", ["messageId"]),
  teamReactions: defineTable({
    messageId: v.id("teamMessages"),
    userId: v.id("users"),
    emoji: v.string(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_and_user_and_emoji", ["messageId", "userId", "emoji"]),
});
