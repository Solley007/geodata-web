import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";
import { internal } from "./_generated/api.js";
import { hasApprovalAuthority, isApprovalTypeGoverned } from "./iam/approvalAuthority.ts";
import { resolveViewerScope, filterByScope } from "./iam/scope.ts";
import { tokenOf } from "./authIdentity";

// ── Auth helpers ───────────────────────────────────────────────────────────────

async function requireStaff(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity)))
    .unique();
  if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
  const STAFF_ROLES = ["super_admin", "admin", "manager", "agent"];
  if (!user.role || !STAFF_ROLES.includes(user.role)) {
    throw new ConvexError({ message: "Staff access required", code: "FORBIDDEN" });
  }
  return user;
}

// Any authenticated user — used only by the "My ..." self-service task
// functions below, which already scope every read/write to
// `assignedTo === user._id` regardless of the caller's coarse role. This
// lets non-staff dashboard profiles (Board, Auditor, External/Restricted)
// see and act on tasks explicitly assigned to them without gaining any
// org-wide visibility that requireStaff's STAFF_ROLES check protects.
async function requireAuthenticated(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenOf(identity)))
    .unique();
  if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
  return user;
}

// ── Ref generators ─────────────────────────────────────────────────────────────

async function nextTaskRef(ctx: MutationCtx): Promise<string> {
  const last = await ctx.db.query("tasks").order("desc").first();
  const n = last ? parseInt(last.taskRef.replace("GWS-TSK-", "") || "0", 10) + 1 : 1;
  return `GWS-TSK-${String(n).padStart(4, "0")}`;
}

async function nextApprovalRef(ctx: MutationCtx): Promise<string> {
  const last = await ctx.db.query("approvals").order("desc").first();
  const n = last ? parseInt(last.approvalRef.replace("GWS-APR-", "") || "0", 10) + 1 : 1;
  return `GWS-APR-${String(n).padStart(4, "0")}`;
}

// ── Audit log helper ───────────────────────────────────────────────────────────

export async function logAudit(
  ctx: MutationCtx,
  params: {
    action: string;
    entity: string;
    entityId?: string;
    entityRef?: string;
    userId?: Id<"users">;
    userName?: string;
    userRole?: string;
    description: string;
    before?: string;
    after?: string;
    metadata?: string;
  }
) {
  await ctx.db.insert("auditLog", {
    ...params,
    timestamp: new Date().toISOString(),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════════════════════

export const listTasks = query({
  args: {
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    category: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);

    let tasks;
    if (args.status) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(200);
    } else if (args.assignedTo) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_assigned", (q) => q.eq("assignedTo", args.assignedTo))
        .order("desc")
        .take(200);
    } else {
      tasks = await ctx.db.query("tasks").order("desc").take(200);
    }

    // Client-side filters
    if (args.priority) tasks = tasks.filter((t) => t.priority === args.priority);
    if (args.category) tasks = tasks.filter((t) => t.category === args.category);
    if (args.assignedTo && !args.status) tasks = tasks.filter((t) => t.assignedTo === args.assignedTo);
    if (args.search) {
      const q = args.search.toLowerCase();
      tasks = tasks.filter((t) =>
        t.title.toLowerCase().includes(q) || t.taskRef.toLowerCase().includes(q)
      );
    }

    const scope = await resolveViewerScope(ctx, user, "tasks");
    tasks = await filterByScope(ctx, tasks, scope, (t) => t.assignedTo ?? t.createdBy);

    // Enrich
    return await Promise.all(
      tasks.map(async (t) => {
        const assignee = t.assignedTo ? await ctx.db.get(t.assignedTo) : null;
        const creator = t.createdBy ? await ctx.db.get(t.createdBy) : null;
        const commentCount = (
          await ctx.db.query("taskComments").withIndex("by_task", (q) => q.eq("taskId", t._id)).collect()
        ).length;
        return {
          ...t,
          assigneeName: assignee?.name ?? "Unassigned",
          creatorName: creator?.name ?? "System",
          commentCount,
        };
      })
    );
  },
});

