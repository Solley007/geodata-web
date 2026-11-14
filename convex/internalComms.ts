import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { paginationOptsValidator } from "convex/server";
import { logAudit } from "./taskboard.ts";
import { hasPermission } from "./iam/access.ts";
import { requireFeatureEnabled, isFeatureEnabled } from "./featureToggles.ts";
import { notifyUser } from "./notifications.ts";
import { tokenOf } from "./authIdentity";

// ══════════════════════════════════════════════════════════════════════════
// ENHANCED INTERNAL COMMUNICATIONS
//
// Adds a staff Inbox (direct messages, group channels, and org-scoped
// channels) and Announcements INSIDE the existing Communications Centre.
// Distinct from convex/communications.ts, which stays exactly as-is and
// keeps managing the PUBLIC ticker/pop notifications shown on the landing
// page — this module is staff-to-staff only, never public.
//
// Org-scoped channels reuse the existing directorates/departments/units/
// userOrgAssignments org chart for membership — never a new org model.
// Direct/group messages notify recipients and announcements notify their
// audience via the existing notifyUser() helper/notifications table/bell
// — never a second notification engine.
//
// Security: everyday messaging (direct/group DMs you are already a
// participant of) is available to any staff member. Creating an org-wide
// channel and creating/publishing announcements — both of which broadcast
// to many people at once — require the explicit "communications.channel_manage"
// / "communications.announce" permissions. super_admin keeps the same
// break-glass fallback used throughout this app.
// ══════════════════════════════════════════════════════════════════════════

const STAFF_ROLES = ["super_admin", "admin", "manager", "agent"];

export const COMMS_PERMISSIONS = ["communications.channel_manage", "communications.announce", "communications.settings_manage"] as const;
export type CommsPermission = (typeof COMMS_PERMISSIONS)[number];

async function requireStaff(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in required" });
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
  if (!user || !STAFF_ROLES.includes(user.role ?? "")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return user;
}

async function requireCommsPermission(ctx: QueryCtx | MutationCtx, user: Doc<"users">, permission: CommsPermission): Promise<void> {
  const allowed = await hasPermission(ctx, user._id, permission);
  if (!allowed && user.role !== "super_admin") {
    throw new ConvexError({ code: "FORBIDDEN", message: "You do not have explicit authority for this communications action" });
  }
}

// Active org assignments for a user — used both to resolve org-channel
// membership and to resolve the audience of an org-scoped announcement.
async function getActiveOrgAssignments(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<Doc<"userOrgAssignments">[]> {
  return ctx.db.query("userOrgAssignments").withIndex("by_user", (q) => q.eq("userId", userId)).filter((q) => q.eq(q.field("status"), "active")).collect();
}

function orgConversationMatchesAssignment(conv: Doc<"conversations">, a: Doc<"userOrgAssignments">): boolean {
  if (conv.unitId) return a.unitId === conv.unitId;
  if (conv.departmentId) return a.departmentId === conv.departmentId;
  if (conv.directorateId) return a.directorateId === conv.directorateId;
  return false;
}

async function isMemberOfConversation(ctx: QueryCtx | MutationCtx, user: Doc<"users">, conv: Doc<"conversations">): Promise<boolean> {
  if (user.role === "super_admin") return true;
  if (conv.kind === "org") {
    const assignments = await getActiveOrgAssignments(ctx, user._id);
    return assignments.some((a) => orgConversationMatchesAssignment(conv, a));
  }
  const row = await ctx.db.query("conversationParticipants").withIndex("by_conversation_and_user", (q) => q.eq("conversationId", conv._id).eq("userId", user._id)).unique();
  return row !== null;
}

async function ensureParticipantRow(ctx: MutationCtx, conversationId: Id<"conversations">, userId: Id<"users">): Promise<Doc<"conversationParticipants">> {
  const existing = await ctx.db.query("conversationParticipants").withIndex("by_conversation_and_user", (q) => q.eq("conversationId", conversationId).eq("userId", userId)).unique();
  if (existing) return existing;
  const id = await ctx.db.insert("conversationParticipants", { conversationId, userId, joinedAt: new Date().toISOString() });
  return (await ctx.db.get(id))!;
}

// ── Access ───────────────────────────────────────────────────────────────

export const getMyCommsAccess = query({
  args: {},
  handler: async (ctx): Promise<{ featureEnabled: boolean; isStaff: boolean; canManageChannels: boolean; canAnnounce: boolean; canManageSettings: boolean }> => {
    const featureEnabled = await isFeatureEnabled(ctx, "feature_enhanced_communications");
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { featureEnabled, isStaff: false, canManageChannels: false, canAnnounce: false, canManageSettings: false };
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity))).unique();
    if (!user || !STAFF_ROLES.includes(user.role ?? "")) {
      return { featureEnabled, isStaff: false, canManageChannels: false, canAnnounce: false, canManageSettings: false };
    }
    const isSuperAdmin = user.role === "super_admin";
    const canManageChannels = (await hasPermission(ctx, user._id, "communications.channel_manage")) || isSuperAdmin;
    const canAnnounce = (await hasPermission(ctx, user._id, "communications.announce")) || isSuperAdmin;
    const canManageSettings = (await hasPermission(ctx, user._id, "communications.settings_manage")) || isSuperAdmin;
    return { featureEnabled, isStaff: true, canManageChannels, canAnnounce, canManageSettings };
  },
});

