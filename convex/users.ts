import { ConvexError } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { paginationOptsValidator, type UserIdentity } from "convex/server";
import { tokenOf } from "./authIdentity";

// Resolves the calling user: try tokenIdentifier first, then fall back to
// matching by email. This survives Hercules Auth issuer URL drift, where the
// same end user can get a new tokenIdentifier between sign-ins.
async function resolveCurrentUser(
  ctx: QueryCtx | MutationCtx,
  identity: UserIdentity,
): Promise<Doc<"users"> | null> {
  const byToken = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity)))
    .unique();
  if (byToken) return byToken;
  if (identity.email) {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();
  }
  return null;
}

const ADMIN_ROLES: ReadonlySet<Doc<"users">["role"]> = new Set(["super_admin", "admin"]);
const ADMIN_MANAGER_ROLES: ReadonlySet<Doc<"users">["role"]> = new Set(["super_admin", "admin", "manager"]);
// Every role except "client" carries staff-level access, so it must have a
// matching staffProfiles record in Staff Management (see convex/staff.ts).
const STAFF_LEVEL_ROLES: ReadonlySet<Doc<"users">["role"]> = new Set(["super_admin", "admin", "manager", "agent"]);

async function syncStaffProfile(ctx: MutationCtx, user: Doc<"users">): Promise<void> {
  if (!user.role || !STAFF_LEVEL_ROLES.has(user.role) || !user.email) return;
  await ctx.runMutation(internal.staff.ensureStaffProfileForUser, {
    userId: user._id,
    fullName: user.name ?? user.email,
    email: user.email,
    phone: user.phone,
    department: user.department,
  });
}

// Side effects for a brand-new self sign-up (welcome email, CRM clients row,
// partner link). Called from updateCurrentUser and from Convex Auth's
// createOrUpdateUser in auth.ts.
export async function onNewSelfSignup(
  ctx: MutationCtx,
  newId: Id<"users">,
  email: string | undefined,
  name: string | undefined,
): Promise<void> {
  // Send welcome email to brand-new clients
  if (email) {
    await ctx.scheduler.runAfter(0, internal.emails.sendClientWelcomeEmail, {
      to: email,
      name: name ?? "there",
    });
  }

  // Every new self-signup is a lead: create a matching CRM `clients` row
  // immediately, unless one with this email already exists (e.g. created
  // earlier via a public inquiry/inspection request).
  if (email) {
    const existingClient = await ctx.db
      .query("clients")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
    if (existingClient) {
      if (!existingClient.userId) await ctx.db.patch(existingClient._id, { userId: newId });
    } else {
      await ctx.db.insert("clients", {
        userId: newId,
        fullName: name ?? email,
        email,
        phone: "",
        kycStatus: "pending",
        source: "website",
        createdBy: newId,
      });
    }
  }

  // Link any approved partner record that still has userId: null
  if (email) {
    await ctx.scheduler.runAfter(0, internal.partners.linkPartnerToUser, {
      email,
      userId: newId,
    });
  }
}

