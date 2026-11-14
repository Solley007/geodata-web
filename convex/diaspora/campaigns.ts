import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { requirePermission } from "./feature.ts";
import { hasPermission } from "../iam/access.ts";
import { tokenOf } from "../authIdentity";

// ══════════════════════════════════════════════════════════════════════════
// Diaspora Campaigns — activations of the permanent platform (e.g. NBLBF2026
// is the first, not the platform's identity). A campaign never creates a
// parallel CRM: it only tags which programmes are active for it and, later
// (milestone-85), attributes leads back to it via a denormalized counter.
// ══════════════════════════════════════════════════════════════════════════

const PROGRAMME_KEY = v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate"));
const STATUS = v.union(
  v.literal("draft"),
  v.literal("scheduled"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed"),
  v.literal("archived"),
);

const DEFAULT_PROGRAMME_KEYS: Array<Doc<"diasporaProgrammes">["key"]> = ["own", "invest", "partner", "refer", "corporate"];

// URL-safe slug for /diaspora/:campaignSlug — lowercase, hyphenated, no
// special characters. Returns undefined for an empty/whitespace-only input.
function normalizeSlug(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const slug = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || undefined;
}

type CampaignWithProgrammes = Doc<"diasporaCampaigns"> & { programmes: Array<{ programmeKey: Doc<"diasporaProgrammes">["key"]; enabled: boolean }> };

// ── Admin: list all campaigns with their programme assignment matrix ────
export const listCampaigns = query({
  args: { status: v.optional(STATUS) },
  handler: async (ctx, args): Promise<Array<CampaignWithProgrammes>> => {
    await requirePermission(ctx, "diaspora.view", { requireEnabled: false });

    const rows = args.status
      ? await ctx.db.query("diasporaCampaigns").withIndex("by_status", (q) => q.eq("status", args.status!)).order("desc").collect()
      : await ctx.db.query("diasporaCampaigns").order("desc").collect();

    const allAssignments = await ctx.db.query("diasporaCampaignProgrammes").collect();
    return rows.map((c) => ({
      ...c,
      programmes: allAssignments.filter((a) => a.campaignId === c._id).map((a) => ({ programmeKey: a.programmeKey, enabled: a.enabled })),
    }));
  },
});

export const getCampaign = query({
  args: { id: v.id("diasporaCampaigns") },
  handler: async (ctx, args): Promise<CampaignWithProgrammes> => {
    await requirePermission(ctx, "diaspora.view", { requireEnabled: false });
    const campaign = await ctx.db.get(args.id);
    if (!campaign) throw new ConvexError({ code: "NOT_FOUND", message: "Campaign not found" });

    const assignments = await ctx.db.query("diasporaCampaignProgrammes").withIndex("by_campaign", (q) => q.eq("campaignId", args.id)).collect();
    return { ...campaign, programmes: assignments.map((a) => ({ programmeKey: a.programmeKey, enabled: a.enabled })) };
  },
});

// Public: only campaigns that are active and have a published landing page.
export const listPublicCampaigns = query({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"diasporaCampaigns">>> => {
    const rows = await ctx.db.query("diasporaCampaigns").withIndex("by_status", (q) => q.eq("status", "active")).collect();
    return rows.filter((c) => c.landingPagePublished === "published");
  },
});

// Public: resolve a campaign's landing page by its slug
// (/diaspora/:campaignSlug). A "published" landing page is visible to every
// visitor. A "preview" landing page is only visible to a signed-in staff
// member holding `diaspora.view` — authorized admins can review a campaign
// page before it goes live without a separate preview server. "draft" is
// never publicly reachable.
export const getPublicCampaignBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args): Promise<(CampaignWithProgrammes & { isPreview: boolean }) | null> => {
    const campaign = await ctx.db.query("diasporaCampaigns").withIndex("by_slug", (q) => q.eq("slug", args.slug)).first();
    if (!campaign) return null;

    if (campaign.landingPagePublished === "draft") return null;

    if (campaign.landingPagePublished === "preview") {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;
      const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
      if (!user) return null;
      const allowed = (await hasPermission(ctx, user._id, "diaspora.view")) || user.role === "super_admin";
      if (!allowed) return null;
    }

    const assignments = await ctx.db.query("diasporaCampaignProgrammes").withIndex("by_campaign", (q) => q.eq("campaignId", campaign._id)).collect();
    return {
      ...campaign,
      programmes: assignments.map((a) => ({ programmeKey: a.programmeKey, enabled: a.enabled })),
      isPreview: campaign.landingPagePublished === "preview",
    };
  },
});

