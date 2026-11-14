import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin.ts";
import { internal } from "./_generated/api.js";
import type { Id, Doc } from "./_generated/dataModel.js";
import type { QueryCtx } from "./_generated/server";
import { resolveViewerScope, filterByScope } from "./iam/scope.ts";
import { notifyClient } from "./notifications.ts";

// ── STATUS CONSTANTS ────────────────────────────────────────────────────────

export const KYC_STATUSES = [
  "not_started",
  "pending_customer",
  "submitted",
  "under_review",
  "more_info_required",
  "approved",
  "rejected",
] as const;

export const KYC_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  pending_customer: "Pending Customer",
  submitted: "Submitted",
  under_review: "Under Review",
  more_info_required: "More Info Required",
  approved: "Approved",
  rejected: "Rejected",
};

// ── QUERIES ────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    status: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);

    let submissions = args.status && args.status !== "all"
      ? await ctx.db.query("kycSubmissions").withIndex("by_status", (q) => q.eq("status", args.status!)).collect()
      : args.clientId
      ? await ctx.db.query("kycSubmissions").withIndex("by_client", (q) => q.eq("clientId", args.clientId!)).collect()
      : await ctx.db.query("kycSubmissions").collect();

    if (args.clientId && !args.status) {
      // already filtered above
    }
    if (args.transactionId) {
      submissions = submissions.filter((s) => s.transactionId === args.transactionId);
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      submissions = submissions.filter((s) =>
        s.submissionRef.toLowerCase().includes(q) ||
        (s.legalName ?? "").toLowerCase().includes(q) ||
        (s.companyName ?? "").toLowerCase().includes(q)
      );
    }

    const scope = await resolveViewerScope(ctx, user, "kyc");
    submissions = await filterByScope(ctx, submissions, scope, (s) => s.assignedReviewer ?? s.createdBy);

    // Resolve client name for display
    const enriched = await Promise.all(
      submissions.map(async (s) => {
        const client = await ctx.db.get(s.clientId);
        const reviewer = s.assignedReviewer ? await ctx.db.get(s.assignedReviewer) : null;
        return {
          ...s,
          clientName: client?.fullName ?? "Unknown",
          clientEmail: client?.email,
          clientPhone: client?.phone,
          reviewerName: reviewer?.name ?? reviewer?.email,
        };
      })
    );

    return enriched.sort((a, b) => b._creationTime - a._creationTime);
  },
});

async function enrichKyc(ctx: QueryCtx, s: Doc<"kycSubmissions">): Promise<Doc<"kycSubmissions"> & {
  clientName: string;
  clientEmail: string | undefined;
  clientPhone: string | undefined;
  reviewerName: string | undefined;
}> {
  const client = await ctx.db.get(s.clientId);
  const reviewer = s.assignedReviewer ? await ctx.db.get(s.assignedReviewer) : null;
  return {
    ...s,
    clientName: client?.fullName ?? "Unknown",
    clientEmail: client?.email,
    clientPhone: client?.phone,
    reviewerName: reviewer?.name ?? reviewer?.email,
  };
}

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const scope = await resolveViewerScope(ctx, user, "kyc");
    const getOwnerId = (s: Doc<"kycSubmissions">) => s.assignedReviewer ?? s.createdBy;

    if (args.search && args.search.trim()) {
      const results = await ctx.db
        .query("kycSubmissions")
        .withSearchIndex("search_ref", (q) => {
          let sq = q.search("submissionRef", args.search!.trim());
          if (args.status && args.status !== "all") sq = sq.eq("status", args.status);
          return sq;
        })
        .paginate(args.paginationOpts);
      const scopedPage = await filterByScope(ctx, results.page, scope, getOwnerId);
      return { ...results, page: await Promise.all(scopedPage.map((s) => enrichKyc(ctx, s))) };
    }

    if (args.status && args.status !== "all") {
      const results = await ctx.db
        .query("kycSubmissions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
      const scopedPage = await filterByScope(ctx, results.page, scope, getOwnerId);
      return { ...results, page: await Promise.all(scopedPage.map((s) => enrichKyc(ctx, s))) };
    }

    const results = await ctx.db.query("kycSubmissions").order("desc").paginate(args.paginationOpts);
    const scopedPage = await filterByScope(ctx, results.page, scope, getOwnerId);
    return { ...results, page: await Promise.all(scopedPage.map((s) => enrichKyc(ctx, s))) };
  },
});

