import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin } from "./admin.ts";
import { internal } from "./_generated/api.js";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";
import { tokenOf } from "./authIdentity";

// ── STAFF PROFILES ────────────────────────────────────────────────
async function resolveAvatarUrl(ctx: QueryCtx, staff: { avatarStorageId?: Id<"_storage"> }) {
  return staff.avatarStorageId ? await ctx.storage.getUrl(staff.avatarStorageId) : null;
}

export const listStaff = query({
  args: { department: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let staff = await ctx.db.query("staffProfiles").collect();
    if (args.department && args.department !== "all") staff = staff.filter((s) => s.department === args.department);
    if (args.status && args.status !== "all") staff = staff.filter((s) => s.status === args.status);
    const sorted = staff.sort((a, b) => b._creationTime - a._creationTime);
    return await Promise.all(sorted.map(async (s) => ({ ...s, avatarUrl: await resolveAvatarUrl(ctx, s) })));
  },
});

export const listStaffPaginated = query({
  args: {
    department: v.optional(v.string()),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let result;
    if (args.search?.trim()) {
      result = await ctx.db
        .query("staffProfiles")
        .withSearchIndex("search_fullName", (q) => {
          let query = q.search("fullName", args.search!);
          if (args.department && args.department !== "all") query = query.eq("department", args.department);
          if (args.status && args.status !== "all") query = query.eq("status", args.status);
          return query;
        })
        .paginate(args.paginationOpts);
    } else if (args.department && args.department !== "all") {
      result = await ctx.db
        .query("staffProfiles")
        .withIndex("by_department", (q) => q.eq("department", args.department!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.status && args.status !== "all") {
      result = await ctx.db
        .query("staffProfiles")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db.query("staffProfiles").order("desc").paginate(args.paginationOpts);
    }

    return {
      ...result,
      page: await Promise.all(result.page.map(async (s) => ({ ...s, avatarUrl: await resolveAvatarUrl(ctx, s) }))),
    };
  },
});

export const createStaff = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
    department: v.string(),
    departmentId: v.optional(v.id("departments")),
    jobTitle: v.string(),
    staffId: v.string(),
    employmentType: v.string(),
    startDate: v.string(),
    salary: v.optional(v.number()),
    status: v.string(),
    avatarStorageId: v.optional(v.id("_storage")),
    address: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    nin: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    bankName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.string()),
    maritalStatus: v.optional(v.string()),
    stateOfOrigin: v.optional(v.string()),
    lgaOfOrigin: v.optional(v.string()),
    gradeLevel: v.optional(v.string()),
    qualification: v.optional(v.string()),
    confirmationDate: v.optional(v.string()),
    pensionRsaPin: v.optional(v.string()),
    nhfNumber: v.optional(v.string()),
    nsitfNumber: v.optional(v.string()),
    tin: v.optional(v.string()),
    nextOfKinName: v.optional(v.string()),
    nextOfKinRelationship: v.optional(v.string()),
    nextOfKinPhone: v.optional(v.string()),
    nextOfKinAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("staffProfiles", args);
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "staff", entityId: id, details: args.fullName });

    if (args.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendStaffOnboardingEmail, {
        to: args.email,
        phone: args.phone,
        fullName: args.fullName,
        jobTitle: args.jobTitle,
        department: args.department,
        startDate: args.startDate,
      });
    }

    return id;
  },
});

export const updateStaff = mutation({
  args: {
    id: v.id("staffProfiles"),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    department: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
    jobTitle: v.optional(v.string()),
    employmentType: v.optional(v.string()),
    startDate: v.optional(v.string()),
    salary: v.optional(v.number()),
    status: v.optional(v.string()),
    avatarStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    address: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    nin: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    bankName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.string()),
    maritalStatus: v.optional(v.string()),
    stateOfOrigin: v.optional(v.string()),
    lgaOfOrigin: v.optional(v.string()),
    gradeLevel: v.optional(v.string()),
    qualification: v.optional(v.string()),
    confirmationDate: v.optional(v.string()),
    pensionRsaPin: v.optional(v.string()),
    nhfNumber: v.optional(v.string()),
    nsitfNumber: v.optional(v.string()),
    tin: v.optional(v.string()),
    nextOfKinName: v.optional(v.string()),
    nextOfKinRelationship: v.optional(v.string()),
    nextOfKinPhone: v.optional(v.string()),
    nextOfKinAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const { id, avatarStorageId, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Staff profile not found" });

    // Only touch the avatar when the caller explicitly sent the field —
    // an absent key here means "leave the current photo alone", while an
    // explicit null means "remove it". Replacing/clearing deletes the
    // previous file so storage doesn't accumulate orphans.
    const patch: Record<string, unknown> = { ...updates };
    if ("avatarStorageId" in args) {
      if (existing.avatarStorageId && existing.avatarStorageId !== avatarStorageId) {
        await ctx.storage.delete(existing.avatarStorageId);
      }
      patch.avatarStorageId = avatarStorageId ?? undefined;
    }

    await ctx.db.patch(id, patch);
    await ctx.db.insert("activityLog", { userId: user._id, action: "update", entity: "staff", entityId: id, details: updates.fullName ?? "updated" });
  },
});