export const createCampaign = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    slug: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    marketId: v.optional(v.id("diasporaMarkets")),
    campaignType: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    assignedTeam: v.optional(v.array(v.id("users"))),
    qrEnabled: v.optional(v.boolean()),
    programmeKeys: v.optional(v.array(PROGRAMME_KEY)), // programmes to turn ON at creation; defaults to all 5
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"diasporaCampaigns">> => {
    const user = await requirePermission(ctx, "diaspora.campaign_manage", { requireEnabled: false });
    const name = args.name.trim();
    const code = args.code.trim().toUpperCase().replace(/\s+/g, "-");
    if (!name) throw new ConvexError({ code: "BAD_REQUEST", message: "Campaign name is required" });
    if (!code) throw new ConvexError({ code: "BAD_REQUEST", message: "Campaign code is required" });

    const existingCode = await ctx.db.query("diasporaCampaigns").withIndex("by_code", (q) => q.eq("code", code)).first();
    if (existingCode) throw new ConvexError({ code: "CONFLICT", message: `Campaign code "${code}" is already in use` });

    const slug = normalizeSlug(args.slug) ?? normalizeSlug(code) ?? undefined;
    if (slug) {
      const existingSlug = await ctx.db.query("diasporaCampaigns").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
      if (existingSlug) throw new ConvexError({ code: "CONFLICT", message: `Landing page URL "/diaspora/${slug}" is already in use` });
    }

    // Safe-config rule: a campaign can only turn ON a programme that is
    // itself enabled platform-wide.
    const requestedKeys = args.programmeKeys ?? DEFAULT_PROGRAMME_KEYS;
    const allProgrammes = await ctx.db.query("diasporaProgrammes").collect();
    const programmeByKey = new Map(allProgrammes.map((p) => [p.key, p]));

    const id = await ctx.db.insert("diasporaCampaigns", {
      name,
      code,
      slug,
      country: args.country,
      city: args.city,
      marketId: args.marketId,
      campaignType: args.campaignType,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "draft",
      assignedTeam: args.assignedTeam,
      qrEnabled: args.qrEnabled ?? false,
      landingPagePublished: "draft",
      leadCount: 0,
      notes: args.notes,
      createdBy: user._id,
    });

    for (const key of DEFAULT_PROGRAMME_KEYS) {
      const wantsEnabled = requestedKeys.includes(key);
      const programme = programmeByKey.get(key);
      // Never enable a programme for a campaign if the programme itself is
      // disabled platform-wide — the row still exists so the toggle can be
      // flipped later once the programme is re-enabled.
      const enabled = wantsEnabled && programme?.enabled === true;
      await ctx.db.insert("diasporaCampaignProgrammes", { campaignId: id, programmeKey: key, enabled });
    }

    await logAudit(ctx, {
      action: "create", entity: "diaspora_campaigns", entityId: id, entityRef: code,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created Diaspora campaign "${name}" (${code})`,
    });

    return id;
  },
});

export const updateCampaign = mutation({
  args: {
    id: v.id("diasporaCampaigns"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    marketId: v.optional(v.id("diasporaMarkets")),
    campaignType: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    assignedTeam: v.optional(v.array(v.id("users"))),
    qrEnabled: v.optional(v.boolean()),
    landingPagePublished: v.optional(v.union(v.literal("draft"), v.literal("preview"), v.literal("published"))),
    notes: v.optional(v.string()),
    heroHeadline: v.optional(v.string()),
    heroSubheadline: v.optional(v.string()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.campaign_manage", { requireEnabled: false });
    const { id, slug: rawSlug, ...patch } = args;
    const campaign = await ctx.db.get(id);
    if (!campaign) throw new ConvexError({ code: "NOT_FOUND", message: "Campaign not found" });

    const filtered: Record<string, unknown> = Object.fromEntries(Object.entries(patch).filter(([, val]) => val !== undefined));

    if (rawSlug !== undefined) {
      const slug = normalizeSlug(rawSlug);
      if (slug && slug !== campaign.slug) {
        const existingSlug = await ctx.db.query("diasporaCampaigns").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
        if (existingSlug && existingSlug._id !== id) throw new ConvexError({ code: "CONFLICT", message: `Landing page URL "/diaspora/${slug}" is already in use` });
      }
      filtered.slug = slug;
    }

    if (Object.keys(filtered).length === 0) return;

    await ctx.db.patch(id, filtered);

    await logAudit(ctx, {
      action: "update", entity: "diaspora_campaigns", entityId: id, entityRef: campaign.code,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated Diaspora campaign "${campaign.name}"`,
      before: JSON.stringify(campaign),
      after: JSON.stringify(filtered),
    });
  },
});

