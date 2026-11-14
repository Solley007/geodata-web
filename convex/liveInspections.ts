import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel.d.ts";
import { logAudit } from "./taskboard.ts";
import { api, internal } from "./_generated/api.js";
import { hasPermission } from "./iam/access.ts";
import { resolveViewerScope, filterByScope } from "./iam/scope.ts";
import { notifyClient } from "./notifications.ts";
import { tokenOf } from "./authIdentity";

// ══════════════════════════════════════════════════════════════════════════
// LIVE VIRTUAL INSPECTION — feature toggle + granular permission catalogue.
//
// The whole feature is gated behind a single siteSettings row, keyed
// FEATURE_KEY. It reuses the existing key/value settings table (convex/cms.ts
// upsertSiteSettings/getSiteSettings pattern) rather than a bespoke config
// table. Default (row absent) is OFF, matching "safe by default".
//
// Every server-side mutation that creates, schedules, starts, or otherwise
// advances an inspection re-checks the toggle AND the caller's granular
// permission — never trusts the client to have hidden a button.
// ══════════════════════════════════════════════════════════════════════════

export const FEATURE_KEY = "feature_live_virtual_inspection";

export const LIVE_INSPECTION_PERMISSIONS = [
  "live_inspection.view",
  "live_inspection.create",
  "live_inspection.schedule",
  "live_inspection.start",
  "live_inspection.join",
  "live_inspection.manage",
  "live_inspection.capture",
  "live_inspection.note",
  "live_inspection.complete",
  "live_inspection.report",
  "live_inspection.export",
] as const;
export type LiveInspectionPermission = (typeof LIVE_INSPECTION_PERMISSIONS)[number];

const PERMISSION_LABELS: Record<LiveInspectionPermission, string> = {
  "live_inspection.view": "View Live Inspections",
  "live_inspection.create": "Create Live Inspections",
  "live_inspection.schedule": "Schedule Live Inspections",
  "live_inspection.start": "Start Live Inspection Sessions",
  "live_inspection.join": "Join Live Inspection Sessions",
  "live_inspection.manage": "Manage Live Inspections (reassign/cancel)",
  "live_inspection.capture": "Capture Snapshots During Inspection",
  "live_inspection.note": "Add Inspection Notes",
  "live_inspection.complete": "Complete Inspections",
  "live_inspection.report": "Generate Inspection Reports",
  "live_inspection.export": "Export Inspection Data",
};

// ── Auth helpers ─────────────────────────────────────────────────────────
async function requireSignedInUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  return user;
}

async function isFeatureEnabled(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", FEATURE_KEY)).first();
  return row?.value === "true";
}

async function requireFeatureEnabled(ctx: QueryCtx | MutationCtx): Promise<void> {
  if (!(await isFeatureEnabled(ctx))) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Live Virtual Inspection is currently disabled" });
  }
}

// Deny-by-default: requires an explicit IAM permission grant AND the feature
// toggle to be ON. Read-only historical access (viewing/auditing existing
// records) is allowed even while the feature is disabled — see
// `requirePermissionEvenIfDisabled` below, used only by view/report/export.
async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  permissionKey: LiveInspectionPermission,
  options: { requireEnabled: boolean } = { requireEnabled: true }
): Promise<Doc<"users">> {
  const user = await requireSignedInUser(ctx);
  if (options.requireEnabled) await requireFeatureEnabled(ctx);
  const allowed = await hasPermission(ctx, user._id, permissionKey);
  if (!allowed) {
    throw new ConvexError({ code: "FORBIDDEN", message: "You do not have permission to perform this action" });
  }
  return user;
}

// ── Feature toggle admin controls ───────────────────────────────────────
export const getFeatureStatus = query({
  args: {},
  handler: async (ctx): Promise<{ enabled: boolean }> => {
    return { enabled: await isFeatureEnabled(ctx) };
  },
});

// Safe, non-throwing access check for the admin UI to render a clear
// "access denied" screen instead of an unhandled query error (which would
// otherwise surface as a blank page). Mirrors exactly what `list`/`getById`
// enforce below (no legacy-admin bypass) so it never gives a false green
// light. Never used to gate the actual data — every query/mutation above
// still independently re-checks permission.
export const getMyAccess = query({
  args: {},
  handler: async (ctx): Promise<{ signedIn: boolean; canView: boolean; isAdmin: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { signedIn: false, canView: false, isAdmin: false };
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
    if (!user) return { signedIn: false, canView: false, isAdmin: false };
    const isAdmin = user.role === "super_admin" || user.role === "admin";
    const canView = await hasPermission(ctx, user._id, "live_inspection.view");
    return { signedIn: true, canView, isAdmin };
  },
});

export const setFeatureStatus = mutation({
  args: { enabled: v.boolean(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireSignedInUser(ctx);
    const allowed = await hasPermission(ctx, user._id, "live_inspection.manage");
    const isLegacyAdmin = user.role === "super_admin" || user.role === "admin";
    if (!allowed && !isLegacyAdmin) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only administrators can change this setting" });
    }
    const existing = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", FEATURE_KEY)).first();
    const previousValue = existing?.value === "true";
    if (existing) {
      await ctx.db.patch(existing._id, { value: String(args.enabled) });
    } else {
      await ctx.db.insert("siteSettings", { key: FEATURE_KEY, value: String(args.enabled) });
    }
    await logAudit(ctx, {
      action: args.enabled ? "enable" : "disable",
      entity: "feature_toggle",
      entityRef: FEATURE_KEY,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `${args.enabled ? "Enabled" : "Disabled"} Live Virtual Inspection feature`,
      before: JSON.stringify({ enabled: previousValue }),
      after: JSON.stringify({ enabled: args.enabled }),
      metadata: args.reason ? JSON.stringify({ reason: args.reason }) : undefined,
    });
  },
});