export const listTasksPaginated = query({
  args: {
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const scope = await resolveViewerScope(ctx, user, "tasks");
    let result;
    if (args.search) {
      result = await ctx.db
        .query("tasks")
        .withSearchIndex("search_title", (q) => {
          let query = q.search("title", args.search!);
          if (args.status) query = query.eq("status", args.status);
          if (args.priority) query = query.eq("priority", args.priority);
          if (args.category) query = query.eq("category", args.category);
          return query;
        })
        .paginate(args.paginationOpts);
    } else if (args.status) {
      result = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.assignedTo) {
      result = await ctx.db
        .query("tasks")
        .withIndex("by_assigned", (q) => q.eq("assignedTo", args.assignedTo))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db.query("tasks").order("desc").paginate(args.paginationOpts);
    }

    const scopedPage = await filterByScope(
      ctx,
      result.page.filter((t) => (!args.priority || t.priority === args.priority) && (!args.category || t.category === args.category)),
      scope,
      (t) => t.assignedTo ?? t.createdBy,
    );

    return {
      ...result,
      page: await Promise.all(
        scopedPage
          .map(async (t) => {
            const assignee = t.assignedTo ? await ctx.db.get(t.assignedTo) : null;
            const creator = t.createdBy ? await ctx.db.get(t.createdBy) : null;
            const commentCount = (
              await ctx.db.query("taskComments").withIndex("by_task", (q) => q.eq("taskId", t._id)).collect()
            ).length;
            return {
              ...t,
              assigneeName: assignee?.name ?? "Unassigned",
              creatorName: creator?.name ?? "System",
              commentCount,
            };
          })
      ),
    };
  },
});

export const getTaskStats = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const all = await ctx.db.query("tasks").order("desc").take(500);
    const now = new Date().toISOString().slice(0, 10);
    return {
      total: all.length,
      todo: all.filter((t) => t.status === "todo").length,
      inProgress: all.filter((t) => t.status === "in_progress").length,
      done: all.filter((t) => t.status === "done").length,
      overdue: all.filter(
        (t) => t.dueDate && t.dueDate < now && !["done", "cancelled"].includes(t.status)
      ).length,
      urgent: all.filter((t) => t.priority === "urgent" && !["done", "cancelled"].includes(t.status)).length,
    };
  },
});

export const getTask = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const task = await ctx.db.get(args.id);
    if (!task) return null;
    const comments = await ctx.db
      .query("taskComments")
      .withIndex("by_task", (q) => q.eq("taskId", args.id))
      .collect();
    const enrichedComments = await Promise.all(
      comments.map(async (c) => {
        const author = await ctx.db.get(c.authorId);
        return { ...c, authorName: author?.name ?? "Unknown" };
      })
    );
    const assignee = task.assignedTo ? await ctx.db.get(task.assignedTo) : null;
    const creator = task.createdBy ? await ctx.db.get(task.createdBy) : null;
    return {
      ...task,
      assigneeName: assignee?.name ?? "Unassigned",
      creatorName: creator?.name ?? "System",
      comments: enrichedComments,
    };
  },
});

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.string(),
    category: v.string(),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const taskRef = await nextTaskRef(ctx);
    const id = await ctx.db.insert("tasks", {
      taskRef,
      status: "todo",
      createdBy: user._id,
      ...args,
    });
    await logAudit(ctx, {
      action: "create",
      entity: "tasks",
      entityId: id,
      entityRef: taskRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Task created: ${args.title}`,
    });
    if (args.assignedTo) {
      const assignee = await ctx.db.get(args.assignedTo);
      if (assignee?.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendTaskAssignedEmail, {
          to: assignee.email,
          phone: assignee.phone,
          name: assignee.name ?? "there",
          taskRef,
          title: args.title,
          priority: args.priority,
          dueDate: args.dueDate,
        });
      }
    }
    return id;
  },
});

export const updateTaskStatus = mutation({
  args: { id: v.id("tasks"), status: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const task = await ctx.db.get(args.id);
    if (!task) throw new ConvexError({ message: "Task not found", code: "NOT_FOUND" });
    const patch: Record<string, string | undefined> = { status: args.status };
    if (args.status === "done") patch.completedAt = new Date().toISOString();
    await ctx.db.patch(args.id, patch);
    await logAudit(ctx, {
      action: "status_change",
      entity: "tasks",
      entityId: args.id,
      entityRef: task.taskRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Task status: ${task.status} → ${args.status}${args.note ? ` — ${args.note}` : ""}`,
    });
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),
    category: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const { id, ...rest } = args;
    const task = await ctx.db.get(id);
    if (!task) throw new ConvexError({ message: "Task not found", code: "NOT_FOUND" });
    await ctx.db.patch(id, rest);
    await logAudit(ctx, {
      action: "update",
      entity: "tasks",
      entityId: id,
      entityRef: task.taskRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Task updated: ${task.title}`,
    });
    if (args.assignedTo && args.assignedTo !== task.assignedTo) {
      const assignee = await ctx.db.get(args.assignedTo);
      if (assignee?.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendTaskAssignedEmail, {
          to: assignee.email,
          phone: assignee.phone,
          name: assignee.name ?? "there",
          taskRef: task.taskRef,
          title: args.title ?? task.title,
          priority: args.priority ?? task.priority,
          dueDate: args.dueDate ?? task.dueDate,
        });
      }
    }
  },
});

export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const task = await ctx.db.get(args.id);
    if (!task) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await ctx.db.delete(args.id);
    // Delete comments too
    const comments = await ctx.db.query("taskComments").withIndex("by_task", (q) => q.eq("taskId", args.id)).collect();
    await Promise.all(comments.map((c) => ctx.db.delete(c._id)));
    await logAudit(ctx, {
      action: "delete",
      entity: "tasks",
      entityId: args.id,
      entityRef: task.taskRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Task deleted: ${task.title}`,
    });
  },
});