// ── Staff directory (for starting a new conversation) ───────────────────

export const listStaffDirectory = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireStaff(ctx);
    const rows = await Promise.all(STAFF_ROLES.map((role) => ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", role as Doc<"users">["role"])).take(200)));
    return rows.flat().filter((u) => u._id !== me._id).map((u) => ({ _id: u._id, name: u.name ?? u.email ?? "Unknown", email: u.email, role: u.role }));
  },
});

// Org scopes available for creating an org-wide channel.
export const listOrgScopesForChannels = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStaff(ctx);
    await requireCommsPermission(ctx, user, "communications.channel_manage");
    const [directorates, departments, units] = await Promise.all([
      ctx.db.query("directorates").withIndex("by_status", (q) => q.eq("status", "active")).collect(),
      ctx.db.query("departments").withIndex("by_status", (q) => q.eq("status", "active")).collect(),
      ctx.db.query("units").withIndex("by_status", (q) => q.eq("status", "active")).collect(),
    ]);
    return { directorates, departments, units };
  },
});

// ── Conversations ────────────────────────────────────────────────────────

export const listMyConversations = query({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"conversations"> & { unread: boolean; memberCount: number }>> => {
    const user = await requireStaff(ctx);
    const participantRows = await ctx.db.query("conversationParticipants").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    const directGroupConvos = await Promise.all(participantRows.map((p) => ctx.db.get(p.conversationId)));

    const assignments = await getActiveOrgAssignments(ctx, user._id);
    const allOrgConvos = await ctx.db.query("conversations").withIndex("by_kind", (q) => q.eq("kind", "org")).collect();
    const myOrgConvos = allOrgConvos.filter((c) => assignments.some((a) => orgConversationMatchesAssignment(c, a)));

    const byId = new Map<Id<"conversations">, Doc<"conversations">>();
    for (const c of directGroupConvos) if (c && !c.archivedAt) byId.set(c._id, c);
    for (const c of myOrgConvos) if (!c.archivedAt) byId.set(c._id, c);

    const result = await Promise.all(
      Array.from(byId.values()).map(async (c) => {
        const myRow = participantRows.find((p) => p.conversationId === c._id) ?? (await ctx.db.query("conversationParticipants").withIndex("by_conversation_and_user", (q) => q.eq("conversationId", c._id).eq("userId", user._id)).unique());
        const unread = !!c.lastMessageAt && (!myRow?.lastReadAt || myRow.lastReadAt < c.lastMessageAt);
        let memberCount: number;
        if (c.kind === "org") {
          const orgAssignments = await ctx.db.query("userOrgAssignments").withIndex("by_status", (q) => q.eq("status", "active")).collect();
          memberCount = orgAssignments.filter((a) => orgConversationMatchesAssignment(c, a)).length;
        } else {
          memberCount = (await ctx.db.query("conversationParticipants").withIndex("by_conversation", (q) => q.eq("conversationId", c._id)).collect()).length;
        }
        return { ...c, unread, memberCount };
      })
    );
    return result.sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  },
});

