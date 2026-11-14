"use node";

// Sends WhatsApp copies of notifications via the Hercules "whatsapp" App Connector.
// This connector delivers rotating Meta/WhatsApp Business credentials (access token +
// phone number ID); we call the WhatsApp Cloud API directly with them.
// Fails safe: if the connector isn't connected yet, or the send errors out, this
// silently no-ops (aside from a console warning) so it never blocks email delivery.
import { Hercules } from "@usehercules/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const hercules = new Hercules({
  apiKey: process.env.HERCULES_API_KEY!,
  apiVersion: "2025-12-09",
});

const WHATSAPP_CONNECTOR_SLUG = "whatsapp";

/**
 * Sends a plain-text WhatsApp message to `to` (any phone number format; digits are
 * extracted). No-ops when the "Send WhatsApp copies" setting is off, the connector
 * isn't connected, or the recipient has no phone number on file.
 * Always call this *after* the corresponding email send — never let a WhatsApp
 * failure block or roll back an email notification.
 */
export const sendWhatsAppMessage = internalAction({
  args: {
    to: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, { to, message }) => {
    if (!to) return; // no phone number on file for this recipient

    const enabledRaw: string = await ctx.runQuery(internal.whatsappSettings.getWhatsAppEnabledInternal, {});
    if (enabledRaw !== "true") return; // feature toggle is off (default)

    const phone = to.replace(/[^\d]/g, ""); // WhatsApp Cloud API wants digits only, no leading +
    if (!phone) return;

    try {
      const creds = await hercules.connectors.credentials(WHATSAPP_CONNECTOR_SLUG);
      const accessToken = creds.secrets.WHATSAPP_ACCESS_TOKEN ?? creds.secrets.ACCESS_TOKEN;
      const phoneNumberId = creds.secrets.WHATSAPP_PHONE_NUMBER_ID ?? creds.secrets.PHONE_NUMBER_ID;
      if (!accessToken || !phoneNumberId) {
        console.warn("WhatsApp connector missing expected credentials; skipping send.");
        return;
      }

      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: message },
        }),
      });

      if (!res.ok) {
        console.warn("WhatsApp send failed:", res.status, await res.text());
      }
    } catch (err) {
      // Connector likely not connected yet, or the send failed — never throw from here.
      console.warn("WhatsApp send skipped/failed:", err instanceof Error ? err.message : err);
    }
  },
});