export const getById = query({
  args: { id: v.id("kycSubmissions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const submission = await ctx.db.get(args.id);
    if (!submission) return null;

    const client = await ctx.db.get(submission.clientId);
    const transaction = submission.transactionId ? await ctx.db.get(submission.transactionId) : null;
    const reviewer = submission.assignedReviewer ? await ctx.db.get(submission.assignedReviewer) : null;

    const documents = await ctx.db
      .query("kycDocuments")
      .withIndex("by_submission", (q) => q.eq("kycSubmissionId", args.id))
      .collect();

    const events = await ctx.db
      .query("kycEvents")
      .withIndex("by_submission", (q) => q.eq("kycSubmissionId", args.id))
      .collect();

    // Resolve verifier names on documents
    const enrichedDocs = await Promise.all(
      documents.map(async (d) => {
        const verifier = d.verifiedBy ? await ctx.db.get(d.verifiedBy) : null;
        return { ...d, verifierName: verifier?.name ?? verifier?.email };
      })
    );

    return {
      ...submission,
      client,
      transaction,
      reviewer,
      documents: enrichedDocs,
      events: events.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("kycSubmissions").collect();
    return {
      total: all.length,
      notStarted: all.filter((s) => s.status === "not_started").length,
      pendingCustomer: all.filter((s) => s.status === "pending_customer").length,
      submitted: all.filter((s) => s.status === "submitted").length,
      underReview: all.filter((s) => s.status === "under_review").length,
      moreInfoRequired: all.filter((s) => s.status === "more_info_required").length,
      approved: all.filter((s) => s.status === "approved").length,
      rejected: all.filter((s) => s.status === "rejected").length,
    };
  },
});

// ── MUTATIONS ──────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    transactionId: v.optional(v.id("transactions")),
    kycType: v.string(),
    legalName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    nationality: v.optional(v.string()),
    placeOfBirth: v.optional(v.string()),
    residentialAddress: v.optional(v.string()),
    stateOfResidence: v.optional(v.string()),
    occupation: v.optional(v.string()),
    employerName: v.optional(v.string()),
    sourceOfFunds: v.optional(v.string()),
    nin: v.optional(v.string()),
    bvn: v.optional(v.string()),
    passportNumber: v.optional(v.string()),
    driversLicense: v.optional(v.string()),
    companyName: v.optional(v.string()),
    rcNumber: v.optional(v.string()),
    assignedReviewer: v.optional(v.id("users")),
    priority: v.optional(v.string()),
    initialStatus: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"kycSubmissions">> => {
    const user = await requireAdmin(ctx);

    // Generate ref
    const existing = await ctx.db.query("kycSubmissions").collect();
    const num = String(existing.length + 1).padStart(4, "0");
    const submissionRef = `GWS-KYC-${num}`;

    const status = args.initialStatus ?? "not_started";
    const now = new Date().toISOString();

    const id = await ctx.db.insert("kycSubmissions", {
      submissionRef,
      clientId: args.clientId,
      transactionId: args.transactionId,
      kycType: args.kycType,
      status,
      legalName: args.legalName,
      dateOfBirth: args.dateOfBirth,
      nationality: args.nationality,
      placeOfBirth: args.placeOfBirth,
      residentialAddress: args.residentialAddress,
      stateOfResidence: args.stateOfResidence,
      occupation: args.occupation,
      employerName: args.employerName,
      sourceOfFunds: args.sourceOfFunds,
      nin: args.nin,
      bvn: args.bvn,
      passportNumber: args.passportNumber,
      driversLicense: args.driversLicense,
      companyName: args.companyName,
      rcNumber: args.rcNumber,
      assignedReviewer: args.assignedReviewer,
      priority: args.priority,
      createdBy: user._id,
      lastUpdatedBy: user._id,
    });

    // Initial event
    await ctx.db.insert("kycEvents", {
      kycSubmissionId: id,
      toStatus: status,
      changedBy: user._id,
      changedByName: user.name,
      note: "KYC submission created",
      timestamp: now,
    });

    // Sync kycStatus on client
    await ctx.db.patch(args.clientId, { kycStatus: status === "approved" ? "verified" : "pending" });

    // If linked to transaction, update transaction kycStatus
    if (args.transactionId) {
      await ctx.db.patch(args.transactionId, { kycStatus: status, lastUpdatedBy: user._id });
    }

    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "create",
      entity: "kycSubmission",
      entityId: id,
      details: `${submissionRef} created`,
    });

    // Alert admins/managers of new submission needing review
    const client = await ctx.db.get(args.clientId);
    await ctx.scheduler.runAfter(0, internal.emails.sendAdminNewKycAlert, {
      to: await ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      adminPhones: await ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      clientName: client?.fullName ?? "Unknown",
      submissionRef,
    });

    return id;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("kycSubmissions"),
    status: v.string(),
    note: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
    moreInfoRequest: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    riskLevel: v.optional(v.string()),
    assignedReviewer: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const submission = await ctx.db.get(args.id);
    if (!submission) throw new ConvexError({ message: "KYC submission not found", code: "NOT_FOUND" });

    const now = new Date().toISOString();

    // Build update payload
    type KycUpdate = {
      status: string;
      lastUpdatedBy: Id<"users">;
      reviewNotes?: string;
      moreInfoRequest?: string;
      rejectionReason?: string;
      riskLevel?: string;
      assignedReviewer?: Id<"users">;
      submittedAt?: string;
      reviewStartedAt?: string;
      approvedAt?: string;
      rejectedAt?: string;
    };

    const update: KycUpdate = {
      status: args.status,
      lastUpdatedBy: user._id,
    };
    if (args.reviewNotes !== undefined) update.reviewNotes = args.reviewNotes;
    if (args.moreInfoRequest !== undefined) update.moreInfoRequest = args.moreInfoRequest;
    if (args.rejectionReason !== undefined) update.rejectionReason = args.rejectionReason;
    if (args.riskLevel !== undefined) update.riskLevel = args.riskLevel;
    if (args.assignedReviewer !== undefined) update.assignedReviewer = args.assignedReviewer;

    // Timestamps per status
    if (args.status === "submitted" && !submission.submittedAt) update.submittedAt = now;
    if (args.status === "under_review" && !submission.reviewStartedAt) update.reviewStartedAt = now;
    if (args.status === "approved") update.approvedAt = now;
    if (args.status === "rejected") update.rejectedAt = now;

    await ctx.db.patch(args.id, update);

    // Audit event
    await ctx.db.insert("kycEvents", {
      kycSubmissionId: args.id,
      fromStatus: submission.status,
      toStatus: args.status,
      changedBy: user._id,
      changedByName: user.name,
      note: args.note,
      timestamp: now,
    });

    // Sync client kycStatus
    const clientKycStatus =
      args.status === "approved" ? "verified" :
      args.status === "rejected" ? "rejected" :
      "pending";
    await ctx.db.patch(submission.clientId, { kycStatus: clientKycStatus });

    // Sync transaction kycStatus if linked
    if (submission.transactionId) {
      await ctx.db.patch(submission.transactionId, { kycStatus: args.status, lastUpdatedBy: user._id });
    }

    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "update",
      entity: "kycSubmission",
      entityId: args.id,
      details: `${submission.submissionRef}: ${submission.status} → ${args.status}`,
    });

    // Notify client of status change (KYC & Compliance)
    const client = await ctx.db.get(submission.clientId);
    if (client?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendKycStatusEmail, {
        to: client.email,
        phone: client.phone,
        name: client.fullName,
        status: args.status,
        submissionRef: submission.submissionRef,
        reason: args.status === "rejected" ? args.rejectionReason : args.status === "more_info_required" ? args.moreInfoRequest : undefined,
      });
    }
    if (client) {
      const statusLabel = args.status.replace(/_/g, " ");
      await notifyClient(ctx, {
        clientId: client._id,
        type: "kyc_status",
        title: "KYC Status Updated",
        message: `Your KYC submission ${submission.submissionRef} is now ${statusLabel}.`,
        link: "/client?tab=kyc",
      });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("kycSubmissions"),
    legalName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    nationality: v.optional(v.string()),
    placeOfBirth: v.optional(v.string()),
    residentialAddress: v.optional(v.string()),
    stateOfResidence: v.optional(v.string()),
    occupation: v.optional(v.string()),
    employerName: v.optional(v.string()),
    sourceOfFunds: v.optional(v.string()),
    nin: v.optional(v.string()),
    bvn: v.optional(v.string()),
    passportNumber: v.optional(v.string()),
    driversLicense: v.optional(v.string()),
    companyName: v.optional(v.string()),
    rcNumber: v.optional(v.string()),
    assignedReviewer: v.optional(v.id("users")),
    priority: v.optional(v.string()),
    riskLevel: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, lastUpdatedBy: user._id });
    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "update",
      entity: "kycSubmission",
      entityId: id,
      details: "Details updated",
    });
  },
});