export const addTaskComment = mutation({
  args: { taskId: v.id("tasks"), content: v.string() },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    return await ctx.db.insert("taskComments", {
      taskId: args.taskId,
      authorId: user._id,
      content: args.content,
      timestamp: new Date().toISOString(),
    });
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// MY TASKS (Staff Portal self-service) — always scoped to the current viewer's
// own assignedTo, regardless of any other org-wide scope rules. This powers
// the /staff/tasks section, distinct from the full admin Tasks & Approvals view.
// ══════════════════════════════════════════════════════════════════════════════

export const listMyTasksPaginated = query({
  args: {
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticated(ctx);

    let result;
    if (args.search) {
      result = await ctx.db
        .query("tasks")
        .withSearchIndex("search_title", (q) => {
          let query = q.search("title", args.search!);
          if (args.status) query = query.eq("status", args.status);
          return query;
        })
        .paginate(args.paginationOpts);
      result = { ...result, page: result.page.filter((t) => t.assignedTo === user._id) };
    } else {
      result = await ctx.db
        .query("tasks")
        .withIndex("by_assigned", (q) => q.eq("assignedTo", user._id))
        .order("desc")
        .paginate(args.paginationOpts);
      if (args.status) result = { ...result, page: result.page.filter((t) => t.status === args.status) };
    }

    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (t) => {
          const commentCount = (
            await ctx.db.query("taskComments").withIndex("by_task", (q) => q.eq("taskId", t._id)).collect()
          ).length;
          return { ...t, commentCount };
        })
      ),
    };
  },
});

export const getMyTaskStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthenticated(ctx);
    const mine = await ctx.db
      .query("tasks")
      .withIndex("by_assigned", (q) => q.eq("assignedTo", user._id))
      .order("desc")
      .take(500);
    const now = new Date().toISOString().slice(0, 10);
    return {
      total: mine.length,
      todo: mine.filter((t) => t.status === "todo").length,
      inProgress: mine.filter((t) => t.status === "in_progress").length,
      done: mine.filter((t) => t.status === "done").length,
      overdue: mine.filter(
        (t) => t.dueDate && t.dueDate < now && !["done", "cancelled"].includes(t.status)
      ).length,
    };
  },
});