// ── Permission catalogue seeding ────────────────────────────────────────
export const seedLiveInspectionPermissions = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requireSignedInUser(ctx);
    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const existing = await ctx.db.query("iamPermissions").withIndex("by_module", (q) => q.eq("module", "live_inspection")).collect();
    const existingKeys = new Set(existing.map((p) => p.key));
    let inserted = 0;
    for (const key of LIVE_INSPECTION_PERMISSIONS) {
      if (existingKeys.has(key)) continue;
      const action = key.split(".")[1].toUpperCase();
      await ctx.db.insert("iamPermissions", {
        key,
        module: "live_inspection",
        action,
        label: PERMISSION_LABELS[key],
        sensitive: key === "live_inspection.manage" || key === "live_inspection.export",
      });
      inserted++;
    }
    return { inserted };
  },
});

// ── Checklist templates (code-defined; only completion state persists) ─
export const CHECKLIST_TEMPLATES: Record<string, Array<{ key: string; label: string }>> = {
  exterior: [
    { key: "exterior.entrance", label: "Entrance" },
    { key: "exterior.building", label: "Building exterior" },
    { key: "exterior.parking", label: "Parking" },
    { key: "exterior.drainage", label: "Drainage" },
    { key: "exterior.access_road", label: "Access road" },
    { key: "exterior.landscaping", label: "Landscaping" },
    { key: "exterior.security", label: "Security/access" },
  ],
  interior: [
    { key: "interior.entrance_lobby", label: "Entrance/lobby" },
    { key: "interior.living_room", label: "Living room" },
    { key: "interior.dining", label: "Dining" },
    { key: "interior.kitchen", label: "Kitchen" },
    { key: "interior.bedrooms", label: "Bedrooms" },
    { key: "interior.bathrooms", label: "Bathrooms" },
    { key: "interior.staircase", label: "Staircase" },
    { key: "interior.balcony", label: "Balcony" },
    { key: "interior.other", label: "Other" },
  ],
  estate: [
    { key: "estate.entrance", label: "Estate entrance" },
    { key: "estate.roads", label: "Roads" },
    { key: "estate.lighting", label: "Lighting" },
    { key: "estate.drainage", label: "Drainage" },
    { key: "estate.security", label: "Security" },
    { key: "estate.recreation", label: "Recreation" },
    { key: "estate.facilities", label: "Facilities" },
  ],
  construction: [
    { key: "construction.stage", label: "Construction stage" },
    { key: "construction.structural", label: "Structural works" },
    { key: "construction.roofing", label: "Roofing" },
    { key: "construction.plumbing", label: "Plumbing" },
    { key: "construction.electrical", label: "Electrical" },
    { key: "construction.finishing", label: "Finishing" },
    { key: "construction.external_works", label: "External works" },
    { key: "construction.roads", label: "Roads" },
  ],
};

export const listChecklistTemplates = query({
  args: {},
  handler: async (): Promise<typeof CHECKLIST_TEMPLATES> => CHECKLIST_TEMPLATES,
});

// ── Ref generator ────────────────────────────────────────────────────────
async function nextInspectionRef(ctx: MutationCtx): Promise<string> {
  const last = await ctx.db.query("liveInspections").order("desc").first();
  const n = last ? parseInt(last.inspectionRef.replace("GWS-LVI-", "") || "0", 10) + 1 : 1;
  return `GWS-LVI-${String(n).padStart(4, "0")}`;
}

// ── Enrichment ───────────────────────────────────────────────────────────
async function enrichInspection(ctx: QueryCtx, inspection: Doc<"liveInspections">) {
  const [client, property, estate, officer] = await Promise.all([
    ctx.db.get(inspection.clientId),
    inspection.propertyId ? ctx.db.get(inspection.propertyId) : null,
    inspection.estateId ? ctx.db.get(inspection.estateId) : null,
    inspection.assignedOfficer ? ctx.db.get(inspection.assignedOfficer) : null,
  ]);
  return {
    ...inspection,
    clientName: client?.fullName ?? "Unknown Client",
    clientEmail: client?.email,
    propertyTitle: property?.title,
    estateName: estate?.name,
    officerName: officer?.name ?? officer?.email,
  };
}

// ── Queries ──────────────────────────────────────────────────────────────
export const list = query({
  args: {
    status: v.optional(v.string()),
    inspectionType: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    propertyId: v.optional(v.id("properties")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.view", { requireEnabled: false });

    let rows = await ctx.db.query("liveInspections").order("desc").collect();
    if (args.status) rows = rows.filter((r) => r.status === args.status);
    if (args.inspectionType) rows = rows.filter((r) => r.inspectionType === args.inspectionType);
    if (args.clientId) rows = rows.filter((r) => r.clientId === args.clientId);
    if (args.propertyId) rows = rows.filter((r) => r.propertyId === args.propertyId);

    const scope = await resolveViewerScope(ctx, user, "live_inspection");
    rows = await filterByScope(ctx, rows, scope, (r) => r.assignedOfficer ?? r.createdBy);

    const enriched = await Promise.all(rows.map((r) => enrichInspection(ctx, r)));
    if (args.search) {
      const s = args.search.toLowerCase();
      return enriched.filter(
        (r) => r.inspectionRef.toLowerCase().includes(s) || r.clientName.toLowerCase().includes(s) || (r.propertyTitle ?? "").toLowerCase().includes(s)
      );
    }
    return enriched;
  },
});

const INSPECTION_STATUSES = [
  "draft", "requested", "scheduled", "confirmed", "live", "completed", "cancelled", "no_show", "rescheduled",
] as const;
type InspectionStatus = (typeof INSPECTION_STATUSES)[number];
function isInspectionStatus(value: string): value is InspectionStatus {
  return (INSPECTION_STATUSES as readonly string[]).includes(value);
}

export const listPaginated = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.view", { requireEnabled: false });
    const scope = await resolveViewerScope(ctx, user, "live_inspection");
    const getOwnerId = (r: Doc<"liveInspections">) => r.assignedOfficer ?? r.createdBy;

    if (args.status && args.status !== "all" && isInspectionStatus(args.status)) {
      const status = args.status;
      const results = await ctx.db.query("liveInspections").withIndex("by_status", (q) => q.eq("status", status)).order("desc").paginate(args.paginationOpts);
      const scopedPage = await filterByScope(ctx, results.page, scope, getOwnerId);
      return { ...results, page: await Promise.all(scopedPage.map((r) => enrichInspection(ctx, r))) };
    }
    const results = await ctx.db.query("liveInspections").order("desc").paginate(args.paginationOpts);
    const scopedPage = await filterByScope(ctx, results.page, scope, getOwnerId);
    return { ...results, page: await Promise.all(scopedPage.map((r) => enrichInspection(ctx, r))) };
  },
});

