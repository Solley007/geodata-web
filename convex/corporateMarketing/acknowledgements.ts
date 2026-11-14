import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel.d.ts";
import { logAudit } from "../taskboard.ts";
import { resolveViewerScope, filterByScope } from "../iam/scope.ts";
import { requirePermission } from "./feature.ts";

// ══════════════════════════════════════════════════════════════════════════
// Acknowledgement — the recipient organisation confirming receipt of a
// partnership letter, physically (signed/stamped copy, hand receipt) or
// electronically (reply email, read receipt). This is EXPLICITLY separate
// from e-signature (corporateEsignatureRequests / esignature.ts): an
// acknowledgement only confirms the letter was received, it never signs a
// binding document. Never conflate the two per the governing spec.
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

export const listAcknowledgements = query({
  args: { letterId: v.id("corporatePartnershipLetters") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.view");
    await assertLetterVisible(ctx, user, args.letterId);
    return ctx.db.query("corporateAcknowledgements").withIndex("by_letter", (q) => q.eq("letterId", args.letterId)).order("desc").collect();
  },
});

export const recordAcknowledgement = mutation({
  args: {
    letterId: v.id("corporatePartnershipLetters"),
    ackType: v.union(v.literal("physical"), v.literal("electronic")),
    dateReceived: v.string(),
    receivedByName: v.optional(v.string()),
    receivedByDesignation: v.optional(v.string()),
    senderEmail: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    communicationReference: v.optional(v.string()),
    proofVaultDocumentId: v.optional(v.id("vaultDocuments")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acknowledgement_record");
    const letter = await assertLetterVisible(ctx, user, args.letterId);

    if (letter.status !== "delivered" && letter.status !== "sent" && letter.status !== "acknowledged") {
      throw new ConvexError({ code: "CONFLICT", message: "The letter must be sent before an acknowledgement can be recorded" });
    }
    if (args.ackType === "electronic" && !args.senderEmail && !args.recipientEmail && !args.communicationReference) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Provide a sender/recipient email or a communication reference for electronic acknowledgements" });
    }

    const id = await ctx.db.insert("corporateAcknowledgements", {
      letterId: args.letterId,
      ackType: args.ackType,
      dateReceived: args.dateReceived,
      receivedByName: args.receivedByName,
      receivedByDesignation: args.receivedByDesignation,
      senderEmail: args.senderEmail,
      recipientEmail: args.recipientEmail,
      communicationReference: args.communicationReference,
      proofVaultDocumentId: args.proofVaultDocumentId,
      notes: args.notes,
      recordedBy: user._id,
    });

    if (letter.status !== "acknowledged") {
      await ctx.db.patch(args.letterId, { status: "acknowledged" });
    }

    await logAudit(ctx, {
      action: "create", entity: "corporate_acknowledgements", entityId: id, entityRef: letter.letterRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Recorded ${args.ackType} acknowledgement for letter "${letter.subject}"`,
    });

    return id;
  },
});

export const updateAcknowledgement = mutation({
  args: {
    id: v.id("corporateAcknowledgements"),
    receivedByName: v.optional(v.string()),
    receivedByDesignation: v.optional(v.string()),
    proofVaultDocumentId: v.optional(v.id("vaultDocuments")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "corporate_marketing.acknowledgement_record");
    const { id, ...patch } = args;
    const ack = await ctx.db.get(id);
    if (!ack) throw new ConvexError({ code: "NOT_FOUND", message: "Acknowledgement record not found" });
    const letter = await assertLetterVisible(ctx, user, ack.letterId);

    await ctx.db.patch(id, patch);

    await logAudit(ctx, {
      action: "update", entity: "corporate_acknowledgements", entityId: id, entityRef: letter.letterRef,
      userId: user._id, userName: user.name, userRole: user.role,
      description: `Updated acknowledgement record for letter "${letter.subject}"`,
      before: JSON.stringify(ack),
      after: JSON.stringify(patch),
    });
  },
});
