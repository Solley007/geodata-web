"use node";

import escapeHtml from "escape-html";
import { Hercules } from "@usehercules/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { renderBrandedEmail, renderPlainText, emailCard, emailInfoRow } from "./emailTemplates.ts";

const hercules = new Hercules({ apiKey: process.env.HERCULES_API_KEY!, apiVersion: "2025-12-09" });
const FROM = "Geodata World Services <noreply@geodata.com.ng>";
const SITE_URL = "https://geodata.com.ng";

const kindValidator = v.union(
  v.literal("reminder"),
  v.literal("extended"),
  v.literal("delisted"),
  v.literal("auto_delisted"),
  v.literal("relisted"),
);

type Kind = "reminder" | "extended" | "delisted" | "auto_delisted" | "relisted";

function formatDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function copyFor(kind: Kind, name: string, endDate: string, daysLeft?: number, newEndDate?: string, reason?: string) {
  switch (kind) {
    case "reminder":
      return {
        subject: `Your Geodata partnership ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        heading: "Your partnership agreement is ending soon",
        accent: "amber" as const,
        lines: [
          `Your partnership agreement with Geodata World Services ends on ${formatDate(endDate)}.`,
          "To keep your logo and profile listed on our website without interruption, contact our team to renew.",
        ],
        teamLine: `${name}'s partner contract ends on ${formatDate(endDate)} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left).`,
      };
    case "extended":
      return {
        subject: "Your Geodata partnership has been extended",
        heading: "Partnership extended",
        accent: "green" as const,
        lines: [`Good news — your partnership agreement now runs until ${formatDate(newEndDate ?? endDate)}.`, "Your listing stays live with no interruption."],
        teamLine: `${name}'s contract was extended to ${formatDate(newEndDate ?? endDate)}.`,
      };
    case "delisted":
    case "auto_delisted":
      return {
        subject: "Your Geodata partner listing has been paused",
        heading: "Your public listing is paused",
        accent: "red" as const,
        lines: [
          kind === "auto_delisted"
            ? `Your partnership agreement ended on ${formatDate(endDate)}, so your logo and profile are no longer shown on our website.`
            : "Your logo and profile are no longer shown on our website.",
          ...(reason ? [`Reason: ${reason}`] : []),
          "Your partner dashboard and any commissions already earned are not affected. Contact us to renew and relist.",
        ],
        teamLine: `${name} was ${kind === "auto_delisted" ? "automatically delisted (contract expired)" : "delisted"}.`,
      };
    case "relisted":
      return {
        subject: "Your Geodata partner listing is live again",
        heading: "You're listed again",
        accent: "green" as const,
        lines: ["Your logo and partner profile are visible on our website again."],
        teamLine: `${name} was relisted.`,
      };
  }
}

export const sendPartnerContractEmail = internalAction({
  args: {
    kind: kindValidator,
    partnerEmail: v.optional(v.string()),
    partnerName: v.string(),
    teamEmails: v.array(v.string()),
    endDate: v.string(),
    newEndDate: v.optional(v.string()),
    daysLeft: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<null> => {
    const c = copyFor(args.kind, args.partnerName, args.endDate, args.daysLeft, args.newEndDate, args.reason);
    const bodyHtml =
      c.lines.map((l) => `<p style="margin:0 0 10px;">${escapeHtml(l)}</p>`).join("") +
      emailCard(emailInfoRow("Agreement end date", formatDate(args.newEndDate ?? args.endDate)));

    const sends: Promise<unknown>[] = [];
    if (args.partnerEmail) {
      sends.push(
        hercules.email.send({
          from: FROM,
          to: args.partnerEmail,
          subject: c.subject,
          html: renderBrandedEmail({
            eyebrow: "Partner Program",
            heading: c.heading,
            greetingName: args.partnerName,
            accent: c.accent,
            bodyHtml,
            ctaLabel: "Open Partner Portal",
            ctaUrl: `${SITE_URL}/partner`,
          }),
          text: renderPlainText({ greetingName: args.partnerName, lines: c.lines }),
        }),
      );
    }
    // Team copy for reminders and automatic actions (manual ones are done by the team already)
    if (args.teamEmails.length > 0 && (args.kind === "reminder" || args.kind === "auto_delisted")) {
      sends.push(
        hercules.email.send({
          from: FROM,
          to: args.teamEmails,
          subject: `Partner contract: ${args.partnerName}`,
          html: renderBrandedEmail({
            eyebrow: "Partner Contracts",
            heading: c.teamLine,
            greetingName: "Team",
            accent: c.accent,
            bodyHtml: `<p style="margin:0;">${escapeHtml(c.teamLine)}</p>`,
            ctaLabel: "Review Contracts",
            ctaUrl: `${SITE_URL}/admin/partners`,
          }),
          text: renderPlainText({ greetingName: "Team", lines: [c.teamLine] }),
        }),
      );
    }
    const results = await Promise.allSettled(sends);
    for (const r of results) if (r.status === "rejected") console.warn("Partner contract email failed:", r.reason);
    return null;
  },
});
