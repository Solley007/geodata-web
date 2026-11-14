import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin.ts";
import { internal } from "./_generated/api.js";
import { resolveViewerScope, filterByScope } from "./iam/scope.ts";
import { notifyClient } from "./notifications.ts";

// ── CLIENTS ────────────────────────────────────────────────────────
export const listClients = query({
  args: { kycStatus: v.optional(v.string()), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    let clients = await ctx.db.query("clients").collect();
    if (args.kycStatus && args.kycStatus !== "all") clients = clients.filter((c) => c.kycStatus === args.kycStatus);
    if (args.search) {
      const q = args.search.toLowerCase();
      clients = clients.filter((c) => c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q));
    }
    const scope = await resolveViewerScope(ctx, user, "clients");
    clients = await filterByScope(ctx, clients, scope, (c) => c.assignedAgent ?? c.createdBy);
    return clients.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const listClientsPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    kycStatus: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const scope = await resolveViewerScope(ctx, user, "clients");

    if (args.search && args.search.trim()) {
      const results = await ctx.db
        .query("clients")
        .withSearchIndex("search_fullName", (q) => {
          let sq = q.search("fullName", args.search!.trim());
          if (args.kycStatus && args.kycStatus !== "all") sq = sq.eq("kycStatus", args.kycStatus);
          return sq;
        })
        .paginate(args.paginationOpts);
      return { ...results, page: await filterByScope(ctx, results.page, scope, (c) => c.assignedAgent ?? c.createdBy) };
    }

    if (args.kycStatus && args.kycStatus !== "all") {
      const results = await ctx.db
        .query("clients")
        .withIndex("by_kyc", (q) => q.eq("kycStatus", args.kycStatus!))
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...results, page: await filterByScope(ctx, results.page, scope, (c) => c.assignedAgent ?? c.createdBy) };
    }

    const results = await ctx.db.query("clients").order("desc").paginate(args.paginationOpts);
    return { ...results, page: await filterByScope(ctx, results.page, scope, (c) => c.assignedAgent ?? c.createdBy) };
  },
});


export const getClient = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

export const createClient = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    state: v.optional(v.string()),
    lga: v.optional(v.string()),
    occupation: v.optional(v.string()),
    nin: v.optional(v.string()),
    bvn: v.optional(v.string()),
    kycStatus: v.string(),
    source: v.string(),
    assignedAgent: v.optional(v.id("users")),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("clients", { ...args, createdBy: user._id });
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "client", entityId: id, details: args.fullName });
    return id;
  },
});

export const updateClient = mutation({
  args: {
    id: v.id("clients"),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    state: v.optional(v.string()),
    lga: v.optional(v.string()),
    occupation: v.optional(v.string()),
    nin: v.optional(v.string()),
    bvn: v.optional(v.string()),
    kycStatus: v.optional(v.string()),
    source: v.optional(v.string()),
    assignedAgent: v.optional(v.id("users")),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    await ctx.db.insert("activityLog", { userId: user._id, action: "update", entity: "client", entityId: id, details: updates.fullName ?? "updated" });
  },
});

export const deleteClient = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", { userId: user._id, action: "delete", entity: "client", entityId: args.id, details: "client deleted" });
  },
});

// ── CLIENT DOCUMENTS ──────────────────────────────────────────────
export const listDocuments = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.query("clientDocuments").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).collect();
  },
});

export const addDocument = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.string(),
    docType: v.string(),
    url: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    return await ctx.db.insert("clientDocuments", { ...args, uploadedBy: user._id });
  },
});