// Called from auth/Callback after every sign-in
export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "User not logged in" });
    }

    // 1. Does a full user record already exist for this identity?
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity)))
      .unique();

    if (existing) {
      // Keep name/email up to date; clear preRegistered flag if still set
      await ctx.db.patch(existing._id, {
        name: identity.name ?? existing.name,
        email: identity.email ?? existing.email,
        preRegistered: false,
      });
      // First sign-in of a client pre-registered by an admin: make sure they
      // have a matching CRM `clients` row (auth.ts links them by email).
      if (existing.preRegistered && (existing.role ?? "client") === "client" && existing.email) {
        const existingClient = await ctx.db
          .query("clients")
          .filter((q) => q.eq(q.field("email"), existing.email))
          .first();
        if (existingClient) {
          if (!existingClient.userId) await ctx.db.patch(existingClient._id, { userId: existing._id });
        } else {
          await ctx.db.insert("clients", {
            userId: existing._id,
            fullName: existing.name ?? existing.email,
            email: existing.email,
            phone: existing.phone ?? "",
            kycStatus: "pending",
            source: "website",
            createdBy: existing._id,
          });
        }
      }
      // Link any approved partner record that still has userId: null
      if (identity.email) {
        await ctx.scheduler.runAfter(0, internal.partners.linkPartnerToUser, {
          email: identity.email,
          userId: existing._id,
        });
      }
      return existing._id;
    }

    // 2. Has the admin pre-registered an account with this email, OR does an
    //    existing user have the same email but a stale tokenIdentifier?
    //    (This happens when the Hercules Auth issuer URL changes between sign-ins,
    //    which would otherwise create a duplicate "client" record.)
    if (identity.email) {
      const emailMatch = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email))
        .first();

      if (emailMatch) {
        // Claim or re-link the existing record — update the tokenIdentifier and
        // refresh name/email; preserve role and all other fields.
        await ctx.db.patch(emailMatch._id, {
          tokenIdentifier: tokenOf(identity),
          name: identity.name ?? emailMatch.name,
          email: identity.email ?? emailMatch.email,
          preRegistered: false,
          isActive: emailMatch.isActive !== false ? true : false,
        });
        // If this account is a plain client (not staff pre-registered into a
        // staff role), make sure they also have a matching CRM `clients` row —
        // covers pre-registered clients and stale-token re-links alike.
        if ((emailMatch.role ?? "client") === "client") {
          const existingClient = await ctx.db
            .query("clients")
            .filter((q) => q.eq(q.field("email"), identity.email!))
            .first();
          if (existingClient) {
            if (!existingClient.userId) await ctx.db.patch(existingClient._id, { userId: emailMatch._id });
          } else {
            await ctx.db.insert("clients", {
              userId: emailMatch._id,
              fullName: identity.name ?? emailMatch.name ?? identity.email,
              email: identity.email,
              phone: emailMatch.phone ?? "",
              kycStatus: "pending",
              source: "website",
              createdBy: emailMatch._id,
            });
          }
        }
        // Link any approved partner record that still has userId: null
        await ctx.scheduler.runAfter(0, internal.partners.linkPartnerToUser, {
          email: identity.email,
          userId: emailMatch._id,
        });
        return emailMatch._id;
      }
    }

    // 3. Brand-new user — first ever user becomes admin, rest are clients
    const allUsers = await ctx.db.query("users").take(1);
    const isFirst = allUsers.length === 0;

    const newId = await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: tokenOf(identity),
      role: isFirst ? "admin" : "client",
      isActive: true,
      preRegistered: false,
    });

    if (!isFirst) await onNewSelfSignup(ctx, newId, identity.email, identity.name);

    return newId;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    // Primary lookup: by current tokenIdentifier
    const byToken = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity)))
      .unique();
    if (byToken) return byToken;
    // Fallback: token may differ (issuer URL change) — find by email
    if (identity.email) {
      return await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email))
        .first();
    }
    return null;
  },
});

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const user = await resolveCurrentUser(ctx, identity);
    return user?.role === "super_admin" || user?.role === "admin" || user?.role === "manager" || user?.role === "agent";
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await resolveCurrentUser(ctx, identity);
    if (!me || !ADMIN_MANAGER_ROLES.has(me.role)) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Insufficient permissions" });
    }
    const all = await ctx.db.query("users").collect();
    // Sort: active users first, then pre-registered, then by creation time
    return all.sort((a, b) => {
      if (a.preRegistered !== b.preRegistered) return a.preRegistered ? 1 : -1;
      return b._creationTime - a._creationTime;
    });
  },
});

export const listAllPaginated = query({
  args: {
    role: v.optional(v.union(v.literal("super_admin"), v.literal("admin"), v.literal("manager"), v.literal("agent"), v.literal("client"))),
    audience: v.optional(v.union(v.literal("staff"), v.literal("client"))),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await resolveCurrentUser(ctx, identity);
    if (!me || !ADMIN_MANAGER_ROLES.has(me.role)) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Insufficient permissions" });
    }

    // "Staff" spans several roles (everyone but clients) — there is no single
    // index value for that, so it is expressed as an OR filter applied INSIDE
    // the query, always before .paginate(), so page boundaries stay correct.
    const staffRoles = ["super_admin", "admin", "manager", "agent"] as const;
    const isStaffAudience = args.audience === "staff" && !args.role;

    if (args.search) {
      const searchQuery = ctx.db
        .query("users")
        .withSearchIndex("search_name", (q) => {
          let query = q.search("name", args.search!);
          if (args.role) query = query.eq("role", args.role);
          else if (args.audience === "client") query = query.eq("role", "client");
          return query;
        });
      if (isStaffAudience) {
        return await searchQuery
          .filter((q) => q.or(...staffRoles.map((r) => q.eq(q.field("role"), r))))
          .paginate(args.paginationOpts);
      }
      return await searchQuery.paginate(args.paginationOpts);
    }
    if (args.role) {
      return await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", args.role)).paginate(args.paginationOpts);
    }
    if (args.audience === "client") {
      return await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "client")).paginate(args.paginationOpts);
    }
    if (isStaffAudience) {
      return await ctx.db
        .query("users")
        .filter((q) => q.or(...staffRoles.map((r) => q.eq(q.field("role"), r))))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("users").order("desc").paginate(args.paginationOpts);
  },
});

