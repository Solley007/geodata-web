import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { format } from "date-fns";
import { paginationOptsValidator } from "convex/server";
import { tokenOf } from "./authIdentity";

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireStaff(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in required" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity)))
    .unique();
  if (!user || !["super_admin", "admin", "manager", "agent"].includes(user.role ?? "")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return user;
}

// ── Ref generators ────────────────────────────────────────────────────────────

async function nextDocRef(ctx: MutationCtx): Promise<string> {
  const last = await ctx.db.query("vaultDocuments").order("desc").first();
  const n = last ? parseInt(last.docRef.split("-")[2] ?? "0") + 1 : 1;
  return `GWS-DOC-${String(n).padStart(4, "0")}`;
}

async function nextRoomRef(ctx: MutationCtx): Promise<string> {
  const last = await ctx.db.query("dataRooms").order("desc").first();
  const n = last ? parseInt(last.roomRef.split("-")[2] ?? "0") + 1 : 1;
  return `GWS-DRM-${String(n).padStart(4, "0")}`;
}

async function nextAgreementRef(ctx: MutationCtx): Promise<string> {
  const last = await ctx.db.query("agreements").order("desc").first();
  const n = last ? parseInt(last.agreementRef.split("-")[2] ?? "0") + 1 : 1;
  return `GWS-AGR-${String(n).padStart(4, "0")}`;
}

// ── VAULT DOCUMENTS ───────────────────────────────────────────────────────────

export const listDocuments = query({
  args: {
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    docType: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let docs;
    if (args.clientId) {
      docs = await ctx.db
        .query("vaultDocuments")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
        .order("desc")
        .take(200);
    } else if (args.transactionId) {
      docs = await ctx.db
        .query("vaultDocuments")
        .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
        .order("desc")
        .take(200);
    } else if (args.docType) {
      docs = await ctx.db
        .query("vaultDocuments")
        .withIndex("by_type", (q) => q.eq("docType", args.docType!))
        .order("desc")
        .take(200);
    } else {
      docs = await ctx.db.query("vaultDocuments").order("desc").take(200);
    }

    if (args.search) {
      const q = args.search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.docRef.toLowerCase().includes(q) ||
          d.fileName.toLowerCase().includes(q)
      );
    }

    // Enrich with client name
    return Promise.all(
      docs.map(async (d) => {
        const client = d.clientId ? await ctx.db.get(d.clientId) : null;
        const uploader = d.uploadedBy ? await ctx.db.get(d.uploadedBy) : null;
        return {
          ...d,
          clientName: client?.fullName ?? null,
          uploaderName: uploader?.name ?? null,
        };
      })
    );
  },
});

export const listDocumentsPaginated = query({
  args: {
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    docType: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    let result;
    if (args.search) {
      result = await ctx.db
        .query("vaultDocuments")
        .withSearchIndex("search_title", (q) => {
          let query = q.search("title", args.search!);
          if (args.docType) query = query.eq("docType", args.docType);
          if (args.clientId) query = query.eq("clientId", args.clientId);
          return query;
        })
        .paginate(args.paginationOpts);
    } else if (args.clientId) {
      result = await ctx.db
        .query("vaultDocuments")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.transactionId) {
      result = await ctx.db
        .query("vaultDocuments")
        .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.docType) {
      result = await ctx.db
        .query("vaultDocuments")
        .withIndex("by_type", (q) => q.eq("docType", args.docType!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db.query("vaultDocuments").order("desc").paginate(args.paginationOpts);
    }

    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (d) => {
          const client = d.clientId ? await ctx.db.get(d.clientId) : null;
          const uploader = d.uploadedBy ? await ctx.db.get(d.uploadedBy) : null;
          return {
            ...d,
            clientName: client?.fullName ?? null,
            uploaderName: uploader?.name ?? null,
          };
        })
      ),
    };
  },
});

export const getDocumentById = query({
  args: { id: v.id("vaultDocuments") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const client = doc.clientId ? await ctx.db.get(doc.clientId) : null;
    const transaction = doc.transactionId ? await ctx.db.get(doc.transactionId) : null;
    const uploader = doc.uploadedBy ? await ctx.db.get(doc.uploadedBy) : null;
    // Versions (all docs with same parentDocId chain or same original)
    const versions = await ctx.db
      .query("vaultDocuments")
      .withIndex("by_ref", (q) => q.eq("docRef", doc.docRef))
      .collect();
    return {
      ...doc,
      clientName: client?.fullName ?? null,
      transactionRef: transaction?.transactionRef ?? null,
      uploaderName: uploader?.name ?? null,
      versionCount: versions.length,
    };
  },
});