export const deleteStaff = mutation({
  args: { id: v.id("staffProfiles") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing?.avatarStorageId) await ctx.storage.delete(existing.avatarStorageId);

    const docs = await ctx.db.query("staffDocuments").withIndex("by_staff", (q) => q.eq("staffId", args.id)).collect();
    for (const doc of docs) {
      await ctx.storage.delete(doc.storageId);
      await ctx.db.delete(doc._id);
    }

    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", { userId: user._id, action: "delete", entity: "staff", entityId: args.id, details: "staff deleted" });
  },
});

// ── ATTENDANCE ────────────────────────────────────────────────────
export const listAttendance = query({
  args: { date: v.optional(v.string()), staffId: v.optional(v.id("staffProfiles")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.staffId) {
      return await ctx.db.query("attendance").withIndex("by_staff", (q) => q.eq("staffId", args.staffId!)).collect();
    }
    if (args.date) {
      return await ctx.db.query("attendance").withIndex("by_date", (q) => q.eq("date", args.date!)).collect();
    }
    return await ctx.db.query("attendance").order("desc").take(100);
  },
});

export const markAttendance = mutation({
  args: {
    staffId: v.id("staffProfiles"),
    date: v.string(),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    // Upsert: check if record exists for that staff+date
    const existing = await ctx.db.query("attendance").withIndex("by_staff", (q) => q.eq("staffId", args.staffId)).collect();
    const todayRecord = existing.find((a) => a.date === args.date);
    if (todayRecord) {
      await ctx.db.patch(todayRecord._id, { checkIn: args.checkIn, checkOut: args.checkOut, status: args.status, notes: args.notes, recordedBy: user._id });
    } else {
      await ctx.db.insert("attendance", { ...args, recordedBy: user._id });
    }

    if (args.status === "absent" || args.status === "late") {
      const staff = await ctx.db.get(args.staffId);
      if (staff) {
        const [emails, phones] = await Promise.all([
          ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
          ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
        ]);
        await ctx.scheduler.runAfter(0, internal.emails.sendAttendanceIrregularityEmail, {
          to: emails,
          adminPhones: phones,
          staffName: staff.fullName,
          date: args.date,
          status: args.status,
          notes: args.notes,
        });
      }
    }
  },
});

// ── LEAVE REQUESTS ────────────────────────────────────────────────
export const listLeaveRequests = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let leaves = await ctx.db.query("leaveRequests").collect();
    if (args.status && args.status !== "all") leaves = leaves.filter((l) => l.status === args.status);
    return leaves.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const createLeaveRequest = mutation({
  args: {
    staffId: v.id("staffProfiles"),
    leaveType: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    reason: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("leaveRequests", args);
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "leave", entityId: id, details: args.leaveType });
    return id;
  },
});

export const updateLeaveStatus = mutation({
  args: { id: v.id("leaveRequests"), status: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status, notes: args.notes, approvedBy: user._id });

    const leave = await ctx.db.get(args.id);
    if (leave && (args.status === "approved" || args.status === "rejected")) {
      const staff = await ctx.db.get(leave.staffId);
      if (staff?.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendLeaveDecisionEmail, {
          to: staff.email,
          phone: staff.phone,
          staffName: staff.fullName,
          leaveType: leave.leaveType,
          startDate: leave.startDate,
          endDate: leave.endDate,
          status: args.status,
          notes: args.notes,
        });
      }
    }
  },
});

// ── SYNC FROM USERS & ROLES ─────────────────────────────────────────
// Called whenever an admin assigns a staff-level role (super_admin, admin,
// manager, agent) to a user from the Users & Roles page. Ensures every staff
// role assignment has a matching staffProfiles record, so Staff Management
// never silently misses someone who already has staff access.
export const ensureStaffProfileForUser = internalMutation({
  args: {
    userId: v.id("users"),
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    department: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // A profile may already exist (created directly in Staff Management, or
    // linked from a previous role assignment) — match on the linked user
    // first, then fall back to email so pre-existing profiles get linked
    // instead of duplicated.
    const existing = await ctx.db
      .query("staffProfiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      if (!existing.userId) await ctx.db.patch(existing._id, { userId: args.userId });
      return existing._id;
    }

    const staffId = `STF-${args.userId.slice(-6).toUpperCase()}`;
    return await ctx.db.insert("staffProfiles", {
      userId: args.userId,
      fullName: args.fullName,
      email: args.email,
      phone: args.phone ?? "",
      department: args.department ?? "Administration",
      jobTitle: args.jobTitle ?? "Staff",
      staffId,
      employmentType: "full_time",
      startDate: new Date().toISOString().split("T")[0],
      status: "active",
    });
  },
});

