import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { internal } from "./_generated/api.js";
import { findMyPartner, requireAdminCtx } from "./partners.ts";
import { computeListed, getProfileByPartner } from "./partnerProfiles.ts";
import {
  addDays,
  contractStatus,
  daysBetween,
  dueReminderTier,
  EXPIRING_WINDOW_DAYS,
  isCalendarDate,
  tiersCoveredBy,
  todayLagos,
} from "./partnerContractUtils.ts";

const MAX_GRACE_DAYS = 90;
const AUTO_DELIST_BATCH = 50;
const REMINDER_SCAN_LIMIT = 300;

type EmailKind = "reminder" | "extended" | "delisted" | "auto_delisted" | "relisted";

// ── helpers ─────────────────────────────────────────────────────────────────

async function getContract(ctx: QueryCtx | MutationCtx, partnerId: Id<"partners">) {
  return await ctx.db
    .query("partnerContracts")
    .withIndex("by_partner", (q) => q.eq("partnerId", partnerId))
    .unique();
}

async function logEvent(
  ctx: MutationCtx,
  event: Omit<Doc<"partnerContractEvents">, "_id" | "_creationTime" | "at">,
) {
  await ctx.db.insert("partnerContractEvents", { ...event, at: new Date().toISOString() });
}

function partnerName(p: Doc<"partners">) {
  return p.companyName || p.fullName;
}

async function queueEmail(
  ctx: MutationCtx,
  partner: Doc<"partners">,
  kind: EmailKind,
  extra: { endDate: string; newEndDate?: string; daysLeft?: number; reason?: string },
  teamEmails: string[] = [],
) {
  await ctx.scheduler.runAfter(0, internal.partnerContractEmails.sendPartnerContractEmail, {
    kind,
    partnerEmail: partner.email || undefined,
    partnerName: partnerName(partner),
    teamEmails,
    ...extra,
  });
}

/** Hide (or show again) the partner's public listing, keeping `listed` in sync. */
async function setDelisted(
  ctx: MutationCtx,
  partnerId: Id<"partners">,
  delisted: boolean,
  meta: { source?: "manual" | "auto"; reason?: string; by?: Id<"users"> } = {},
) {
  const profile = await getProfileByPartner(ctx, partnerId);
  if (!profile) return false;
  const patch = delisted
    ? {
        delisted: true,
        delistSource: meta.source,
        delistReason: meta.reason,
        delistedAt: new Date().toISOString(),
        delistedBy: meta.by,
      }
    : { delisted: false, delistSource: undefined, delistReason: undefined, delistedAt: undefined, delistedBy: undefined };
  await ctx.db.patch(profile._id, { ...patch, listed: computeListed({ ...profile, delisted }) });
  return true;
}

function validateDates(startDate: string, endDate: string) {
  if (!isCalendarDate(startDate) || !isCalendarDate(endDate)) {
    throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter valid dates." });
  }
  if (endDate <= startDate) {
    throw new ConvexError({ code: "BAD_REQUEST", message: "The end date must be after the start date." });
  }
}

function validateGrace(graceDays: number) {
  if (!Number.isInteger(graceDays) || graceDays < 0 || graceDays > MAX_GRACE_DAYS) {
    throw new ConvexError({ code: "BAD_REQUEST", message: `Grace period must be 0–${MAX_GRACE_DAYS} days.` });
  }
}

async function requirePartner(ctx: MutationCtx, partnerId: Id<"partners">) {
  const partner = await ctx.db.get(partnerId);
  if (!partner) throw new ConvexError({ code: "NOT_FOUND", message: "Partner not found." });
  return partner;
}

async function presentContract(ctx: QueryCtx, c: Doc<"partnerContracts">) {
  const today = todayLagos();
  return {
    _id: c._id,
    startDate: c.startDate,
    endDate: c.endDate,
    graceDays: c.graceDays,
    autoDelist: c.autoDelist,
    delistOn: c.delistOn,
    notes: c.notes ?? null,
    agreementFileName: c.agreementFileName ?? null,
    agreementUrl: c.agreementStorageId ? await ctx.storage.getUrl(c.agreementStorageId) : null,
    status: contractStatus(c.endDate, today),
    daysLeft: daysBetween(today, c.endDate),
  };
}