const STATUS_LABELS: Record<Doc<"diasporaCampaigns">["status"], string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

// Safe-config rule (spec section 16): archived/completed campaigns cannot
// accept new leads unless explicitly reopened by an admin changing status
// back to active/scheduled/paused. This mutation is the only way to change
// status, so the rule is enforced in exactly one place.
export const updateCampaignStatus = mutation({
  args: { id: v.id("diasporaCampaigns"), status: STATUS, reason: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.campaign_manage", { requireEnabled: false });
    const campaign = await ctx.db.get(args.id);
    if (!campaign) throw new ConvexError({ code: "NOT_FOUND", message: "Campaign not found" });

    await ctx.db.patch(args.id, { status: args.status });

    await logAudit(ctx, {
      action: "update", entity: "diaspora_campaigns", entityId: args.id, entityRef: campaign.code,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Campaign "${campaign.name}" status: ${STATUS_LABELS[campaign.status]} → ${STATUS_LABELS[args.status]}`,
      before: JSON.stringify({ status: campaign.status }),
      after: JSON.stringify({ status: args.status }),
      metadata: args.reason ? JSON.stringify({ reason: args.reason }) : undefined,
    });
  },
});

// Whether a campaign is currently allowed to accept new leads/enquiries —
// the single source of truth used by the future public enquiry mutation
// (milestone-85) and any UI that needs to show/hide a campaign's forms.
export function campaignAcceptsLeads(campaign: Doc<"diasporaCampaigns">): boolean {
  return campaign.status === "active" || campaign.status === "scheduled" || campaign.status === "paused" ? campaign.status !== "paused" : false;
}

// ── Per-campaign programme toggle ───────────────────────────────────────
export const updateCampaignProgrammeToggle = mutation({
  args: { campaignId: v.id("diasporaCampaigns"), programmeKey: PROGRAMME_KEY, enabled: v.boolean() },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.campaign_manage", { requireEnabled: false });
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new ConvexError({ code: "NOT_FOUND", message: "Campaign not found" });

    // Safe-config rule: a disabled programme can never be turned ON for a
    // campaign, even if requested — it must be re-enabled platform-wide first.
    if (args.enabled) {
      const programme = await ctx.db.query("diasporaProgrammes").withIndex("by_key", (q) => q.eq("key", args.programmeKey)).unique();
      if (!programme?.enabled) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "This programme is disabled platform-wide and cannot be turned on for a campaign. Enable it under Programmes first." });
      }
    }

    const assignment = await ctx.db
      .query("diasporaCampaignProgrammes")
      .withIndex("by_campaign_and_programme", (q) => q.eq("campaignId", args.campaignId).eq("programmeKey", args.programmeKey))
      .unique();

    if (assignment) {
      await ctx.db.patch(assignment._id, { enabled: args.enabled });
    } else {
      await ctx.db.insert("diasporaCampaignProgrammes", { campaignId: args.campaignId, programmeKey: args.programmeKey, enabled: args.enabled });
    }

    await logAudit(ctx, {
      action: "update", entity: "diaspora_campaign_programmes", entityId: args.campaignId, entityRef: campaign.code,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Campaign "${campaign.name}": ${args.programmeKey} programme ${args.enabled ? "enabled" : "disabled"}`,
      before: JSON.stringify({ programmeKey: args.programmeKey, enabled: assignment?.enabled ?? false }),
      after: JSON.stringify({ programmeKey: args.programmeKey, enabled: args.enabled }),
    });
  },
});