export const updateDocumentStatus = mutation({
  args: { id: v.id("clientDocuments"), status: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const deleteDocument = mutation({
  args: { id: v.id("clientDocuments") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// ── CLIENT NOTES ──────────────────────────────────────────────────
export const listNotes = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.query("clientNotes").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).order("desc").take(50);
  },
});

export const addNote = mutation({
  args: { clientId: v.id("clients"), note: v.string(), authorName: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    return await ctx.db.insert("clientNotes", { ...args, authorId: user._id });
  },
});

export const deleteNote = mutation({
  args: { id: v.id("clientNotes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// ── FOLLOW-UPS ────────────────────────────────────────────────────
export const listFollowUps = query({
  args: { clientId: v.optional(v.id("clients")), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.clientId) {
      const clientId = args.clientId;
      let items = await ctx.db.query("followUps").withIndex("by_client", (q) => q.eq("clientId", clientId)).collect();
      if (args.status && args.status !== "all") items = items.filter((f) => f.status === args.status);
      return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
    let items = await ctx.db.query("followUps").collect();
    if (args.status && args.status !== "all") items = items.filter((f) => f.status === args.status);
    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },
});

export const createFollowUp = mutation({
  args: {
    clientId: v.id("clients"),
    dueDate: v.string(),
    type: v.string(),
    description: v.string(),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("followUps", { ...args, status: "pending" });
  },
});

export const updateFollowUpStatus = mutation({
  args: { id: v.id("followUps"), status: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const deleteFollowUp = mutation({
  args: { id: v.id("followUps") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const listFollowUpsPaginated = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status && args.status !== "all") {
      return await ctx.db
        .query("followUps")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("followUps").order("desc").paginate(args.paginationOpts);
  },
});

// ── INVOICES ──────────────────────────────────────────────────────
export const listInvoices = query({
  args: { clientId: v.optional(v.id("clients")), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.clientId) {
      const clientId = args.clientId;
      let items = await ctx.db.query("invoices").withIndex("by_client", (q) => q.eq("clientId", clientId)).collect();
      if (args.status && args.status !== "all") items = items.filter((i) => i.status === args.status);
      return items.sort((a, b) => b._creationTime - a._creationTime);
    }
    let items = await ctx.db.query("invoices").collect();
    if (args.status && args.status !== "all") items = items.filter((i) => i.status === args.status);
    return items.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const createInvoice = mutation({
  args: {
    clientId: v.id("clients"),
    propertyId: v.optional(v.id("properties")),
    invoiceNumber: v.string(),
    amount: v.number(),
    dueDate: v.string(),
    items: v.array(v.object({ description: v.string(), amount: v.number() })),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const id = await ctx.db.insert("invoices", { ...args, paid: 0, balance: args.amount, status: "draft", createdBy: user._id });
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "invoice", entityId: id, details: args.invoiceNumber });
    return id;
  },
});

export const updateInvoice = mutation({
  args: {
    id: v.id("invoices"),
    paid: v.optional(v.number()),
    balance: v.optional(v.number()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    await ctx.db.insert("activityLog", { userId: user._id, action: "update", entity: "invoice", entityId: id, details: `status: ${updates.status ?? "updated"}` });
  },
});

export const deleteInvoice = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    await ctx.db.insert("activityLog", { userId: user._id, action: "delete", entity: "invoice", entityId: args.id, details: "deleted" });
  },
});

export const listInvoicesPaginated = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status && args.status !== "all") {
      return await ctx.db
        .query("invoices")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("invoices").order("desc").paginate(args.paginationOpts);
  },
});

// ── PAYMENT PLANS ─────────────────────────────────────────────────
export const listPaymentPlans = query({
  args: { clientId: v.optional(v.id("clients")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.clientId) {
      const clientId = args.clientId;
      return await ctx.db.query("paymentPlans").withIndex("by_client", (q) => q.eq("clientId", clientId)).collect();
    }
    return await ctx.db.query("paymentPlans").order("desc").take(100);
  },
});

export const listPaymentPlansPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.query("paymentPlans").order("desc").paginate(args.paginationOpts);
  },
});

export const createPaymentPlan = mutation({
  args: {
    clientId: v.id("clients"),
    propertyId: v.optional(v.id("properties")),
    title: v.string(),
    totalAmount: v.number(),
    initialDeposit: v.number(),
    durationMonths: v.number(),
    startDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const balance = args.totalAmount - args.initialDeposit;
    const id = await ctx.db.insert("paymentPlans", { ...args, balance, status: "active", createdBy: user._id });
    // Auto-generate monthly installments
    const monthlyAmount = Math.round(balance / args.durationMonths);
    const start = new Date(args.startDate);
    for (let i = 0; i < args.durationMonths; i++) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i + 1);
      await ctx.db.insert("installments", {
        paymentPlanId: id,
        clientId: args.clientId,
        dueDate: due.toISOString().split("T")[0],
        amount: i === args.durationMonths - 1 ? balance - monthlyAmount * (args.durationMonths - 1) : monthlyAmount,
        status: "pending",
      });
    }
    await ctx.db.insert("activityLog", { userId: user._id, action: "create", entity: "payment_plan", entityId: id, details: args.title });
    return id;
  },
});