// ── ADMIN ───────────────────────────────────────────────────────────────────

export const generateAgreementUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    await requireAdminCtx(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Contract, listing state and full history for the admin partner drawer. */
export const getForPartner = query({
  args: { partnerId: v.id("partners") },
  handler: async (ctx, args) => {
    await requireAdminCtx(ctx);
    const [contract, profile, events] = await Promise.all([
      getContract(ctx, args.partnerId),
      getProfileByPartner(ctx, args.partnerId),
      ctx.db
        .query("partnerContractEvents")
        .withIndex("by_partner", (q) => q.eq("partnerId", args.partnerId))
        .order("desc")
        .take(50),
    ]);
    const names = new Map<Id<"users">, string>();
    for (const e of events) {
      if (e.byUserId && !names.has(e.byUserId)) {
        const u = await ctx.db.get(e.byUserId);
        names.set(e.byUserId, u?.name || u?.email || "Staff");
      }
    }
    return {
      contract: contract ? await presentContract(ctx, contract) : null,
      hasProfile: !!profile,
      delisted: profile?.delisted ?? false,
      delistSource: profile?.delistSource ?? null,
      delistReason: profile?.delistReason ?? null,
      delistedAt: profile?.delistedAt ?? null,
      events: events.map((e) => ({
        _id: e._id,
        type: e.type,
        fromEndDate: e.fromEndDate ?? null,
        toEndDate: e.toEndDate ?? null,
        reason: e.reason ?? null,
        at: e.at,
        by: e.byUserId ? (names.get(e.byUserId) ?? "Staff") : "Automatic",
      })),
    };
  },
});

/** Create or edit the partnership agreement. */
export const saveContract = mutation({
  args: {
    partnerId: v.id("partners"),
    startDate: v.string(),
    endDate: v.string(),
    graceDays: v.number(),
    autoDelist: v.boolean(),
    notes: v.optional(v.string()),
    agreementStorageId: v.optional(v.id("_storage")),
    agreementFileName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireAdminCtx(ctx);
    await requirePartner(ctx, args.partnerId);
    validateDates(args.startDate, args.endDate);
    validateGrace(args.graceDays);

    const existing = await getContract(ctx, args.partnerId);
    const fields = {
      startDate: args.startDate,
      endDate: args.endDate,
      graceDays: args.graceDays,
      autoDelist: args.autoDelist,
      delistOn: addDays(args.endDate, args.graceDays),
      // The daily job double-checks the listing state, so this is safe to set on every save
      autoDelistPending: args.autoDelist,
      notes: args.notes?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      // Swap the agreement file only when a new one was uploaded
      if (args.agreementStorageId && existing.agreementStorageId && existing.agreementStorageId !== args.agreementStorageId) {
        await ctx.storage.delete(existing.agreementStorageId);
      }
      await ctx.db.patch(existing._id, {
        ...fields,
        // A new end date restarts the reminder schedule
        remindersSent: existing.endDate === args.endDate ? existing.remindersSent : [],
        ...(args.agreementStorageId
          ? { agreementStorageId: args.agreementStorageId, agreementFileName: args.agreementFileName }
          : {}),
      });
      await logEvent(ctx, {
        partnerId: args.partnerId,
        type: "updated",
        fromEndDate: existing.endDate !== args.endDate ? existing.endDate : undefined,
        toEndDate: existing.endDate !== args.endDate ? args.endDate : undefined,
        byUserId: admin._id,
      });
    } else {
      await ctx.db.insert("partnerContracts", {
        partnerId: args.partnerId,
        ...fields,
        remindersSent: [],
        agreementStorageId: args.agreementStorageId,
        agreementFileName: args.agreementFileName,
      });
      await logEvent(ctx, { partnerId: args.partnerId, type: "created", toEndDate: args.endDate, byUserId: admin._id });
    }
    return null;
  },
});

/** Extend/renew: new end date, history kept, listing restored if it was auto-delisted. */
export const extendContract = mutation({
  args: { partnerId: v.id("partners"), newEndDate: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireAdminCtx(ctx);
    const partner = await requirePartner(ctx, args.partnerId);
    const contract = await getContract(ctx, args.partnerId);
    if (!contract) throw new ConvexError({ code: "NOT_FOUND", message: "Add a contract before extending it." });
    if (!isCalendarDate(args.newEndDate) || args.newEndDate <= contract.endDate) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "The new end date must be later than the current one." });
    }
    if (args.newEndDate < todayLagos()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "The new end date must be in the future." });
    }

    await ctx.db.patch(contract._id, {
      endDate: args.newEndDate,
      delistOn: addDays(args.newEndDate, contract.graceDays),
      autoDelistPending: contract.autoDelist,
      remindersSent: [],
      updatedAt: new Date().toISOString(),
    });
    await logEvent(ctx, {
      partnerId: args.partnerId,
      type: "extended",
      fromEndDate: contract.endDate,
      toEndDate: args.newEndDate,
      reason: args.note?.trim() || undefined,
      byUserId: admin._id,
    });

    // Only undo an automatic (expiry) delist — a manual delist stays until an admin relists
    const profile = await getProfileByPartner(ctx, args.partnerId);
    if (profile?.delisted && profile.delistSource === "auto") {
      await setDelisted(ctx, args.partnerId, false);
      await logEvent(ctx, { partnerId: args.partnerId, type: "relisted", reason: "Contract extended", byUserId: admin._id });
    }
    await queueEmail(ctx, partner, "extended", { endDate: contract.endDate, newEndDate: args.newEndDate });
    return null;
  },
});