export const getById = query({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "live_inspection.view", { requireEnabled: false });
    const inspection = await ctx.db.get(args.id);
    if (!inspection) return null;
    const [enriched, checklist, notes, viewRequests, snapshots, participants] = await Promise.all([
      enrichInspection(ctx, inspection),
      ctx.db.query("inspectionChecklistItems").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect(),
      ctx.db.query("inspectionNotes").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect(),
      ctx.db.query("inspectionViewRequests").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect(),
      ctx.db.query("inspectionSnapshots").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect(),
      ctx.db.query("inspectionParticipants").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect(),
    ]);
    return { ...enriched, checklist, notes, viewRequests, snapshots, participants };
  },
});

// Lists inspections for a specific property/client — used to render the
// "View Inspections" button/panel from Properties and Clients & CRM without
// duplicating any property/client data.
export const listForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const enabled = await isFeatureEnabled(ctx);
    if (!enabled) return [];
    const user = await requireSignedInUser(ctx);
    const allowed = await hasPermission(ctx, user._id, "live_inspection.view");
    if (!allowed) return [];
    const rows = await ctx.db.query("liveInspections").withIndex("by_property", (q) => q.eq("propertyId", args.propertyId)).order("desc").collect();
    return Promise.all(rows.map((r) => enrichInspection(ctx, r)));
  },
});

export const listForClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const enabled = await isFeatureEnabled(ctx);
    if (!enabled) return [];
    const user = await requireSignedInUser(ctx);
    const allowed = await hasPermission(ctx, user._id, "live_inspection.view");
    if (!allowed) return [];
    const rows = await ctx.db.query("liveInspections").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).order("desc").collect();
    return Promise.all(rows.map((r) => enrichInspection(ctx, r)));
  },
});

// Finds an existing client by email, or creates a lightweight lead client
// record — mirrors the "walk-in"/"website" client sourcing already used
// elsewhere, so a public request never needs its own separate contacts table.
async function findOrCreatePublicClient(
  ctx: MutationCtx,
  args: { name: string; email: string; phone: string }
): Promise<Id<"clients">> {
  const existing = await ctx.db
    .query("clients")
    .filter((q) => q.eq(q.field("email"), args.email))
    .first();
  if (existing) return existing._id;
  return ctx.db.insert("clients", {
    fullName: args.name,
    email: args.email,
    phone: args.phone,
    kycStatus: "pending",
    source: "website",
  });
}

// ── Public request (no sign-in, no permission — mirrors inquiries.create) ──
// Lets a visitor on a property page request a Live Property or Live
// Construction Inspection directly, without going through the generic
// inquiry form. Creates a real, trackable liveInspections row with status
// "requested" so it shows up immediately in the admin Live Virtual
// Inspection list — reusing the exact same system admins schedule from.
export const requestPublic = mutation({
  args: {
    inspectionType: v.union(v.literal("property"), v.literal("construction")),
    propertyId: v.id("properties"),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    preferredAt: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ id: Id<"liveInspections">; inspectionRef: string }> => {
    if (!(await isFeatureEnabled(ctx))) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Live Virtual Inspection is currently disabled" });
    }
    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });

    const clientId = await findOrCreatePublicClient(ctx, args);
    const inspectionRef = await nextInspectionRef(ctx);
    const id = await ctx.db.insert("liveInspections", {
      inspectionRef,
      inspectionType: args.inspectionType,
      propertyId: args.propertyId,
      clientId,
      status: "requested",
      checklistTemplateKey: args.inspectionType === "construction" ? "construction" : "interior",
      scheduledAt: args.preferredAt,
    });

    const templateKey = args.inspectionType === "construction" ? "construction" : "interior";
    for (const item of CHECKLIST_TEMPLATES[templateKey] ?? []) {
      await ctx.db.insert("inspectionChecklistItems", { inspectionId: id, itemKey: item.key, label: item.label, completed: false });
    }

    if (args.note) {
      await ctx.db.insert("clientNotes", {
        clientId,
        note: `Requested a ${args.inspectionType === "construction" ? "Live Construction" : "Live Property"} Inspection for "${property.title}" (${inspectionRef}): ${args.note}`,
        authorName: args.name,
      });
    }

    await logAudit(ctx, {
      action: "create", entity: "live_inspections", entityId: id, entityRef: inspectionRef,
      userId: undefined, userName: args.name, userRole: "client",
      description: `Public request for a ${args.inspectionType === "construction" ? "Live Construction" : "Live Property"} Inspection of "${property.title}" (${inspectionRef})`,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendAdminNewInquiryAlert, {
      to: await ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      adminPhones: await ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      name: args.name,
      email: args.email,
      phone: args.phone,
      message: `Requested a ${args.inspectionType === "construction" ? "Live Construction" : "Live Property"} Inspection (${inspectionRef}) for "${property.title}"${args.preferredAt ? ` — preferred time: ${args.preferredAt}` : ""}.${args.note ? ` Note: ${args.note}` : ""}`,
      subject: `Live Inspection Request — ${property.title}`,
    });

    return { id, inspectionRef };
  },
});