export const updatePaymentPlanStatus = mutation({
  args: { id: v.id("paymentPlans"), status: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

// ── INSTALLMENTS ──────────────────────────────────────────────────
export const listInstallments = query({
  args: { paymentPlanId: v.id("paymentPlans") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.query("installments").withIndex("by_plan", (q) => q.eq("paymentPlanId", args.paymentPlanId)).collect();
  },
});

export const markInstallmentPaid = mutation({
  args: { id: v.id("installments"), reference: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: "paid", paidDate: new Date().toISOString().split("T")[0], reference: args.reference, recordedBy: user._id });
  },
});

// Sweeps pending installments and sends "due soon" (within 3 days) or
// "overdue" reminders to the client. Bounded to pending rows only, safe to
// run repeatedly on-demand from the admin UI — mirrors the sweep pattern
// already used by temporaryAccess.ts / partnerEngagements.ts.
export const sweepInstallmentReminders = mutation({
  args: {},
  handler: async (ctx): Promise<{ dueSoon: number; overdue: number }> => {
    await requireAdmin(ctx);
    const pending = await ctx.db.query("installments").withIndex("by_status", (q) => q.eq("status", "pending")).collect();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const soonCutoff = new Date(today);
    soonCutoff.setDate(soonCutoff.getDate() + 3);
    const soonCutoffStr = soonCutoff.toISOString().split("T")[0];

    let dueSoon = 0;
    let overdue = 0;
    for (const installment of pending) {
      const isOverdue = installment.dueDate < todayStr;
      const isDueSoon = !isOverdue && installment.dueDate <= soonCutoffStr;
      if (!isOverdue && !isDueSoon) continue;

      if (isOverdue && installment.status !== "overdue") {
        await ctx.db.patch(installment._id, { status: "overdue" });
      }

      const [client, plan] = await Promise.all([
        ctx.db.get(installment.clientId),
        ctx.db.get(installment.paymentPlanId),
      ]);
      if (client?.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendInstallmentReminderEmail, {
          to: client.email,
          phone: client.phone,
          name: client.fullName,
          amount: installment.amount,
          dueDate: installment.dueDate,
          planTitle: plan?.title ?? "Payment Plan",
          overdue: isOverdue,
        });
      }
      if (isOverdue) overdue++;
      else dueSoon++;
    }
    return { dueSoon, overdue };
  },
});

// ── SUPPORT TICKETS ───────────────────────────────────────────────
export const listTickets = query({
  args: { clientId: v.optional(v.id("clients")), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.clientId) {
      const clientId = args.clientId;
      let tickets = await ctx.db.query("supportTickets").withIndex("by_client", (q) => q.eq("clientId", clientId)).collect();
      if (args.status && args.status !== "all") tickets = tickets.filter((t) => t.status === args.status);
      return tickets.sort((a, b) => b._creationTime - a._creationTime);
    }
    let tickets = await ctx.db.query("supportTickets").collect();
    if (args.status && args.status !== "all") tickets = tickets.filter((t) => t.status === args.status);
    return tickets.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const listTicketsPaginated = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status && args.status !== "all") {
      return await ctx.db
        .query("supportTickets")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("supportTickets").order("desc").paginate(args.paginationOpts);
  },
});

export const createTicket = mutation({
  args: {
    clientId: v.id("clients"),
    subject: v.string(),
    message: v.string(),
    priority: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("supportTickets", { ...args, status: "open" });
  },
});

export const updateTicket = mutation({
  args: {
    id: v.id("supportTickets"),
    status: v.optional(v.string()),
    response: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, respondedBy: updates.response ? user._id : undefined });

    if (updates.response) {
      const ticket = await ctx.db.get(id);
      if (ticket) {
        await notifyClient(ctx, {
          clientId: ticket.clientId,
          type: "support_reply",
          title: "New Reply to Your Support Ticket",
          message: `"${ticket.subject}" received a reply from our team.`,
          link: "/client?tab=support",
        });
      }
    }
  },
});

// ── STATS ─────────────────────────────────────────────────────────
export const getClientStats = query({
  args: {},
  handler: async (ctx): Promise<{
    totalClients: number; verifiedKyc: number; pendingKyc: number;
    totalInvoiced: number; totalPaid: number; totalBalance: number;
    openTickets: number; pendingFollowUps: number;
  }> => {
    await requireAdmin(ctx);
    const clients = await ctx.db.query("clients").collect();
    const invoices = await ctx.db.query("invoices").collect();
    const tickets = await ctx.db.query("supportTickets").collect();
    const followUps = await ctx.db.query("followUps").collect();
    return {
      totalClients: clients.length,
      verifiedKyc: clients.filter((c) => c.kycStatus === "verified").length,
      pendingKyc: clients.filter((c) => c.kycStatus === "pending").length,
      totalInvoiced: invoices.reduce((s, i) => s + i.amount, 0),
      totalPaid: invoices.reduce((s, i) => s + i.paid, 0),
      totalBalance: invoices.reduce((s, i) => s + i.balance, 0),
      openTickets: tickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
      pendingFollowUps: followUps.filter((f) => f.status === "pending").length,
    };
  },
});
