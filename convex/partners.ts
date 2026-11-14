import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api.js";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";
import { campaignAcceptsLeads } from "./diaspora/campaigns.ts";

// ── helpers ─────────────────────────────────────────────────────────────────

/** Resolve the current user by token, falling back to email if the token has changed. */
export async function resolveUser(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const byToken = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (byToken) return byToken;
  // Fallback: issuer URL may have changed — find by email
  if (identity.email) {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();
  }
  return null;
}

const ADMIN_ROLES = ["super_admin", "admin", "manager"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

function isAdminRole(role: string | undefined): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}

export async function requireAdminCtx(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
  const user = await resolveUser(ctx);
  if (!user || !isAdminRole(user.role ?? ""))
    throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });
  return user;
}

function generateReferralCode(name: string): string {
  const prefix = "GWS";
  const initials = name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2)
    .padEnd(2, "X");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${initials}${rand}`;
}

// ── PUBLIC: submit application ───────────────────────────────────────────────

export const submitApplication = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    address: v.optional(v.string()),
    country: v.optional(v.string()),
    motivation: v.string(),
    experience: v.optional(v.string()),
    howHeard: v.optional(v.string()),
    campaignCode: v.optional(v.string()), // Diaspora campaign attribution via ?ref=CODE
    partnerType: v.optional(v.union(v.literal("individual"), v.literal("company"))),
    companyName: v.optional(v.string()),
    rcNumber: v.optional(v.string()),
    companyWebsite: v.optional(v.string()),
    contactRole: v.optional(v.string()),
    bankName: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"partnerApplications">> => {
    const { campaignCode, ...rest } = args;
    if (rest.partnerType === "company" && !rest.companyName?.trim()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Company name is required for company partners." });
    }
    const existing = await ctx.db
      .query("partnerApplications")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      if (existing.status === "pending") {
        throw new ConvexError({
          code: "CONFLICT",
          message: "You already have a pending application. Please wait for a response.",
        });
      }
      if (existing.status === "approved") {
        throw new ConvexError({
          code: "CONFLICT",
          message: "This email is already registered as an approved partner.",
        });
      }
      // rejected — delete the old record so they can apply fresh
      await ctx.db.delete(existing._id);
    }

    // Resolve Diaspora campaign attribution — a stale/unknown/closed code is
    // never fatal; the application still goes through without attribution.
    let diasporaCampaignId: Id<"diasporaCampaigns"> | undefined;
    if (campaignCode) {
      const campaign = await ctx.db
        .query("diasporaCampaigns")
        .withIndex("by_code", (q) => q.eq("code", campaignCode.trim().toUpperCase()))
        .first();
      if (campaign && campaignAcceptsLeads(campaign)) {
        diasporaCampaignId = campaign._id;
        await ctx.db.patch(campaign._id, { leadCount: campaign.leadCount + 1 });
      }
    }

    const id = await ctx.db.insert("partnerApplications", {
      ...rest,
      status: "pending",
      diasporaCampaignId,
    });

    // Alert admins/managers of new partner application
    await ctx.scheduler.runAfter(0, internal.emails.sendAdminNewPartnerApplicationAlert, {
      to: await ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      adminPhones: await ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      fullName: args.companyName ? `${args.companyName} (${args.fullName})` : args.fullName,
      email: args.email,
      phone: args.phone,
    });

    return id;
  },
});

// ── ADMIN: list applications ──────────────────────────────────────────────────

export const listApplications = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const user = await resolveUser(ctx);
    if (!user || !isAdminRole(user.role ?? "")) return [];

    if (args.status) {
      return await ctx.db
        .query("partnerApplications")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("partnerApplications").order("desc").collect();
  },
});

export const listApplicationsPaginated = query({
  args: { status: v.optional(v.string()), search: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await resolveUser(ctx);
    if (!user || !isAdminRole(user.role ?? "")) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const results = await (args.search?.trim()
      ? ctx.db
          .query("partnerApplications")
          .withSearchIndex("search_fullName", (q) => {
            let query = q.search("fullName", args.search!);
            if (args.status && args.status !== "all") query = query.eq("status", args.status);
            return query;
          })
          .paginate(args.paginationOpts)
      : args.status && args.status !== "all"
        ? ctx.db
            .query("partnerApplications")
            .withIndex("by_status", (q) => q.eq("status", args.status!))
            .order("desc")
            .paginate(args.paginationOpts)
        : ctx.db.query("partnerApplications").order("desc").paginate(args.paginationOpts));

    const page = await Promise.all(
      results.page.map(async (app) => {
        const campaign = app.diasporaCampaignId ? await ctx.db.get(app.diasporaCampaignId) : null;
        return { ...app, diasporaCampaignName: campaign?.name };
      }),
    );

    return { ...results, page };
  },
});

export const countPendingApplications = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const results = await ctx.db
      .query("partnerApplications")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return results.length;
  },
});

// ── ADMIN: approve / reject application ──────────────────────────────────────

export const approveApplication = mutation({
  args: {
    applicationId: v.id("partnerApplications"),
    commissionRate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const admin = await requireAdminCtx(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ code: "NOT_FOUND", message: "Application not found" });
    if (app.status !== "pending")
      throw new ConvexError({ code: "BAD_REQUEST", message: "Application is not pending" });

    // Generate unique referral code
    // Company partners get a code from the company name, not the contact person
    const codeName = app.companyName || app.fullName;
    let referralCode = generateReferralCode(codeName);
    // ensure uniqueness
    let attempt = 0;
    while (
      await ctx.db
        .query("partners")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
        .first()
    ) {
      referralCode = generateReferralCode(codeName + attempt);
      attempt++;
    }

    // Create partner record
    const partnerId = await ctx.db.insert("partners", {
      fullName: app.fullName,
      email: app.email,
      phone: app.phone,
      whatsapp: app.whatsapp,
      address: app.address,
      partnerType: app.partnerType ?? "individual",
      companyName: app.companyName,
      rcNumber: app.rcNumber,
      companyWebsite: app.companyWebsite,
      contactRole: app.contactRole,
      bankName: app.bankName,
      bankAccount: app.bankAccount,
      bankAccountName: app.bankAccountName,
      referralCode,
      commissionRate: args.commissionRate,
      status: "approved",
      applicationId: args.applicationId,
      totalReferrals: 0,
      totalCommissionEarned: 0,
      approvedBy: admin._id,
      approvedAt: new Date().toISOString(),
      notes: args.notes,
    });

    // Update application
    await ctx.db.patch(args.applicationId, {
      status: "approved",
      reviewedBy: admin._id,
      reviewedAt: new Date().toISOString(),
      reviewNotes: args.notes,
      commissionRate: args.commissionRate,
      partnerId,
    });

    // Notify applicant of approval
    await ctx.scheduler.runAfter(0, internal.emails.sendPartnerApplicationDecisionEmail, {
      to: app.email,
      phone: app.phone,
      name: app.companyName || app.fullName,
      approved: true,
      referralCode,
      commissionRate: args.commissionRate,
    });
  },
});

export const rejectApplication = mutation({
  args: {
    applicationId: v.id("partnerApplications"),
    notes: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const admin = await requireAdminCtx(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ code: "NOT_FOUND", message: "Application not found" });
    await ctx.db.patch(args.applicationId, {
      status: "rejected",
      reviewedBy: admin._id,
      reviewedAt: new Date().toISOString(),
      reviewNotes: args.notes,
    });

    // Notify applicant of rejection
    await ctx.scheduler.runAfter(0, internal.emails.sendPartnerApplicationDecisionEmail, {
      to: app.email,
      phone: app.phone,
      name: app.fullName,
      approved: false,
      reason: args.notes,
    });
  },
});

// ── ADMIN: list all partners ──────────────────────────────────────────────────

export const listPartners = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const user = await resolveUser(ctx);
    if (!user || !isAdminRole(user.role ?? "")) return [];

    if (args.status) {
      return await ctx.db
        .query("partners")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("partners").order("desc").collect();
  },
});

export const listPartnersPaginated = query({
  args: { status: v.optional(v.string()), search: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await resolveUser(ctx);
    if (!user || !isAdminRole(user.role ?? "")) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    if (args.search?.trim()) {
      return await ctx.db
        .query("partners")
        .withSearchIndex("search_fullName", (q) => {
          let query = q.search("fullName", args.search!);
          if (args.status && args.status !== "all") query = query.eq("status", args.status);
          return query;
        })
        .paginate(args.paginationOpts);
    }

    if (args.status && args.status !== "all") {
      return await ctx.db
        .query("partners")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("partners").order("desc").paginate(args.paginationOpts);
  },
});

export const deletePartner = mutation({
  args: { partnerId: v.id("partners") },
  handler: async (ctx, args): Promise<void> => {
    await requireAdminCtx(ctx);
    const partner = await ctx.db.get(args.partnerId);
    if (!partner) throw new ConvexError({ code: "NOT_FOUND", message: "Partner not found" });
    // Delete related referrals and commissions
    const referrals = await ctx.db
      .query("partnerReferrals")
      .withIndex("by_partner", (q) => q.eq("partnerId", args.partnerId))
      .take(500);
    for (const r of referrals) await ctx.db.delete(r._id);
    const commissions = await ctx.db
      .query("partnerCommissions")
      .withIndex("by_partner", (q) => q.eq("partnerId", args.partnerId))
      .take(500);
    for (const c of commissions) await ctx.db.delete(c._id);
    // Also delete the linked partnerApplications record so the email is freed
    if (partner.email) {
      const application = await ctx.db
        .query("partnerApplications")
        .withIndex("by_email", (q) => q.eq("email", partner.email as string))
        .first();
      if (application) await ctx.db.delete(application._id);
    }
    await ctx.db.delete(args.partnerId);
  },
});


export const updatePartner = mutation({
  args: {
    partnerId: v.id("partners"),
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
    commissionRate: v.optional(v.number()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    bankName: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
    suspendReason: v.optional(v.string()),
    partnerType: v.optional(v.union(v.literal("individual"), v.literal("company"))),
    companyName: v.optional(v.string()),
    rcNumber: v.optional(v.string()),
    companyWebsite: v.optional(v.string()),
    contactRole: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await requireAdminCtx(ctx);
    const { partnerId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(partnerId, filtered);
  },
});

// ── ADMIN: get partner referrals ──────────────────────────────────────────────
export const getPartnerReferrals = query({
  args: { partnerId: v.id("partners") },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const user = await resolveUser(ctx);
    if (!user || !isAdminRole(user.role ?? "")) return [];
    return await ctx.db.query("partnerReferrals")
      .withIndex("by_partner", (q) => q.eq("partnerId", args.partnerId))
      .order("desc")
      .take(200);
  },
});

// ── ADMIN: get commissions for a specific partner ─────────────────────────────
export const getPartnerCommissions = query({
  args: { partnerId: v.id("partners") },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const user = await resolveUser(ctx);
    if (!user || !isAdminRole(user.role ?? "")) return [];
    return await ctx.db.query("partnerCommissions")
      .withIndex("by_partner", (q) => q.eq("partnerId", args.partnerId))
      .order("desc")
      .take(200);
  },
});

// ── ADMIN: void a commission ──────────────────────────────────────────────────
export const voidCommission = mutation({
  args: {
    commissionId: v.id("partnerCommissions"),
    reason: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    await requireAdminCtx(ctx);
    const commission = await ctx.db.get(args.commissionId);
    if (!commission) throw new ConvexError({ code: "NOT_FOUND", message: "Commission not found" });
    if (commission.status === "paid") {
      // Reverse the totalCommissionEarned on the partner
      const partner = await ctx.db.get(commission.partnerId);
      if (partner) {
        await ctx.db.patch(commission.partnerId, {
          totalCommissionEarned: Math.max(0, partner.totalCommissionEarned - commission.commissionAmount),
        });
      }
    }
    await ctx.db.patch(args.commissionId, { status: "voided", voidReason: args.reason });
  },
});

// ── STAFF-AS-PARTNER: enroll current user as partner ─────────────────────────

export const enrollSelfAsPartner = mutation({
  args: {
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    bankName: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    if (!["super_admin", "admin", "manager", "agent"].includes(user.role ?? ""))
      throw new ConvexError({ code: "FORBIDDEN", message: "Staff only" });

    // Check already enrolled
    const existing = await ctx.db
      .query("partners")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) throw new ConvexError({ code: "CONFLICT", message: "Already enrolled as partner" });

    let referralCode = generateReferralCode(user.name ?? "Partner");
    let attempt = 0;
    while (
      await ctx.db
        .query("partners")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
        .first()
    ) {
      referralCode = generateReferralCode((user.name ?? "Partner") + attempt);
      attempt++;
    }

    await ctx.db.insert("partners", {
      userId: user._id,
      fullName: user.name ?? "Staff Partner",
      email: user.email ?? "",
      phone: args.phone,
      whatsapp: args.whatsapp,
      bankName: args.bankName,
      bankAccount: args.bankAccount,
      bankAccountName: args.bankAccountName,
      referralCode,
      commissionRate: 5, // default 5% for staff
      status: "approved", // staff are auto-approved
      totalReferrals: 0,
      totalCommissionEarned: 0,
      isStaff: true,
    });
  },
});

// ── PARTNER: get own profile ──────────────────────────────────────────────────

export const getMyPartnerProfile = query({
  args: {},
  handler: async (ctx): Promise<Record<string, unknown> | null> => {
    return await findMyPartner(ctx);
  },
});

/** The partner record for the signed-in user (by linked userId, else by email). */
export async function findMyPartner(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await resolveUser(ctx);

  // Primary: match by userId (staff-enrolled partners or previously linked)
  if (user) {
    const byUser = await ctx.db
      .query("partners")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (byUser) return byUser;
  }

  // Fallback: approved external partners may not have userId set yet —
  // find by the email on their auth identity or user record
  const email = identity.email ?? user?.email;
  if (email) {
    return await ctx.db
      .query("partners")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  }
  return null;
}

// ── REFERRAL: track a click ───────────────────────────────────────────────────

export const trackReferralClick = mutation({
  args: {
    referralCode: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    resourceTitle: v.string(),
  },
  handler: async (ctx, args): Promise<{ partnerId: string; phone: string } | null> => {
    const partner = await ctx.db
      .query("partners")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode))
      .unique();
    if (!partner || partner.status !== "approved") return null;

    await ctx.db.insert("partnerReferrals", {
      partnerId: partner._id,
      referralCode: args.referralCode,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      resourceTitle: args.resourceTitle,
      status: "click",
    });

    // Increment counter
    await ctx.db.patch(partner._id, {
      totalReferrals: partner.totalReferrals + 1,
    });

    return { partnerId: partner._id, phone: partner.phone };
  },
});

// resolve partner info by referral code (public — used to show partner phone)
export const getPartnerByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args): Promise<{ fullName: string; phone: string; whatsapp: string | undefined } | null> => {
    const partner = await ctx.db
      .query("partners")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", args.code))
      .unique();
    if (!partner || partner.status !== "approved") return null;
    return { fullName: partner.fullName, phone: partner.phone, whatsapp: partner.whatsapp };
  },
});

// ── PARTNER: own referrals & commissions ─────────────────────────────────────

export const getMyReferrals = query({
  args: {},
  handler: async (ctx): Promise<Array<Record<string, unknown>>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await resolveUser(ctx);

    // Find partner by userId first, then fall back to email
    let partner = user
      ? await ctx.db.query("partners").withIndex("by_user", (q) => q.eq("userId", user._id)).first()
      : null;
    if (!partner) {
      const email = identity.email ?? user?.email;
      if (email) {
        partner = await ctx.db.query("partners").withIndex("by_email", (q) => q.eq("email", email)).first();
      }
    }
    if (!partner) return [];

    return await ctx.db
      .query("partnerReferrals")
      .withIndex("by_partner", (q) => q.eq("partnerId", partner._id))
      .order("desc")
      .take(100);
  },
});

export const getMyCommissions = query({
  args: {},
  handler: async (ctx): Promise<Array<Record<string, unknown>>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await resolveUser(ctx);

    // Find partner by userId first, then fall back to email
    let partner = user
      ? await ctx.db.query("partners").withIndex("by_user", (q) => q.eq("userId", user._id)).first()
      : null;
    if (!partner) {
      const email = identity.email ?? user?.email;
      if (email) {
        partner = await ctx.db.query("partners").withIndex("by_email", (q) => q.eq("email", email)).first();
      }
    }
    if (!partner) return [];

    return await ctx.db
      .query("partnerCommissions")
      .withIndex("by_partner", (q) => q.eq("partnerId", partner._id))
      .order("desc")
      .take(100);
  },
});

// ── ADMIN: commission management ─────────────────────────────────────────────

export const listAllCommissions = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const user = await resolveUser(ctx);
    if (!user || !isAdminRole(user.role ?? "")) return [];

    if (args.status) {
      return await ctx.db
        .query("partnerCommissions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("partnerCommissions").order("desc").collect();
  },
});

export const listAllCommissionsPaginated = query({
  args: { status: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await resolveUser(ctx);
    if (!user || !isAdminRole(user.role ?? "")) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const results = await (args.status && args.status !== "all"
      ? ctx.db
          .query("partnerCommissions")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .paginate(args.paginationOpts)
      : ctx.db.query("partnerCommissions").order("desc").paginate(args.paginationOpts));

    const page = await Promise.all(
      results.page.map(async (c) => {
        const partner = await ctx.db.get(c.partnerId);
        return { ...c, partnerName: partner?.fullName ?? "—" };
      }),
    );

    return { ...results, page };
  },
});

export const createCommission = mutation({
  args: {
    partnerId: v.id("partners"),
    description: v.string(),
    saleAmount: v.number(),
    referralId: v.optional(v.id("partnerReferrals")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await requireAdminCtx(ctx);
    const partner = await ctx.db.get(args.partnerId);
    if (!partner) throw new ConvexError({ code: "NOT_FOUND", message: "Partner not found" });
    const commissionAmount = (args.saleAmount * partner.commissionRate) / 100;
    await ctx.db.insert("partnerCommissions", {
      partnerId: args.partnerId,
      referralId: args.referralId,
      description: args.description,
      saleAmount: args.saleAmount,
      commissionRate: partner.commissionRate,
      commissionAmount,
      status: "pending",
      notes: args.notes,
    });
  },
});

export const updateCommissionStatus = mutation({
  args: {
    commissionId: v.id("partnerCommissions"),
    status: v.string(), // "approved" | "paid"
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const admin = await requireAdminCtx(ctx);
    const commission = await ctx.db.get(args.commissionId);
    if (!commission) throw new ConvexError({ code: "NOT_FOUND", message: "Commission not found" });

    const typedUpdates: {
      status: string;
      approvedBy: typeof admin._id;
      notes: string | undefined;
      paidAt?: string;
    } = {
      status: args.status,
      approvedBy: admin._id,
      notes: args.notes ?? commission.notes,
    };
    if (args.status === "paid") {
      typedUpdates.paidAt = new Date().toISOString();
      // Update partner total
      const partner = await ctx.db.get(commission.partnerId);
      if (partner) {
        await ctx.db.patch(commission.partnerId, {
          totalCommissionEarned: partner.totalCommissionEarned + commission.commissionAmount,
        });
      }
    }
    await ctx.db.patch(args.commissionId, typedUpdates);
  },
});

// ── INTERNAL: link partner record to user on sign-in ─────────────────────────
export const linkPartnerToUser = internalMutation({
  args: { email: v.string(), userId: v.id("users") },
  handler: async (ctx, args): Promise<void> => {
    const partner = await ctx.db
      .query("partners")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (partner && !partner.userId) {
      await ctx.db.patch(partner._id, { userId: args.userId });
    }
  },
});