// ── Authenticated client self-request ───────────────────────────────────
// Mirrors requestPublic, but for a client who is already signed in — no
// email lookup/creation needed since we already know the exact client
// record. Lets clients self-serve a request from their dashboard instead of
// only being able to ask their officer outside the app.
export const requestFromClient = mutation({
  args: {
    inspectionType: v.union(v.literal("property"), v.literal("construction")),
    propertyId: v.id("properties"),
    preferredAt: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ id: Id<"liveInspections">; inspectionRef: string }> => {
    await requireFeatureEnabled(ctx);
    const client = await requireBuyerClient(ctx);
    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });

    const inspectionRef = await nextInspectionRef(ctx);
    const templateKey = args.inspectionType === "construction" ? "construction" : "interior";
    const id = await ctx.db.insert("liveInspections", {
      inspectionRef,
      inspectionType: args.inspectionType,
      propertyId: args.propertyId,
      clientId: client._id,
      status: "requested",
      checklistTemplateKey: templateKey,
      scheduledAt: args.preferredAt,
    });

    for (const item of CHECKLIST_TEMPLATES[templateKey] ?? []) {
      await ctx.db.insert("inspectionChecklistItems", { inspectionId: id, itemKey: item.key, label: item.label, completed: false });
    }

    if (args.note) {
      await ctx.db.insert("clientNotes", {
        clientId: client._id,
        note: `Requested a ${args.inspectionType === "construction" ? "Live Construction" : "Live Property"} Inspection for "${property.title}" (${inspectionRef}): ${args.note}`,
        authorName: client.fullName,
      });
    }

    await logAudit(ctx, {
      action: "create", entity: "live_inspections", entityId: id, entityRef: inspectionRef,
      userId: undefined, userName: client.fullName, userRole: "client",
      description: `Client requested a ${args.inspectionType === "construction" ? "Live Construction" : "Live Property"} Inspection of "${property.title}" (${inspectionRef})`,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendAdminNewInquiryAlert, {
      to: await ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      adminPhones: await ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      name: client.fullName,
      email: client.email,
      phone: client.phone,
      message: `Requested a ${args.inspectionType === "construction" ? "Live Construction" : "Live Property"} Inspection (${inspectionRef}) for "${property.title}"${args.preferredAt ? ` — preferred time: ${args.preferredAt}` : ""}.${args.note ? ` Note: ${args.note}` : ""}`,
      subject: `Live Inspection Request — ${property.title}`,
    });

    return { id, inspectionRef };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────
export const create = mutation({
  args: {
    inspectionType: v.union(v.literal("property"), v.literal("estate"), v.literal("construction")),
    propertyId: v.optional(v.id("properties")),
    estateId: v.optional(v.id("estates")),
    clientId: v.id("clients"),
    assignedOfficer: v.optional(v.id("users")),
    checklistTemplateKey: v.optional(v.string()),
    scheduledAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.create");
    if (!args.propertyId && !args.estateId) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "An inspection must reference a property or an estate" });
    }
    const inspectionRef = await nextInspectionRef(ctx);
    const status = args.scheduledAt ? "scheduled" : "draft";
    const id = await ctx.db.insert("liveInspections", {
      inspectionRef,
      inspectionType: args.inspectionType,
      propertyId: args.propertyId,
      estateId: args.estateId,
      clientId: args.clientId,
      assignedOfficer: args.assignedOfficer,
      status,
      checklistTemplateKey: args.checklistTemplateKey,
      scheduledAt: args.scheduledAt,
      createdBy: user._id,
    });

    const templateKey = args.checklistTemplateKey ?? (args.inspectionType === "construction" ? "construction" : args.inspectionType === "estate" ? "estate" : "interior");
    const items = CHECKLIST_TEMPLATES[templateKey] ?? [];
    for (const item of items) {
      await ctx.db.insert("inspectionChecklistItems", { inspectionId: id, itemKey: item.key, label: item.label, completed: false });
    }

    await logAudit(ctx, {
      action: "create", entity: "live_inspections", entityId: id, entityRef: inspectionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created live inspection "${inspectionRef}"`,
    });
    return id;
  },
});

export const schedule = mutation({
  args: { id: v.id("liveInspections"), scheduledAt: v.string(), assignedOfficer: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.schedule");
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    await ctx.db.patch(args.id, {
      scheduledAt: args.scheduledAt,
      assignedOfficer: args.assignedOfficer ?? inspection.assignedOfficer,
      status: "scheduled",
    });
    await logAudit(ctx, {
      action: "update", entity: "live_inspections", entityId: args.id, entityRef: inspection.inspectionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Scheduled inspection "${inspection.inspectionRef}" for ${args.scheduledAt}`,
    });
    await notifyClient(ctx, {
      clientId: inspection.clientId,
      type: "inspection_update",
      title: "Inspection Scheduled",
      message: `Your ${inspection.inspectionRef} inspection has been scheduled for ${new Date(args.scheduledAt).toLocaleString()}.`,
      link: "/client?tab=inspections",
    });
  },
});

