import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.d.ts";
import { tokenOf } from "./authIdentity";

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    subject: v.optional(v.string()),
    message: v.string(),
    propertyId: v.optional(v.id("properties")),
    propertyInterest: v.optional(v.string()),
    type: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"inquiries">> => {
    const identity = await ctx.auth.getUserIdentity();
    const id = await ctx.db.insert("inquiries", {
      ...args,
      status: "new",
      tokenIdentifier: (identity ? tokenOf(identity) : undefined),
    });

    // Confirm receipt to the sender
    await ctx.scheduler.runAfter(0, internal.emails.sendInquiryConfirmation, {
      to: args.email,
      name: args.name,
      subject: args.subject,
    });

    // Alert admins/managers of the new inquiry
    await ctx.scheduler.runAfter(0, internal.emails.sendAdminNewInquiryAlert, {
      to: await ctx.runQuery(internal.admin.getStaffAlertEmails, {}),
      adminPhones: await ctx.runQuery(internal.admin.getStaffAlertPhones, {}),
      name: args.name,
      email: args.email,
      phone: args.phone,
      message: args.message,
      subject: args.subject,
    });

    return id;
  },
});

export const listMyInquiries = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    // First try tokenIdentifier index
    const byToken = await ctx.db
      .query("inquiries")
      .filter((q) => q.eq(q.field("tokenIdentifier"), tokenOf(identity)))
      .collect();
    if (byToken.length > 0) return byToken;
    // Fallback: match by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity)))
      .unique();
    if (!user?.email) return [];
    return await ctx.db
      .query("inquiries")
      .withIndex("by_email", (q) => q.eq("email", user.email!))
      .collect();
  },
});

export const subscribe = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) return { success: true, message: "Already subscribed" };
    await ctx.db.insert("subscribers", { email: args.email, active: true });
    return { success: true, message: "Subscribed successfully" };
  },
});
