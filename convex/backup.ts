"use node";

// Backup & Recovery Center — Node runtime action file (uses Buffer for JSON archive assembly)
import { v, ConvexError } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api.js";
import type { ActionCtx } from "./_generated/server";
import type { Id, TableNames } from "./_generated/dataModel.d.ts";

// ── Tables included in a full backup snapshot ───────────────────────────────
// Excludes auditLog (immutable trail, not restorable data) and the backup/
// restore job tables themselves (would be self-referential).
export const BACKUP_TABLES: TableNames[] = [
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
];

async function requireSuperAdmin(ctx: ActionCtx): Promise<{ id: string; name: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  const user = await ctx.runQuery(internal.backupInternal.resolveUserByIdentity, {
    tokenIdentifier: identity.tokenIdentifier,
    email: identity.email,
  });
  if (!user || user.role !== "super_admin") {
    throw new ConvexError({ message: "Super admin access required", code: "FORBIDDEN" });
  }
  return { id: user._id, name: user.name ?? identity.name ?? "Super Admin" };
}

// ── Create a manual backup (super admin triggered) ──────────────────────────
export const createManualBackup = action({
  args: { tables: v.optional(v.array(v.string())) },
  handler: async (ctx, args): Promise<{ jobId: string; jobRef: string }> => {
    const me = await requireSuperAdmin(ctx);
    const tables = (args.tables?.length ? args.tables : BACKUP_TABLES) as TableNames[];
    return await runBackup(ctx, { type: "manual", tables, createdBy: me.id, createdByName: me.name });
  },
});

// ── Scheduled daily backup (internal, cron-triggered) ───────────────────────
export const runScheduledBackup = internalAction({
  args: {},
  handler: async (ctx): Promise<{ jobId: string; jobRef: string }> => {
    return await runBackup(ctx, { type: "scheduled", tables: BACKUP_TABLES });
  },
});

async function runBackup(
  ctx: ActionCtx,
  opts: { type: "manual" | "scheduled"; tables: TableNames[]; createdBy?: string; createdByName?: string }
): Promise<{ jobId: string; jobRef: string }> {
  const startedAt = new Date().toISOString();
  const jobRef: string = await ctx.runMutation(internal.backupInternal.nextBackupRef, {});
  const jobId: Id<"backupJobs"> = await ctx.runMutation(internal.backupInternal.createBackupJob, {
    jobRef,
    type: opts.type,
    tables: opts.tables,
    createdBy: opts.createdBy,
    createdByName: opts.createdByName,
    startedAt,
  });

  try {
    const snapshot: Record<string, unknown[]> = {};
    const recordCounts: Record<string, number> = {};
    let totalRecords = 0;

    for (const table of opts.tables) {
      const rows: unknown[] = await ctx.runQuery(internal.backupInternal.exportTable, { table });
      snapshot[table] = rows;
      recordCounts[table] = rows.length;
      totalRecords += rows.length;
    }

    const manifest = {
      jobRef,
      type: opts.type,
      generatedAt: new Date().toISOString(),
      app: "Geodata World Services Limited",
      tables: opts.tables,
      recordCounts,
      totalRecords,
      data: snapshot,
    };
    const json = JSON.stringify(manifest, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const storageId = await ctx.storage.store(blob);

    await ctx.runMutation(internal.backupInternal.completeBackupJob, {
      jobId,
      storageId,
      fileSizeBytes: blob.size,
      recordCounts: JSON.stringify(recordCounts),
      totalRecords,
      completedAt: new Date().toISOString(),
    });

    // Fan out to any enabled external destinations (S3, Dropbox, Google Drive, email)
    await ctx.scheduler.runAfter(0, internal.backupDestinations.syncBackupToDestinations, { backupJobId: jobId });
  } catch (err) {
    await ctx.runMutation(internal.backupInternal.failBackupJob, {
      jobId,
      error: err instanceof Error ? err.message : "Unknown error during backup",
      completedAt: new Date().toISOString(),
    });
    throw err;
  }

  return { jobId, jobRef };
}

// ── Restore selected tables from a completed backup ─────────────────────────
export const restoreFromBackup = action({
  args: {
    backupJobId: v.id("backupJobs"),
    tables: v.array(v.string()),
    mode: v.union(v.literal("merge"), v.literal("replace")),
  },
  handler: async (ctx, args): Promise<{ restoreId: string; recordsWritten: number }> => {
    const me = await requireSuperAdmin(ctx);
    const startedAt = new Date().toISOString();
    const restoreRef: string = await ctx.runMutation(internal.backupInternal.nextRestoreRef, {});
    const restoreId: Id<"restoreJobs"> = await ctx.runMutation(internal.backupInternal.createRestoreJob, {
      restoreRef,
      backupJobId: args.backupJobId,
      tables: args.tables,
      performedBy: me.id,
      performedByName: me.name,
      startedAt,
    });

    try {
      const backupJob = await ctx.runQuery(internal.backupInternal.getBackupJob, { backupJobId: args.backupJobId });
      if (!backupJob || !backupJob.storageId) {
        throw new Error("Backup snapshot not found or has no stored file");
      }
      const fileUrl = await ctx.storage.getUrl(backupJob.storageId);
      if (!fileUrl) throw new Error("Could not resolve backup file URL");
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`Failed to fetch backup file (${res.status})`);
      const manifest = (await res.json()) as { data: Record<string, unknown[]> };

      let recordsWritten = 0;
      for (const table of args.tables) {
        const rows = manifest.data[table] ?? [];
        const written: number = await ctx.runMutation(internal.backupInternal.restoreTable, {
          table,
          rowsJson: rows.map((row) => JSON.stringify(row)),
          mode: args.mode,
        });
        recordsWritten += written;
      }

      await ctx.runMutation(internal.backupInternal.completeRestoreJob, {
        restoreId,
        recordsWritten,
        completedAt: new Date().toISOString(),
      });
      return { restoreId, recordsWritten };
    } catch (err) {
      await ctx.runMutation(internal.backupInternal.failRestoreJob, {
        restoreId,
        error: err instanceof Error ? err.message : "Unknown error during restore",
        completedAt: new Date().toISOString(),
      });
      throw err;
    }
  },
});

// ── Get a signed download URL for a completed backup file ───────────────────
export const getBackupDownloadUrl = action({
  args: { backupJobId: v.id("backupJobs") },
  handler: async (ctx, args): Promise<{ url: string; jobRef: string } | null> => {
    await requireSuperAdmin(ctx);
    const job = await ctx.runQuery(internal.backupInternal.getBackupJob, { backupJobId: args.backupJobId });
    if (!job || !job.storageId) return null;
    const url = await ctx.storage.getUrl(job.storageId);
    if (!url) return null;
    return { url, jobRef: job.jobRef };
  },
});
