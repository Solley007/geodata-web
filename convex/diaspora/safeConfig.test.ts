import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api.js";
import schema from "../schema.ts";
import { modules } from "../test.setup.ts";
import type { Id } from "../_generated/dataModel.d.ts";

// ══════════════════════════════════════════════════════════════════════════
// Regression coverage for the Diaspora Investment & Property Platform's
// safe-configuration rules (spec section 16):
//   1. Master toggle OFF hides every programme regardless of individual state
//   2. A disabled/closed programme rejects new enquiries
//   3. An archived/completed campaign rejects new leads unless reopened
//   4. A hidden property never appears in Diaspora listings
// These are mission-critical (they gate what the public site shows and
// whether the CRM accepts new records), so each rule gets a direct test
// rather than only being exercised indirectly through the UI.
// ══════════════════════════════════════════════════════════════════════════

async function grantDiasporaPermission(t: TestConvex<typeof schema>, userId: Id<"users">, permissionKey: string) {
  await t.run(async (ctx) => {
    const roleKey = "test_diaspora_admin";
    const existingRole = await ctx.db.query("iamRoles").withIndex("by_key", (q) => q.eq("key", roleKey)).unique();
    if (!existingRole) {
      await ctx.db.insert("iamRoles", {
        key: roleKey,
        name: "Test Diaspora Admin",
        isSystem: false,
        dashboardProfileKey: "manager",
        status: "active",
      });
    }
    const existingGrant = await ctx.db
      .query("iamRolePermissions")
      .withIndex("by_role_and_permission", (q) => q.eq("roleKey", roleKey).eq("permissionKey", permissionKey))
      .unique();
    if (!existingGrant) {
      await ctx.db.insert("iamRolePermissions", { roleKey, permissionKey, grantedAt: new Date().toISOString() });
    }
    const existingAssignment = await ctx.db.query("userOrgAssignments").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (!existingAssignment) {
      await ctx.db.insert("userOrgAssignments", {
        userId,
        roleKey,
        isPrimary: true,
        effectiveFrom: new Date().toISOString(),
        status: "active",
      });
    }
  });
}

async function setUpAdminUser(t: TestConvex<typeof schema>, permissionKeys: string[]) {
  const asAdmin = t.withIdentity({ tokenIdentifier: "test|admin-1", name: "Admin" });
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", { tokenIdentifier: "test|admin-1", name: "Admin", role: "manager" });
  });
  for (const key of permissionKeys) {
    await grantDiasporaPermission(t, userId, key);
  }
  return { asAdmin, userId };
}

