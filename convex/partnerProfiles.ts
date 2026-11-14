import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { findMyPartner, requireAdminCtx } from "./partners.ts";
import { partnerProfileContent, type PartnerProfileContent } from "./schema/partnerProfile.ts";

// ── helpers ─────────────────────────────────────────────────────────────────

const PUBLIC_LIST_LIMIT = 120;

async function withUrls(ctx: QueryCtx, content: PartnerProfileContent | undefined) {
  if (!content) return null;
  return {
    ...content,
    logoUrl: content.logoStorageId ? await ctx.storage.getUrl(content.logoStorageId) : null,
    logoLightUrl: content.logoLightStorageId ? await ctx.storage.getUrl(content.logoLightStorageId) : null,
  };
}

function placementOf(p: Doc<"partnerProfiles">) {
  return {
    slug: p.slug,
    showHomepage: p.showHomepage,
    showDiaspora: p.showDiaspora,
    showDirectory: p.showDirectory,
    featured: p.featured,
    verified: p.verified,
    sortOrder: p.sortOrder,
  };
}

async function presentProfile(ctx: QueryCtx, profile: Doc<"partnerProfiles"> | null) {
  if (!profile) return null;
  return {
    _id: profile._id,
    reviewStatus: profile.reviewStatus,
    submittedAt: profile.submittedAt,
    reviewedAt: profile.reviewedAt,
    rejectionReason: profile.rejectionReason,
    live: await withUrls(ctx, profile.live),
    pending: await withUrls(ctx, profile.pending),
    placement: placementOf(profile),
    delisted: profile.delisted ?? false,
    delistReason: profile.delistReason ?? null,
  };
}

export function computeListed(
  p: Pick<Doc<"partnerProfiles">, "live" | "showHomepage" | "showDiaspora" | "showDirectory" | "delisted">,
) {
  return !!p.live && !p.delisted && (p.showHomepage || p.showDiaspora || p.showDirectory);
}

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "partner";
}

async function uniqueSlug(ctx: MutationCtx, name: string) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await ctx.db.query("partnerProfiles").withIndex("by_slug", (q) => q.eq("slug", slug)).first(); i++) {
    slug = `${base}-${i}`;
  }
  return slug;
}

function cleanContent(c: PartnerProfileContent): PartnerProfileContent {
  const displayName = c.displayName.trim();
  if (displayName.length < 2 || displayName.length > 80) {
    throw new ConvexError({ code: "BAD_REQUEST", message: "Display name must be 2–80 characters." });
  }
  if ((c.tagline ?? "").length > 120) {
    throw new ConvexError({ code: "BAD_REQUEST", message: "Tagline must be 120 characters or fewer." });
  }
  if ((c.description ?? "").length > 1200) {
    throw new ConvexError({ code: "BAD_REQUEST", message: "Description must be 1,200 characters or fewer." });
  }
  let website = c.website?.trim() || undefined;
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  if (website) {
    try {
      new URL(website);
    } catch {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Website address is not valid." });
    }
  }
  return {
    ...c,
    displayName,
    tagline: c.tagline?.trim() || undefined,
    description: c.description?.trim() || undefined,
    country: c.country?.trim() || undefined,
    website,
  };
}

export async function getProfileByPartner(ctx: QueryCtx | MutationCtx, partnerId: Id<"partners">) {
  return await ctx.db
    .query("partnerProfiles")
    .withIndex("by_partner", (q) => q.eq("partnerId", partnerId))
    .unique();
}

/** New profile row with default placement (directory on, others off until admin chooses). */
async function insertProfile(
  ctx: MutationCtx,
  partnerId: Id<"partners">,
  name: string,
  fields: Partial<Doc<"partnerProfiles">> & Pick<Doc<"partnerProfiles">, "reviewStatus">,
) {
  const defaults = {
    showHomepage: false,
    showDiaspora: false,
    showDirectory: true,
    featured: false,
    verified: false,
    sortOrder: 100,
  };
  const row = { partnerId, slug: await uniqueSlug(ctx, name), ...defaults, ...fields };
  return await ctx.db.insert("partnerProfiles", { ...row, listed: computeListed(row) });
}