export const getStaffStats = query({
  args: {},
  handler: async (ctx): Promise<{
    totalStaff: number; activeStaff: number; byDepartment: Array<{ dept: string; count: number }>;
    pendingLeaves: number; todayPresent: number;
  }> => {
    await requireAdmin(ctx);
    const staff = await ctx.db.query("staffProfiles").collect();
    const leaves = await ctx.db.query("leaveRequests").collect();
    const today = new Date().toISOString().split("T")[0];
    const todayAtt = await ctx.db.query("attendance").withIndex("by_date", (q) => q.eq("date", today)).collect();
    const deptMap: Record<string, number> = {};
    for (const s of staff) deptMap[s.department] = (deptMap[s.department] ?? 0) + 1;
    return {
      totalStaff: staff.length,
      activeStaff: staff.filter((s) => s.status === "active").length,
      byDepartment: Object.entries(deptMap).map(([dept, count]) => ({ dept, count })),
      pendingLeaves: leaves.filter((l) => l.status === "pending").length,
      todayPresent: todayAtt.filter((a) => a.status === "present" || a.status === "late").length,
    };
  },
});

// ── FILE UPLOADS (passport photo, credentials) ─────────────────────
// Reuses the shared api.cms.generateUploadUrl/getFileUrl endpoints (any
// authenticated upload, not CMS-specific) via the shared FileUploadButton
// component — no need for a staff-specific upload URL endpoint.

// A caller may manage a staff profile's photo/documents if they're an admin,
// or if the profile is linked to (or shares an email with) their own account.
async function requireStaffOwnerOrAdmin(ctx: MutationCtx, staffId: Id<"staffProfiles">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
  const me = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
  if (!me) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });

  const staff = await ctx.db.get(staffId);
  if (!staff) throw new ConvexError({ code: "NOT_FOUND", message: "Staff profile not found" });

  const isAdmin = me.role === "super_admin" || me.role === "admin" || me.role === "manager" || me.role === "agent";
  const isOwner = staff.userId === me._id || (!!staff.email && staff.email === me.email);
  if (!isAdmin && !isOwner) throw new ConvexError({ code: "FORBIDDEN", message: "You cannot manage this staff profile" });

  return { me, staff };
}

// Lets a staff member update their own passport photo from the self-service
// portal, without needing full admin access to the rest of their record.
export const updateMyAvatar = mutation({
  args: { staffId: v.id("staffProfiles"), avatarStorageId: v.union(v.id("_storage"), v.null()) },
  handler: async (ctx, args) => {
    const { staff } = await requireStaffOwnerOrAdmin(ctx, args.staffId);
    if (staff.avatarStorageId && staff.avatarStorageId !== args.avatarStorageId) {
      await ctx.storage.delete(staff.avatarStorageId);
    }
    await ctx.db.patch(args.staffId, { avatarStorageId: args.avatarStorageId ?? undefined });
  },
});

// ── CREDENTIALS / DOCUMENTS ─────────────────────────────────────────
export const listStaffDocuments = query({
  args: { staffId: v.id("staffProfiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
    if (!me) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });

    const staff = await ctx.db.get(args.staffId);
    if (!staff) return [];
    const isAdmin = me.role === "super_admin" || me.role === "admin" || me.role === "manager" || me.role === "agent";
    const isOwner = staff.userId === me._id || (!!staff.email && staff.email === me.email);
    if (!isAdmin && !isOwner) throw new ConvexError({ code: "FORBIDDEN", message: "You cannot view these documents" });

    const docs = await ctx.db.query("staffDocuments").withIndex("by_staff", (q) => q.eq("staffId", args.staffId)).collect();
    return await Promise.all(
      docs
        .sort((a, b) => b._creationTime - a._creationTime)
        .map(async (d) => ({ ...d, fileUrl: await ctx.storage.getUrl(d.storageId) })),
    );
  },
});

export const addStaffDocument = mutation({
  args: {
    staffId: v.id("staffProfiles"),
    docType: v.string(),
    customLabel: v.optional(v.string()),
    fileName: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { me } = await requireStaffOwnerOrAdmin(ctx, args.staffId);
    return await ctx.db.insert("staffDocuments", {
      staffId: args.staffId,
      docType: args.docType,
      customLabel: (args.docType === "other" || args.docType === "certificate") ? args.customLabel || undefined : undefined,
      fileName: args.fileName,
      storageId: args.storageId,
      uploadedBy: me._id,
    });
  },
});

export const deleteStaffDocument = mutation({
  args: { id: v.id("staffDocuments") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return;
    await requireStaffOwnerOrAdmin(ctx, doc.staffId);
    await ctx.storage.delete(doc.storageId);
    await ctx.db.delete(args.id);
  },
});
