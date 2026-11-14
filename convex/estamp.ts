import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { logAudit } from "./taskboard.ts";
import { hasPermission } from "./iam/access.ts";
import { requireFeatureEnabled, isFeatureEnabled } from "./featureToggles.ts";

// ══════════════════════════════════════════════════════════════════════════
// OFFICIAL GEODATA CORPORATE E-STAMP
//
// A system-generated, tamper-evident mark of authenticity applied to one
// exact vaultDocuments VERSION — never a second document repository, never
// user-entered content, never a client-supplied date/time. Distinct from
// E-Signature (convex/esignature.ts): a document can be signed, stamped,
// both, or neither — the two are independent, optional layers on the same
// vault document.
//
// Security: five explicit, non-overlapping permissions gate this feature —
// STAMP_VIEW / STAMP_APPLY / STAMP_REVOKE / STAMP_ADMIN / STAMP_AUDIT.
// None is ever inferred from role or job title (super_admin keeps the same
// break-glass fallback used everywhere else in this app).
//
// Public verification (verifyStampByRef) is intentionally the ONLY query in
// this file with no auth requirement, and it explicitly whitelists the
// handful of fields it returns — it must NEVER expose vaultDocumentId,
// docRef, client/transaction linkage, staff identities, or audit data.
// ══════════════════════════════════════════════════════════════════════════

const STAFF_ROLES = ["super_admin", "admin", "manager", "agent"];

export const STAMP_PERMISSIONS = ["estamp.view", "estamp.apply", "estamp.revoke", "estamp.admin", "estamp.audit"] as const;
export type StampPermission = (typeof STAMP_PERMISSIONS)[number];

async function requireStaff(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in required" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  if (!user || !STAFF_ROLES.includes(user.role ?? "")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return user;
}

async function requireStampPermission(ctx: QueryCtx | MutationCtx, user: Doc<"users">, permission: StampPermission): Promise<void> {
  const allowed = await hasPermission(ctx, user._id, permission);
  if (!allowed && user.role !== "super_admin") {
    throw new ConvexError({ code: "FORBIDDEN", message: "You do not have explicit e-stamp authority for this action" });
  }
}

async function nextStampRef(ctx: MutationCtx): Promise<string> {
  const year = new Date().getUTCFullYear();
  const last = await ctx.db.query("eStamps").order("desc").first();
  let n = 1;
  if (last) {
    const parts = last.stampRef.split("-");
    const lastYear = parseInt(parts[1] ?? "0");
    n = lastYear === year ? parseInt(parts[2] ?? "0") + 1 : 1;
  }
  return `GWSL-${year}-${String(n).padStart(5, "0")}`;
}