export const getMyTask = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticated(ctx);
    const task = await ctx.db.get(args.id);
    if (!task || task.assignedTo !== user._id) return null;
    const comments = await ctx.db
      .query("taskComments")
      .withIndex("by_task", (q) => q.eq("taskId", args.id))
      .collect();
    const enrichedComments = await Promise.all(
      comments.map(async (c) => {
        const author = await ctx.db.get(c.authorId);
        return { ...c, authorName: author?.name ?? "Unknown" };
      })
    );
    const creator = task.createdBy ? await ctx.db.get(task.createdBy) : null;
    return { ...task, creatorName: creator?.name ?? "System", comments: enrichedComments };
  },
});

export const updateMyTaskStatus = mutation({
  args: { id: v.id("tasks"), status: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAuthenticated(ctx);
    const task = await ctx.db.get(args.id);
    if (!task) throw new ConvexError({ message: "Task not found", code: "NOT_FOUND" });
    if (task.assignedTo !== user._id) {
      throw new ConvexError({ message: "You can only update your own tasks", code: "FORBIDDEN" });
    }
    const patch: Record<string, string | undefined> = { status: args.status };
    if (args.status === "done") patch.completedAt = new Date().toISOString();
    await ctx.db.patch(args.id, patch);
    await logAudit(ctx, {
      action: "status_change",
      entity: "tasks",
      entityId: args.id,
      entityRef: task.taskRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Task status: ${task.status} → ${args.status}${args.note ? ` — ${args.note}` : ""}`,
    });
  },
});

export const addMyTaskComment = mutation({
  args: { taskId: v.id("tasks"), content: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthenticated(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new ConvexError({ message: "Task not found", code: "NOT_FOUND" });
    if (task.assignedTo !== user._id) {
      throw new ConvexError({ message: "You can only comment on your own tasks", code: "FORBIDDEN" });
    }
    return await ctx.db.insert("taskComments", {
      taskId: args.taskId,
      authorId: user._id,
      content: args.content,
      timestamp: new Date().toISOString(),
    });
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// APPROVALS
// ══════════════════════════════════════════════════════════════════════════════

export const listApprovals = query({
  args: {
    status: v.optional(v.string()),
    approvalType: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);

    let approvals;
    if (args.status) {
      approvals = await ctx.db
        .query("approvals")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(200);
    } else if (args.approvalType) {
      approvals = await ctx.db
        .query("approvals")
        .withIndex("by_type", (q) => q.eq("approvalType", args.approvalType!))
        .order("desc")
        .take(200);
    } else {
      approvals = await ctx.db.query("approvals").order("desc").take(200);
    }

    if (args.approvalType && args.status) {
      approvals = approvals.filter((a) => a.approvalType === args.approvalType);
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      approvals = approvals.filter((a) =>
        a.summary.toLowerCase().includes(q) ||
        a.approvalRef.toLowerCase().includes(q) ||
        (a.relatedRef ?? "").toLowerCase().includes(q)
      );
    }

    const scope = await resolveViewerScope(ctx, user, "tasks");
    approvals = await filterByScope(ctx, approvals, scope, (a) => a.assignedTo ?? a.requestedBy);

    return await Promise.all(
      approvals.map(async (a) => {
        const requester = a.requestedBy ? await ctx.db.get(a.requestedBy) : null;
        const reviewer = a.assignedTo ? await ctx.db.get(a.assignedTo) : null;
        const client = a.clientId ? await ctx.db.get(a.clientId) : null;
        return {
          ...a,
          requesterName: requester?.name ?? "System",
          reviewerName: reviewer?.name ?? "Unassigned",
          clientName: client?.fullName ?? null,
        };
      })
    );
  },
});

export const listApprovalsPaginated = query({
  args: {
    status: v.optional(v.string()),
    approvalType: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const scope = await resolveViewerScope(ctx, user, "tasks");
    let result;
    if (args.search) {
      result = await ctx.db
        .query("approvals")
        .withSearchIndex("search_summary", (q) => {
          let query = q.search("summary", args.search!);
          if (args.status) query = query.eq("status", args.status);
          if (args.approvalType) query = query.eq("approvalType", args.approvalType);
          return query;
        })
        .paginate(args.paginationOpts);
    } else if (args.status) {
      result = await ctx.db
        .query("approvals")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.approvalType) {
      result = await ctx.db
        .query("approvals")
        .withIndex("by_type", (q) => q.eq("approvalType", args.approvalType!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db.query("approvals").order("desc").paginate(args.paginationOpts);
    }

    const scopedPage = await filterByScope(ctx, result.page, scope, (a) => a.assignedTo ?? a.requestedBy);

    return {
      ...result,
      page: await Promise.all(
        scopedPage.map(async (a) => {
          const requester = a.requestedBy ? await ctx.db.get(a.requestedBy) : null;
          const reviewer = a.assignedTo ? await ctx.db.get(a.assignedTo) : null;
          const client = a.clientId ? await ctx.db.get(a.clientId) : null;
          return {
            ...a,
            requesterName: requester?.name ?? "System",
            reviewerName: reviewer?.name ?? "Unassigned",
            clientName: client?.fullName ?? null,
          };
        })
      ),
    };
  },
});

export const getApprovalStats = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const all = await ctx.db.query("approvals").order("desc").take(500);
    return {
      total: all.length,
      pending: all.filter((a) => a.status === "pending").length,
      approved: all.filter((a) => a.status === "approved").length,
      rejected: all.filter((a) => a.status === "rejected").length,
      escalated: all.filter((a) => a.status === "escalated").length,
      urgent: all.filter((a) => a.priority === "urgent" && a.status === "pending").length,
    };
  },
});

export const createApproval = mutation({
  args: {
    approvalType: v.string(),
    priority: v.string(),
    summary: v.string(),
    requestNote: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    transactionId: v.optional(v.id("transactions")),
    kycSubmissionId: v.optional(v.id("kycSubmissions")),
    financeApplicationId: v.optional(v.id("financeApplications")),
    paymentId: v.optional(v.id("geoPayments")),
    relatedRef: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const approvalRef = await nextApprovalRef(ctx);
    const id = await ctx.db.insert("approvals", {
      approvalRef,
      status: "pending",
      requestedBy: user._id,
      requestedAt: new Date().toISOString(),
      ...args,
    });
    await logAudit(ctx, {
      action: "create",
      entity: "approvals",
      entityId: id,
      entityRef: approvalRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Approval request created: ${args.summary}`,
    });
    return id;
  },
});

