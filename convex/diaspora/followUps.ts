import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Diaspora enquiry settings + the 48-hour follow-up desk.
// Mirrors the "Geodata use only" box on the printed lead capture form:
// lead owner, date received, 48-hour follow-up due, status / notes.
// Everything works off the EXISTING `leads` table — no new CRM table, no
// schema change. "Due" is derived from the lead's creation time.
// ══════════════════════════════════════════════════════════════════════════

const FORUM_OPTION_KEY = "diaspora_forum_option_visible";
export const FOLLOW_UP_WINDOW_MS = 48 * 60 * 60 * 1000;
// Bounded read budget for the reactive follow-up list.
const MAX_ROWS = 200;

// Public: the enquiry form reads this to decide whether to offer
// "Meet at the forum (28–29 October)". Defaults to visible.
export const getEnquirySettings = query({
  args: {},
  handler: async (ctx): Promise<{ forumOptionVisible: boolean }> => {
    const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", FORUM_OPTION_KEY)).first();
    return { forumOptionVisible: row?.value !== "false" };
  },
});

export const setForumOptionVisible = mutation({
  args: { visible: v.boolean() },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.cta_manage", { requireEnabled: false });
    const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", FORUM_OPTION_KEY)).first();
    const before = row?.value !== "false";
    if (row) await ctx.db.patch(row._id, { value: String(args.visible) });
    else await ctx.db.insert("siteSettings", { key: FORUM_OPTION_KEY, value: String(args.visible) });
    await logAudit(ctx, {
      action: "update", entity: "diaspora_setting", entityRef: FORUM_OPTION_KEY,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `${args.visible ? "Showed" : "Hid"} the "Meet at the forum" option on the Diaspora enquiry form`,
      before: JSON.stringify({ visible: before }), after: JSON.stringify({ visible: args.visible }),
    });
  },
});

const STAGE_FILTER = v.union(v.literal("new"), v.literal("contacted"));

export type FollowUpRow = {
  _id: Id<"leads">;
  name: string;
  email: string | undefined;
  phone: string;
  country: string | undefined;
  programmeInterest: Doc<"leads">["programmeInterest"];
  source: string;
  stage: string;
  notes: string | undefined;
  assignedTo: Id<"users"> | undefined;
  ownerName: string | undefined;
  campaignName: string | undefined;
  receivedAt: number;
  dueAt: number;
};

// Staff: Diaspora leads awaiting first contact ("new") or recently
// contacted, oldest-due first so overdue leads surface at the top.
export const listFollowUps = query({
  args: { stage: STAGE_FILTER },
  handler: async (ctx, args): Promise<FollowUpRow[]> => {
    await requirePermission(ctx, "diaspora.view", { requireEnabled: false });
    const leads = await ctx.db.query("leads").withIndex("by_stage", (q) => q.eq("stage", args.stage)).order("desc").take(MAX_ROWS);
    // Only Diaspora-platform leads carry programmeInterest.
    const diaspora = leads.filter((l) => l.programmeInterest !== undefined && l.programmeInterest.length > 0);

    // Batch-resolve owners and campaigns instead of one lookup per row.
    const ownerIds = [...new Set(diaspora.map((l) => l.assignedTo).filter((id): id is Id<"users"> => id !== undefined))];
    const campaignIds = [...new Set(diaspora.map((l) => l.diasporaCampaignId).filter((id): id is Id<"diasporaCampaigns"> => id !== undefined))];
    const owners = await Promise.all(ownerIds.map((id) => ctx.db.get(id)));
    const campaigns = await Promise.all(campaignIds.map((id) => ctx.db.get(id)));
    const ownerName = new Map(owners.filter((u): u is Doc<"users"> => u !== null).map((u) => [u._id, u.name ?? u.email ?? "Staff"]));
    const campaignName = new Map(campaigns.filter((c): c is Doc<"diasporaCampaigns"> => c !== null).map((c) => [c._id, c.name]));

    return diaspora
      .map((l) => ({
        _id: l._id, name: l.name, email: l.email, phone: l.phone, country: l.country,
        programmeInterest: l.programmeInterest, source: l.source, stage: l.stage, notes: l.notes,
        assignedTo: l.assignedTo,
        ownerName: l.assignedTo ? ownerName.get(l.assignedTo) : undefined,
        campaignName: l.diasporaCampaignId ? campaignName.get(l.diasporaCampaignId) : undefined,
        receivedAt: l._creationTime,
        dueAt: l._creationTime + FOLLOW_UP_WINDOW_MS,
      }))
      .sort((a, b) => a.dueAt - b.dueAt);
  },
});

export const updateFollowUp = mutation({
  args: {
    id: v.id("leads"),
    assignedTo: v.optional(v.union(v.id("users"), v.null())),
    stage: v.optional(v.union(v.literal("new"), v.literal("contacted"), v.literal("qualified"), v.literal("lost"))),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.consultation_manage", { requireEnabled: false });
    const lead = await ctx.db.get(args.id);
    if (!lead) throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found" });

    const patch: Partial<Doc<"leads">> = {};
    if (args.assignedTo !== undefined) patch.assignedTo = args.assignedTo ?? undefined;
    if (args.stage) patch.stage = args.stage;
    const note = args.note?.trim();
    if (note) {
      // Append, never overwrite — the visitor's original answers live in notes too.
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const line = `[${stamp} UTC · ${user.name ?? "Staff"}] ${note}`;
      patch.notes = lead.notes ? `${lead.notes}\n${line}` : line;
    }
    if (Object.keys(patch).length === 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Nothing to update" });

    await ctx.db.patch(args.id, patch);
    await ctx.db.insert("activityLog", {
      userId: user._id, action: "update", entity: "lead", entityId: args.id,
      details: `Diaspora follow-up updated${args.stage ? ` — stage: ${args.stage}` : ""}${note ? " — note added" : ""}`,
    });
  },
});
