import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.d.ts";
import { internal } from "./_generated/api.js";
import { requireAdminCtx } from "./partners.ts";
import { effectiveRates, invertRates, isStale, isValidRate, FX_CURRENCIES } from "./fxUtils.ts";

// Free, keyless daily-updated reference rates. Second source is used if the first fails.
const SOURCES = [
  { name: "open.er-api.com", url: "https://open.er-api.com/v6/latest/NGN", pick: (j: Record<string, unknown>) => j.rates },
  { name: "fawazahmed0 currency-api", url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/ngn.json", pick: (j: Record<string, unknown>) => upperKeys(j.ngn) },
] as const;

function upperKeys(o: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (o && typeof o === "object") for (const [k, val] of Object.entries(o)) if (typeof val === "number") out[k.toUpperCase()] = val;
  return out;
}

async function getDoc(ctx: QueryCtx | MutationCtx): Promise<Doc<"fxSettings"> | null> {
  return ctx.db.query("fxSettings").withIndex("by_key", (q) => q.eq("key", "main")).unique();
}

async function ensureDoc(ctx: MutationCtx): Promise<Doc<"fxSettings">> {
  const existing = await getDoc(ctx);
  if (existing) return existing;
  const id = await ctx.db.insert("fxSettings", { key: "main", enabled: true, round: true, updatedAt: new Date().toISOString() });
  const created = await ctx.db.get(id);
  if (!created) throw new ConvexError({ code: "NOT_FOUND", message: "Could not create currency settings" });
  return created;
}

/** Public: the rates the website should display (null when disabled or no rates yet). */
export const getDisplayRates = query({
  args: {},
  handler: async (ctx) => {
    const doc = await getDoc(ctx);
    if (doc && !doc.enabled) return null;
    const rates = effectiveRates(doc?.liveRates, doc?.manualRates, doc?.useManual);
    if (Object.keys(rates).length === 0) return null;
    const anyManual = FX_CURRENCIES.some((c) => doc?.useManual?.[c] && isValidRate(doc?.manualRates?.[c]));
    return { rates, round: doc?.round ?? true, updatedAt: doc?.liveFetchedAt ?? doc?.updatedAt ?? null, anyManual };
  },
});

/** Admin: full settings including live vs manual and freshness. */
export const getAdminSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminCtx(ctx);
    const doc = await getDoc(ctx);
    return {
      enabled: doc?.enabled ?? true,
      round: doc?.round ?? true,
      liveRates: doc?.liveRates ?? null,
      liveFetchedAt: doc?.liveFetchedAt ?? null,
      liveSource: doc?.liveSource ?? null,
      lastError: doc?.lastError ?? null,
      lastErrorAt: doc?.lastErrorAt ?? null,
      manualRates: doc?.manualRates ?? {},
      useManual: doc?.useManual ?? {},
      stale: isStale(doc?.liveFetchedAt, Date.now()),
    };
  },
});

const optionalRates = v.object({ USD: v.optional(v.number()), EUR: v.optional(v.number()), GBP: v.optional(v.number()) });
const optionalFlags = v.object({ USD: v.optional(v.boolean()), EUR: v.optional(v.boolean()), GBP: v.optional(v.boolean()) });

export const saveSettings = mutation({
  args: { enabled: v.boolean(), round: v.boolean(), manualRates: optionalRates, useManual: optionalFlags },
  handler: async (ctx, args) => {
    const user = await requireAdminCtx(ctx);
    for (const c of FX_CURRENCIES) {
      const r = args.manualRates[c];
      if (r !== undefined && !isValidRate(r)) throw new ConvexError({ code: "BAD_REQUEST", message: `${c} rate must be a positive number` });
      if (args.useManual[c] && r === undefined) throw new ConvexError({ code: "BAD_REQUEST", message: `Enter a ${c} rate before using your own rate` });
    }
    const doc = await ensureDoc(ctx);
    await ctx.db.patch(doc._id, { ...args, updatedAt: new Date().toISOString(), updatedBy: user._id });
    return null;
  },
});

/** Admin: fetch live rates right now instead of waiting for the schedule. */
export const refreshNow = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdminCtx(ctx);
    await ctx.scheduler.runAfter(0, internal.fx.fetchLiveRates, {});
    return null;
  },
});

export const storeLiveRates = internalMutation({
  args: { rates: v.object({ USD: v.number(), EUR: v.number(), GBP: v.number() }), source: v.string() },
  handler: async (ctx, args) => {
    const doc = await ensureDoc(ctx);
    const now = new Date().toISOString();
    await ctx.db.patch(doc._id, { liveRates: args.rates, liveSource: args.source, liveFetchedAt: now, lastError: undefined, lastErrorAt: undefined });
    return null;
  },
});

export const storeFetchError = internalMutation({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    const doc = await ensureDoc(ctx);
    // Keep the last good rates; only record the failure.
    await ctx.db.patch(doc._id, { lastError: args.message.slice(0, 300), lastErrorAt: new Date().toISOString() });
    return null;
  },
});

/** Scheduled twice a day. One outbound request (two at most on fallback), one write. */
export const fetchLiveRates = internalAction({
  args: {},
  handler: async (ctx): Promise<null> => {
    const errors: string[] = [];
    for (const src of SOURCES) {
      try {
        const res = await fetch(src.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Record<string, unknown>;
        const raw = src.pick(json);
        const rates = invertRates(raw && typeof raw === "object" ? (raw as Record<string, number>) : {});
        if (isValidRate(rates.USD) && isValidRate(rates.EUR) && isValidRate(rates.GBP)) {
          await ctx.runMutation(internal.fx.storeLiveRates, { rates: { USD: rates.USD, EUR: rates.EUR, GBP: rates.GBP }, source: src.name });
          return null;
        }
        throw new Error("Missing USD/EUR/GBP in response");
      } catch (err) {
        errors.push(`${src.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    await ctx.runMutation(internal.fx.storeFetchError, { message: errors.join(" | ") });
    return null;
  },
});