export const getConversation = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const conv = await ctx.db.get(args.id);
    if (!conv) return null;
    if (!(await isMemberOfConversation(ctx, user, conv))) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You are not a member of this conversation" });
    }
    let participants: Array<{ userId: Id<"users">; name: string }>;
    if (conv.kind === "org") {
      const assignments = await ctx.db.query("userOrgAssignments").withIndex("by_status", (q) => q.eq("status", "active")).collect();
      const matching = assignments.filter((a) => orgConversationMatchesAssignment(conv, a));
      const users = await Promise.all(matching.map((a) => ctx.db.get(a.userId)));
      participants = users.filter((u): u is Doc<"users"> => u !== null).map((u) => ({ userId: u._id, name: u.name ?? u.email ?? "Unknown" }));
    } else {
      const rows = await ctx.db.query("conversationParticipants").withIndex("by_conversation", (q) => q.eq("conversationId", conv._id)).collect();
      const users = await Promise.all(rows.map((r) => ctx.db.get(r.userId)));
      participants = users.filter((u): u is Doc<"users"> => u !== null).map((u) => ({ userId: u._id, name: u.name ?? u.email ?? "Unknown" }));
    }
    return { ...conv, participants };
  },
});

export const listConversationMessages = query({
  args: { conversationId: v.id("conversations"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new ConvexError({ code: "NOT_FOUND", message: "Conversation not found" });
    if (!(await isMemberOfConversation(ctx, user, conv))) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You are not a member of this conversation" });
    }
    const results = await ctx.db.query("conversationMessages").withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId)).order("desc").paginate(args.paginationOpts);
    const page = await Promise.all(
      results.page.map(async (m) => {
        const sender = await ctx.db.get(m.senderId);
        return { ...m, senderName: sender?.name ?? sender?.email ?? "Unknown" };
      })
    );
    return { ...results, page };
  },
});

export const createConversation = mutation({
  args: {
    kind: v.union(v.literal("direct"), v.literal("group")),
    participantUserIds: v.array(v.id("users")),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"conversations">> => {
    const user = await requireStaff(ctx);
    await requireFeatureEnabled(ctx, "feature_enhanced_communications");

    const others = Array.from(new Set(args.participantUserIds)).filter((id) => id !== user._id);
    if (others.length === 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Select at least one other participant" });
    if (args.kind === "direct" && others.length !== 1) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "A direct message must have exactly one other participant" });
    }
    if (args.kind === "group" && !args.name?.trim()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Group channels require a name" });
    }

    // De-duplicate direct conversations between the same two people.
    if (args.kind === "direct") {
      const mine = await ctx.db.query("conversationParticipants").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
      for (const p of mine) {
        const conv = await ctx.db.get(p.conversationId);
        if (conv?.kind !== "direct") continue;
        const participants = await ctx.db.query("conversationParticipants").withIndex("by_conversation", (q) => q.eq("conversationId", conv._id)).collect();
        if (participants.length === 2 && participants.some((pp) => pp.userId === others[0])) {
          return conv._id;
        }
      }
    }

    const allIds = [user._id, ...others];
    const convId = await ctx.db.insert("conversations", {
      kind: args.kind,
      name: args.kind === "group" ? args.name!.trim() : undefined,
      createdBy: user._id,
    });
    for (const uid of allIds) {
      await ensureParticipantRow(ctx, convId, uid);
    }

    await logAudit(ctx, {
      action: "create", entity: "conversations", entityId: convId,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Started a ${args.kind} conversation${args.kind === "group" ? ` "${args.name}"` : ""} with ${others.length} other staff member${others.length > 1 ? "s" : ""}`,
    });

    return convId;
  },
});

export const createOrgConversation = mutation({
  args: {
    name: v.string(),
    directorateId: v.optional(v.id("directorates")),
    departmentId: v.optional(v.id("departments")),
    unitId: v.optional(v.id("units")),
  },
  handler: async (ctx, args): Promise<Id<"conversations">> => {
    const user = await requireStaff(ctx);
    await requireCommsPermission(ctx, user, "communications.channel_manage");
    await requireFeatureEnabled(ctx, "feature_enhanced_communications");

    const scopeCount = [args.directorateId, args.departmentId, args.unitId].filter(Boolean).length;
    if (scopeCount !== 1) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Select exactly one directorate, department, or unit for this channel" });
    }
    if (!args.name.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Channel name is required" });

    const convId = await ctx.db.insert("conversations", {
      kind: "org",
      name: args.name.trim(),
      directorateId: args.directorateId,
      departmentId: args.departmentId,
      unitId: args.unitId,
      createdBy: user._id,
    });

    await logAudit(ctx, {
      action: "create", entity: "conversations", entityId: convId,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Created org-wide channel "${args.name.trim()}"`,
    });

    return convId;
  },
});