export const decideApproval = mutation({
  args: {
    id: v.id("approvals"),
    decision: v.string(),  // "approved" | "rejected"
    decisionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const approval = await ctx.db.get(args.id);
    if (!approval) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (approval.status !== "pending" && approval.status !== "escalated") {
      throw new ConvexError({ message: "Approval already decided", code: "BAD_REQUEST" });
    }
    // Explicit approval authority: once any authority has been configured for
    // this approval type, only holders of active authority (direct or via an
    // active delegation) may decide it. Never inferred from role/title.
    if (await isApprovalTypeGoverned(ctx, approval.approvalType)) {
      const directAuthority = await hasApprovalAuthority(ctx, user._id, approval.approvalType);
      let viaDelegation = false;
      if (!directAuthority) {
        const now = new Date().toISOString();
        const delegations = await ctx.db
          .query("approvalDelegations")
          .withIndex("by_delegate", (q) => q.eq("delegateId", user._id))
          .collect();
        viaDelegation = delegations.some(
          (d) =>
            d.approvalType === approval.approvalType &&
            d.status === "active" &&
            d.startAt <= now &&
            d.endAt >= now
        );
      }
      if (!directAuthority && !viaDelegation) {
        throw new ConvexError({
          message: "You do not hold explicit approval authority for this approval type",
          code: "FORBIDDEN",
        });
      }
    }
    await ctx.db.patch(args.id, {
      status: args.decision,
      decision: args.decision,
      decisionNote: args.decisionNote,
      decisionBy: user._id,
      decisionAt: new Date().toISOString(),
    });
    await logAudit(ctx, {
      action: args.decision === "approved" ? "approve" : "reject",
      entity: "approvals",
      entityId: args.id,
      entityRef: approval.approvalRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Approval ${args.decision}: ${approval.summary}${args.decisionNote ? ` — ${args.decisionNote}` : ""}`,
    });
    if (approval.requestedBy) {
      const requester = await ctx.db.get(approval.requestedBy);
      if (requester?.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendApprovalDecisionEmail, {
          to: requester.email,
          phone: requester.phone,
          name: requester.name ?? "there",
          approvalRef: approval.approvalRef,
          summary: approval.summary,
          decision: args.decision,
          decisionNote: args.decisionNote,
        });
      }
    }
  },
});

export const escalateApproval = mutation({
  args: {
    id: v.id("approvals"),
    escalatedTo: v.id("users"),
    escalationNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const approval = await ctx.db.get(args.id);
    if (!approval) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.id, {
      status: "escalated",
      escalatedTo: args.escalatedTo,
      escalationNote: args.escalationNote,
      assignedTo: args.escalatedTo,
    });
    await logAudit(ctx, {
      action: "update",
      entity: "approvals",
      entityId: args.id,
      entityRef: approval.approvalRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Approval escalated by ${user.name}${args.escalationNote ? ` — ${args.escalationNote}` : ""}`,
    });
    const escalatedTo = await ctx.db.get(args.escalatedTo);
    if (escalatedTo?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendApprovalEscalatedEmail, {
        to: escalatedTo.email,
        phone: escalatedTo.phone,
        name: escalatedTo.name ?? "there",
        approvalRef: approval.approvalRef,
        summary: approval.summary,
        escalatedByName: user.name ?? "A colleague",
        escalationNote: args.escalationNote,
      });
    }
  },
});