/** Manually hide the partner's logo and profile. Dashboard and earnings are unaffected. */
export const delistPartner = mutation({
  args: { partnerId: v.id("partners"), reason: v.string(), notifyPartner: v.boolean() },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireAdminCtx(ctx);
    const partner = await requirePartner(ctx, args.partnerId);
    const reason = args.reason.trim();
    if (!reason) throw new ConvexError({ code: "BAD_REQUEST", message: "Please give a reason." });
    const done = await setDelisted(ctx, args.partnerId, true, { source: "manual", reason, by: admin._id });
    if (!done) throw new ConvexError({ code: "NOT_FOUND", message: "This partner has no showcase profile to delist." });
    await logEvent(ctx, { partnerId: args.partnerId, type: "delisted", reason, byUserId: admin._id });
    if (args.notifyPartner) {
      const contract = await getContract(ctx, args.partnerId);
      await queueEmail(ctx, partner, "delisted", { endDate: contract?.endDate ?? todayLagos(), reason });
    }
    return null;
  },
});

export const relistPartner = mutation({
  args: { partnerId: v.id("partners"), notifyPartner: v.boolean() },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireAdminCtx(ctx);
    const partner = await requirePartner(ctx, args.partnerId);
    const done = await setDelisted(ctx, args.partnerId, false);
    if (!done) throw new ConvexError({ code: "NOT_FOUND", message: "This partner has no showcase profile." });
    // Relisting while expired is an explicit admin override — stop the daily job re-delisting
    const contract = await getContract(ctx, args.partnerId);
    if (contract && contract.delistOn <= todayLagos()) {
      await ctx.db.patch(contract._id, { autoDelistPending: false });
    }
    await logEvent(ctx, { partnerId: args.partnerId, type: "relisted", byUserId: admin._id });
    if (args.notifyPartner) await queueEmail(ctx, partner, "relisted", { endDate: contract?.endDate ?? todayLagos() });
    return null;
  },
});

const filterValidator = v.union(v.literal("all"), v.literal("expiring"), v.literal("expired"));

/** Admin contracts overview with "Expiring soon" / "Expired" filters. */
export const listContracts = query({
  args: { filter: filterValidator },
  handler: async (ctx, args) => {
    await requireAdminCtx(ctx);
    const today = todayLagos();
    const base = ctx.db.query("partnerContracts");
    const rows =
      args.filter === "expiring"
        ? await base
            .withIndex("by_end_date", (q) => q.gte("endDate", today).lte("endDate", addDays(today, EXPIRING_WINDOW_DAYS)))
            .take(200)
        : args.filter === "expired"
          ? await base.withIndex("by_end_date", (q) => q.lt("endDate", today)).order("desc").take(200)
          : await base.withIndex("by_end_date").take(300);

    return await Promise.all(
      rows.map(async (c) => {
        const [partner, profile] = await Promise.all([ctx.db.get(c.partnerId), getProfileByPartner(ctx, c.partnerId)]);
        return {
          ...(await presentContract(ctx, c)),
          partnerId: c.partnerId,
          partnerName: partner ? partnerName(partner) : "Unknown partner",
          partnerStatus: partner?.status ?? "unknown",
          delisted: profile?.delisted ?? false,
          listed: profile?.listed ?? false,
        };
      }),
    );
  },
});