// Tamper-evidence hash — never used as a secret, only as a fingerprint the
// public verifier can be shown to exist without exposing document content.
async function computeDocHash(docRef: string, version: number, fileUrl: string): Promise<string> {
  const data = new TextEncoder().encode(`${docRef}::v${version}::${fileUrl}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Called by other modules (enhanced document versioning, e-signature
// finalization) whenever a NEW vaultDocuments version supersedes one that
// carried an "applied" e-stamp. The stamp on the old version is marked
// "superseded" — it stays on record and stays publicly verifiable as
// superseded, it is never deleted. This keeps the stamp lifecycle correct
// without a second workflow: the source of truth for "which version is
// current" remains vaultDocuments.isLatestVersion.
export async function supersedeStampsForVersion(ctx: MutationCtx, oldVaultDocumentId: Id<"vaultDocuments">): Promise<void> {
  const stamps = await ctx.db.query("eStamps").withIndex("by_document", (q) => q.eq("vaultDocumentId", oldVaultDocumentId)).collect();
  for (const stamp of stamps) {
    if (stamp.status === "applied") {
      await ctx.db.patch(stamp._id, { status: "superseded" });
    }
  }
}

// ── Queries ──────────────────────────────────────────────────────────────

export const getMyEStampAccess = query({
  args: {},
  handler: async (ctx): Promise<{ featureEnabled: boolean; isStaff: boolean; canView: boolean; canApply: boolean; canRevoke: boolean; canAdmin: boolean; canAudit: boolean }> => {
    const featureEnabled = await isFeatureEnabled(ctx, "feature_corporate_estamp");
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { featureEnabled, isStaff: false, canView: false, canApply: false, canRevoke: false, canAdmin: false, canAudit: false };
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user || !STAFF_ROLES.includes(user.role ?? "")) {
      return { featureEnabled, isStaff: false, canView: false, canApply: false, canRevoke: false, canAdmin: false, canAudit: false };
    }
    const isSuperAdmin = user.role === "super_admin";
    const canView = (await hasPermission(ctx, user._id, "estamp.view")) || isSuperAdmin;
    const canApply = (await hasPermission(ctx, user._id, "estamp.apply")) || isSuperAdmin;
    const canRevoke = (await hasPermission(ctx, user._id, "estamp.revoke")) || isSuperAdmin;
    const canAdmin = (await hasPermission(ctx, user._id, "estamp.admin")) || isSuperAdmin;
    const canAudit = (await hasPermission(ctx, user._id, "estamp.audit")) || isSuperAdmin;
    return { featureEnabled, isStaff: true, canView, canApply, canRevoke, canAdmin, canAudit };
  },
});

export const listStampsForDocument = query({
  args: { docRef: v.string() },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    await requireStampPermission(ctx, user, "estamp.view");
    const stamps = await ctx.db.query("eStamps").withIndex("by_docRef", (q) => q.eq("docRef", args.docRef)).order("desc").collect();
    return Promise.all(
      stamps.map(async (s) => {
        const appliedByUser = await ctx.db.get(s.appliedBy);
        const revokedByUser = s.revokedBy ? await ctx.db.get(s.revokedBy) : null;
        return { ...s, appliedByName: appliedByUser?.name ?? "Unknown", revokedByName: revokedByUser?.name ?? null };
      })
    );
  },
});

// Full audit-style listing across all documents — separately gated by
// estamp.audit so day-to-day applying/revoking staff need not also see the
// full register, and vice versa.
const STAMP_STATUSES = ["applied", "revoked", "superseded", "invalid"] as const;
type StampStatus = (typeof STAMP_STATUSES)[number];

export const listAllStamps = query({
  args: { statusFilter: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    await requireStampPermission(ctx, user, "estamp.audit");
    const filter: StampStatus | undefined = STAMP_STATUSES.find((s) => s === args.statusFilter);
    const stamps = filter
      ? await ctx.db.query("eStamps").withIndex("by_status", (q) => q.eq("status", filter)).order("desc").take(200)
      : await ctx.db.query("eStamps").order("desc").take(200);
    return Promise.all(
      stamps.map(async (s) => {
        const appliedByUser = await ctx.db.get(s.appliedBy);
        return { ...s, appliedByName: appliedByUser?.name ?? "Unknown" };
      })
    );
  },
});

// PUBLIC — no authentication. Verifies a stamp by its public reference only.
// Returns an explicit, minimal whitelist of fields. Never expose docRef,
// vaultDocumentId, client/transaction linkage, staff names, revoke reasons,
// or any other internal/CRM/finance/staff/security/audit information here.
export const verifyStampByRef = query({
  args: { stampRef: v.string() },
  handler: async (ctx, args): Promise<{
    valid: boolean;
    stampRef: string;
    status?: "applied" | "revoked" | "superseded" | "invalid";
    docType?: string;
    appliedAt?: string;
    revokedAt?: string;
    message: string;
  }> => {
    const cleanRef = args.stampRef.trim();
    const stamp = await ctx.db.query("eStamps").withIndex("by_stampRef", (q) => q.eq("stampRef", cleanRef)).first();
    if (!stamp) {
      return { valid: false, stampRef: cleanRef, message: "No official Geodata e-stamp was found with this reference." };
    }
    const messages: Record<Doc<"eStamps">["status"], string> = {
      applied: "This document carries a valid, currently active official GEODATA WORLD SERVICES LIMITED e-stamp.",
      revoked: "This e-stamp has been revoked and is no longer valid.",
      superseded: "This e-stamp was applied to an earlier version of the document that has since been superseded.",
      invalid: "This e-stamp is not valid.",
    };
    return {
      valid: stamp.status === "applied",
      stampRef: stamp.stampRef,
      status: stamp.status,
      docType: stamp.docType,
      appliedAt: stamp.appliedAt,
      revokedAt: stamp.revokedAt,
      message: messages[stamp.status],
    };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────

export const applyStamp = mutation({
  args: { vaultDocumentId: v.id("vaultDocuments") },
  handler: async (ctx, args): Promise<Id<"eStamps">> => {
    const user = await requireStaff(ctx);
    await requireStampPermission(ctx, user, "estamp.apply");
    await requireFeatureEnabled(ctx, "feature_corporate_estamp");

    const doc = await ctx.db.get(args.vaultDocumentId);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Document not found in the vault" });
    if (doc.isLatestVersion === false) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Only the latest version of a document can be stamped" });
    }

    const existing = await ctx.db.query("eStamps").withIndex("by_document", (q) => q.eq("vaultDocumentId", args.vaultDocumentId)).collect();
    if (existing.some((s) => s.status === "applied")) {
      throw new ConvexError({ code: "CONFLICT", message: "This document version already carries a valid e-stamp" });
    }

    const stampRef = await nextStampRef(ctx);
    const docHash = await computeDocHash(doc.docRef, doc.version, doc.fileUrl);
    const appliedAt = new Date().toISOString(); // server clock only — never client-supplied

    const stampId = await ctx.db.insert("eStamps", {
      stampRef,
      vaultDocumentId: args.vaultDocumentId,
      docRef: doc.docRef,
      version: doc.version,
      docType: doc.docType,
      docHash,
      status: "applied",
      appliedBy: user._id,
      appliedAt,
    });

    await ctx.db.patch(args.vaultDocumentId, { eStampStatus: "applied" });

    await logAudit(ctx, {
      action: "create",
      entity: "eStamps",
      entityId: stampId,
      entityRef: stampRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Applied official Geodata e-stamp "${stampRef}" to "${doc.title}" (${doc.docRef} v${doc.version})`,
    });

    return stampId;
  },
});