export const withdrawApproval = mutation({
  args: { id: v.id("approvals"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    const approval = await ctx.db.get(args.id);
    if (!approval) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.id, { status: "withdrawn" });
    await logAudit(ctx, {
      action: "update",
      entity: "approvals",
      entityId: args.id,
      entityRef: approval.approvalRef,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      description: `Approval withdrawn${args.note ? `: ${args.note}` : ""}`,
    });
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════════════════════════

export const listAuditLog = query({
  args: {
    entity: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    action: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const limit = args.limit ?? 100;

    let entries;
    if (args.entity) {
      entries = await ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) => q.eq("entity", args.entity!))
        .order("desc")
        .take(limit);
    } else if (args.userId) {
      entries = await ctx.db
        .query("auditLog")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .take(limit);
    } else {
      entries = await ctx.db.query("auditLog").order("desc").take(limit);
    }

    if (args.action) entries = entries.filter((e) => e.action === args.action);
    if (args.search) {
      const q = args.search.toLowerCase();
      entries = entries.filter((e) =>
        e.description.toLowerCase().includes(q) ||
        (e.entityRef ?? "").toLowerCase().includes(q) ||
        (e.userName ?? "").toLowerCase().includes(q)
      );
    }

    return entries;
  },
});

export const listAuditLogPaginated = query({
  args: {
    entity: v.optional(v.string()),
    action: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);

    if (args.search) {
      return await ctx.db
        .query("auditLog")
        .withSearchIndex("search_description", (q) => {
          let query = q.search("description", args.search!);
          if (args.entity) query = query.eq("entity", args.entity);
          if (args.action) query = query.eq("action", args.action);
          return query;
        })
        .paginate(args.paginationOpts);
    }

    if (args.entity && args.action) {
      return await ctx.db
        .query("auditLog")
        .withIndex("by_entity_and_action", (q) => q.eq("entity", args.entity!).eq("action", args.action!))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    if (args.entity) {
      return await ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) => q.eq("entity", args.entity!))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    if (args.action) {
      return await ctx.db
        .query("auditLog")
        .withIndex("by_action", (q) => q.eq("action", args.action!))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db.query("auditLog").order("desc").paginate(args.paginationOpts);
  },
});

export const getAuditStats = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const entries = await ctx.db.query("auditLog").order("desc").take(500);
    const actions: Record<string, number> = {};
    const entities: Record<string, number> = {};
    for (const e of entries) {
      actions[e.action] = (actions[e.action] ?? 0) + 1;
      entities[e.entity] = (entities[e.entity] ?? 0) + 1;
    }
    return { total: entries.length, actions, entities };
  },
});

// Manual audit entry (for admin use)
export const createAuditEntry = mutation({
  args: {
    action: v.string(),
    entity: v.string(),
    entityRef: v.optional(v.string()),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    await ctx.db.insert("auditLog", {
      ...args,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      timestamp: new Date().toISOString(),
    });
  },
});
