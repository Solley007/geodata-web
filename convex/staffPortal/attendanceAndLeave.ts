import { query, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin } from "../admin.ts";
import { internal } from "../_generated/api.js";
import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";

// ══════════════════════════════════════════════════════════════════════════
// STAFF PORTAL — MY ATTENDANCE & MY LEAVE (self-service, /staff)
//
// Staff profiles aren't directly linked to `users` by an id column, so the
// viewer's own staffProfiles row is resolved by matching users.email to
// staffProfiles.email (both are required, unique-ish fields). If no matching
// row exists, the viewer has no linked staff profile yet — every query below
// returns an empty/null result rather than throwing, so the page can render
// a clear "not linked" state instead of crashing.
// ══════════════════════════════════════════════════════════════════════════

async function getMyStaffProfile(ctx: QueryCtx, userEmail: string | undefined): Promise<Doc<"staffProfiles"> | null> {
  if (!userEmail) return null;
  return await ctx.db.query("staffProfiles").withIndex("by_email", (q) => q.eq("email", userEmail)).unique();
}

export const getMyStaffRecord = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const staff = await getMyStaffProfile(ctx, user.email);
    if (!staff) return null;
    const avatarUrl = staff.avatarStorageId ? await ctx.storage.getUrl(staff.avatarStorageId) : null;
    return { ...staff, avatarUrl };
  },
});

// ── My Attendance ────────────────────────────────────────────────────────

export const listMyAttendancePaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const staff = await getMyStaffProfile(ctx, user.email);
    if (!staff) return { page: [], isDone: true, continueCursor: "" };
    return await ctx.db.query("attendance").withIndex("by_staff", (q) => q.eq("staffId", staff._id)).order("desc").paginate(args.paginationOpts);
  },
});

export const getMyAttendanceForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const staff = await getMyStaffProfile(ctx, user.email);
    if (!staff) return null;
    const records = await ctx.db.query("attendance").withIndex("by_staff", (q) => q.eq("staffId", staff._id)).collect();
    return records.find((a) => a.date === args.date) ?? null;
  },
});

export const getMyAttendanceStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const staff = await getMyStaffProfile(ctx, user.email);
    if (!staff) return { hasProfile: false, present: 0, absent: 0, late: 0, halfDay: 0, total: 0, thisMonthPresent: 0 };

    const records = await ctx.db.query("attendance").withIndex("by_staff", (q) => q.eq("staffId", staff._id)).collect();
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
    const thisMonth = records.filter((a) => a.date.startsWith(currentMonthPrefix));

    return {
      hasProfile: true,
      present: records.filter((a) => a.status === "present").length,
      absent: records.filter((a) => a.status === "absent").length,
      late: records.filter((a) => a.status === "late").length,
      halfDay: records.filter((a) => a.status === "half_day").length,
      total: records.length,
      thisMonthPresent: thisMonth.filter((a) => a.status === "present" || a.status === "late").length,
    };
  },
});

export const clockIn = mutation({
  args: { date: v.string(), time: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const staff = await getMyStaffProfile(ctx, user.email);
    if (!staff) throw new ConvexError({ message: "No staff profile is linked to your account yet. Contact HR.", code: "NOT_FOUND" });

    const existing = await ctx.db.query("attendance").withIndex("by_staff", (q) => q.eq("staffId", staff._id)).collect();
    const todayRecord = existing.find((a) => a.date === args.date);
    if (todayRecord?.checkIn) throw new ConvexError({ message: "You already clocked in today", code: "CONFLICT" });

    if (todayRecord) {
      await ctx.db.patch(todayRecord._id, { checkIn: args.time, status: "present" });
    } else {
      await ctx.db.insert("attendance", { staffId: staff._id, date: args.date, checkIn: args.time, status: "present" });
    }
  },
});