export const sendMessage = mutation({
  args: { conversationId: v.id("conversations"), body: v.string(), attachmentVaultDocumentId: v.optional(v.id("vaultDocuments")) },
  handler: async (ctx, args): Promise<Id<"conversationMessages">> => {
    const user = await requireStaff(ctx);
    await requireFeatureEnabled(ctx, "feature_enhanced_communications");

    if (!args.body.trim() && !args.attachmentVaultDocumentId) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Message cannot be empty" });
    }
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new ConvexError({ code: "NOT_FOUND", message: "Conversation not found" });
    if (!(await isMemberOfConversation(ctx, user, conv))) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You are not a member of this conversation" });
    }

    const now = new Date().toISOString();
    const messageId = await ctx.db.insert("conversationMessages", {
      conversationId: args.conversationId,
      senderId: user._id,
      body: args.body.trim(),
      attachmentVaultDocumentId: args.attachmentVaultDocumentId,
    });
    const preview = args.body.trim().slice(0, 120) || "Sent an attachment";
    await ctx.db.patch(args.conversationId, { lastMessageAt: now, lastMessagePreview: preview });
    await ensureParticipantRow(ctx, args.conversationId, user._id);
    await ctx.db.patch((await ensureParticipantRow(ctx, args.conversationId, user._id))._id, { lastReadAt: now });

    // Notify direct/group recipients through the existing notification bell.
    // Org channels are not individually notified per message to avoid write
    // amplification across a whole department on every message — members see
    // unread state live in the Inbox instead.
    if (conv.kind !== "org") {
      const participants = await ctx.db.query("conversationParticipants").withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId)).collect();
      for (const p of participants) {
        if (p.userId === user._id || p.mutedAt) continue;
        await notifyUser(ctx, {
          userId: p.userId,
          type: "internal_message",
          title: conv.kind === "group" ? `New message in ${conv.name}` : `New message from ${user.name ?? "a colleague"}`,
          message: preview,
          link: `/admin/communications?tab=inbox&conversation=${args.conversationId}`,
        });
      }
    }

    return messageId;
  },
});

export const markConversationRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireStaff(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new ConvexError({ code: "NOT_FOUND", message: "Conversation not found" });
    if (!(await isMemberOfConversation(ctx, user, conv))) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You are not a member of this conversation" });
    }
    const row = await ensureParticipantRow(ctx, args.conversationId, user._id);
    await ctx.db.patch(row._id, { lastReadAt: new Date().toISOString() });
  },
});