export const confirm = mutation({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.schedule");
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    await ctx.db.patch(args.id, { status: "confirmed" });
    await logAudit(ctx, {
      action: "update", entity: "live_inspections", entityId: args.id, entityRef: inspection.inspectionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Confirmed inspection "${inspection.inspectionRef}"`,
    });
    await notifyClient(ctx, {
      clientId: inspection.clientId,
      type: "inspection_update",
      title: "Inspection Confirmed",
      message: `Your ${inspection.inspectionRef} inspection has been confirmed.`,
      link: "/client?tab=inspections",
    });
  },
});

export const cancel = mutation({
  args: { id: v.id("liveInspections"), reason: v.string() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.manage", { requireEnabled: false });
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    await ctx.db.patch(args.id, { status: "cancelled", cancelReason: args.reason });
    await logAudit(ctx, {
      action: "update", entity: "live_inspections", entityId: args.id, entityRef: inspection.inspectionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Cancelled inspection "${inspection.inspectionRef}": ${args.reason}`,
    });
    await notifyClient(ctx, {
      clientId: inspection.clientId,
      type: "inspection_update",
      title: "Inspection Cancelled",
      message: `Your ${inspection.inspectionRef} inspection was cancelled: ${args.reason}`,
      link: "/client?tab=inspections",
    });
  },
});

export const markNoShow = mutation({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.manage", { requireEnabled: false });
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    await ctx.db.patch(args.id, { status: "no_show" });
    await logAudit(ctx, {
      action: "update", entity: "live_inspections", entityId: args.id, entityRef: inspection.inspectionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Marked inspection "${inspection.inspectionRef}" as no-show`,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.manage", { requireEnabled: false });
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    if (inspection.status === "live") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Cannot delete an inspection while it is live" });
    }
    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      action: "delete", entity: "live_inspections", entityId: args.id, entityRef: inspection.inspectionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Deleted inspection "${inspection.inspectionRef}"`,
    });
  },
});

// ══════════════════════════════════════════════════════════════════════════
// LIVE SESSION — WebRTC signaling relay, participants, chat, checklist,
// snapshots, notes, and client view requests. All reuse the existing
// liveInspections record; nothing here duplicates Properties/Clients/CRM
// data. Every mutation re-checks the feature toggle + granular permission
// server-side, and every lifecycle transition is written to the existing
// audit log via logAudit.
// ══════════════════════════════════════════════════════════════════════════

async function requireBuyerClient(ctx: QueryCtx | MutationCtx): Promise<Doc<"clients">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  const allClients = await ctx.db.query("clients").collect();
  const client = allClients.find((c) => c.userId === user._id || c.email === user.email);
  if (!client) throw new ConvexError({ code: "NOT_FOUND", message: "No linked client record found" });
  return client;
}

// Verifies the caller is either the officer/staff permitted to join, or the
// specific client this inspection belongs to. Returns which side they are.
async function requireSessionParticipant(
  ctx: QueryCtx | MutationCtx,
  inspection: Doc<"liveInspections">,
): Promise<{ side: "officer"; user: Doc<"users"> } | { side: "client"; client: Doc<"clients"> }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

  const allowed = await hasPermission(ctx, user._id, "live_inspection.join");
  if (allowed) return { side: "officer", user };

  // Not staff with join permission — check if this is the inspection's own client.
  const allClients = await ctx.db.query("clients").collect();
  const client = allClients.find((c) => c.userId === user._id || c.email === user.email);
  if (client && client._id === inspection.clientId) return { side: "client", client };

  throw new ConvexError({ code: "FORBIDDEN", message: "You do not have permission to join this session" });
}

// ── Session lifecycle ───────────────────────────────────────────────────
export const startSession = mutation({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.start");
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    if (!["scheduled", "confirmed", "requested"].includes(inspection.status)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This inspection cannot be started from its current status" });
    }
    await ctx.db.patch(args.id, { status: "live", startedAt: new Date().toISOString() });
    await ctx.db.insert("inspectionParticipants", { inspectionId: args.id, userId: user._id, role: "officer", joinedAt: new Date().toISOString() });
    await logAudit(ctx, {
      action: "update", entity: "live_inspections", entityId: args.id, entityRef: inspection.inspectionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Started live session for inspection "${inspection.inspectionRef}"`,
    });
    return { ok: true };
  },
});

export const endSession = mutation({
  args: { id: v.id("liveInspections"), outcome: v.optional(v.string()), followUpRequired: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.complete");
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    const endedAt = new Date().toISOString();
    const durationSeconds = inspection.startedAt
      ? Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(inspection.startedAt).getTime()) / 1000))
      : undefined;
    await ctx.db.patch(args.id, {
      status: "completed",
      endedAt,
      durationSeconds,
      outcome: args.outcome ?? inspection.outcome,
      followUpRequired: args.followUpRequired ?? inspection.followUpRequired,
    });

    // Close out any still-open participant rows.
    const openParticipants = await ctx.db.query("inspectionParticipants").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect();
    for (const p of openParticipants) {
      if (!p.leftAt) await ctx.db.patch(p._id, { leftAt: endedAt });
    }

    // Create a CRM activity note on the client record so the completed
    // inspection surfaces in the existing Clients & CRM timeline — no
    // second customer database, just an existing clientNotes row.
    await ctx.db.insert("clientNotes", {
      clientId: inspection.clientId,
      note: `Live virtual inspection "${inspection.inspectionRef}" completed.${args.outcome ? ` Outcome: ${args.outcome}` : ""}`,
      authorName: user.name ?? user.email ?? "Officer",
      authorId: user._id,
    });

    await logAudit(ctx, {
      action: "update", entity: "live_inspections", entityId: args.id, entityRef: inspection.inspectionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Completed live session for inspection "${inspection.inspectionRef}"`,
    });
    return { ok: true };
  },
});