export const clockOut = mutation({
  args: { date: v.string(), time: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const staff = await getMyStaffProfile(ctx, user.email);
    if (!staff) throw new ConvexError({ message: "No staff profile is linked to your account yet. Contact HR.", code: "NOT_FOUND" });

    const existing = await ctx.db.query("attendance").withIndex("by_staff", (q) => q.eq("staffId", staff._id)).collect();
    const todayRecord = existing.find((a) => a.date === args.date);
    if (!todayRecord || !todayRecord.checkIn) throw new ConvexError({ message: "Clock in before clocking out", code: "BAD_REQUEST" });
    if (todayRecord.checkOut) throw new ConvexError({ message: "You already clocked out today", code: "CONFLICT" });

    await ctx.db.patch(todayRecord._id, { checkOut: args.time });
  },
});

// ── My Leave Requests ────────────────────────────────────────────────────

export const listMyLeaveRequestsPaginated = query({
  args: { status: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const staff = await getMyStaffProfile(ctx, user.email);
    if (!staff) return { page: [], isDone: true, continueCursor: "" };

    const results = await ctx.db.query("leaveRequests").withIndex("by_staff", (q) => q.eq("staffId", staff._id)).order("desc").paginate(args.paginationOpts);
    const page = args.status && args.status !== "all" ? results.page.filter((l) => l.status === args.status) : results.page;
    return { ...results, page };
  },
});

export const getMyLeaveStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const staff = await getMyStaffProfile(ctx, user.email);
    if (!staff) return { hasProfile: false, pending: 0, approved: 0, rejected: 0, total: 0 };

    const leaves = await ctx.db.query("leaveRequests").withIndex("by_staff", (q) => q.eq("staffId", staff._id)).collect();
    return {
      hasProfile: true,
      pending: leaves.filter((l) => l.status === "pending").length,
      approved: leaves.filter((l) => l.status === "approved").length,
      rejected: leaves.filter((l) => l.status === "rejected").length,
      total: leaves.length,
    };
  },
});

export const createMyLeaveRequest = mutation({
  args: {
    leaveType: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"leaveRequests">> => {
    const user = await requireAdmin(ctx);
    const staff = await getMyStaffProfile(ctx, user.email);
    if (!staff) throw new ConvexError({ message: "No staff profile is linked to your account yet. Contact HR.", code: "NOT_FOUND" });
    if (args.endDate < args.startDate) throw new ConvexError({ message: "End date must be on or after the start date", code: "BAD_REQUEST" });

    const id = await ctx.db.insert("leaveRequests", {
      staffId: staff._id,
      leaveType: args.leaveType,
      startDate: args.startDate,
      endDate: args.endDate,
      reason: args.reason,
      status: "pending",
    });
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "leave", entityId: id, details: `${args.leaveType} (self-service)` });

    const [emails, phones] = await Promise.all([
      ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
    ]);
    for (const to of emails) {
      await ctx.scheduler.runAfter(0, internal.emails.sendLeaveApprovalReminder, {
        to,
        phone: phones[0],
        managerName: "Team",
        staffName: staff.fullName,
        leaveType: args.leaveType,
        startDate: args.startDate,
        endDate: args.endDate,
      });
    }

    return id;
  },
});

export const cancelMyLeaveRequest = mutation({
  args: { id: v.id("leaveRequests") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const staff = await getMyStaffProfile(ctx, user.email);
    if (!staff) throw new ConvexError({ message: "No staff profile is linked to your account yet.", code: "NOT_FOUND" });

    const leave = await ctx.db.get(args.id);
    if (!leave || leave.staffId !== staff._id) throw new ConvexError({ message: "Leave request not found", code: "NOT_FOUND" });
    if (leave.status !== "pending") throw new ConvexError({ message: "Only pending requests can be cancelled", code: "BAD_REQUEST" });

    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", { userId: user._id, action: "delete", entity: "leave", entityId: args.id, details: "cancelled by staff" });
  },
});