export const deleteMessage = mutation({
  args: { id: v.id("conversationMessages") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireStaff(ctx);
    const message = await ctx.db.get(args.id);
    if (!message) throw new ConvexError({ code: "NOT_FOUND", message: "Message not found" });
    const isOwn = message.senderId === user._id;
    if (!isOwn && user.role !== "super_admin") {
      await requireCommsPermission(ctx, user, "communications.channel_manage");
    }
    await ctx.db.patch(args.id, { deletedAt: new Date().toISOString(), body: "" });
    await logAudit(ctx, {
      action: "delete", entity: "conversationMessages", entityId: args.id,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Removed a message from a conversation`,
    });
  },
});

// ── Announcements ────────────────────────────────────────────────────────

async function resolveAnnouncementAudienceUserIds(ctx: QueryCtx | MutationCtx, a: Doc<"announcements">): Promise<Id<"users">[]> {
  if (a.audienceType === "all_staff") {
    const rows = await Promise.all(STAFF_ROLES.map((role) => ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", role as Doc<"users">["role"])).take(500)));
    return rows.flat().map((u) => u._id);
  }
  const assignments = await ctx.db.query("userOrgAssignments").withIndex("by_status", (q) => q.eq("status", "active")).collect();
  const matching = assignments.filter((asg) => {
    if (a.audienceType === "unit") return asg.unitId === a.audienceUnitId;
    if (a.audienceType === "department") return asg.departmentId === a.audienceDepartmentId;
    return asg.directorateId === a.audienceDirectorateId;
  });
  return Array.from(new Set(matching.map((asg) => asg.userId)));
}

function isAnnouncementVisibleNow(a: Doc<"announcements">): boolean {
  const now = new Date().toISOString();
  if (a.status !== "published") return false;
  if (a.publishAt && a.publishAt > now) return false;
  if (a.expiresAt && a.expiresAt < now) return false;
  return true;
}

export const listAnnouncementsForMe = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStaff(ctx);
    const assignments = await getActiveOrgAssignments(ctx, user._id);
    const all = await ctx.db.query("announcements").withIndex("by_status", (q) => q.eq("status", "published")).collect();
    const mine = all.filter((a) => {
      if (!isAnnouncementVisibleNow(a)) return false;
      if (a.audienceType === "all_staff") return true;
      return assignments.some((asg) =>
        (a.audienceType === "unit" && asg.unitId === a.audienceUnitId) ||
        (a.audienceType === "department" && asg.departmentId === a.audienceDepartmentId) ||
        (a.audienceType === "directorate" && asg.directorateId === a.audienceDirectorateId)
      );
    });
    const acks = await ctx.db.query("announcementAcknowledgements").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    const ackByAnnouncement = new Map(acks.map((a) => [a.announcementId, a]));
    return mine
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a) => ({ ...a, myAck: ackByAnnouncement.get(a._id) ?? null }));
  },
});

export const listAllAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStaff(ctx);
    await requireCommsPermission(ctx, user, "communications.announce");
    const rows = await ctx.db.query("announcements").order("desc").collect();
    return rows;
  },
});

export const getAnnouncementAcknowledgementStats = query({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    await requireCommsPermission(ctx, user, "communications.announce");
    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) throw new ConvexError({ code: "NOT_FOUND", message: "Announcement not found" });
    const audienceIds = await resolveAnnouncementAudienceUserIds(ctx, announcement);
    const acks = await ctx.db.query("announcementAcknowledgements").withIndex("by_announcement", (q) => q.eq("announcementId", args.announcementId)).collect();
    const ackedIds = new Set(acks.filter((a) => a.acknowledgedAt).map((a) => a.userId));
    return { audienceSize: audienceIds.length, acknowledgedCount: ackedIds.size };
  },
});

export const createAnnouncement = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    priority: v.union(v.literal("normal"), v.literal("important"), v.literal("urgent")),
    audienceType: v.union(v.literal("all_staff"), v.literal("directorate"), v.literal("department"), v.literal("unit")),
    audienceDirectorateId: v.optional(v.id("directorates")),
    audienceDepartmentId: v.optional(v.id("departments")),
    audienceUnitId: v.optional(v.id("units")),
    requiresAcknowledgement: v.boolean(),
    publishAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    publishNow: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"announcements">> => {
    const user = await requireCommsPermission2(ctx);
    await requireFeatureEnabled(ctx, "feature_enhanced_communications");

    if (!args.title.trim() || !args.body.trim()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Title and message body are required" });
    }
    if (args.audienceType === "directorate" && !args.audienceDirectorateId) throw new ConvexError({ code: "BAD_REQUEST", message: "Select a directorate" });
    if (args.audienceType === "department" && !args.audienceDepartmentId) throw new ConvexError({ code: "BAD_REQUEST", message: "Select a department" });
    if (args.audienceType === "unit" && !args.audienceUnitId) throw new ConvexError({ code: "BAD_REQUEST", message: "Select a unit" });

    const id = await ctx.db.insert("announcements", {
      title: args.title.trim(),
      body: args.body.trim(),
      priority: args.priority,
      audienceType: args.audienceType,
      audienceDirectorateId: args.audienceDirectorateId,
      audienceDepartmentId: args.audienceDepartmentId,
      audienceUnitId: args.audienceUnitId,
      requiresAcknowledgement: args.requiresAcknowledgement,
      publishAt: args.publishAt,
      expiresAt: args.expiresAt,
      status: args.publishNow ? "published" : "draft",
      createdBy: user._id,
      createdAt: new Date().toISOString(),
    });

    if (args.publishNow) {
      await notifyAnnouncementAudience(ctx, { ...(await ctx.db.get(id))! });
    }

    await logAudit(ctx, {
      action: "create", entity: "announcements", entityId: id, entityRef: args.title.trim(),
      userId: user._id, userName: user.name, userRole: user.role,
      description: `${args.publishNow ? "Published" : "Drafted"} announcement "${args.title.trim()}" (${args.audienceType} audience)`,
    });

    return id;
  },
});

async function notifyAnnouncementAudience(ctx: MutationCtx, announcement: Doc<"announcements">): Promise<void> {
  const audienceIds = await resolveAnnouncementAudienceUserIds(ctx, announcement);
  for (const userId of audienceIds) {
    await notifyUser(ctx, {
      userId,
      type: "announcement",
      title: announcement.title,
      message: announcement.body.slice(0, 140),
      link: `/admin/communications?tab=announcements&id=${announcement._id}`,
    });
  }
}

async function requireCommsPermission2(ctx: MutationCtx): Promise<Doc<"users">> {
  const user = await requireStaff(ctx);
  await requireCommsPermission(ctx, user, "communications.announce");
  return user;
}

export const publishAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireCommsPermission2(ctx);
    const announcement = await ctx.db.get(args.id);
    if (!announcement) throw new ConvexError({ code: "NOT_FOUND", message: "Announcement not found" });
    if (announcement.status !== "draft") throw new ConvexError({ code: "CONFLICT", message: "Only a draft announcement can be published" });
    await ctx.db.patch(args.id, { status: "published" });
    await notifyAnnouncementAudience(ctx, { ...announcement, status: "published" });
    await logAudit(ctx, {
      action: "update", entity: "announcements", entityId: args.id, entityRef: announcement.title,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Published announcement "${announcement.title}"`,
    });
  },
});