// ── Participants & join ─────────────────────────────────────────────────
export const joinSession = mutation({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args): Promise<{ side: "officer" | "client"; participantId: Id<"inspectionParticipants"> }> => {
    await requireFeatureEnabled(ctx);
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    if (inspection.status !== "live") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This inspection session is not live" });
    }
    const participant = await requireSessionParticipant(ctx, inspection);
    const joinedAt = new Date().toISOString();
    if (participant.side === "officer") {
      const id = await ctx.db.insert("inspectionParticipants", { inspectionId: args.id, userId: participant.user._id, role: "officer", joinedAt });
      return { side: "officer", participantId: id };
    }
    const id = await ctx.db.insert("inspectionParticipants", { inspectionId: args.id, clientId: participant.client._id, role: "client", joinedAt });
    await logAudit(ctx, {
      action: "update", entity: "live_inspections", entityId: args.id, entityRef: inspection.inspectionRef,
      userId: undefined, userName: participant.client.fullName, userRole: "client",
      description: `Client "${participant.client.fullName}" joined live session for "${inspection.inspectionRef}"`,
    });
    return { side: "client", participantId: id };
  },
});

export const leaveSession = mutation({
  args: { id: v.id("liveInspections"), participantId: v.id("inspectionParticipants") },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (participant && participant.inspectionId === args.id && !participant.leftAt) {
      await ctx.db.patch(args.participantId, { leftAt: new Date().toISOString() });
    }
    return { ok: true };
  },
});

export const listParticipants = query({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.id);
    if (!inspection) return [];
    await requireSessionParticipant(ctx, inspection);
    return ctx.db.query("inspectionParticipants").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect();
  },
});

// ── WebRTC signaling relay ──────────────────────────────────────────────
// Rows are short-lived: each side polls for new signals addressed to them
// (or broadcast) via `since`, then the client prunes what it has consumed.
// No third-party video SaaS — this is a thin Convex-backed signaling relay
// used only to exchange SDP offers/answers and ICE candidates; the actual
// media flows peer-to-peer over WebRTC.
export const sendSignal = mutation({
  args: {
    id: v.id("liveInspections"),
    fromUserKey: v.string(),
    toUserKey: v.optional(v.string()),
    signalType: v.union(v.literal("offer"), v.literal("answer"), v.literal("ice-candidate"), v.literal("leave")),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    await requireSessionParticipant(ctx, inspection);
    await ctx.db.insert("inspectionSignals", {
      inspectionId: args.id,
      fromUserKey: args.fromUserKey,
      toUserKey: args.toUserKey,
      signalType: args.signalType,
      payload: args.payload,
    });
    return { ok: true };
  },
});

export const listSignals = query({
  args: { id: v.id("liveInspections"), forUserKey: v.string() },
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.id);
    if (!inspection) return [];
    await requireSessionParticipant(ctx, inspection);
    const rows = await ctx.db.query("inspectionSignals").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).order("asc").collect();
    // Only signals broadcast, or explicitly addressed to this participant,
    // and never their own outgoing signals.
    return rows.filter((r) => r.fromUserKey !== args.forUserKey && (!r.toUserKey || r.toUserKey === args.forUserKey));
  },
});

// ── Live chat ────────────────────────────────────────────────────────────
export const sendChatMessage = mutation({
  args: { id: v.id("liveInspections"), body: v.string() },
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    const participant = await requireSessionParticipant(ctx, inspection);
    const trimmed = args.body.trim();
    if (!trimmed) throw new ConvexError({ code: "BAD_REQUEST", message: "Message cannot be empty" });
    if (participant.side === "officer") {
      await ctx.db.insert("inspectionChatMessages", {
        inspectionId: args.id, senderRole: "officer", senderName: participant.user.name ?? participant.user.email ?? "Officer",
        senderId: participant.user._id, body: trimmed, createdAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("inspectionChatMessages", {
        inspectionId: args.id, senderRole: "client", senderName: participant.client.fullName,
        senderClientId: participant.client._id, body: trimmed, createdAt: new Date().toISOString(),
      });
    }
    return { ok: true };
  },
});

export const listChatMessages = query({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.id);
    if (!inspection) return [];
    await requireSessionParticipant(ctx, inspection);
    return ctx.db.query("inspectionChatMessages").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).order("asc").collect();
  },
});

// ── Checklist completion ─────────────────────────────────────────────────
export const toggleChecklistItem = mutation({
  args: { itemId: v.id("inspectionChecklistItems"), completed: v.boolean(), remark: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.capture");
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new ConvexError({ code: "NOT_FOUND", message: "Checklist item not found" });
    await ctx.db.patch(args.itemId, {
      completed: args.completed,
      completedBy: args.completed ? user._id : undefined,
      completedAt: args.completed ? new Date().toISOString() : undefined,
      remark: args.remark ?? item.remark,
    });
    return { ok: true };
  },
});

// ── Snapshots ─────────────────────────────────────────────────────────────
export const generateSnapshotUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "live_inspection.capture");
    return ctx.storage.generateUploadUrl();
  },
});