export const getDocumentStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("vaultDocuments").order("desc").take(500);
    const total = all.length;
    const confidential = all.filter((d) => d.isConfidential).length;
    const byType = all.reduce<Record<string, number>>((acc, d) => {
      acc[d.docType] = (acc[d.docType] ?? 0) + 1;
      return acc;
    }, {});
    return { total, confidential, byType };
  },
});

export const createDocument = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    docType: v.string(),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSizeBytes: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    kycSubmissionId: v.optional(v.id("kycSubmissions")),
    financeApplicationId: v.optional(v.id("financeApplications")),
    agreementId: v.optional(v.id("agreements")),
    paymentId: v.optional(v.id("geoPayments")),
    isConfidential: v.boolean(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const docRef = await nextDocRef(ctx);
    return ctx.db.insert("vaultDocuments", {
      ...args,
      docRef,
      version: 1,
      uploadedBy: user._id,
      uploadedAt: new Date().toISOString(),
    });
  },
});

export const updateDocument = mutation({
  args: {
    id: v.id("vaultDocuments"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    docType: v.optional(v.string()),
    isConfidential: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const deleteDocument = mutation({
  args: { id: v.id("vaultDocuments") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    await ctx.db.delete(args.id);
  },
});

// ── DATA ROOMS ────────────────────────────────────────────────────────────────

export const listDataRooms = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let rooms;
    if (args.status) {
      rooms = await ctx.db
        .query("dataRooms")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(100);
    } else {
      rooms = await ctx.db.query("dataRooms").order("desc").take(100);
    }
    return Promise.all(
      rooms.map(async (r) => {
        const client = r.clientId ? await ctx.db.get(r.clientId) : null;
        const transaction = r.transactionId ? await ctx.db.get(r.transactionId) : null;
        const docCount = await ctx.db
          .query("dataRoomDocuments")
          .withIndex("by_room", (q) => q.eq("dataRoomId", r._id))
          .collect()
          .then((d) => d.length);
        const accessCount = await ctx.db
          .query("dataRoomAccess")
          .withIndex("by_room", (q) => q.eq("dataRoomId", r._id))
          .collect()
          .then((a) => a.filter((x) => !x.revokedAt).length);
        return {
          ...r,
          clientName: client?.fullName ?? null,
          transactionRef: transaction?.transactionRef ?? null,
          docCount,
          accessCount,
        };
      })
    );
  },
});

export const listDataRoomsPaginated = query({
  args: { status: v.optional(v.string()), search: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    let result;
    if (args.search) {
      result = await ctx.db
        .query("dataRooms")
        .withSearchIndex("search_name", (q) => {
          let query = q.search("name", args.search!);
          if (args.status) query = query.eq("status", args.status);
          return query;
        })
        .paginate(args.paginationOpts);
    } else if (args.status) {
      result = await ctx.db
        .query("dataRooms")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db.query("dataRooms").order("desc").paginate(args.paginationOpts);
    }

    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r) => {
          const client = r.clientId ? await ctx.db.get(r.clientId) : null;
          const transaction = r.transactionId ? await ctx.db.get(r.transactionId) : null;
          const docCount = await ctx.db
            .query("dataRoomDocuments")
            .withIndex("by_room", (q) => q.eq("dataRoomId", r._id))
            .collect()
            .then((d) => d.length);
          const accessCount = await ctx.db
            .query("dataRoomAccess")
            .withIndex("by_room", (q) => q.eq("dataRoomId", r._id))
            .collect()
            .then((a) => a.filter((x) => !x.revokedAt).length);
          return {
            ...r,
            clientName: client?.fullName ?? null,
            transactionRef: transaction?.transactionRef ?? null,
            docCount,
            accessCount,
          };
        })
      ),
    };
  },
});

