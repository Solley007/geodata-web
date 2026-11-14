import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { campaignAcceptsLeads } from "./campaigns.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// QR campaign attribution — every campaign's landing URL (`?ref=CODE`) can be
// turned into a QR code entirely client-side (reusing the existing `qrcode`
// package pattern from convex/documents.ts and src/pages/admin/allocations.tsx
// — never a new QR generation dependency). This file only records the scan
// event once a visitor actually lands on the page; it never gates access and
// never blocks a lead from also being attributed.
// ══════════════════════════════════════════════════════════════════════════

// Public — fired once (client-side, on first render) when a `?ref=CODE`
// param is present on any /diaspora/* page. A stale/unknown/paused code is
// silently ignored — recording a scan is best-effort analytics, never a
// gate, so it must never surface an error to the visitor.
export const recordQrScan = mutation({
  args: { code: v.string(), landingPath: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const campaign = await ctx.db.query("diasporaCampaigns").withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase())).first();
    if (!campaign) return;

    await ctx.db.insert("diasporaQrScans", {
      campaignId: campaign._id,
      landingPath: args.landingPath,
      scannedAt: new Date().toISOString(),
    });
  },
});

// Admin: total scan count + accepts-leads state for a campaign, used by the
// Campaigns admin panel's QR card. Bounded via the campaign index.
export const getCampaignQrStats = query({
  args: { campaignId: v.id("diasporaCampaigns") },
  handler: async (ctx, args): Promise<{ scanCount: number; acceptsLeads: boolean }> => {
    await requirePermission(ctx, "diaspora.view", { requireEnabled: false });
    const campaign = await ctx.db.get(args.campaignId);
    const scans = await ctx.db.query("diasporaQrScans").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect();
    return { scanCount: scans.length, acceptsLeads: campaign ? campaignAcceptsLeads(campaign) : false };
  },
});
