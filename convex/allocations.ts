import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.js";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api.js";

// ─── Blocks ──────────────────────────────────────────────────────
export const listBlocks = query({
  args: { estateId: v.id("estates") },
  handler: async (ctx, args) => {
    return await ctx.db.query("estateBlocks").withIndex("by_estate", (q) => q.eq("estateId", args.estateId)).collect();
  },
});

export const createBlock = mutation({
  args: { estateId: v.id("estates"), name: v.string(), description: v.optional(v.string()), totalPlots: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("estateBlocks", args);
  },
});

export const deleteBlock = mutation({
  args: { id: v.id("estateBlocks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ─── Plots ───────────────────────────────────────────────────────
export const listPlots = query({
  args: {
    estateId: v.optional(v.id("estates")),
    blockId: v.optional(v.id("estateBlocks")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("plots");
    if (args.estateId) {
      return await q.withIndex("by_estate", (qi) => qi.eq("estateId", args.estateId!)).collect();
    }
    if (args.blockId) {
      return await q.withIndex("by_block", (qi) => qi.eq("blockId", args.blockId)).collect();
    }
    return await q.collect();
  },
});

export const listPlotsPaginated = query({
  args: {
    estateId: v.optional(v.id("estates")),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (args.search) {
      return await ctx.db
        .query("plots")
        .withSearchIndex("search_plotNumber", (q) => {
          let query = q.search("plotNumber", args.search!);
          if (args.status) query = query.eq("status", args.status);
          if (args.estateId) query = query.eq("estateId", args.estateId);
          return query;
        })
        .paginate(args.paginationOpts);
    }
    if (args.estateId) {
      return await ctx.db.query("plots").withIndex("by_estate", (q) => q.eq("estateId", args.estateId!)).paginate(args.paginationOpts);
    }
    if (args.status) {
      return await ctx.db.query("plots").withIndex("by_status", (q) => q.eq("status", args.status!)).paginate(args.paginationOpts);
    }
    return await ctx.db.query("plots").paginate(args.paginationOpts);
  },
});

export const getPlot = query({
  args: { id: v.id("plots") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const createPlot = mutation({
  args: {
    estateId: v.id("estates"),
    blockId: v.optional(v.id("estateBlocks")),
    plotNumber: v.string(),
    size: v.string(),
    price: v.number(),
    features: v.optional(v.array(v.string())),
    coordinates: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("plots", { ...args, status: "available" });
  },
});

export const updatePlot = mutation({
  args: {
    id: v.id("plots"),
    plotNumber: v.optional(v.string()),
    size: v.optional(v.string()),
    price: v.optional(v.number()),
    status: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    coordinates: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const deletePlot = mutation({
  args: { id: v.id("plots") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ─── Allocations ─────────────────────────────────────────────────
export const listAllocations = query({
  args: {
    estateId: v.optional(v.id("estates")),
    clientId: v.optional(v.id("clients")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.estateId) {
      return await ctx.db.query("allocations").withIndex("by_estate", (q) => q.eq("estateId", args.estateId!)).collect();
    }
    if (args.clientId) {
      return await ctx.db.query("allocations").withIndex("by_client", (q) => q.eq("clientId", args.clientId!)).collect();
    }
    if (args.status) {
      return await ctx.db.query("allocations").withIndex("by_status", (q) => q.eq("status", args.status!)).collect();
    }
    return await ctx.db.query("allocations").order("desc").take(200);
  },
});

export const listAllocationsPaginated = query({
  args: {
    estateId: v.optional(v.id("estates")),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (args.search) {
      return await ctx.db
        .query("allocations")
        .withSearchIndex("search_allocationNumber", (q) => {
          let query = q.search("allocationNumber", args.search!);
          if (args.status) query = query.eq("status", args.status);
          if (args.estateId) query = query.eq("estateId", args.estateId);
          return query;
        })
        .paginate(args.paginationOpts);
    }
    if (args.estateId) {
      return await ctx.db
        .query("allocations")
        .withIndex("by_estate", (q) => q.eq("estateId", args.estateId!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    if (args.status) {
      return await ctx.db
        .query("allocations")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("allocations").order("desc").paginate(args.paginationOpts);
  },
});

export const getAllocation = query({
  args: { id: v.id("allocations") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const getAllocationByNumber = query({
  args: { allocationNumber: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db.query("allocations").collect();
    return results.find((a) => a.allocationNumber === args.allocationNumber) ?? null;
  },
});

async function nextAllocationNumber(ctx: MutationCtx): Promise<string> {
  const all = await ctx.db.query("allocations").collect();
  const num = all.length + 1;
  return `GWS-ALLOC-${String(num).padStart(4, "0")}`;
}

export const createAllocation = mutation({
  args: {
    plotId: v.id("plots"),
    estateId: v.id("estates"),
    clientId: v.id("clients"),
    allocatedDate: v.string(),
    purchasePrice: v.number(),
    paymentType: v.string(),
    paymentPlanId: v.optional(v.id("paymentPlans")),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const allocationNumber = await nextAllocationNumber(ctx);
    // Generate QR payload
    const qrCode = JSON.stringify({
      allocationNumber,
      plotId: args.plotId,
      clientId: args.clientId,
      estateId: args.estateId,
      date: args.allocatedDate,
      issuer: "GEODATA WORLD SERVICES",
    });

    const id = await ctx.db.insert("allocations", {
      ...args,
      allocationNumber,
      qrCode,
      status: "active",
      deedIssued: false,
      offerLetterIssued: false,
      receiptIssued: false,
      contractIssued: false,
      allocationLetterIssued: false,
    });

    // Mark plot as allocated
    await ctx.db.patch(args.plotId, { status: "allocated" });

    // Record ownership history
    const client = await ctx.db.get(args.clientId);
    await ctx.db.insert("ownershipHistory", {
      plotId: args.plotId,
      clientId: args.clientId,
      allocationId: id,
      transferDate: args.allocatedDate,
      transferType: "initial_sale",
      newOwnerName: client?.fullName ?? "Unknown",
      salePrice: args.purchasePrice,
      recordedBy: args.createdBy,
    });

    if (client?.email) {
      const plot = await ctx.db.get(args.plotId);
      await ctx.scheduler.runAfter(0, internal.emails.sendAllocationConfirmedEmail, {
        to: client.email,
        phone: client.phone,
        name: client.fullName,
        allocationNumber,
        plotLabel: plot ? `Plot ${plot.plotNumber}` : "your plot",
        purchasePrice: args.purchasePrice,
      });
    }

    return id;
  },
});

export const updateAllocation = mutation({
  args: {
    id: v.id("allocations"),
    status: v.optional(v.string()),
    deedIssued: v.optional(v.boolean()),
    offerLetterIssued: v.optional(v.boolean()),
    receiptIssued: v.optional(v.boolean()),
    contractIssued: v.optional(v.boolean()),
    allocationLetterIssued: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    const existing = await ctx.db.get(id);
    await ctx.db.patch(id, rest);

    if (!existing) return;
    const newlyIssued: string[] = [];
    if (args.deedIssued === true && existing.deedIssued !== true) newlyIssued.push("Deed of Assignment");
    if (args.offerLetterIssued === true && existing.offerLetterIssued !== true) newlyIssued.push("Offer Letter");
    if (args.receiptIssued === true && existing.receiptIssued !== true) newlyIssued.push("Payment Receipt");
    if (args.contractIssued === true && existing.contractIssued !== true) newlyIssued.push("Sale Contract");
    if (args.allocationLetterIssued === true && existing.allocationLetterIssued !== true) newlyIssued.push("Allocation Letter");

    if (newlyIssued.length > 0) {
      const client = await ctx.db.get(existing.clientId);
      if (client?.email) {
        for (const documentLabel of newlyIssued) {
          await ctx.scheduler.runAfter(0, internal.emails.sendAllocationDocumentIssuedEmail, {
            to: client.email,
            phone: client.phone,
            name: client.fullName,
            allocationNumber: existing.allocationNumber,
            documentLabel,
          });
        }
      }
    }
  },
});

export const revokeAllocation = mutation({
  args: { id: v.id("allocations"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const alloc = await ctx.db.get(args.id);
    if (!alloc) return;
    await ctx.db.patch(args.id, { status: "revoked" });
    await ctx.db.patch(alloc.plotId, { status: "available" });
  },
});

// ─── Ownership History ───────────────────────────────────────────
export const listOwnershipHistory = query({
  args: { plotId: v.id("plots") },
  handler: async (ctx, args) => {
    return await ctx.db.query("ownershipHistory").withIndex("by_plot", (q) => q.eq("plotId", args.plotId)).collect();
  },
});

// ─── Stats ───────────────────────────────────────────────────────
export const getAllocationStats = query({
  args: {},
  handler: async (ctx) => {
    const plots = await ctx.db.query("plots").collect();
    const allocations = await ctx.db.query("allocations").collect();
    const totalPlots = plots.length;
    const availablePlots = plots.filter((p) => p.status === "available").length;
    const allocatedPlots = plots.filter((p) => p.status === "allocated" || p.status === "sold").length;
    const reservedPlots = plots.filter((p) => p.status === "reserved").length;
    const activeAllocations = allocations.filter((a) => a.status === "active").length;
    const totalRevenue = allocations.filter((a) => a.status === "active" || a.status === "completed").reduce((s, a) => s + a.purchasePrice, 0);
    return { totalPlots, availablePlots, allocatedPlots, reservedPlots, activeAllocations, totalRevenue };
  },
});