/** Delete logo files that the old copy used but the new copy no longer references. */
async function deleteReplacedLogos(
  ctx: MutationCtx,
  oldC: PartnerProfileContent | undefined,
  keep: Array<PartnerProfileContent | undefined>,
) {
  if (!oldC) return;
  const kept = new Set(
    keep.flatMap((c) => [c?.logoStorageId, c?.logoLightStorageId]).filter(Boolean),
  );
  for (const id of [oldC.logoStorageId, oldC.logoLightStorageId]) {
    if (id && !kept.has(id)) await ctx.storage.delete(id);
  }
}

async function requireApprovedPartner(ctx: MutationCtx) {
  const partner = await findMyPartner(ctx);
  if (!partner) throw new ConvexError({ code: "FORBIDDEN", message: "Partner account not found." });
  if (partner.status !== "approved") {
    throw new ConvexError({ code: "FORBIDDEN", message: "Only active partners can edit a showcase profile." });
  }
  return partner;
}

async function getStats(ctx: QueryCtx | MutationCtx, partnerId: Id<"partners">) {
  return await ctx.db
    .query("partnerShowcaseStats")
    .withIndex("by_partner", (q) => q.eq("partnerId", partnerId))
    .unique();
}

function presentStats(s: Doc<"partnerShowcaseStats"> | null) {
  return { profileViews: s?.profileViews ?? 0, logoClicks: s?.logoClicks ?? 0, websiteClicks: s?.websiteClicks ?? 0 };
}

// ── PARTNER ─────────────────────────────────────────────────────────────────

export const generateLogoUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    const partner = await findMyPartner(ctx);
    if (!partner) await requireAdminCtx(ctx); // admins may upload on a partner's behalf
    return await ctx.storage.generateUploadUrl();
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const partner = await findMyPartner(ctx);
    if (!partner) return null;
    const profile = await presentProfile(ctx, await getProfileByPartner(ctx, partner._id));
    if (!profile) return null;
    return { ...profile, stats: presentStats(await getStats(ctx, partner._id)) };
  },
});

/** Partner submits (or re-submits) their showcase details for admin approval. */
export const submitMyProfile = mutation({
  args: { content: partnerProfileContent },
  handler: async (ctx, args): Promise<null> => {
    const partner = await requireApprovedPartner(ctx);
    const content = cleanContent(args.content);
    const existing = await getProfileByPartner(ctx, partner._id);
    const now = new Date().toISOString();

    if (existing) {
      // Replacing an older pending draft: drop its logos unless still in use
      await deleteReplacedLogos(ctx, existing.pending, [content, existing.live]);
      await ctx.db.patch(existing._id, {
        pending: content,
        reviewStatus: "pending",
        submittedAt: now,
        rejectionReason: undefined,
      });
    } else {
      await insertProfile(ctx, partner._id, content.displayName, {
        pending: content,
        reviewStatus: "pending",
        submittedAt: now,
      });
    }
    return null;
  },
});

/** Partner cancels a change that is still awaiting review. */
export const withdrawMyChanges = mutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const partner = await requireApprovedPartner(ctx);
    const existing = await getProfileByPartner(ctx, partner._id);
    if (!existing?.pending) return null;
    await deleteReplacedLogos(ctx, existing.pending, [existing.live]);
    await ctx.db.patch(existing._id, { pending: undefined, reviewStatus: "none", rejectionReason: undefined });
    return null;
  },
});

// ── ADMIN ───────────────────────────────────────────────────────────────────

export const listPendingReviews = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminCtx(ctx);
    const rows = await ctx.db
      .query("partnerProfiles")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "pending"))
      .take(100);
    return await Promise.all(
      rows.map(async (row) => {
        const partner = await ctx.db.get(row.partnerId);
        return {
          ...(await presentProfile(ctx, row))!,
          partnerId: row.partnerId,
          partnerName: partner ? (partner.companyName || partner.fullName) : "Unknown partner",
          partnerType: partner?.partnerType ?? "individual",
        };
      }),
    );
  },
});