export const revokeStamp = mutation({
  args: { id: v.id("eStamps"), reason: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireStaff(ctx);
    await requireStampPermission(ctx, user, "estamp.revoke");
    await requireFeatureEnabled(ctx, "feature_corporate_estamp");

    const stamp = await ctx.db.get(args.id);
    if (!stamp) throw new ConvexError({ code: "NOT_FOUND", message: "E-stamp not found" });
    if (stamp.status !== "applied") {
      throw new ConvexError({ code: "CONFLICT", message: "Only a currently applied e-stamp can be revoked" });
    }
    if (!args.reason.trim()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "A reason is required to revoke an e-stamp" });
    }

    await ctx.db.patch(args.id, { status: "revoked", revokedBy: user._id, revokedAt: new Date().toISOString(), revokeReason: args.reason.trim() });
    await ctx.db.patch(stamp.vaultDocumentId, { eStampStatus: "revoked" });

    await logAudit(ctx, {
      action: "revoke",
      entity: "eStamps",
      entityId: args.id,
      entityRef: stamp.stampRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Revoked official Geodata e-stamp "${stamp.stampRef}" on "${stamp.docRef}" v${stamp.version} — ${args.reason.trim()}`,
    });
  },
});

// STAMP_ADMIN-only: marks a stamp permanently invalid (e.g. discovered to
// have been applied in error). Distinct from revoke, which is the normal
// business-reason withdrawal path available to STAMP_REVOKE holders.
export const markStampInvalid = mutation({
  args: { id: v.id("eStamps"), reason: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireStaff(ctx);
    await requireStampPermission(ctx, user, "estamp.admin");
    await requireFeatureEnabled(ctx, "feature_corporate_estamp");

    const stamp = await ctx.db.get(args.id);
    if (!stamp) throw new ConvexError({ code: "NOT_FOUND", message: "E-stamp not found" });
    if (stamp.status === "invalid") {
      throw new ConvexError({ code: "CONFLICT", message: "This e-stamp is already marked invalid" });
    }
    if (!args.reason.trim()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "A reason is required to invalidate an e-stamp" });
    }

    await ctx.db.patch(args.id, { status: "invalid", invalidatedBy: user._id, invalidatedAt: new Date().toISOString(), invalidateReason: args.reason.trim() });
    if (stamp.status === "applied") {
      await ctx.db.patch(stamp.vaultDocumentId, { eStampStatus: "invalid" });
    }

    await logAudit(ctx, {
      action: "update",
      entity: "eStamps",
      entityId: args.id,
      entityRef: stamp.stampRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Marked official Geodata e-stamp "${stamp.stampRef}" invalid — ${args.reason.trim()}`,
    });
  },
});

// Idempotent seed for the five granular e-stamp permissions. Safe to call
// multiple times; only inserts what's missing. Only an existing admin can
// run it (consistent with seedFeatureSettingsPermissions / seedInitialPermissions).
export const seedStampPermissions = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requireStaff(ctx);
    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const existing = await ctx.db.query("iamPermissions").withIndex("by_module", (q) => q.eq("module", "estamp")).collect();
    const existingKeys = new Set(existing.map((p) => p.key));
    const labels: Record<StampPermission, { action: string; label: string; sensitive: boolean }> = {
      "estamp.view": { action: "VIEW", label: "View Official Geodata E-Stamps", sensitive: false },
      "estamp.apply": { action: "APPLY", label: "Apply Official Geodata E-Stamp", sensitive: true },
      "estamp.revoke": { action: "REVOKE", label: "Revoke Official Geodata E-Stamp", sensitive: true },
      "estamp.admin": { action: "ADMIN", label: "Administer Official Geodata E-Stamps", sensitive: true },
      "estamp.audit": { action: "AUDIT", label: "Audit Official Geodata E-Stamp Register", sensitive: false },
    };
    let inserted = 0;
    for (const key of STAMP_PERMISSIONS) {
      if (existingKeys.has(key)) continue;
      const meta = labels[key];
      await ctx.db.insert("iamPermissions", { key, module: "estamp", action: meta.action, label: meta.label, sensitive: meta.sensitive });
      inserted++;
    }
    return { inserted };
  },
});
