import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Delivery tracking for partnership letters — proof of physical/courier/
// email delivery. Explicitly a distinct step from acknowledgement (the
// recipient confirming receipt) which lives in acknowledgements.ts.
// ══════════════════════════════════════════════════════════════════════════

async function assertLetterVisible(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  letterId: Id<"corporatePartnershipLetters">,
): Promise<Doc<"corporatePartnershipLetters">> {
  const letter = await ctx.db.get(letterId);
  if (!letter) throw new ConvexError({ code: "NOT_FOUND", message: "Partnership letter not found" });
  const org = await ctx.db.get(letter.organisationId);
  const ownerId = org?.assignedOfficer ?? org?.relationshipOwner;
  const scope = await resolveViewerScope(ctx, user, "corporate_marketing");
  const [visible] = await filterByScope(ctx, [letter], scope, () => ownerId);
  if (!visible) throw new ConvexError({ code: "FORBIDDEN", message: "You do not have access to this partnership letter" });
  return letter;
}

export const listDeliveries = query({
  args: { letterId: v.id("corporatePartnershipLetters") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    await assertLetterVisible(ctx, user, args.letterId);
    return ctx.db.query("corporateDeliveries").withIndex("by_letter", (q) => q.eq("letterId", args.letterId)).order("desc").collect();
  },
});

export const recordDelivery = mutation({
  args: {
    letterId: v.id("corporatePartnershipLetters"),
    deliveryMethod: v.union(v.literal("hand_delivery"), v.literal("courier"), v.literal("email"), v.literal("other")),
    deliveredBy: v.optional(v.string()),
    receivedBy: v.optional(v.string()),
    recipientDesignation: v.optional(v.string()),
    deliveryDate: v.string(),
    status: v.union(v.literal("pending"), v.literal("delivered"), v.literal("failed")),
    proofVaultDocumentId: v.optional(v.id("vaultDocuments")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.send");
    const letter = await assertLetterVisible(ctx, user, args.letterId);

    if (letter.status !== "sent" && letter.status !== "delivered") {
      throw new ConvexError({ code: "CONFLICT", message: "The letter must be sent before delivery can be recorded" });
    }

    const id = await ctx.db.insert("corporateDeliveries", {
      letterId: args.letterId,
      deliveryMethod: args.deliveryMethod,
      deliveredBy: args.deliveredBy,
      receivedBy: args.receivedBy,
      recipientDesignation: args.recipientDesignation,
      deliveryDate: args.deliveryDate,
      status: args.status,
      proofVaultDocumentId: args.proofVaultDocumentId,
      notes: args.notes,
      recordedBy: user._id,
    });

    if (args.status === "delivered" && letter.status !== "delivered") {
      await ctx.db.patch(args.letterId, { status: "delivered" });
    }

    await logAudit(ctx, {
      action: "create", entity: "corporate_deliveries", entityId: id, entityRef: letter.letterRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Recorded ${args.deliveryMethod.replace("_", " ")} delivery (${args.status}) for letter "${letter.subject}"`,
    });

    return id;
  },
});

export const updateDelivery = mutation({
  args: {
    id: v.id("corporateDeliveries"),
    receivedBy: v.optional(v.string()),
    recipientDesignation: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("delivered"), v.literal("failed"))),
    proofVaultDocumentId: v.optional(v.id("vaultDocuments")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.send");
    const { id, ...patch } = args;
    const delivery = await ctx.db.get(id);
    if (!delivery) throw new ConvexError({ code: "NOT_FOUND", message: "Delivery record not found" });
    const letter = await assertLetterVisible(ctx, user, delivery.letterId);

    await ctx.db.patch(id, patch);

    if (patch.status === "delivered" && letter.status !== "delivered") {
      await ctx.db.patch(delivery.letterId, { status: "delivered" });
    }

    await logAudit(ctx, {
      action: "update", entity: "corporate_deliveries", entityId: id, entityRef: letter.letterRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated delivery record for letter "${letter.subject}"`,
      before: JSON.stringify(delivery),
      after: JSON.stringify(patch),
    });
  },
});
