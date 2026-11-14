import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api.js";
import { requireIamAdmin } from "./roles.ts";
import { logAudit } from "../taskboard.ts";
import type { Id } from "../_generated/dataModel.d.ts";

// ── Initial organogram — CONFIGURATION DATA ONLY. This seeds the tables;
// it is never hard-coded into authorization logic. Admins can rename, move,
// deactivate, or restructure freely after seeding. ─────────────────────────
const INITIAL_DIRECTORATES = [
  {
    name: "Project Development & Delivery", code: "PDD", colorTheme: "blue",
    departments: ["Design", "Engineering", "Quantity Surveying", "Construction", "Procurement", "HSE & Quality"],
  },
  {
    name: "Finance & Investment", code: "FIN", colorTheme: "teal",
    departments: ["Accounts", "Treasury", "Budgeting", "Project Finance", "Reporting & Controls"],
  },
  {
    name: "Commercial & Customer Experience", code: "CCE", colorTheme: "cyan",
    departments: ["Sales", "Marketing", "Leasing", "Institutional Accounts", "CRM", "After-Sales"],
  },
  {
    name: "Legal, Company Secretariat & Compliance", code: "LCS", colorTheme: "indigo",
    departments: ["Titles", "Contracts", "Regulatory Compliance", "Board Secretariat"],
  },
  {
    name: "Corporate Services & Technology", code: "CST", colorTheme: "emerald",
    departments: ["Human Resources", "Administration", "ICT", "Data Security", "Facilities"],
  },
];

export const seedInitialOrganization = mutation({
  args: {},
  handler: async (ctx): Promise<{ directoratesInserted: number; departmentsInserted: number }> => {
    await requireIamAdmin(ctx);
    const existingDirectorates = await ctx.db.query("directorates").collect();
    const existingNames = new Set(existingDirectorates.map((d) => d.name));
    let directoratesInserted = 0;
    let departmentsInserted = 0;

    for (let i = 0; i < INITIAL_DIRECTORATES.length; i++) {
      const d = INITIAL_DIRECTORATES[i];
      if (existingNames.has(d.name)) continue;
      const directorateId = await ctx.db.insert("directorates", {
        name: d.name,
        code: d.code,
        colorTheme: d.colorTheme,
        order: i,
        status: "active",
      });
      directoratesInserted++;
      for (let j = 0; j < d.departments.length; j++) {
        await ctx.db.insert("departments", {
          directorateId,
          name: d.departments[j],
          order: j,
          status: "active",
        });
        departmentsInserted++;
      }
    }
    return { directoratesInserted, departmentsInserted };
  },
});

// ── Starter units & positions — CONFIGURATION DATA ONLY. Seeds one
// reasonable starting unit + position per existing department so the
// Add User / Assignments dropdowns aren't empty out of the box. Admins can
// freely add, rename, move, deactivate, or delete these afterwards — same
// as anything else in the org structure. ────────────────────────────────────
const STARTER_UNITS_BY_DEPARTMENT: Record<string, { unit: string; position: string }> = {
  Design: { unit: "Architectural Design Unit", position: "Architect" },
  Engineering: { unit: "Structural Engineering Unit", position: "Structural Engineer" },
  "Quantity Surveying": { unit: "Cost Management Unit", position: "Quantity Surveyor" },
  Construction: { unit: "Site Operations Unit", position: "Site Engineer" },
  Procurement: { unit: "Vendor Management Unit", position: "Procurement Officer" },
  "HSE & Quality": { unit: "Quality Assurance Unit", position: "HSE Officer" },
  Accounts: { unit: "Accounts Payable & Receivable Unit", position: "Accountant" },
  Treasury: { unit: "Cash Management Unit", position: "Treasury Officer" },
  Budgeting: { unit: "Planning & Forecasting Unit", position: "Budget Analyst" },
  "Project Finance": { unit: "Project Costing Unit", position: "Project Finance Officer" },
  "Reporting & Controls": { unit: "Financial Reporting Unit", position: "Financial Controller" },
  Sales: { unit: "Direct Sales Unit", position: "Sales Executive" },
  Marketing: { unit: "Brand & Campaigns Unit", position: "Marketing Officer" },
  Leasing: { unit: "Leasing Operations Unit", position: "Leasing Officer" },
  "Institutional Accounts": { unit: "Corporate Accounts Unit", position: "Account Manager" },
  CRM: { unit: "Client Relations Unit", position: "CRM Officer" },
  "After-Sales": { unit: "Client Support Unit", position: "After-Sales Officer" },
  Titles: { unit: "Title Perfection Unit", position: "Titles Officer" },
  Contracts: { unit: "Contract Drafting Unit", position: "Contracts Officer" },
  "Regulatory Compliance": { unit: "Compliance Monitoring Unit", position: "Compliance Officer" },
  "Board Secretariat": { unit: "Governance Support Unit", position: "Company Secretary" },
  "Human Resources": { unit: "Talent & Welfare Unit", position: "HR Officer" },
  Administration: { unit: "General Administration Unit", position: "Administrative Officer" },
  ICT: { unit: "Systems & Infrastructure Unit", position: "IT Officer" },
  "Data Security": { unit: "Information Security Unit", position: "Data Security Officer" },
  Facilities: { unit: "Facilities Management Unit", position: "Facilities Officer" },
};

