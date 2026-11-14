import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// The five permanent Diaspora programmes (Own/Invest/Partner/Refer/Corporate)
// per spec section 5. Fixed set — never user-creatable/deletable — admins
// only configure the five toggles on each (spec section 6):
// Enabled, Public Visibility, Accepting Enquiries, Featured, Registration Open.
// ══════════════════════════════════════════════════════════════════════════

type ProgrammeKey = Doc<"diasporaProgrammes">["key"];

const DEFAULT_PROGRAMMES: Array<{
  key: ProgrammeKey;
  label: string;
  description: string;
  ctaLabel: string;
  order: number;
}> = [
  {
    key: "own",
    label: "Diaspora Homeownership Package",
    description:
      "For Nigerians in the Diaspora, returning residents and other qualified customers who want to own residential property in Nigeria.",
    ctaLabel: "I Want to Own",
    order: 1,
  },
  {
    key: "invest",
    label: "Diaspora Property Investment Package",
    description: "For Diaspora and international investors seeking Nigerian real-estate investment opportunities.",
    ctaLabel: "I Want to Invest",
    order: 2,
  },
  {
    key: "partner",
    label: "Diaspora Development & Partnership Package",
    description:
      "For developers, investors, landowners, infrastructure partners, construction partners and institutional investors seeking development or strategic partnerships.",
    ctaLabel: "I Want to Partner",
    order: 3,
  },
  {
    key: "refer",
    label: "Diaspora Referral & Sales Partner Programme",
    description: "Register, get verified, and earn commission by referring clients to Geodata property and investment opportunities.",
    ctaLabel: "I Want to Refer",
    order: 4,
  },
  {
    key: "corporate",
    label: "Diaspora Corporate & Institutional Package",
    description:
      "For businesses, institutions, NGOs and organisations seeking staff housing, bulk property acquisition, institutional housing or development partnerships.",
    ctaLabel: "I Represent an Organisation",
    order: 5,
  },
];

// ── Seed the 5 fixed programmes (idempotent — only inserts what's missing) ──
export const seedProgrammes = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requirePermission(ctx, "diaspora.programme_manage", { requireEnabled: false });
    const existing = await ctx.db.query("diasporaProgrammes").collect();
    const existingKeys = new Set(existing.map((p) => p.key));
    let inserted = 0;
    for (const p of DEFAULT_PROGRAMMES) {
      if (existingKeys.has(p.key)) continue;
      await ctx.db.insert("diasporaProgrammes", {
        ...p,
        enabled: true,
        publicVisible: true,
        acceptingEnquiries: true,
        featured: false,
        registrationOpen: true,
        updatedBy: user._id,
      });
      inserted++;
    }
    return { inserted };
  },
});

// ── Admin: list all programmes (with toggles) ───────────────────────────
export const listProgrammes = query({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"diasporaProgrammes">>> => {
    await requirePermission(ctx, "diaspora.view", { requireEnabled: false });
    const rows = await ctx.db.query("diasporaProgrammes").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

// ── Public: list programmes visible to end users, respecting the master
//    toggle (checked by the caller, since this query intentionally stays
//    permission-free for public consumption) and each programme's own
//    enabled/publicVisible state.
export const listPublicProgrammes = query({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"diasporaProgrammes">>> => {
    const rows = await ctx.db.query("diasporaProgrammes").collect();
    return rows
      .filter((p) => p.enabled && p.publicVisible)
      .sort((a, b) => a.order - b.order);
  },
});

const PROGRAMME_TOGGLE_FIELDS = ["enabled", "publicVisible", "acceptingEnquiries", "featured", "registrationOpen"] as const;
type ProgrammeToggleField = (typeof PROGRAMME_TOGGLE_FIELDS)[number];

const TOGGLE_LABELS: Record<ProgrammeToggleField, string> = {
  enabled: "Enabled",
  publicVisible: "Public Visibility",
  acceptingEnquiries: "Accepting Enquiries",
  featured: "Featured",
  registrationOpen: "Registration Open",
};

export const updateProgrammeToggle = mutation({
  args: {
    id: v.id("diasporaProgrammes"),
    field: v.union(...PROGRAMME_TOGGLE_FIELDS.map((f) => v.literal(f))),
    value: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.programme_manage", { requireEnabled: false });
    const programme = await ctx.db.get(args.id);
    if (!programme) throw new ConvexError({ code: "NOT_FOUND", message: "Programme not found" });

    const previousValue = programme[args.field];
    await ctx.db.patch(args.id, { [args.field]: args.value, updatedBy: user._id });

    await logAudit(ctx, {
      action: "update",
      entity: "diaspora_programmes",
      entityId: args.id,
      entityRef: programme.key,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Programme: ${programme.label}\nSetting: ${TOGGLE_LABELS[args.field]}\nPrevious: ${previousValue ? "Enabled" : "Disabled"}\nNew: ${args.value ? "Enabled" : "Disabled"}`,
      before: JSON.stringify({ [args.field]: previousValue }),
      after: JSON.stringify({ [args.field]: args.value }),
      metadata: args.reason ? JSON.stringify({ reason: args.reason }) : undefined,
    });
  },
});

// ── Update editable text fields (label/description/ctaLabel) — copy only,
//    never the fixed `key`.
export const updateProgrammeContent = mutation({
  args: {
    id: v.id("diasporaProgrammes"),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    ctaLabel: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.cta_manage", { requireEnabled: false });
    const { id, ...patch } = args;
    const programme = await ctx.db.get(id);
    if (!programme) throw new ConvexError({ code: "NOT_FOUND", message: "Programme not found" });
    const filtered = Object.fromEntries(Object.entries(patch).filter(([, val]) => val !== undefined));
    if (Object.keys(filtered).length === 0) return;

    await ctx.db.patch(id, { ...filtered, updatedBy: user._id });

    await logAudit(ctx, {
      action: "update", entity: "diaspora_programmes", entityId: id, entityRef: programme.key,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated content for programme "${programme.label}"`,
      before: JSON.stringify(programme),
      after: JSON.stringify(filtered),
    });
  },
});