export const countExpiringSoon = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    await requireAdminCtx(ctx);
    const today = todayLagos();
    const rows = await ctx.db
      .query("partnerContracts")
      .withIndex("by_end_date", (q) => q.gte("endDate", today).lte("endDate", addDays(today, EXPIRING_WINDOW_DAYS)))
      .take(100);
    return rows.length;
  },
});

// ── PARTNER ─────────────────────────────────────────────────────────────────

export const getMyContract = query({
  args: {},
  handler: async (ctx) => {
    const partner = await findMyPartner(ctx);
    if (!partner) return null;
    const [contract, profile] = await Promise.all([getContract(ctx, partner._id), getProfileByPartner(ctx, partner._id)]);
    if (!contract) return null;
    const today = todayLagos();
    return {
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contractStatus(contract.endDate, today),
      daysLeft: daysBetween(today, contract.endDate),
      delisted: profile?.delisted ?? false,
      delistReason: profile?.delistReason ?? null,
    };
  },
});

// ── DAILY JOB ───────────────────────────────────────────────────────────────

/**
 * Runs once a day: delists partners whose contract + grace period has passed, then
 * sends 30/7/1-day expiry reminders. Reads only open work via tight index ranges.
 */
export const runDailyContractCheck = internalMutation({
  args: { today: v.optional(v.string()) },
  handler: async (ctx, args): Promise<null> => {
    const today = args.today ?? todayLagos();

    // 1) Automatic delists that are now due
    const due = await ctx.db
      .query("partnerContracts")
      .withIndex("by_auto_delist_pending_and_delist_on", (q) => q.eq("autoDelistPending", true).lte("delistOn", today))
      .take(AUTO_DELIST_BATCH);

    let teamEmails: string[] | null = null;
    const getTeam = async () => (teamEmails ??= await ctx.runQuery(internal.admin.getStaffAlertEmails, {}));

    for (const c of due) {
      await ctx.db.patch(c._id, { autoDelistPending: false });
      const [partner, profile] = await Promise.all([ctx.db.get(c.partnerId), getProfileByPartner(ctx, c.partnerId)]);
      if (!partner || !profile || profile.delisted) continue; // nothing listed to remove
      await setDelisted(ctx, c.partnerId, true, { source: "auto", reason: "Contract expired" });
      await logEvent(ctx, { partnerId: c.partnerId, type: "auto_delisted", reason: "Contract expired", fromEndDate: c.endDate });
      await queueEmail(ctx, partner, "auto_delisted", { endDate: c.endDate }, await getTeam());
    }
    if (due.length === AUTO_DELIST_BATCH) {
      // More due than one batch: continue with the same cutoff
      await ctx.scheduler.runAfter(0, internal.partnerContracts.runDailyContractCheck, { today });
      return null;
    }

    // 2) Expiry reminders for contracts ending within the next 30 days
    const upcoming = await ctx.db
      .query("partnerContracts")
      .withIndex("by_end_date", (q) => q.gte("endDate", today).lte("endDate", addDays(today, EXPIRING_WINDOW_DAYS)))
      .take(REMINDER_SCAN_LIMIT);

    for (const c of upcoming) {
      const daysLeft = daysBetween(today, c.endDate);
      const tier = dueReminderTier(daysLeft, c.remindersSent);
      if (tier === null) continue;
      const partner = await ctx.db.get(c.partnerId);
      await ctx.db.patch(c._id, { remindersSent: [...new Set([...c.remindersSent, ...tiersCoveredBy(tier)])] });
      if (!partner || partner.status !== "approved") continue;
      await queueEmail(ctx, partner, "reminder", { endDate: c.endDate, daysLeft }, await getTeam());
    }
    return null;
  },
});