export const seedStarterUnitsAndPositions = mutation({
  args: {},
  handler: async (ctx): Promise<{ unitsInserted: number; positionsInserted: number }> => {
    const me = await requireIamAdmin(ctx);
    const allDepartments = await ctx.db.query("departments").collect();
    const existingUnits = await ctx.db.query("units").collect();
    const deptsWithUnits = new Set(existingUnits.map((u) => u.departmentId));

    let unitsInserted = 0;
    let positionsInserted = 0;

    for (const dept of allDepartments) {
      if (deptsWithUnits.has(dept._id)) continue; // never overwrite an already-configured department
      const starter = STARTER_UNITS_BY_DEPARTMENT[dept.name];
      if (!starter) continue; // unknown/custom department name — leave for manual setup

      const unitId = await ctx.db.insert("units", {
        departmentId: dept._id,
        name: starter.unit,
        order: 0,
        status: "active",
        createdBy: me._id,
      });
      unitsInserted++;
      await logOrgChange(ctx, "create_unit", "unit", unitId, undefined, JSON.stringify({ departmentId: dept._id, name: starter.unit }), me._id);

      const positionId = await ctx.db.insert("positions", {
        title: starter.position,
        unitId,
        status: "active",
        createdBy: me._id,
      });
      positionsInserted++;
      await logOrgChange(ctx, "create_position", "position", positionId, undefined, JSON.stringify({ unitId, title: starter.position }), me._id);
    }

    return { unitsInserted, positionsInserted };
  },
});

// ── Directorates ─────────────────────────────────────────────────────────────
export const listDirectorates = query({
  args: {},
  handler: async (ctx) => {
    await requireIamAdmin(ctx);
    return await ctx.db.query("directorates").withIndex("by_order").order("asc").collect();
  },
});

export const createDirectorate = mutation({
  args: { name: v.string(), code: v.optional(v.string()), description: v.optional(v.string()), colorTheme: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const all = await ctx.db.query("directorates").collect();
    const id = await ctx.db.insert("directorates", { ...args, order: all.length, status: "active", createdBy: me._id });
    await logOrgChange(ctx, "create_directorate", "directorate", id, undefined, JSON.stringify(args), me._id);
    return id;
  },
});

export const updateDirectorate = mutation({
  args: {
    id: v.id("directorates"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    colorTheme: v.optional(v.string()),
    order: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const { id, ...patch } = args;
    const before = await ctx.db.get(id);
    if (!before) throw new ConvexError({ code: "NOT_FOUND", message: "Directorate not found" });
    await ctx.db.patch(id, patch);
    await logOrgChange(ctx, "update_directorate", "directorate", id, JSON.stringify(before), JSON.stringify(patch), me._id);
  },
});

// ── Departments ──────────────────────────────────────────────────────────────
export const listDepartments = query({
  args: { directorateId: v.optional(v.id("directorates")) },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    if (args.directorateId) {
      return await ctx.db.query("departments").withIndex("by_directorate", (q) => q.eq("directorateId", args.directorateId!)).collect();
    }
    return await ctx.db.query("departments").collect();
  },
});