export const captureSnapshot = mutation({
  args: {
    inspectionId: v.id("liveInspections"),
    storageId: v.id("_storage"),
    checklistItemKey: v.optional(v.string()),
    annotation: v.optional(v.string()),
    clientVisible: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.capture");
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    const id = await ctx.db.insert("inspectionSnapshots", {
      inspectionId: args.inspectionId,
      storageId: args.storageId,
      checklistItemKey: args.checklistItemKey,
      capturedBy: user._id,
      capturedAt: new Date().toISOString(),
      annotation: args.annotation,
      clientVisible: args.clientVisible,
    });
    await logAudit(ctx, {
      action: "create", entity: "inspection_snapshots", entityId: id, entityRef: inspection.inspectionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Captured a snapshot during inspection "${inspection.inspectionRef}"${args.clientVisible ? " (client-visible)" : " (internal)"}`,
    });
    return id;
  },
});

export const setSnapshotVisibility = mutation({
  args: { id: v.id("inspectionSnapshots"), clientVisible: v.boolean() },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "live_inspection.capture");
    await ctx.db.patch(args.id, { clientVisible: args.clientVisible });
    return { ok: true };
  },
});

export const listSnapshots = query({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args): Promise<Array<Doc<"inspectionSnapshots"> & { url: string | null }>> => {
    const inspection = await ctx.db.get(args.id);
    if (!inspection) return [];
    const participant = await requireSessionParticipant(ctx, inspection);
    const rows = await ctx.db.query("inspectionSnapshots").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect();
    // Clients only ever see snapshots explicitly marked client-visible.
    const visible = participant.side === "client" ? rows.filter((r) => r.clientVisible) : rows;
    return Promise.all(visible.map(async (r) => ({ ...r, url: await ctx.storage.getUrl(r.storageId) })));
  },
});

// ── Notes ─────────────────────────────────────────────────────────────────
export const addNote = mutation({
  args: { inspectionId: v.id("liveInspections"), body: v.string(), visibility: v.union(v.literal("internal"), v.literal("client_visible")) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.note");
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    const id = await ctx.db.insert("inspectionNotes", {
      inspectionId: args.inspectionId, authorId: user._id, body: args.body, visibility: args.visibility, createdAt: new Date().toISOString(),
    });
    await logAudit(ctx, {
      action: "create", entity: "inspection_notes", entityId: id, entityRef: inspection.inspectionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Added ${args.visibility === "internal" ? "an internal" : "a client-visible"} note to inspection "${inspection.inspectionRef}"`,
    });
    return id;
  },
});

// Notes scoped for the caller — clients never receive internal notes,
// enforced here at the query level regardless of what the client requests.
export const listNotesForViewer = query({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.id);
    if (!inspection) return [];
    const participant = await requireSessionParticipant(ctx, inspection);
    const rows = await ctx.db.query("inspectionNotes").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect();
    return participant.side === "client" ? rows.filter((r) => r.visibility === "client_visible") : rows;
  },
});

// ── Client view requests ─────────────────────────────────────────────────
const VIEW_AREAS = [
  "kitchen", "master_bedroom", "bedroom", "bathroom", "living_room",
  "exterior", "parking", "road", "estate_facility", "other",
] as const;

export const requestView = mutation({
  args: { inspectionId: v.id("liveInspections"), requestedArea: v.union(...VIEW_AREAS.map((a) => v.literal(a))), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    const participant = await requireSessionParticipant(ctx, inspection);
    if (participant.side !== "client") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only the client can request a view" });
    }
    const id = await ctx.db.insert("inspectionViewRequests", {
      inspectionId: args.inspectionId, requestedArea: args.requestedArea, note: args.note, status: "pending", requestedAt: new Date().toISOString(),
    });
    return id;
  },
});

export const fulfillViewRequest = mutation({
  args: { id: v.id("inspectionViewRequests"), status: v.union(v.literal("fulfilled"), v.literal("declined")) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "live_inspection.join");
    await ctx.db.patch(args.id, { status: args.status, fulfilledAt: new Date().toISOString() });
    return { ok: true };
  },
});

export const listViewRequests = query({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.id);
    if (!inspection) return [];
    await requireSessionParticipant(ctx, inspection);
    return ctx.db.query("inspectionViewRequests").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).order("desc").collect();
  },
});

// Session detail for either side — includes property/estate context for
// the property info panel, but never internal notes to a client caller.
export const getSessionContext = query({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args): Promise<{
    inspection: Awaited<ReturnType<typeof enrichInspection>>;
    side: "officer" | "client";
    checklist: Doc<"inspectionChecklistItems">[];
    property: Doc<"properties"> | null;
    estate: Doc<"estates"> | null;
  }> => {
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    const participant = await requireSessionParticipant(ctx, inspection);
    const [enriched, checklist, property, estate] = await Promise.all([
      enrichInspection(ctx, inspection),
      ctx.db.query("inspectionChecklistItems").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect(),
      inspection.propertyId ? ctx.db.get(inspection.propertyId) : null,
      inspection.estateId ? ctx.db.get(inspection.estateId) : null,
    ]);
    return { inspection: enriched, side: participant.side, checklist, property, estate };
  },
});

// Lists live/upcoming inspections visible to the signed-in buyer's own
// client record — used by the Client Portal to show "Join" without any
// admin permission, since it's their own inspection.
export const listForCurrentClient = query({
  args: {},
  handler: async (ctx) => {
    const enabled = await isFeatureEnabled(ctx);
    if (!enabled) return [];
    const client = await requireBuyerClient(ctx);
    const rows = await ctx.db.query("liveInspections").withIndex("by_client", (q) => q.eq("clientId", client._id)).order("desc").collect();
    return Promise.all(rows.map((r) => enrichInspection(ctx, r)));
  },
});

// ══════════════════════════════════════════════════════════════════════════
// DOCUMENTS & VAULT INTEGRATION — links an inspection to existing vault
// documents ("documents presented" during the session). No second document
// store: this is a thin join table pointing at `vaultDocuments`. A client
// only ever sees a linked document if it is explicitly marked
// `presentedToClient` AND the underlying vault document is not confidential.
// ══════════════════════════════════════════════════════════════════════════

