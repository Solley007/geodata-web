import { v, ConvexError } from "convex/values";
import { internalQuery, internalMutation, query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id, TableNames } from "./_generated/dataModel.d.ts";

// ── V8-runtime internal helpers for the Backup & Recovery Center ───────────
// Kept separate from backup.ts ("use node") since queries/mutations must run
// in the default Convex runtime.

async function resolveUser(ctx: QueryCtx | MutationCtx, tokenIdentifier: string, email?: string) {
  const byToken = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
  if (byToken) return byToken;
  if (email) {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  }
  return null;
}

async function requireSuperAdminCtx(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  const user = await resolveUser(ctx, identity.tokenIdentifier, identity.email);
  if (!user || user.role !== "super_admin") {
    throw new ConvexError({ message: "Super admin access required", code: "FORBIDDEN" });
  }
  return user;
}

export const resolveUserByIdentity = internalQuery({
  args: { tokenIdentifier: v.string(), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await resolveUser(ctx, args.tokenIdentifier, args.email);
  },
});

// ── Public queries for the admin UI ──────────────────────────────────────────

export const listBackupJobs = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdminCtx(ctx);
    return await ctx.db.query("backupJobs").withIndex("by_startedAt").order("desc").take(50);
  },
});

export const listRestoreJobs = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdminCtx(ctx);
    return await ctx.db.query("restoreJobs").withIndex("by_startedAt").order("desc").take(50);
  },
});

export const getBackupStats = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdminCtx(ctx);
    const jobs = await ctx.db.query("backupJobs").withIndex("by_startedAt").order("desc").take(200);
    const completed = jobs.filter((j) => j.status === "completed");
    const lastCompleted = completed[0];
    return {
      total: jobs.length,
      completed: completed.length,
      failed: jobs.filter((j) => j.status === "failed").length,
      running: jobs.filter((j) => j.status === "running").length,
      lastBackupAt: lastCompleted?.completedAt ?? null,
      lastBackupRecords: lastCompleted?.totalRecords ?? null,
      totalStorageBytes: completed.reduce((sum, j) => sum + (j.fileSizeBytes ?? 0), 0),
    };
  },
});

// ── External backup destinations ─────────────────────────────────────────────

export const listDestinations = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdminCtx(ctx);
    return await ctx.db.query("backupDestinations").collect();
  },
});

export const getEnabledDestinations = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("backupDestinations")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();
  },
});

export const upsertDestination = mutation({
  args: {
    destinationId: v.optional(v.id("backupDestinations")),
    provider: v.union(v.literal("s3"), v.literal("dropbox"), v.literal("gdrive"), v.literal("email")),
    label: v.string(),
    enabled: v.boolean(),
    config: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminCtx(ctx);
    if (args.destinationId) {
      await ctx.db.patch(args.destinationId, {
        label: args.label,
        enabled: args.enabled,
        config: args.config,
      });
      return args.destinationId;
    }
    return await ctx.db.insert("backupDestinations", {
      provider: args.provider,
      label: args.label,
      enabled: args.enabled,
      config: args.config,
      createdAt: new Date().toISOString(),
    });
  },
});

export const deleteDestination = mutation({
  args: { destinationId: v.id("backupDestinations") },
  handler: async (ctx, args) => {
    await requireSuperAdminCtx(ctx);
    await ctx.db.delete(args.destinationId);
  },
});

export const recordDestinationSync = internalMutation({
  args: {
    destinationId: v.id("backupDestinations"),
    backupJobId: v.id("backupJobs"),
    provider: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const syncedAt = new Date().toISOString();
    await ctx.db.patch(args.destinationId, {
      lastSyncAt: syncedAt,
      lastSyncStatus: args.status,
      lastSyncError: args.status === "failed" ? args.detail : undefined,
    });
    await ctx.db.insert("backupSyncLogs", {
      backupJobId: args.backupJobId,
      destinationId: args.destinationId,
      provider: args.provider,
      status: args.status,
      detail: args.detail,
      syncedAt,
    });
  },
});

export const listSyncLogsForJob = query({
  args: { backupJobId: v.id("backupJobs") },
  handler: async (ctx, args) => {
    await requireSuperAdminCtx(ctx);
    return await ctx.db
      .query("backupSyncLogs")
      .withIndex("by_backupJob", (q) => q.eq("backupJobId", args.backupJobId))
      .collect();
  },
});

// ── Ref generators ───────────────────────────────────────────────────────────

export const nextBackupRef = internalMutation({
  args: {},
  handler: async (ctx) => {
    const last = await ctx.db.query("backupJobs").order("desc").first();
    const n = last ? parseInt(last.jobRef.replace("GWS-BAK-", "") || "0", 10) + 1 : 1;
    return `GWS-BAK-${String(n).padStart(4, "0")}`;
  },
});

export const nextRestoreRef = internalMutation({
  args: {},
  handler: async (ctx) => {
    const last = await ctx.db.query("restoreJobs").order("desc").first();
    const n = last ? parseInt(last.restoreRef.replace("GWS-RST-", "") || "0", 10) + 1 : 1;
    return `GWS-RST-${String(n).padStart(4, "0")}`;
  },
});

// ── Backup job lifecycle ─────────────────────────────────────────────────────