export const createDepartment = mutation({
  args: { directorateId: v.id("directorates"), name: v.string(), code: v.optional(v.string()), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const siblings = await ctx.db.query("departments").withIndex("by_directorate", (q) => q.eq("directorateId", args.directorateId)).collect();
    const id = await ctx.db.insert("departments", { ...args, order: siblings.length, status: "active", createdBy: me._id });
    await logOrgChange(ctx, "create_department", "department", id, undefined, JSON.stringify(args), me._id);
    return id;
  },
});

export const updateDepartment = mutation({
  args: {
    id: v.id("departments"),
    directorateId: v.optional(v.id("directorates")), // moving to a different directorate
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const { id, ...patch } = args;
    const before = await ctx.db.get(id);
    if (!before) throw new ConvexError({ code: "NOT_FOUND", message: "Department not found" });
    await ctx.db.patch(id, patch);
    const changeType = args.directorateId && args.directorateId !== before.directorateId ? "move_department" : "update_department";
    await logOrgChange(ctx, changeType, "department", id, JSON.stringify(before), JSON.stringify(patch), me._id);

    // Keep staffProfiles.department (a denormalized name copy used for
    // display/filtering/search) in sync whenever the linked department is
    // renamed, so HR records never drift from the live org chart.
    if (args.name && args.name !== before.name) {
      const linkedStaff = await ctx.db.query("staffProfiles").withIndex("by_departmentId", (q) => q.eq("departmentId", id)).collect();
      for (const s of linkedStaff) {
        await ctx.db.patch(s._id, { department: args.name });
      }
    }

    if (changeType === "move_department") {
      const newDirectorate = args.directorateId ? await ctx.db.get(args.directorateId) : null;
      const assignments = await ctx.db
        .query("userOrgAssignments")
        .withIndex("by_department", (q) => q.eq("departmentId", id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      for (const assignment of assignments) {
        const targetUser = await ctx.db.get(assignment.userId);
        if (targetUser?.email) {
          await ctx.scheduler.runAfter(0, internal.emails.sendOrgChangeAffectingUserEmail, {
            to: targetUser.email,
            phone: targetUser.phone,
            name: targetUser.name ?? "there",
            changeDescription: `Your department, "${before.name}", has moved to the ${newDirectorate?.name ?? "a different"} directorate.`,
          });
        }
      }
    }
  },
});

// ── Units ────────────────────────────────────────────────────────────────────
export const listUnits = query({
  args: { departmentId: v.optional(v.id("departments")) },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    if (args.departmentId) {
      return await ctx.db.query("units").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId!)).collect();
    }
    return await ctx.db.query("units").collect();
  },
});

export const createUnit = mutation({
  args: { departmentId: v.id("departments"), name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const siblings = await ctx.db.query("units").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId)).collect();
    const id = await ctx.db.insert("units", { ...args, order: siblings.length, status: "active", createdBy: me._id });
    await logOrgChange(ctx, "create_unit", "unit", id, undefined, JSON.stringify(args), me._id);
    return id;
  },
});

export const updateUnit = mutation({
  args: {
    id: v.id("units"),
    departmentId: v.optional(v.id("departments")),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const { id, ...patch } = args;
    const before = await ctx.db.get(id);
    if (!before) throw new ConvexError({ code: "NOT_FOUND", message: "Unit not found" });
    await ctx.db.patch(id, patch);
    const changeType = args.departmentId && args.departmentId !== before.departmentId ? "move_unit" : "update_unit";
    await logOrgChange(ctx, changeType, "unit", id, JSON.stringify(before), JSON.stringify(patch), me._id);
  },
});

