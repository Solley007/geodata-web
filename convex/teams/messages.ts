import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { notifyUser } from "../notifications.ts";
import { requireTeamAccess } from "./access.ts";

const attachmentValidator = v.object({ storageId: v.id("_storage"), fileName: v.string() });
const MAX_ATTACHMENTS = 5;
const MAX_BODY = 4000;
const EMOJIS = ["👍", "❤️", "😂", "🎉", "👀", "✅"];

type Attachment = { storageId: Id<"_storage">; fileName: string };

async function withUrls(ctx: QueryCtx, attachments: Attachment[]) {
  return await Promise.all(attachments.map(async (a) => ({ fileName: a.fileName, url: await ctx.storage.getUrl(a.storageId) })));
}

async function authorOf(ctx: QueryCtx, cache: Map<Id<"users">, { name: string; avatar: string | null }>, id: Id<"users">) {
  const hit = cache.get(id);
  if (hit) return hit;
  const u = await ctx.db.get(id);
  const info = { name: u?.name ?? u?.email ?? "Unknown", avatar: u?.avatar ?? null };
  cache.set(id, info);
  return info;
}

function validateContent(body: string, attachments: Attachment[]) {
  if (!body.trim() && attachments.length === 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Write a message or attach a file" });
  if (body.length > MAX_BODY) throw new ConvexError({ code: "BAD_REQUEST", message: "Message is too long" });
  if (attachments.length > MAX_ATTACHMENTS) throw new ConvexError({ code: "BAD_REQUEST", message: `Up to ${MAX_ATTACHMENTS} files per message` });
}

// Notifies team members whose "@Name" appears in the text (never the sender)
async function notifyMentions(
  ctx: Parameters<typeof notifyUser>[0],
  team: Doc<"teams">,
  sender: Doc<"users">,
  body: string,
) {
  if (!body.includes("@")) return;
  const members = await ctx.db.query("teamMembers").withIndex("by_team", (q) => q.eq("teamId", team._id)).take(500);
  for (const m of members) {
    if (m.userId === sender._id) continue;
    const u = await ctx.db.get(m.userId);
    if (u?.name && body.includes(`@${u.name}`)) {
      await notifyUser(ctx, { userId: u._id, type: "team_mention", title: `Mentioned in ${team.name}`, message: `${sender.name ?? "A colleague"}: ${body.slice(0, 120)}`, link: "/admin/teams" });
    }
  }
}

export const listMessages = query({
  args: { channelId: v.id("teamChannels"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new ConvexError({ code: "NOT_FOUND", message: "Channel not found" });
    const { user } = await requireTeamAccess(ctx, channel.teamId);
    const result = await ctx.db.query("teamMessages").withIndex("by_channel", (q) => q.eq("channelId", args.channelId)).order("desc").paginate(args.paginationOpts);
    const cache = new Map<Id<"users">, { name: string; avatar: string | null }>();
    const page = await Promise.all(
      result.page.map(async (m) => {
        const [author, reactions, attachments] = await Promise.all([
          authorOf(ctx, cache, m.authorId),
          ctx.db.query("teamReactions").withIndex("by_message", (q) => q.eq("messageId", m._id)).take(200),
          withUrls(ctx, m.attachments),
        ]);
        const counts = new Map<string, { count: number; mine: boolean }>();
        for (const r of reactions) {
          const c = counts.get(r.emoji) ?? { count: 0, mine: false };
          counts.set(r.emoji, { count: c.count + 1, mine: c.mine || r.userId === user._id });
        }
        return {
          _id: m._id,
          _creationTime: m._creationTime,
          authorId: m.authorId,
          authorName: author.name,
          authorAvatar: author.avatar,
          body: m.deletedAt ? "" : m.body,
          deleted: !!m.deletedAt,
          attachments: m.deletedAt ? [] : attachments,
          replyCount: m.replyCount,
          pinned: m.pinned,
          reactions: Array.from(counts, ([emoji, c]) => ({ emoji, ...c })),
        };
      }),
    );
    return { ...result, page };
  },
});

export const listReplies = query({
  args: { messageId: v.id("teamMessages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new ConvexError({ code: "NOT_FOUND", message: "Message not found" });
    await requireTeamAccess(ctx, message.teamId);
    const rows = await ctx.db.query("teamReplies").withIndex("by_message", (q) => q.eq("messageId", args.messageId)).take(300);
    const cache = new Map<Id<"users">, { name: string; avatar: string | null }>();
    return await Promise.all(
      rows.map(async (r) => {
        const author = await authorOf(ctx, cache, r.authorId);
        return {
          _id: r._id,
          _creationTime: r._creationTime,
          authorId: r.authorId,
          authorName: author.name,
          authorAvatar: author.avatar,
          body: r.deletedAt ? "" : r.body,
          deleted: !!r.deletedAt,
          attachments: r.deletedAt ? [] : await withUrls(ctx, r.attachments),
        };
      }),
    );
  },
});

export const postMessage = mutation({
  args: { channelId: v.id("teamChannels"), body: v.string(), attachments: v.array(attachmentValidator) },
  handler: async (ctx, args): Promise<null> => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.archived) throw new ConvexError({ code: "NOT_FOUND", message: "Channel not found" });
    const { user, team, isMember } = await requireTeamAccess(ctx, channel.teamId);
    if (!isMember) throw new ConvexError({ code: "FORBIDDEN", message: "Join the team to post" });
    validateContent(args.body, args.attachments);
    await ctx.db.insert("teamMessages", { teamId: team._id, channelId: channel._id, authorId: user._id, body: args.body.trim(), attachments: args.attachments, replyCount: 0, pinned: false });
    await notifyMentions(ctx, team, user, args.body);
    return null;
  },
});

export const postReply = mutation({
  args: { messageId: v.id("teamMessages"), body: v.string(), attachments: v.array(attachmentValidator) },
  handler: async (ctx, args): Promise<null> => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new ConvexError({ code: "NOT_FOUND", message: "Message not found" });
    const { user, team, isMember } = await requireTeamAccess(ctx, message.teamId);
    if (!isMember) throw new ConvexError({ code: "FORBIDDEN", message: "Join the team to reply" });
    validateContent(args.body, args.attachments);
    await ctx.db.insert("teamReplies", { messageId: message._id, teamId: team._id, authorId: user._id, body: args.body.trim(), attachments: args.attachments });
    await ctx.db.patch(message._id, { replyCount: message.replyCount + 1 });
    await notifyMentions(ctx, team, user, args.body);
    if (message.authorId !== user._id) {
      await notifyUser(ctx, { userId: message.authorId, type: "team_reply", title: `New reply in ${team.name}`, message: `${user.name ?? "A colleague"}: ${args.body.slice(0, 120)}`, link: "/admin/teams" });
    }
    return null;
  },
});