export const remove = mutation({
  args: { id: v.id("kycSubmissions") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const submission = await ctx.db.get(args.id);
    if (!submission) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });

    // Delete related docs and events
    const docs = await ctx.db.query("kycDocuments").withIndex("by_submission", (q) => q.eq("kycSubmissionId", args.id)).collect();
    for (const d of docs) await ctx.db.delete(d._id);
    const events = await ctx.db.query("kycEvents").withIndex("by_submission", (q) => q.eq("kycSubmissionId", args.id)).collect();
    for (const e of events) await ctx.db.delete(e._id);

    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "delete",
      entity: "kycSubmission",
      entityId: args.id,
      details: `${submission.submissionRef} deleted`,
    });
  },
});

// ── KYC DOCUMENTS ──────────────────────────────────────────────────────────

export const addDocument = mutation({
  args: {
    kycSubmissionId: v.id("kycSubmissions"),
    clientId: v.id("clients"),
    docType: v.string(),
    name: v.string(),
    url: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args): Promise<Id<"kycDocuments">> => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("kycDocuments", {
      ...args,
      status: "pending",
      uploadedBy: user._id,
    });
    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "create",
      entity: "kycDocument",
      entityId: id,
      details: `${args.docType}: ${args.name}`,
    });
    return id;
  },
});

export const verifyDocument = mutation({
  args: {
    id: v.id("kycDocuments"),
    status: v.string(), // "verified"|"rejected"
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const now = new Date().toISOString();
    await ctx.db.patch(args.id, {
      status: args.status,
      rejectionReason: args.rejectionReason,
      verifiedBy: user._id,
      verifiedAt: now,
    });
    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "update",
      entity: "kycDocument",
      entityId: args.id,
      details: `Document ${args.status}`,
    });
  },
});

export const removeDocument = mutation({
  args: { id: v.id("kycDocuments") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "delete",
      entity: "kycDocument",
      entityId: args.id,
      details: "Document removed",
    });
  },
});
