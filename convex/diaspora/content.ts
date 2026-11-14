import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { logAudit } from "../taskboard.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Diaspora CMS content — hero headline/sub-headline per programme (plus the
// hub itself) and an FAQ list per programme. Stored as one JSON blob under
// the existing `siteSettings` key/value pattern (mirrors `cms.ts`'s
// `categories` key), never a bespoke content table. Admin-editable through
// a CMS tab in the Diaspora admin section; public pages read this instead
// of hard-coded copy. Testimonials reuse the EXISTING `testimonials` table
// (tagged with `diasporaVisible`/`diasporaProgrammeKey`), never duplicated.
// ══════════════════════════════════════════════════════════════════════════

export const CONTENT_KEY = "diaspora_content";

const PROGRAMME_KEY = v.union(v.literal("own"), v.literal("invest"), v.literal("partner"), v.literal("refer"), v.literal("corporate"));
type ProgrammeKeyT = "own" | "invest" | "partner" | "refer" | "corporate";
const PROGRAMME_KEYS: ProgrammeKeyT[] = ["own", "invest", "partner", "refer", "corporate"];

export type FaqEntry = { question: string; answer: string };
export type ProgrammeContent = { heroHeadline: string; heroSubheadline: string; faqs: FaqEntry[] };
export type DiasporaContent = {
  hub: { heroHeadline: string; heroSubheadline: string };
  programmes: Record<ProgrammeKeyT, ProgrammeContent>;
};

const EMPTY_PROGRAMME_CONTENT: ProgrammeContent = { heroHeadline: "", heroSubheadline: "", faqs: [] };

const DEFAULT_CONTENT: DiasporaContent = {
  hub: { heroHeadline: "", heroSubheadline: "" },
  programmes: {
    own: { ...EMPTY_PROGRAMME_CONTENT },
    invest: { ...EMPTY_PROGRAMME_CONTENT },
    partner: { ...EMPTY_PROGRAMME_CONTENT },
    refer: { ...EMPTY_PROGRAMME_CONTENT },
    corporate: { ...EMPTY_PROGRAMME_CONTENT },
  },
};

function parseContent(raw: string | null | undefined): DiasporaContent {
  if (!raw) return DEFAULT_CONTENT;
  try {
    const parsed = JSON.parse(raw) as Partial<DiasporaContent>;
    const programmes = { ...DEFAULT_CONTENT.programmes };
    for (const key of PROGRAMME_KEYS) {
      programmes[key] = { ...EMPTY_PROGRAMME_CONTENT, ...(parsed.programmes?.[key] ?? {}) };
    }
    return { hub: { ...DEFAULT_CONTENT.hub, ...(parsed.hub ?? {}) }, programmes };
  } catch {
    return DEFAULT_CONTENT;
  }
}

// Public: read-only, no auth required — the hub and every programme page
// read their copy from here instead of hard-coded strings.
export const getContent = query({
  args: {},
  handler: async (ctx): Promise<DiasporaContent> => {
    const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", CONTENT_KEY)).first();
    return parseContent(row?.value ?? null);
  },
});

export const updateContent = mutation({
  args: {
    hub: v.optional(v.object({ heroHeadline: v.string(), heroSubheadline: v.string() })),
    programmeKey: v.optional(PROGRAMME_KEY),
    programmeContent: v.optional(v.object({
      heroHeadline: v.string(),
      heroSubheadline: v.string(),
      faqs: v.array(v.object({ question: v.string(), answer: v.string() })),
    })),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await requirePermission(ctx, "diaspora.cta_manage", { requireEnabled: false });
    if (!args.hub && !(args.programmeKey && args.programmeContent)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Nothing to update" });
    }

    const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", CONTENT_KEY)).first();
    const current = parseContent(row?.value ?? null);
    const next: DiasporaContent = {
      hub: args.hub ?? current.hub,
      programmes: args.programmeKey && args.programmeContent
        ? { ...current.programmes, [args.programmeKey]: args.programmeContent }
        : current.programmes,
    };

    const value = JSON.stringify(next);
    if (row) {
      await ctx.db.patch(row._id, { value });
    } else {
      await ctx.db.insert("siteSettings", { key: CONTENT_KEY, value });
    }

    await logAudit(ctx, {
      action: "update", entity: "diaspora_content", entityRef: args.programmeKey ?? "hub",
      userId: user._id, userName: user.name, userRole: user.role,
      description: args.programmeKey ? `Updated Diaspora CMS content for the "${args.programmeKey}" programme` : "Updated Diaspora hub CMS content",
      before: JSON.stringify(current),
      after: JSON.stringify(next),
    });
  },
});
