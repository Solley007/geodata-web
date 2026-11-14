import type { Doc, Id } from "../_generated/dataModel.d.ts";
import type { MutationCtx } from "../_generated/server";

// ══════════════════════════════════════════════════════════════════════════
// Shared helpers used by both commitments.ts and bulkAcquisitions.ts (kept in
// their own module to avoid a circular import between the two — commitments
// already depends on bulkAcquisitions for rollups/eligibility, so these two
// small helpers live here instead of in either file).
// ══════════════════════════════════════════════════════════════════════════

// Lazily creates (once) a billing/legal proxy `clients` row for a corporate
// organisation, tagged with source "corporate" so it's identifiable in the
// existing Clients & CRM list. Never called more than once per organisation.
export async function ensureLinkedClient(
  ctx: MutationCtx,
  org: Doc<"corporateOrganisations">,
  actorId: Id<"users">,
): Promise<Id<"clients">> {
  if (org.linkedClientId) {
    const existing = await ctx.db.get(org.linkedClientId);
    if (existing) return org.linkedClientId;
  }

  const clientId = await ctx.db.insert("clients", {
    fullName: org.name,
    email: org.officialEmail ?? `${org.orgRef.toLowerCase()}@corporate.geodataworld.internal`,
    phone: org.phone ?? "N/A",
    address: org.address,
    state: org.state,
    kycStatus: "verified", // institutional counterpart, not an individual buyer requiring KYC
    source: "corporate",
    assignedAgent: org.assignedOfficer,
    notes: `Billing/legal proxy for corporate organisation ${org.orgRef} (${org.name}). Managed via Corporate Marketing & Bulk Sales — do not edit independently.`,
    createdBy: actorId,
  });

  await ctx.db.patch(org._id, { linkedClientId: clientId, updatedBy: actorId });
  return clientId;
}

export async function nextTransactionRef(ctx: MutationCtx): Promise<string> {
  const count = await ctx.db.query("transactions").collect();
  return `GWS-TXN-${String(count.length + 1).padStart(4, "0")}`;
}