export const getDataRoom = query({
  args: { id: v.id("dataRooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.id);
    if (!room) return null;
    const client = room.clientId ? await ctx.db.get(room.clientId) : null;
    const transaction = room.transactionId ? await ctx.db.get(room.transactionId) : null;

    // Docs in room
    const roomDocs = await ctx.db
      .query("dataRoomDocuments")
      .withIndex("by_room", (q) => q.eq("dataRoomId", room._id))
      .collect();
    const docs = await Promise.all(
      roomDocs.map(async (rd) => {
        const doc = await ctx.db.get(rd.vaultDocumentId);
        return doc ? { ...doc, addedAt: rd.addedAt } : null;
      })
    ).then((d) => d.filter(Boolean));

    // Access grants
    const access = await ctx.db
      .query("dataRoomAccess")
      .withIndex("by_room", (q) => q.eq("dataRoomId", room._id))
      .collect();
    const enrichedAccess = await Promise.all(
      access.map(async (a) => {
        const grantClient = a.clientId ? await ctx.db.get(a.clientId) : null;
        return { ...a, clientName: grantClient?.fullName ?? null };
      })
    );

    return {
      ...room,
      clientName: client?.fullName ?? null,
      transactionRef: transaction?.transactionRef ?? null,
      docs,
      access: enrichedAccess,
    };
  },
});

export const createDataRoom = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    expiresAt: v.optional(v.string()),
    allowDownload: v.boolean(),
    requireNDA: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const roomRef = await nextRoomRef(ctx);
    return ctx.db.insert("dataRooms", {
      ...args,
      roomRef,
      status: "active",
      createdBy: user._id,
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateDataRoom = mutation({
  args: {
    id: v.id("dataRooms"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    allowDownload: v.optional(v.boolean()),
    requireNDA: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const addDocToRoom = mutation({
  args: { dataRoomId: v.id("dataRooms"), vaultDocumentId: v.id("vaultDocuments") },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    // Check not already in room
    const existing = await ctx.db
      .query("dataRoomDocuments")
      .withIndex("by_room", (q) => q.eq("dataRoomId", args.dataRoomId))
      .collect()
      .then((docs) => docs.find((d) => d.vaultDocumentId === args.vaultDocumentId));
    if (existing) return existing._id;
    return ctx.db.insert("dataRoomDocuments", {
      dataRoomId: args.dataRoomId,
      vaultDocumentId: args.vaultDocumentId,
      addedBy: user._id,
      addedAt: new Date().toISOString(),
    });
  },
});

export const removeDocFromRoom = mutation({
  args: { dataRoomId: v.id("dataRooms"), vaultDocumentId: v.id("vaultDocuments") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const entry = await ctx.db
      .query("dataRoomDocuments")
      .withIndex("by_room", (q) => q.eq("dataRoomId", args.dataRoomId))
      .collect()
      .then((docs) => docs.find((d) => d.vaultDocumentId === args.vaultDocumentId));
    if (entry) await ctx.db.delete(entry._id);
  },
});

export const grantRoomAccess = mutation({
  args: { dataRoomId: v.id("dataRooms"), clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    // Revoke existing if any
    const existing = await ctx.db
      .query("dataRoomAccess")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect()
      .then((rows) => rows.find((r) => r.dataRoomId === args.dataRoomId && !r.revokedAt));
    if (existing) return existing._id;
    return ctx.db.insert("dataRoomAccess", {
      dataRoomId: args.dataRoomId,
      clientId: args.clientId,
      grantedBy: user._id,
      grantedAt: new Date().toISOString(),
      viewCount: 0,
      downloadCount: 0,
      ndaSigned: false,
    });
  },
});

export const revokeRoomAccess = mutation({
  args: { accessId: v.id("dataRoomAccess") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    await ctx.db.patch(args.accessId, { revokedAt: new Date().toISOString() });
  },
});

// ── AGREEMENTS ────────────────────────────────────────────────────────────────

export const listAgreements = query({
  args: {
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let agreements;
    if (args.clientId) {
      agreements = await ctx.db
        .query("agreements")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
        .order("desc")
        .take(200);
    } else if (args.status) {
      agreements = await ctx.db
        .query("agreements")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(200);
    } else {
      agreements = await ctx.db.query("agreements").order("desc").take(200);
    }

    if (args.search) {
      const q = args.search.toLowerCase();
      agreements = agreements.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.agreementRef.toLowerCase().includes(q)
      );
    }

    return Promise.all(
      agreements.map(async (a) => {
        const client = await ctx.db.get(a.clientId);
        const transaction = a.transactionId ? await ctx.db.get(a.transactionId) : null;
        return {
          ...a,
          clientName: client?.fullName ?? null,
          transactionRef: transaction?.transactionRef ?? null,
        };
      })
    );
  },
});

export const listAgreementsPaginated = query({
  args: {
    clientId: v.optional(v.id("clients")),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    let result;
    if (args.search) {
      result = await ctx.db
        .query("agreements")
        .withSearchIndex("search_title", (q) => {
          let query = q.search("title", args.search!);
          if (args.status) query = query.eq("status", args.status);
          if (args.clientId) query = query.eq("clientId", args.clientId);
          return query;
        })
        .paginate(args.paginationOpts);
    } else if (args.clientId) {
      result = await ctx.db
        .query("agreements")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.status) {
      result = await ctx.db
        .query("agreements")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db.query("agreements").order("desc").paginate(args.paginationOpts);
    }

    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (a) => {
          const client = await ctx.db.get(a.clientId);
          const transaction = a.transactionId ? await ctx.db.get(a.transactionId) : null;
          return {
            ...a,
            clientName: client?.fullName ?? null,
            transactionRef: transaction?.transactionRef ?? null,
          };
        })
      ),
    };
  },
});

export const getAgreement = query({
  args: { id: v.id("agreements") },
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.id);
    if (!a) return null;
    const client = await ctx.db.get(a.clientId);
    const transaction = a.transactionId ? await ctx.db.get(a.transactionId) : null;
    const events = await ctx.db
      .query("agreementEvents")
      .withIndex("by_agreement", (q) => q.eq("agreementId", a._id))
      .order("desc")
      .take(30);
    return {
      ...a,
      clientName: client?.fullName ?? null,
      clientEmail: client?.email ?? null,
      clientPhone: client?.phone ?? null,
      transactionRef: transaction?.transactionRef ?? null,
      events,
    };
  },
});