export const cancelAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireCommsPermission2(ctx);
    const announcement = await ctx.db.get(args.id);
    if (!announcement) throw new ConvexError({ code: "NOT_FOUND", message: "Announcement not found" });
    if (["cancelled", "expired"].includes(announcement.status)) {
      throw new ConvexError({ code: "CONFLICT", message: "This announcement is already inactive" });
    }
    await ctx.db.patch(args.id, { status: "cancelled" });
    await logAudit(ctx, {
      action: "cancel", entity: "announcements", entityId: args.id, entityRef: announcement.title,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Cancelled announcement "${announcement.title}"`,
    });
  },
});

export const recordAnnouncementView = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireStaff(ctx);
    const existing = await ctx.db.query("announcementAcknowledgements").withIndex("by_announcement_and_user", (q) => q.eq("announcementId", args.announcementId).eq("userId", user._id)).unique();
    if (existing) return;
    await ctx.db.insert("announcementAcknowledgements", { announcementId: args.announcementId, userId: user._id, readAt: new Date().toISOString() });
  },
});

export const acknowledgeAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args): Promise<void> => {
    const user = await requireStaff(ctx);
    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) throw new ConvexError({ code: "NOT_FOUND", message: "Announcement not found" });
    const existing = await ctx.db.query("announcementAcknowledgements").withIndex("by_announcement_and_user", (q) => q.eq("announcementId", args.announcementId).eq("userId", user._id)).unique();
    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, { acknowledgedAt: now });
    } else {
      await ctx.db.insert("announcementAcknowledgements", { announcementId: args.announcementId, userId: user._id, readAt: now, acknowledgedAt: now });
    }
    await logAudit(ctx, {
      action: "approve", entity: "announcements", entityId: args.announcementId, entityRef: announcement.title,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Acknowledged announcement "${announcement.title}"`,
    });
  },
});

// Idempotent seed for the three granular communications permissions. Safe to
// call multiple times; only inserts what's missing.
export const seedCommsPermissions = mutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const user = await requireStaff(ctx);
    if (user.role !== "super_admin" && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const existing = await ctx.db.query("iamPermissions").withIndex("by_module", (q) => q.eq("module", "communications_internal")).collect();
    const existingKeys = new Set(existing.map((p) => p.key));
    const labels: Record<CommsPermission, { action: string; label: string; sensitive: boolean }> = {
      "communications.channel_manage": { action: "ADMIN", label: "Create & Manage Org-Wide Channels", sensitive: true },
      "communications.announce": { action: "ADMIN", label: "Create & Publish Announcements", sensitive: true },
      "communications.settings_manage": { action: "ADMIN", label: "Manage Communication Settings", sensitive: true },
    };
    let inserted = 0;
    for (const key of COMMS_PERMISSIONS) {
      if (existingKeys.has(key)) continue;
      const meta = labels[key];
      await ctx.db.insert("iamPermissions", { key, module: "communications_internal", action: meta.action, label: meta.label, sensitive: meta.sensitive });
      inserted++;
    }
    return { inserted };
  },
});