// Candidate documents an officer can link — the client's own vault
// documents plus anything tied to a linked transaction, scoped the same
// way Documents & Vault already scopes staff access (no bypass).
export const listLinkableDocuments = query({
  args: { inspectionId: v.id("liveInspections") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "live_inspection.manage", { requireEnabled: false });
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    const docs = await ctx.db.query("vaultDocuments").withIndex("by_client", (q) => q.eq("clientId", inspection.clientId)).order("desc").take(200);
    return docs;
  },
});

export const linkDocument = mutation({
  args: { inspectionId: v.id("liveInspections"), vaultDocumentId: v.id("vaultDocuments"), presentedToClient: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.manage", { requireEnabled: false });
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    const doc = await ctx.db.get(args.vaultDocumentId);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Document not found" });
    const id = await ctx.db.insert("inspectionDocuments", {
      inspectionId: args.inspectionId,
      vaultDocumentId: args.vaultDocumentId,
      presentedToClient: args.presentedToClient,
      linkedBy: user._id,
      linkedAt: new Date().toISOString(),
    });
    await logAudit(ctx, {
      action: "create", entity: "inspection_documents", entityId: id, entityRef: inspection.inspectionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Linked document "${doc.title}" to inspection "${inspection.inspectionRef}"${args.presentedToClient ? " (presented to client)" : ""}`,
    });
    return id;
  },
});

export const unlinkDocument = mutation({
  args: { id: v.id("inspectionDocuments") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "live_inspection.manage", { requireEnabled: false });
    const link = await ctx.db.get(args.id);
    if (!link) return { ok: true };
    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      action: "delete", entity: "inspection_documents", entityId: args.id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Unlinked a document from an inspection`,
    });
    return { ok: true };
  },
});

// Documents scoped for the caller — clients only ever see links explicitly
// marked presentedToClient, on a non-confidential vault document.
export const listDocumentsForViewer = query({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.id);
    if (!inspection) return [];
    const participant = await requireSessionParticipant(ctx, inspection);
    const links = await ctx.db.query("inspectionDocuments").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect();
    const enriched = await Promise.all(links.map(async (l) => ({ ...l, document: await ctx.db.get(l.vaultDocumentId) })));
    const visible = enriched.filter((l) => l.document !== null) as Array<typeof enriched[number] & { document: Doc<"vaultDocuments"> }>;
    if (participant.side === "client") {
      return visible.filter((l) => l.presentedToClient && !l.document.isConfidential);
    }
    return visible;
  },
});

// ══════════════════════════════════════════════════════════════════════════
// INSPECTION REPORT — aggregates everything needed for the PDF (generated
// via the existing jsPDF infra in convex/documents.ts) plus a
// dashboard/detail-page summary. Follow-up tasks reuse the existing Tasks
// & Approvals board via createTask — no bespoke follow-up system.
// ══════════════════════════════════════════════════════════════════════════
export const getReportData = query({
  args: { id: v.id("liveInspections") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "live_inspection.report", { requireEnabled: false });
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    const [enriched, checklist, viewRequests, snapshots, clientNotes, docLinks] = await Promise.all([
      enrichInspection(ctx, inspection),
      ctx.db.query("inspectionChecklistItems").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect(),
      ctx.db.query("inspectionViewRequests").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect(),
      ctx.db.query("inspectionSnapshots").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect(),
      ctx.db.query("inspectionNotes").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect(),
      ctx.db.query("inspectionDocuments").withIndex("by_inspection", (q) => q.eq("inspectionId", args.id)).collect(),
    ]);
    const clientVisibleSnapshots = snapshots.filter((s) => s.clientVisible);
    const clientVisibleNotes = clientNotes.filter((n) => n.visibility === "client_visible");
    const documentsPresented = await Promise.all(
      docLinks.map(async (l) => {
        const doc = await ctx.db.get(l.vaultDocumentId);
        return { title: doc?.title ?? "Unknown document", presentedToClient: l.presentedToClient };
      })
    );
    const completedChecklist = checklist.filter((c) => c.completed).length;
    return {
      inspection: enriched,
      checklistCompletion: { completed: completedChecklist, total: checklist.length },
      clientRequestedAreas: viewRequests.map((v) => v.requestedArea),
      approvedSnapshotCount: clientVisibleSnapshots.length,
      clientVisibleNotes: clientVisibleNotes.map((n) => n.body),
      documentsPresented,
    };
  },
});

// Creates a follow-up task on the existing Tasks & Approvals board —
// reused as-is per spec, no bespoke follow-up system.
export const createFollowUpTask = mutation({
  args: { id: v.id("liveInspections"), title: v.string(), notes: v.optional(v.string()), assignedTo: v.optional(v.id("users")), dueDate: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Id<"tasks">> => {
    const user = await requirePermission(ctx, "live_inspection.manage", { requireEnabled: false });
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new ConvexError({ code: "NOT_FOUND", message: "Inspection not found" });
    const taskId: Id<"tasks"> = await ctx.runMutation(api.taskboard.createTask, {
      title: args.title,
      description: `Follow-up for live inspection ${inspection.inspectionRef}`,
      priority: "medium",
      category: "live_inspection_follow_up",
      assignedTo: args.assignedTo ?? inspection.assignedOfficer,
      dueDate: args.dueDate,
      clientId: inspection.clientId,
      notes: args.notes,
    });
    await ctx.db.patch(args.id, { followUpRequired: true });
    await logAudit(ctx, {
      action: "create", entity: "live_inspections", entityId: args.id, entityRef: inspection.inspectionRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created follow-up task for inspection "${inspection.inspectionRef}"`,
    });
    return taskId;
  },
});

