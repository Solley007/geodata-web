import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin.ts";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

// ══════════════════════════════════════════════════════════════════════════
// EMPLOYMENT LETTERS
//
// One row per issued letter — a new letter (promotion, contract renewal,
// re-confirmation) is a new row rather than an edit to a previous one, so an
// already-accepted letter's terms are never silently rewritten. The staff
// portal ("My Employment Letter") always shows the most recent letter; the
// admin side can see the full history per staff member.
// ══════════════════════════════════════════════════════════════════════════

async function requireStaffLetterOwner(ctx: QueryCtx, staffId: Id<"staffProfiles">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
  const me = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  if (!me) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });

  const staff = await ctx.db.get(staffId);
  if (!staff) throw new ConvexError({ code: "NOT_FOUND", message: "Staff profile not found" });

  const isOwner = staff.userId === me._id || (!!staff.email && staff.email === me.email);
  if (!isOwner) throw new ConvexError({ code: "FORBIDDEN", message: "This is not your employment letter" });

  return { me, staff };
}

export const listStaffLetters = query({
  args: { staffId: v.id("staffProfiles") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.query("staffEmploymentLetters").withIndex("by_staff", (q) => q.eq("staffId", args.staffId)).order("desc").collect();
  },
});

export const createEmploymentLetter = mutation({
  args: {
    staffId: v.id("staffProfiles"),
    letterType: v.string(),
    position: v.string(),
    department: v.string(),
    startDate: v.string(),
    employmentType: v.string(),
    salary: v.optional(v.number()),
    gradeLevel: v.optional(v.string()),
    probationMonths: v.optional(v.number()),
    reportingManager: v.optional(v.string()),
    additionalTerms: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const staff = await ctx.db.get(args.staffId);
    if (!staff) throw new ConvexError({ code: "NOT_FOUND", message: "Staff profile not found" });

    const id = await ctx.db.insert("staffEmploymentLetters", {
      staffId: args.staffId,
      letterType: args.letterType,
      position: args.position,
      department: args.department,
      startDate: args.startDate,
      employmentType: args.employmentType,
      salary: args.salary,
      gradeLevel: args.gradeLevel,
      probationMonths: args.probationMonths,
      reportingManager: args.reportingManager,
      additionalTerms: args.additionalTerms,
      status: "pending",
      generatedBy: user._id,
    });

    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "employment_letter", entityId: id, details: `${args.letterType} letter for ${staff.fullName}` });
    return id;
  },
});

// One-time/occasional backfill for staff who already existed before this
// feature shipped and have no letter yet. Generates a straightforward
// "offer" letter from each staff member's current profile fields — bounded
// to staff without an existing letter, so it's safe to re-run.
export const backfillMissingLetters = mutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const user = await requireAdmin(ctx);
    const allStaff = await ctx.db.query("staffProfiles").collect();
    let created = 0;

    for (const staff of allStaff) {
      const existing = await ctx.db.query("staffEmploymentLetters").withIndex("by_staff", (q) => q.eq("staffId", staff._id)).first();
      if (existing) continue;

      await ctx.db.insert("staffEmploymentLetters", {
        staffId: staff._id,
        letterType: "offer",
        position: staff.jobTitle,
        department: staff.department,
        startDate: staff.startDate,
        employmentType: staff.employmentType,
        salary: staff.salary,
        gradeLevel: staff.gradeLevel,
        status: "pending",
        generatedBy: user._id,
      });
      created++;
    }

    if (created > 0) {
      await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "employment_letter", entityId: user._id, details: `Backfilled ${created} retroactive employment letter(s)` });
    }
    return created;
  },
});

// ── Staff self-service ─────────────────────────────────────────────────
export const getMyEmploymentLetter = query({
  args: { staffId: v.id("staffProfiles") },
  handler: async (ctx, args): Promise<Doc<"staffEmploymentLetters"> | null> => {
    await requireStaffLetterOwner(ctx, args.staffId);
    return await ctx.db.query("staffEmploymentLetters").withIndex("by_staff", (q) => q.eq("staffId", args.staffId)).order("desc").first();
  },
});

export const acceptMyEmploymentLetter = mutation({
  args: { id: v.id("staffEmploymentLetters") },
  handler: async (ctx, args) => {
    const letter = await ctx.db.get(args.id);
    if (!letter) throw new ConvexError({ code: "NOT_FOUND", message: "Letter not found" });
    const { me } = await requireStaffLetterOwner(ctx, letter.staffId);
    if (letter.status === "accepted") return;

    await ctx.db.patch(args.id, { status: "accepted", acceptedAt: new Date().toISOString() });
    await ctx.db.insert("activityLog", { userId: me._id, action: "update", entity: "employment_letter", entityId: args.id, details: "Accepted employment letter" });
  },
});