export const countPendingReviews = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    await requireAdminCtx(ctx);
    const rows = await ctx.db
      .query("partnerProfiles")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "pending"))
      .take(100);
    return rows.length;
  },
});

export const getForPartner = query({
  args: { partnerId: v.id("partners") },
  handler: async (ctx, args) => {
    await requireAdminCtx(ctx);
    const profile = await presentProfile(ctx, await getProfileByPartner(ctx, args.partnerId));
    if (!profile) return null;
    return { ...profile, stats: presentStats(await getStats(ctx, args.partnerId)) };
  },
});

export const approveChanges = mutation({
  args: { profileId: v.id("partnerProfiles") },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireAdminCtx(ctx);
    const profile = await ctx.db.get(args.profileId);
    if (!profile?.pending) {
      throw new ConvexError({ code: "NOT_FOUND", message: "There are no changes awaiting review." });
    }
    await deleteReplacedLogos(ctx, profile.live, [profile.pending]);
    await ctx.db.patch(profile._id, {
      live: profile.pending,
      pending: undefined,
      reviewStatus: "none",
      reviewedAt: new Date().toISOString(),
      reviewedBy: admin._id,
      rejectionReason: undefined,
      listed: computeListed({ ...profile, live: profile.pending }),
    });
    return null;
  },
});

export const rejectChanges = mutation({
  args: { profileId: v.id("partnerProfiles"), reason: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireAdminCtx(ctx);
    const profile = await ctx.db.get(args.profileId);
    if (!profile?.pending) {
      throw new ConvexError({ code: "NOT_FOUND", message: "There are no changes awaiting review." });
    }
    const reason = args.reason.trim();
    if (!reason) throw new ConvexError({ code: "BAD_REQUEST", message: "Please give a reason." });
    // Keep the rejected draft so the partner can see and fix it; live stays untouched
    await ctx.db.patch(profile._id, {
      reviewStatus: "rejected",
      reviewedAt: new Date().toISOString(),
      reviewedBy: admin._id,
      rejectionReason: reason,
    });
    return null;
  },
});

/** Admin edits a partner's showcase directly — goes live immediately. */
export const adminSaveProfile = mutation({
  args: { partnerId: v.id("partners"), content: partnerProfileContent },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireAdminCtx(ctx);
    const partner = await ctx.db.get(args.partnerId);
    if (!partner) throw new ConvexError({ code: "NOT_FOUND", message: "Partner not found." });
    const content = cleanContent(args.content);
    const existing = await getProfileByPartner(ctx, args.partnerId);
    const now = new Date().toISOString();
    if (existing) {
      await deleteReplacedLogos(ctx, existing.live, [content, existing.pending]);
      await ctx.db.patch(existing._id, {
        live: content,
        reviewedAt: now,
        reviewedBy: admin._id,
        listed: computeListed({ ...existing, live: content }),
      });
    } else {
      await insertProfile(ctx, args.partnerId, content.displayName, {
        live: content,
        reviewStatus: "none",
        reviewedAt: now,
        reviewedBy: admin._id,
      });
    }
    return null;
  },
});