export const toggleReaction = mutation({
  args: { messageId: v.id("teamMessages"), emoji: v.string() },
  handler: async (ctx, args): Promise<null> => {
    if (!EMOJIS.includes(args.emoji)) throw new ConvexError({ code: "BAD_REQUEST", message: "Unsupported reaction" });
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;
    const { user } = await requireTeamAccess(ctx, message.teamId);
    const existing = await ctx.db.query("teamReactions").withIndex("by_message_and_user_and_emoji", (q) => q.eq("messageId", args.messageId).eq("userId", user._id).eq("emoji", args.emoji)).unique();
    if (existing) await ctx.db.delete(existing._id);
    else await ctx.db.insert("teamReactions", { messageId: args.messageId, userId: user._id, emoji: args.emoji });
    return null;
  },
});

export const setPinned = mutation({
  args: { messageId: v.id("teamMessages"), pinned: v.boolean() },
  handler: async (ctx, args): Promise<null> => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;
    const { isOwner } = await requireTeamAccess(ctx, message.teamId);
    if (!isOwner) throw new ConvexError({ code: "FORBIDDEN", message: "Only team owners can pin messages" });
    await ctx.db.patch(message._id, { pinned: args.pinned });
    return null;
  },
});

// Soft delete: the author or a team owner can remove a message or reply
export const deleteMessage = mutation({
  args: { messageId: v.id("teamMessages") },
  handler: async (ctx, args): Promise<null> => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;
    const { user, isOwner } = await requireTeamAccess(ctx, message.teamId);
    if (message.authorId !== user._id && !isOwner) throw new ConvexError({ code: "FORBIDDEN", message: "You can only delete your own messages" });
    await ctx.db.patch(message._id, { deletedAt: new Date().toISOString() });
    return null;
  },
});

export const deleteReply = mutation({
  args: { replyId: v.id("teamReplies") },
  handler: async (ctx, args): Promise<null> => {
    const reply = await ctx.db.get(args.replyId);
    if (!reply) return null;
    const { user, isOwner } = await requireTeamAccess(ctx, reply.teamId);
    if (reply.authorId !== user._id && !isOwner) throw new ConvexError({ code: "FORBIDDEN", message: "You can only delete your own replies" });
    await ctx.db.patch(reply._id, { deletedAt: new Date().toISOString() });
    return null;
  },
});
