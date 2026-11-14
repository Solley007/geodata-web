import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";
import { tokenOf } from "./authIdentity";

// ── Shared in-app notification inbox ────────────────────────────────────────
// Powers the bell icon on every dashboard (client, partner, admin). Rows are
// created by helper functions (below) called directly from the same backend
// mutations that already send email alerts (KYC, support, live inspections,
// documents, transactions, leads) — this file never triggers anything on its
// own, it only stores and serves what other modules create.

/** Resolves the current signed-in user's `users` row, or null if not signed in. */
async function getCurrentUserRow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
}

/** Resolves the current signed-in user's linked `clients` row, or null. */
async function getCurrentClientRow(ctx: QueryCtx | MutationCtx, userId: Id<"users"> | undefined, email: string | undefined) {
  if (!userId && !email) return null;
  const allClients = await ctx.db.query("clients").collect();
  return allClients.find((c) => c.userId === userId || (email && c.email === email)) ?? null;
}

// Called directly (same transaction, no extra hop) from other mutations right
// alongside their existing email alert, e.g.:
//   await notifyClient(ctx, { clientId, type: "kyc_status", title: "...", message: "...", link: "/client" });
export async function notifyUser(
  ctx: MutationCtx,
  args: { userId: Id<"users">; type: string; title: string; message: string; link?: string }
) {
  return ctx.db.insert("notifications", {
    recipientUserId: args.userId,
    type: args.type,
    title: args.title,
    message: args.message,
    link: args.link,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
}

export async function notifyClient(
  ctx: MutationCtx,
  args: { clientId: Id<"clients">; type: string; title: string; message: string; link?: string }
) {
  return ctx.db.insert("notifications", {
    recipientClientId: args.clientId,
    type: args.type,
    title: args.title,
    message: args.message,
    link: args.link,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
}

// Public — lists the signed-in user's most recent notifications (staff/admin
// via users, buyers via their linked clients row). Bounded to a fixed recent
// window; the bell is a quick-glance panel, not a full paginated inbox.
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserRow(ctx);
    if (!user) return [];
    const client = await getCurrentClientRow(ctx, user._id, user.email);

    const [userNotifs, clientNotifs] = await Promise.all([
      ctx.db.query("notifications").withIndex("by_recipientUser_and_isRead", (q) => q.eq("recipientUserId", user._id)).order("desc").take(30),
      client
        ? ctx.db.query("notifications").withIndex("by_recipientClient_and_isRead", (q) => q.eq("recipientClientId", client._id)).order("desc").take(30)
        : Promise.resolve([]),
    ]);

    return [...userNotifs, ...clientNotifs].sort((a, b) => b._creationTime - a._creationTime).slice(0, 30);
  },
});

// Public — unread count for the bell badge.
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserRow(ctx);
    if (!user) return 0;
    const client = await getCurrentClientRow(ctx, user._id, user.email);

    const [userUnread, clientUnread] = await Promise.all([
      ctx.db.query("notifications").withIndex("by_recipientUser_and_isRead", (q) => q.eq("recipientUserId", user._id).eq("isRead", false)).collect(),
      client
        ? ctx.db.query("notifications").withIndex("by_recipientClient_and_isRead", (q) => q.eq("recipientClientId", client._id).eq("isRead", false)).collect()
        : Promise.resolve([]),
    ]);

    return userUnread.length + clientUnread.length;
  },
});

async function requireOwnedNotification(ctx: MutationCtx, id: Id<"notifications">) {
  const user = await getCurrentUserRow(ctx);
  if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const client = await getCurrentClientRow(ctx, user._id, user.email);

  const notif = await ctx.db.get(id);
  if (!notif) throw new ConvexError({ code: "NOT_FOUND", message: "Notification not found" });
  const owns = notif.recipientUserId === user._id || (client && notif.recipientClientId === client._id);
  if (!owns) throw new ConvexError({ code: "FORBIDDEN", message: "Not your notification" });
  return notif;
}

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await requireOwnedNotification(ctx, args.id);
    await ctx.db.patch(args.id, { isRead: true });
    return null;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserRow(ctx);
    if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const client = await getCurrentClientRow(ctx, user._id, user.email);

    const [userUnread, clientUnread] = await Promise.all([
      ctx.db.query("notifications").withIndex("by_recipientUser_and_isRead", (q) => q.eq("recipientUserId", user._id).eq("isRead", false)).collect(),
      client
        ? ctx.db.query("notifications").withIndex("by_recipientClient_and_isRead", (q) => q.eq("recipientClientId", client._id).eq("isRead", false)).collect()
        : Promise.resolve([]),
    ]);

    for (const n of [...userUnread, ...clientUnread]) {
      await ctx.db.patch(n._id, { isRead: true });
    }
    return null;
  },
});