export const deleteCampaign = mutation({
  args: { id: v.id("diasporaCampaigns") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.campaign_manage", { requireEnabled: false });
    const campaign = await ctx.db.get(args.id);
    if (!campaign) throw new ConvexError({ code: "NOT_FOUND", message: "Campaign not found" });

    if (campaign.leadCount > 0) {
      throw new ConvexError({ code: "CONFLICT", message: "Cannot delete a campaign with attributed leads. Archive it instead to preserve history." });
    }

    const assignments = await ctx.db.query("diasporaCampaignProgrammes").withIndex("by_campaign", (q) => q.eq("campaignId", args.id)).collect();
    for (const a of assignments) await ctx.db.delete(a._id);
    await ctx.db.delete(args.id);

    await logAudit(ctx, {
      action: "delete", entity: "diaspora_campaigns", entityId: args.id, entityRef: campaign.code,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Deleted Diaspora campaign "${campaign.name}"`,
      before: JSON.stringify(campaign),
    });
  },
});

// ── Seed the NBLBF2026 example campaign (spec section 11) — one example
// activation, fully editable/renameable, never hard-coded into platform logic.
export const seedNblbf2026 = mutation({
  args: {},
  handler: async (ctx): Promise<{ created: boolean }> => {
    const user = await requirePermission(ctx, "diaspora.campaign_manage", { requireEnabled: false });
    const existing = await ctx.db.query("diasporaCampaigns").withIndex("by_code", (q) => q.eq("code", "NBLBF2026")).first();
    if (existing) return { created: false };

    const id = await ctx.db.insert("diasporaCampaigns", {
      name: "Nigeria–Belgium–Luxembourg Business Forum 2026",
      code: "NBLBF2026",
      slug: "nblbf-2026",
      country: "Belgium",
      city: "Brussels",
      campaignType: "business_forum",
      description: "First activation of the Geodata Diaspora Investment & Property Platform, hosted at the Nigeria–Belgium–Luxembourg Business Forum, Brussels, 28–30 Oct 2026.",
      startDate: "2026-10-28",
      endDate: "2026-10-30",
      status: "draft",
      qrEnabled: true,
      landingPagePublished: "draft",
      leadCount: 0,
      createdBy: user._id,
    });

    for (const key of DEFAULT_PROGRAMME_KEYS) {
      await ctx.db.insert("diasporaCampaignProgrammes", { campaignId: id, programmeKey: key, enabled: true });
    }

    await logAudit(ctx, {
      action: "create", entity: "diaspora_campaigns", entityId: id, entityRef: "NBLBF2026",
      userId: user._id, userName: user.name, userRole: user.role,
      description: "Seeded example campaign: Nigeria–Belgium–Luxembourg Business Forum 2026 (NBLBF2026)",
    });

    return { created: true };
  },
});

// Lightweight list for pickers.
export const listCampaignOptions = query({
  args: {},
  handler: async (ctx): Promise<Array<{ _id: Doc<"diasporaCampaigns">["_id"]; name: string; code: string; status: Doc<"diasporaCampaigns">["status"] }>> => {
    await requirePermission(ctx, "diaspora.view", { requireEnabled: false });
    const rows = await ctx.db.query("diasporaCampaigns").collect();
    return rows.map((c) => ({ _id: c._id, name: c.name, code: c.code, status: c.status }));
  },
});