export const getAgreementStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("agreements").order("desc").take(500);
    const byStatus = all.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    }, {});
    const signed = byStatus["signed"] ?? 0 + (byStatus["completed"] ?? 0);
    const pending = (byStatus["sent"] ?? 0) + (byStatus["viewed"] ?? 0);
    const draft = (byStatus["draft"] ?? 0) + (byStatus["pending_review"] ?? 0);
    return { total: all.length, signed, pending, draft, byStatus };
  },
});

export const createAgreement = mutation({
  args: {
    title: v.string(),
    agreementType: v.string(),
    clientId: v.id("clients"),
    transactionId: v.optional(v.id("transactions")),
    pdfUrl: v.optional(v.string()),
    signatories: v.array(v.object({
      name: v.string(),
      email: v.string(),
      role: v.string(),
      signedAt: v.optional(v.string()),
      signatureRef: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
    })),
    expiresAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const agreementRef = await nextAgreementRef(ctx);
    const now = new Date().toISOString();
    const id = await ctx.db.insert("agreements", {
      ...args,
      agreementRef,
      status: "draft",
      draftedAt: now,
      createdBy: user._id,
    });
    await ctx.db.insert("agreementEvents", {
      agreementId: id,
      toStatus: "draft",
      changedBy: user._id,
      changedByName: user.name ?? "Staff",
      note: "Agreement created",
      timestamp: now,
    });
    return id;
  },
});

export const updateAgreementStatus = mutation({
  args: {
    id: v.id("agreements"),
    status: v.string(),
    note: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    declineReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const agreement = await ctx.db.get(args.id);
    if (!agreement) throw new ConvexError({ code: "NOT_FOUND", message: "Agreement not found" });

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: args.status, lastUpdatedBy: user._id };

    if (args.pdfUrl) patch.pdfUrl = args.pdfUrl;
    if (args.declineReason) patch.declineReason = args.declineReason;
    if (args.status === "sent") patch.sentAt = now;
    if (args.status === "viewed") patch.viewedAt = now;
    if (args.status === "signed") patch.signedAt = now;
    if (args.status === "completed") patch.completedAt = now;
    if (args.status === "declined") patch.declinedAt = now;

    await ctx.db.patch(args.id, patch);
    await ctx.db.insert("agreementEvents", {
      agreementId: args.id,
      fromStatus: agreement.status,
      toStatus: args.status,
      changedBy: user._id,
      changedByName: user.name ?? "Staff",
      note: args.note,
      timestamp: now,
    });

    // Sync to transaction if linked
    if (agreement.transactionId) {
      const txnPatch: Record<string, string> = {};
      if (args.status === "sent" || args.status === "viewed") txnPatch.agreementStatus = "sent";
      if (args.status === "signed") txnPatch.agreementStatus = "signed";
      if (args.status === "completed") { txnPatch.agreementStatus = "completed"; txnPatch.signatureStatus = "completed"; }
      if (args.status === "declined") txnPatch.agreementStatus = "declined";
      if (Object.keys(txnPatch).length > 0) {
        await ctx.db.patch(agreement.transactionId, txnPatch);
      }
    }
  },
});

export const updateAgreement = mutation({
  args: {
    id: v.id("agreements"),
    title: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    signatories: v.optional(v.array(v.object({
      name: v.string(),
      email: v.string(),
      role: v.string(),
      signedAt: v.optional(v.string()),
      signatureRef: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const deleteAgreement = mutation({
  args: { id: v.id("agreements") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    // Also delete events
    const events = await ctx.db
      .query("agreementEvents")
      .withIndex("by_agreement", (q) => q.eq("agreementId", args.id))
      .collect();
    for (const ev of events) await ctx.db.delete(ev._id);
    await ctx.db.delete(args.id);
  },
});

// Buyer-facing: get agreements for authenticated client
export const getMyAgreements = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity)))
      .unique();
    if (!user) return [];
    const client = await ctx.db
      .query("clients")
      .filter((q) => q.or(
        q.eq(q.field("userId"), user._id),
        q.eq(q.field("email"), user.email ?? "__none__")
      ))
      .first();
    if (!client) return [];
    return ctx.db
      .query("agreements")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .order("desc")
      .take(50);
  },
});