/** Admin placement controls: where the logo shows, featured, verified, order. */
export const updatePlacement = mutation({
  args: {
    profileId: v.id("partnerProfiles"),
    showHomepage: v.optional(v.boolean()),
    showDiaspora: v.optional(v.boolean()),
    showDirectory: v.optional(v.boolean()),
    featured: v.optional(v.boolean()),
    verified: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<null> => {
    await requireAdminCtx(ctx);
    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new ConvexError({ code: "NOT_FOUND", message: "Showcase profile not found." });
    const { profileId, ...changes } = args;
    if (changes.sortOrder !== undefined && (!Number.isFinite(changes.sortOrder) || changes.sortOrder < 0)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Display order must be 0 or higher." });
    }
    const patch = Object.fromEntries(Object.entries(changes).filter(([, val]) => val !== undefined));
    const next = { ...profile, ...patch };
    await ctx.db.patch(profileId, { ...patch, listed: computeListed(next) });
    return null;
  },
});

/** Admin overview of every showcase listing (for the placement manager). */
export const listAllForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminCtx(ctx);
    const rows = await ctx.db.query("partnerProfiles").take(300);
    const out = await Promise.all(
      rows.map(async (row) => {
        const partner = await ctx.db.get(row.partnerId);
        const live = row.live;
        return {
          _id: row._id,
          partnerId: row.partnerId,
          partnerName: partner ? (partner.companyName || partner.fullName) : "Unknown partner",
          partnerStatus: partner?.status ?? "unknown",
          displayName: live?.displayName ?? row.pending?.displayName ?? "Untitled",
          category: live?.category ?? row.pending?.category ?? "other",
          logoUrl: live?.logoStorageId ? await ctx.storage.getUrl(live.logoStorageId) : null,
          hasLive: !!live,
          delisted: row.delisted ?? false,
          reviewStatus: row.reviewStatus,
          stats: presentStats(await getStats(ctx, row.partnerId)),
          ...placementOf(row),
        };
      }),
    );
    return out.sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
  },
});

// ── PUBLIC ──────────────────────────────────────────────────────────────────

const placementValidator = v.union(v.literal("homepage"), v.literal("diaspora"), v.literal("directory"));

/** Public logo list for a placement. Suspended/inactive partners never appear. */
export const listPublic = query({
  args: { placement: placementValidator },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("partnerProfiles")
      .withIndex("by_listed_and_sort_order", (q) => q.eq("listed", true))
      .take(PUBLIC_LIST_LIMIT);
    const inPlacement = rows.filter((r) =>
      args.placement === "homepage" ? r.showHomepage : args.placement === "diaspora" ? r.showDiaspora : r.showDirectory,
    );
    const items = await Promise.all(
      inPlacement.map(async (r) => {
        const partner = await ctx.db.get(r.partnerId);
        if (!partner || partner.status !== "approved" || !r.live) return null;
        const live = await withUrls(ctx, r.live);
        return {
          slug: r.slug,
          featured: r.featured,
          verified: r.verified,
          displayName: live!.displayName,
          tagline: live!.tagline ?? null,
          country: live!.country ?? null,
          category: live!.category,
          logoUrl: live!.logoUrl,
          logoLightUrl: live!.logoLightUrl,
        };
      }),
    );
    // Featured partners first, then admin order (index already sorted by sortOrder)
    const visible = items.filter((i): i is NonNullable<typeof i> => i !== null);
    return [...visible.filter((i) => i.featured), ...visible.filter((i) => !i.featured)];
  },
});

/** Public partner profile page. */
export const getPublicBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("partnerProfiles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!row || !row.listed || !row.live) return null;
    const partner = await ctx.db.get(row.partnerId);
    if (!partner || partner.status !== "approved") return null;
    const live = (await withUrls(ctx, row.live))!;
    return {
      slug: row.slug,
      verified: row.verified,
      featured: row.featured,
      referralCode: partner.referralCode,
      partnerType: partner.partnerType ?? "individual",
      ...live,
    };
  },
});

/** Record a showcase view or click. Counters live in their own table. */
export const recordShowcaseEvent = mutation({
  args: {
    slug: v.string(),
    event: v.union(v.literal("profile_view"), v.literal("logo_click"), v.literal("website_click")),
  },
  handler: async (ctx, args): Promise<null> => {
    const row = await ctx.db
      .query("partnerProfiles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!row || !row.listed) return null;
    const field = args.event === "profile_view" ? "profileViews" : args.event === "logo_click" ? "logoClicks" : "websiteClicks";
    const stats = await getStats(ctx, row.partnerId);
    if (stats) {
      await ctx.db.patch(stats._id, { [field]: stats[field] + 1 });
    } else {
      await ctx.db.insert("partnerShowcaseStats", {
        partnerId: row.partnerId,
        profileViews: 0,
        logoClicks: 0,
        websiteClicks: 0,
        [field]: 1,
      });
    }
    return null;
  },
});