// ── Positions ────────────────────────────────────────────────────────────────
export const listPositions = query({
  args: { unitId: v.optional(v.id("units")), departmentId: v.optional(v.id("departments")) },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    if (args.unitId) {
      return await ctx.db.query("positions").withIndex("by_unit", (q) => q.eq("unitId", args.unitId!)).collect();
    }
    if (args.departmentId) {
      return await ctx.db.query("positions").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId!)).collect();
    }
    return await ctx.db.query("positions").collect();
  },
});

export const createPosition = mutation({
  args: {
    title: v.string(),
    unitId: v.optional(v.id("units")),
    departmentId: v.optional(v.id("departments")),
    directorateId: v.optional(v.id("directorates")),
    reportsToPositionId: v.optional(v.id("positions")),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const id = await ctx.db.insert("positions", { ...args, status: "active", createdBy: me._id });
    await logOrgChange(ctx, "create_position", "position", id, undefined, JSON.stringify(args), me._id);
    return id;
  },
});

export const updatePosition = mutation({
  args: {
    id: v.id("positions"),
    title: v.optional(v.string()),
    unitId: v.optional(v.id("units")),
    departmentId: v.optional(v.id("departments")),
    directorateId: v.optional(v.id("directorates")),
    reportsToPositionId: v.optional(v.id("positions")),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const me = await requireIamAdmin(ctx);
    const { id, ...patch } = args;
    const before = await ctx.db.get(id);
    if (!before) throw new ConvexError({ code: "NOT_FOUND", message: "Position not found" });
    await ctx.db.patch(id, patch);
    await logOrgChange(ctx, "update_position", "position", id, JSON.stringify(before), JSON.stringify(patch), me._id);
  },
});

// ── Change impact preview — dynamically calculated, never hard-coded ────────
export const previewDepartmentMoveImpact = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args): Promise<{ usersAffected: number; unitsAffected: number; positionsAffected: number }> => {
    await requireIamAdmin(ctx);
    const [assignments, units] = await Promise.all([
      ctx.db.query("userOrgAssignments").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId)).filter((q) => q.eq(q.field("status"), "active")).collect(),
      ctx.db.query("units").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId)).collect(),
    ]);
    let positionsAffected = 0;
    for (const u of units) {
      const positions = await ctx.db.query("positions").withIndex("by_unit", (q) => q.eq("unitId", u._id)).collect();
      positionsAffected += positions.length;
    }
    const directPositions = await ctx.db.query("positions").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId)).collect();
    return {
      usersAffected: assignments.length,
      unitsAffected: units.length,
      positionsAffected: positionsAffected + directPositions.length,
    };
  },
});

// ── Organisational change history logging (shared helper) ──────────────────
async function logOrgChange(
  ctx: MutationCtx,
  changeType: string,
  entityType: string,
  entityId: string,
  previousState: string | undefined,
  newState: string | undefined,
  actorId: Id<"users">,
) {
  await ctx.db.insert("organizationalChanges", {
    changeType,
    entityType,
    entityId,
    previousState,
    newState,
    effectiveDate: new Date().toISOString(),
    actorId,
    timestamp: new Date().toISOString(),
  });
  // Every organisational structure change is also mirrored into the main
  // Audit Log so it shows up alongside all other administrative actions,
  // not just in the dedicated organisational-change history view.
  const actor = await ctx.db.get(actorId);
  await logAudit(ctx, {
    action: changeType.startsWith("create") ? "create" : changeType.startsWith("delete") ? "delete" : "update",
    entity: `org_${entityType}`,
    entityId,
    userId: actorId,
    userName: actor?.name,
    userRole: actor?.role,
    description: `${changeType.replace(/_/g, " ")} (${entityType})`,
    before: previousState,
    after: newState,
  });
}

export const listOrganizationalChanges = query({
  args: { entityType: v.optional(v.string()), entityId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireIamAdmin(ctx);
    if (args.entityType && args.entityId) {
      return await ctx.db
        .query("organizationalChanges")
        .withIndex("by_entity", (q) => q.eq("entityType", args.entityType!).eq("entityId", args.entityId!))
        .order("desc")
        .take(100);
    }
    return await ctx.db.query("organizationalChanges").withIndex("by_timestamp").order("desc").take(100);
  },
});