export const createBackupJob = internalMutation({
  args: {
    jobRef: v.string(),
    type: v.union(v.literal("manual"), v.literal("scheduled")),
    tables: v.array(v.string()),
    createdBy: v.optional(v.string()),
    createdByName: v.optional(v.string()),
    startedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("backupJobs", {
      jobRef: args.jobRef,
      type: args.type,
      status: "running",
      tables: args.tables,
      createdBy: args.createdBy as Id<"users"> | undefined,
      createdByName: args.createdByName,
      startedAt: args.startedAt,
    });
    return id;
  },
});

export const completeBackupJob = internalMutation({
  args: {
    jobId: v.id("backupJobs"),
    storageId: v.id("_storage"),
    fileSizeBytes: v.number(),
    recordCounts: v.string(),
    totalRecords: v.number(),
    completedAt: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      storageId: args.storageId,
      fileSizeBytes: args.fileSizeBytes,
      recordCounts: args.recordCounts,
      totalRecords: args.totalRecords,
      completedAt: args.completedAt,
    });
  },
});

export const failBackupJob = internalMutation({
  args: { jobId: v.id("backupJobs"), error: v.string(), completedAt: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: "failed", error: args.error, completedAt: args.completedAt });
  },
});

export const getBackupJob = internalQuery({
  args: { backupJobId: v.id("backupJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.backupJobId);
  },
});

// ── Restore job lifecycle ────────────────────────────────────────────────────

export const createRestoreJob = internalMutation({
  args: {
    restoreRef: v.string(),
    backupJobId: v.id("backupJobs"),
    tables: v.array(v.string()),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
    startedAt: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("restoreJobs", {
      restoreRef: args.restoreRef,
      backupJobId: args.backupJobId,
      tables: args.tables,
      status: "running",
      performedBy: args.performedBy as Id<"users"> | undefined,
      performedByName: args.performedByName,
      startedAt: args.startedAt,
    });
  },
});

export const completeRestoreJob = internalMutation({
  args: { restoreId: v.id("restoreJobs"), recordsWritten: v.number(), completedAt: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.restoreId, { status: "completed", recordsWritten: args.recordsWritten, completedAt: args.completedAt });
  },
});

export const failRestoreJob = internalMutation({
  args: { restoreId: v.id("restoreJobs"), error: v.string(), completedAt: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.restoreId, { status: "failed", error: args.error, completedAt: args.completedAt });
  },
});

// ── Table export / restore (generic, whitelisted table names only) ─────────

const ALLOWED_TABLES = new Set<string>([
  "users", "properties", "estates", "testimonials", "newsArticles", "blogComments",
  "inquiries", "subscribers", "leads", "commissions", "staffProfiles", "attendance",
  "leaveRequests", "constructionSites", "materials", "suppliers", "siteReports",
  "clients", "clientDocuments", "clientNotes", "followUps", "invoices", "paymentPlans",
  "installments", "galleryItems", "heroSlides", "siteSettings", "estateBlocks", "plots",
  "allocations", "ownershipHistory", "partners", "partnerApplications", "partnerReferrals",
  "partnerCommissions", "transactions", "transactionEvents", "kycSubmissions",
  "kycDocuments", "kycEvents", "financeApplications", "mortgageDetails", "financeEvents",
  "paymentGateways", "geoPayments", "paymentReceipts", "reconciliationBatches",
  "reconciliationItems", "tickerMessages", "popNotifications", "vaultDocuments",
  "dataRooms", "dataRoomDocuments", "dataRoomAccess", "agreements", "agreementEvents",
  "tasks", "taskComments", "approvals", "supportTickets",
]);

function assertAllowedTable(table: string): TableNames {
  if (!ALLOWED_TABLES.has(table)) {
    throw new ConvexError({ message: `Table "${table}" is not eligible for backup/restore`, code: "BAD_REQUEST" });
  }
  return table as TableNames;
}

export const exportTable = internalQuery({
  args: { table: v.string() },
  handler: async (ctx, args) => {
    const table = assertAllowedTable(args.table);
    return await ctx.db.query(table).collect();
  },
});

export const restoreTable = internalMutation({
  args: {
    table: v.string(),
    // Each row is a JSON-encoded document (including its original _id/_creationTime),
    // serialized this way since document shapes vary per table and Convex validators
    // must be static.
    rowsJson: v.array(v.string()),
    mode: v.union(v.literal("merge"), v.literal("replace")),
  },
  handler: async (ctx, args) => {
    const table = assertAllowedTable(args.table);

    if (args.mode === "replace") {
      // Clear existing rows in batches before restoring the snapshot
      let existing = await ctx.db.query(table).take(500);
      while (existing.length > 0) {
        for (const row of existing) await ctx.db.delete(row._id);
        existing = await ctx.db.query(table).take(500);
      }
    }

    let written = 0;
    for (const rowJson of args.rowsJson) {
      const parsed: unknown = JSON.parse(rowJson);
      if (typeof parsed !== "object" || parsed === null) continue;
      const { _id, _creationTime, ...fields } = parsed as Record<string, unknown> & {
        _id?: string;
        _creationTime?: number;
      };

      if (args.mode === "merge" && typeof _id === "string") {
        const existingDoc = await ctx.db.get(_id as Id<typeof table>).catch(() => null);
        if (existingDoc) {
          await ctx.db.patch(existingDoc._id, fields);
          written++;
          continue;
        }
      }
      await ctx.db.insert(table, fields as never);
      written++;
    }
    return written;
  },
});