export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("super_admin"), v.literal("admin"), v.literal("manager"), v.literal("agent"), v.literal("client")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await resolveCurrentUser(ctx, identity);
    if (!me || !ADMIN_ROLES.has(me.role)) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });
    if (args.userId === me._id && me.role !== "super_admin" && args.role !== "admin") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "You cannot change your own role" });
    }
    const target = await ctx.db.get(args.userId);
    await ctx.db.patch(args.userId, { role: args.role });

    const updated = await ctx.db.get(args.userId);
    if (updated) await syncStaffProfile(ctx, updated);

    if (target && target.role !== args.role && target.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendRoleChangedEmail, {
        to: target.email,
        phone: target.phone,
        name: target.name ?? "there",
        fromRole: target.role ?? "none",
        toRole: args.role,
        changedByName: me.name ?? "an administrator",
      });
    }
  },
});

// Admin creates a user account before they sign in
export const preRegisterUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("admin"), v.literal("manager"), v.literal("agent"), v.literal("client")),
    phone: v.optional(v.string()),
    department: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await resolveCurrentUser(ctx, identity);
    if (!me || !ADMIN_ROLES.has(me.role)) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    // Check duplicate email
    const duplicate = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (duplicate) {
      throw new ConvexError({ code: "CONFLICT", message: "A user with this email already exists" });
    }

    const userId = await ctx.db.insert("users", {
      tokenIdentifier: `pre:${args.email}`, // placeholder — overwritten on first login
      name: args.name,
      email: args.email,
      role: args.role,
      phone: args.phone,
      department: args.department,
      isActive: true,
      preRegistered: true,
    });

    const created = await ctx.db.get(userId);
    if (created) await syncStaffProfile(ctx, created);
    return userId;
  },
});

// Admin updates a user's profile details
export const adminUpdateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("super_admin"), v.literal("admin"), v.literal("manager"), v.literal("agent"), v.literal("client"))),
    phone: v.optional(v.string()),
    department: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await resolveCurrentUser(ctx, identity);
    if (!me || !ADMIN_ROLES.has(me.role)) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });
    const { userId, ...patch } = args;
    await ctx.db.patch(userId, patch);

    const updated = await ctx.db.get(userId);
    if (updated) await syncStaffProfile(ctx, updated);
  },
});

// Admin hard-deletes any user (admins only, cannot delete self)
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await resolveCurrentUser(ctx, identity);
    if (!me || !ADMIN_ROLES.has(me.role)) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });
    if (args.userId === me._id) throw new ConvexError({ code: "BAD_REQUEST", message: "You cannot delete your own account" });
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    await ctx.db.delete(args.userId);
  },
});

// Admin toggles a user's active/suspended status
export const setUserActive = mutation({
  args: { userId: v.id("users"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await resolveCurrentUser(ctx, identity);
    if (!me || !ADMIN_ROLES.has(me.role)) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });
    if (args.userId === me._id) throw new ConvexError({ code: "BAD_REQUEST", message: "You cannot suspend your own account" });
    await ctx.db.patch(args.userId, { isActive: args.isActive });
  },
});


// Self-service: any signed-in user edits ONLY their own name, phone and photo.
// Role, department, email and active status stay admin-only.
export const updateMyProfile = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    avatar: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await resolveCurrentUser(ctx, identity);
    if (!me) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    const name = args.name.trim();
    if (name.length < 2 || name.length > 100) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter your full name" });
    }
    const phone = args.phone.trim();
    if (phone.length > 30) throw new ConvexError({ code: "BAD_REQUEST", message: "Phone number is too long" });
    await ctx.db.patch(me._id, {
      name,
      phone: phone || undefined,
      ...(args.avatar !== undefined ? { avatar: args.avatar ?? undefined } : {}),
    });
    return null;
  },
});