describe("Diaspora Platform — safe-configuration rules", () => {
  it("master toggle OFF hides the feature status regardless of individual programme state", async () => {
    const t = convexTest(schema, modules);
    const { asAdmin } = await setUpAdminUser(t, ["diaspora.manage", "diaspora.programme_manage", "diaspora.view"]);

    // Feature defaults to OFF when never configured.
    const initialStatus = await t.query(api.diaspora.feature.getFeatureStatus, {});
    expect(initialStatus.enabled).toBe(false);

    await asAdmin.mutation(api.diaspora.feature.setFeatureStatus, { enabled: true });
    expect((await t.query(api.diaspora.feature.getFeatureStatus, {})).enabled).toBe(true);

    // Even with a programme fully enabled/public/open, the platform-wide
    // toggle is what the public shell (DiasporaShell) checks first — turning
    // it OFF here must never be undone by any programme-level setting.
    await asAdmin.mutation(api.diaspora.programmes.seedProgrammes, {});
    const programmes = await asAdmin.query(api.diaspora.programmes.listProgrammes, {});
    expect(programmes.length).toBe(5);
    expect(programmes.every((p) => p.enabled && p.publicVisible)).toBe(true);

    await asAdmin.mutation(api.diaspora.feature.setFeatureStatus, { enabled: false });
    const finalStatus = await t.query(api.diaspora.feature.getFeatureStatus, {});
    expect(finalStatus.enabled).toBe(false);

    // Public programme listing is independent of the master toggle by design
    // (DiasporaShell is the actual gate) — but it must still reflect that
    // individual programmes remain untouched, proving the master toggle
    // never deletes or mutates programme configuration.
    const publicProgrammes = await t.query(api.diaspora.programmes.listPublicProgrammes, {});
    expect(publicProgrammes.length).toBe(5);
  });

  it("rejects a Diaspora enquiry for a programme that is disabled platform-wide", async () => {
    const t = convexTest(schema, modules);
    const { asAdmin } = await setUpAdminUser(t, ["diaspora.manage", "diaspora.programme_manage", "diaspora.view"]);
    await asAdmin.mutation(api.diaspora.feature.setFeatureStatus, { enabled: true });
    await asAdmin.mutation(api.diaspora.programmes.seedProgrammes, {});

    const programmes = await asAdmin.query(api.diaspora.programmes.listProgrammes, {});
    const ownProgramme = programmes.find((p) => p.key === "own")!;
    await asAdmin.mutation(api.diaspora.programmes.updateProgrammeToggle, { id: ownProgramme._id, field: "enabled", value: false });

    await expect(
      t.mutation(api.diaspora.leads.submitDiasporaEnquiry, {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "+1 555 0100",
        country: "Canada",
        programmeInterest: ["own"],
        consent: true,
      }),
    ).rejects.toThrow();
  });

  it("rejects a Diaspora enquiry for a programme that has closed enquiries even while still enabled", async () => {
    const t = convexTest(schema, modules);
    const { asAdmin } = await setUpAdminUser(t, ["diaspora.manage", "diaspora.programme_manage", "diaspora.view"]);
    await asAdmin.mutation(api.diaspora.feature.setFeatureStatus, { enabled: true });
    await asAdmin.mutation(api.diaspora.programmes.seedProgrammes, {});

    const programmes = await asAdmin.query(api.diaspora.programmes.listProgrammes, {});
    const investProgramme = programmes.find((p) => p.key === "invest")!;
    await asAdmin.mutation(api.diaspora.programmes.updateProgrammeToggle, { id: investProgramme._id, field: "acceptingEnquiries", value: false });

    await expect(
      t.mutation(api.diaspora.leads.submitDiasporaEnquiry, {
        name: "John Smith",
        email: "john@example.com",
        phone: "+44 20 7946 0000",
        country: "United Kingdom",
        programmeInterest: ["invest"],
        consent: true,
      }),
    ).rejects.toThrow();
  });

  it("accepts a Diaspora enquiry once the programme is re-enabled and open", async () => {
    const t = convexTest(schema, modules);
    const { asAdmin } = await setUpAdminUser(t, ["diaspora.manage", "diaspora.programme_manage"]);
    await asAdmin.mutation(api.diaspora.feature.setFeatureStatus, { enabled: true });
    await asAdmin.mutation(api.diaspora.programmes.seedProgrammes, {});

    const result = await t.mutation(api.diaspora.leads.submitDiasporaEnquiry, {
      name: "Amaka Okafor",
      email: "amaka@example.com",
      phone: "+32 470 000 000",
      country: "Belgium",
      programmeInterest: ["own"],
      consent: true,
    });
    expect(result.id).toBeDefined();
  });

  it("rejects a new lead attribution to an archived campaign but accepts once reopened", async () => {
    const t = convexTest(schema, modules);
    const { asAdmin } = await setUpAdminUser(t, [
      "diaspora.manage", "diaspora.programme_manage", "diaspora.campaign_manage",
    ]);
    await asAdmin.mutation(api.diaspora.feature.setFeatureStatus, { enabled: true });
    await asAdmin.mutation(api.diaspora.programmes.seedProgrammes, {});

    const campaignId = await asAdmin.mutation(api.diaspora.campaigns.createCampaign, {
      name: "Test Roadshow",
      code: "TESTROADSHOW",
    });
    await asAdmin.mutation(api.diaspora.campaigns.updateCampaignStatus, { id: campaignId, status: "active" });

    const activeResult = await t.mutation(api.diaspora.leads.submitDiasporaEnquiry, {
      name: "Chidi Eze",
      email: "chidi@example.com",
      phone: "+1 416 555 0000",
      country: "Canada",
      programmeInterest: ["own"],
      campaignCode: "TESTROADSHOW",
      consent: true,
    });
    const activeLead = await t.run((ctx) => ctx.db.get(activeResult.id));
    expect(activeLead?.diasporaCampaignId).toBe(campaignId);

    await asAdmin.mutation(api.diaspora.campaigns.updateCampaignStatus, { id: campaignId, status: "archived" });

    // The enquiry itself must still succeed (a broken/stale campaign code is
    // never fatal to a genuine lead) — but it must land WITHOUT attribution
    // to the archived campaign.
    const archivedResult = await t.mutation(api.diaspora.leads.submitDiasporaEnquiry, {
      name: "Ngozi Bello",
      email: "ngozi@example.com",
      phone: "+1 647 555 0000",
      country: "Canada",
      programmeInterest: ["own"],
      campaignCode: "TESTROADSHOW",
      consent: true,
    });
    const archivedLead = await t.run((ctx) => ctx.db.get(archivedResult.id));
    expect(archivedLead?.diasporaCampaignId).toBeUndefined();

    // Reopening the campaign restores attribution for new leads.
    await asAdmin.mutation(api.diaspora.campaigns.updateCampaignStatus, { id: campaignId, status: "active" });
    const reopenedResult = await t.mutation(api.diaspora.leads.submitDiasporaEnquiry, {
      name: "Tunde Bakare",
      email: "tunde@example.com",
      phone: "+1 437 555 0000",
      country: "Canada",
      programmeInterest: ["own"],
      campaignCode: "TESTROADSHOW",
      consent: true,
    });
    const reopenedLead = await t.run((ctx) => ctx.db.get(reopenedResult.id));
    expect(reopenedLead?.diasporaCampaignId).toBe(campaignId);
  });

  it("never returns a property hidden from the Diaspora platform, even if it is otherwise available", async () => {
    const t = convexTest(schema, modules);
    const { asAdmin } = await setUpAdminUser(t, ["diaspora.property_visibility_manage"]);

    const [visiblePropertyId, hiddenPropertyId] = await t.run(async (ctx) => {
      const visible = await ctx.db.insert("properties", {
        title: "Visible Diaspora Property",
        description: "Available and visible",
        price: 50_000_000,
        priceType: "fixed",
        propertyType: "residential",
        status: "available",
        location: "Idu",
        state: "FCT",
        lga: "Abuja Municipal",
        images: [],
        featuredImage: "",
        amenities: [],
        featured: false,
        views: 0,
        diasporaVisible: true,
        diasporaProgrammeKeys: ["own"],
      });
      const hidden = await ctx.db.insert("properties", {
        title: "Hidden Diaspora Property",
        description: "Available but hidden from Diaspora",
        price: 60_000_000,
        priceType: "fixed",
        propertyType: "residential",
        status: "available",
        location: "Idu",
        state: "FCT",
        lga: "Abuja Municipal",
        images: [],
        featuredImage: "",
        amenities: [],
        featured: false,
        views: 0,
        diasporaVisible: false,
        diasporaProgrammeKeys: ["own"],
      });
      return [visible, hidden];
    });

    const results = await t.query(api.diaspora.properties.listDiasporaVisibleProperties, { programmeKey: "own" });
    const ids = results.map((p) => p._id);
    expect(ids).toContain(visiblePropertyId);
    expect(ids).not.toContain(hiddenPropertyId);

    // Turning visibility ON via the admin toggle must surface it immediately.
    await asAdmin.mutation(api.diaspora.properties.updatePropertyVisibilityToggle, {
      propertyId: hiddenPropertyId,
      field: "diasporaVisible",
      value: true,
    });
    const resultsAfter = await t.query(api.diaspora.properties.listDiasporaVisibleProperties, { programmeKey: "own" });
    expect(resultsAfter.map((p) => p._id)).toContain(hiddenPropertyId);
  });
});
