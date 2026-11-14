"use node";

import escapeHtml from "escape-html";
import { Hercules } from "@usehercules/sdk";
import { v } from "convex/values";
import { internalAction, action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { renderBrandedEmail, renderPlainText, emailCard, emailInfoRow } from "./emailTemplates.ts";

const hercules = new Hercules({
  apiKey: process.env.HERCULES_API_KEY!,
  apiVersion: "2025-12-09",
});

// Shared sender — user must verify this email in Hercules > Emails tab
const FROM = "Geodata World Services <noreply@geodata.com.ng>";
const SITE_URL = "https://geodata.com.ng";

/**
 * Fires a WhatsApp copy of a notification alongside its email. Best-effort: never
 * throws, so it can't block or fail the email send that already went out.
 * `phone` is optional — omit when the recipient's WhatsApp number isn't on file.
 */
function sendWhatsAppCopy(ctx: ActionCtx, phone: string | undefined, lines: string[]) {
  if (!phone) return;
  ctx
    .runAction(internal.whatsapp.sendWhatsAppMessage, { to: phone, message: lines.join("\n") })
    .catch((err: unknown) => console.warn("WhatsApp copy failed:", err));
}

// ── LEAD FOLLOW-UP REMINDER ───────────────────────────────────────
export const sendLeadFollowUpReminder = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    agentName: v.string(),
    leadName: v.string(),
    stage: v.string(),
    expectedCloseDate: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, agentName, leadName, stage, expectedCloseDate }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Follow-up Reminder: ${leadName} – ${stage}`,
      html: renderBrandedEmail({
        eyebrow: "Sales CRM Reminder",
        heading: "You have a pending follow-up",
        greetingName: agentName,
        preheader: `Follow up with ${leadName} — stage: ${stage}`,
        bodyHtml:
          `<p style="margin:0 0 4px;">You have a pending follow-up for:</p>` +
          emailCard(
            `<p style="margin:0 0 6px;font-weight:700;color:#0f172a;">${escapeHtml(leadName)}</p>` +
              emailInfoRow("Stage", stage) +
              (expectedCloseDate ? emailInfoRow("Expected close", expectedCloseDate) : "")
          ),
        ctaLabel: "Open Sales Pipeline",
        ctaUrl: `${SITE_URL}/admin/sales`,
      }),
      text: renderPlainText({
        greetingName: agentName,
        lines: [`Reminder: Follow up with ${leadName} (Stage: ${stage})${expectedCloseDate ? `\nExpected close date: ${expectedCloseDate}` : ""}.`],
      }),
    });
    sendWhatsAppCopy(ctx, phone, [`Follow-up Reminder: ${leadName} – ${stage}`, `Reminder: Follow up with ${leadName} (Stage: ${stage})${expectedCloseDate ? `\nExpected close date: ${expectedCloseDate}` : ""}.`]);
  },
});

// ── COMMISSION APPROVAL REMINDER ─────────────────────────────────
export const sendCommissionApprovalReminder = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    managerName: v.string(),
    agentName: v.string(),
    commissionAmount: v.number(),
    saleAmount: v.number(),
    transactionDate: v.string(),
  },
  handler: async (ctx, { to, phone, managerName, agentName, commissionAmount, saleAmount, transactionDate }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Action Required: Commission Approval for ${agentName}`,
      html: renderBrandedEmail({
        eyebrow: "Commission Approval Request",
        heading: "A commission is pending your approval",
        greetingName: managerName,
        accent: "amber",
        bodyHtml: emailCard(
          emailInfoRow("Agent", agentName) +
            emailInfoRow("Sale amount", `₦${saleAmount.toLocaleString()}`) +
            emailInfoRow("Commission due", `₦${commissionAmount.toLocaleString()}`, { valueColor: "#16a34a", bold: true }) +
            emailInfoRow("Transaction date", transactionDate),
          "amber"
        ) + `<p style="margin:14px 0 0;">Please log in to the ERP to approve or reject this commission.</p>`,
        ctaLabel: "Review Commission",
        ctaUrl: `${SITE_URL}/admin/partners`,
      }),
      text: renderPlainText({
        greetingName: managerName,
        lines: [`A commission for ${agentName} (₦${commissionAmount.toLocaleString()} on sale of ₦${saleAmount.toLocaleString()}) is pending your approval.`],
      }),
    });
    sendWhatsAppCopy(ctx, phone, [`Commission Approval for ${agentName}`, `A commission for ${agentName} (₦${commissionAmount.toLocaleString()} on sale of ₦${saleAmount.toLocaleString()}) is pending your approval.`]);
  },
});

// ── LEAVE APPROVAL REMINDER ───────────────────────────────────────
export const sendLeaveApprovalReminder = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    managerName: v.string(),
    staffName: v.string(),
    leaveType: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { to, phone, managerName, staffName, leaveType, startDate, endDate }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Leave Request Pending: ${staffName}`,
      html: renderBrandedEmail({
        eyebrow: "HR Leave Management",
        heading: "A leave request requires your attention",
        greetingName: managerName,
        accent: "purple",
        bodyHtml: emailCard(
          `<p style="margin:0 0 6px;font-weight:700;color:#0f172a;">${escapeHtml(staffName)}</p>` +
            emailInfoRow("Leave type", leaveType) +
            emailInfoRow("From", startDate) +
            emailInfoRow("To", endDate),
          "purple"
        ) + `<p style="margin:14px 0 0;">Please log in to the ERP to approve or reject this leave request.</p>`,
        ctaLabel: "Open Staff Management",
        ctaUrl: `${SITE_URL}/admin/staff`,
      }),
      text: renderPlainText({
        greetingName: managerName,
        lines: [`${staffName} has a pending ${leaveType} leave request from ${startDate} to ${endDate}.`],
      }),
    });
    sendWhatsAppCopy(ctx, phone, [`Leave Request Pending: ${staffName}`, `${staffName} has a pending ${leaveType} leave request from ${startDate} to ${endDate}.`]);
  },
});

// ── SITE REPORT REMINDER (public action callable from admin) ──────
export const sendSiteReportReminder = action({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    managerName: v.string(),
    siteName: v.string(),
    lastReportDate: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, managerName, siteName, lastReportDate }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Site Report Due: ${siteName}`,
      html: renderBrandedEmail({
        eyebrow: "Construction Management",
        heading: "A daily site report is due",
        greetingName: managerName,
        accent: "green",
        bodyHtml: emailCard(
          `<p style="margin:0 0 6px;font-weight:700;color:#0f172a;">${escapeHtml(siteName)}</p>` +
            (lastReportDate
              ? emailInfoRow("Last report filed", lastReportDate)
              : `<p style="margin:0;color:#dc2626;font-size:13px;">No reports filed yet</p>`),
          "green"
        ) + `<p style="margin:14px 0 0;">Please log in to the ERP to file today's report.</p>`,
        ctaLabel: "Open Construction Module",
        ctaUrl: `${SITE_URL}/admin/construction`,
      }),
      text: renderPlainText({
        greetingName: managerName,
        lines: [`A daily report is due for construction site: ${siteName}.`],
      }),
    });
    sendWhatsAppCopy(ctx, phone, [`Site Report Due: ${siteName}`, `A daily report is due for construction site: ${siteName}.`]);
  },
});

// ── CUSTOM REMINDER (manual send from admin panel) ────────────────
export const sendCustomReminder = action({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    subject: v.string(),
    recipientName: v.string(),
    message: v.string(),
  },
  handler: async (ctx, { to, phone, subject, recipientName, message }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject,
      html: renderBrandedEmail({
        eyebrow: "Message From Our Team",
        heading: subject,
        greetingName: recipientName,
        bodyHtml: `<div>${escapeHtml(message).replace(/\n/g, "<br/>")}</div>`,
      }),
      text: renderPlainText({ greetingName: recipientName, lines: [message] }),
    });
    sendWhatsAppCopy(ctx, phone, [subject, message]);
  },
});

// ── CLIENT: WELCOME EMAIL ─────────────────────────────────────────
export const sendClientWelcomeEmail = internalAction({
  args: { to: v.string(), phone: v.optional(v.string()), name: v.string() },
  handler: async (ctx, { to, phone, name }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: "Welcome to Geodata World Services",
      html: renderBrandedEmail({
        eyebrow: "Welcome",
        heading: `Welcome aboard, ${name.split(" ")[0]}!`,
        greetingName: name,
        preheader: "Your Geodata World Services account is ready.",
        bodyHtml:
          `<p style="margin:0 0 14px;">Thank you for creating an account with Geodata World Services Limited. You can now track inquiries, monitor KYC and finance status, view payments, and manage your property purchase — all from your Buyer Portal.</p>`,
        ctaLabel: "Go to Buyer Portal",
        ctaUrl: `${SITE_URL}/client`,
      }),
      text: renderPlainText({
        greetingName: name,
        lines: ["Thank you for creating an account with Geodata World Services Limited. You can now track your property purchase from your Buyer Portal.", `${SITE_URL}/client`],
      }),
    });
    sendWhatsAppCopy(ctx, phone, ["Welcome to Geodata World Services", "Thank you for creating an account with us. You can now track your property purchase from your Buyer Portal.", `${SITE_URL}/client`]);
  },
});

// ── CLIENT: INQUIRY RECEIVED CONFIRMATION ─────────────────────────
export const sendInquiryConfirmation = internalAction({
  args: { to: v.string(), phone: v.optional(v.string()), name: v.string(), subject: v.optional(v.string()) },
  handler: async (ctx, { to, phone, name, subject }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: "We've received your inquiry",
      html: renderBrandedEmail({
        eyebrow: "Inquiry Received",
        heading: "Thanks for reaching out",
        greetingName: name,
        preheader: "Our team will respond within 24 hours.",
        bodyHtml:
          `<p style="margin:0 0 14px;">We've received your inquiry${subject ? ` about "${escapeHtml(subject)}"` : ""} and a member of our team will get back to you within 24 hours.</p>` +
          `<p style="margin:0;">In the meantime, feel free to browse our available properties.</p>`,
        ctaLabel: "Browse Properties",
        ctaUrl: `${SITE_URL}/properties`,
      }),
      text: renderPlainText({
        greetingName: name,
        lines: [`We've received your inquiry${subject ? ` about "${subject}"` : ""}. Our team will respond within 24 hours.`],
      }),
    });
    sendWhatsAppCopy(ctx, phone, ["We've received your inquiry", `We've received your inquiry${subject ? ` about "${subject}"` : ""}. Our team will respond within 24 hours.`]);
  },
});

// ── CLIENT: KYC STATUS CHANGE ─────────────────────────────────────
const KYC_STATUS_COPY: Record<string, { heading: string; accent: "blue" | "green" | "amber" | "red" | "purple"; message: string }> = {
  submitted: { heading: "Your KYC submission was received", accent: "blue", message: "We've received your KYC documents and they are now queued for review. We'll notify you as soon as there's an update." },
  under_review: { heading: "Your KYC is under review", accent: "blue", message: "Our compliance team has started reviewing your KYC submission. This usually takes 1–3 business days." },
  more_info_required: { heading: "We need more information", accent: "amber", message: "We need a few more details or documents to complete your KYC review. Please log in to your Buyer Portal to see what's required." },
  approved: { heading: "Your KYC has been approved", accent: "green", message: "Congratulations — your KYC verification is complete. You can now proceed with the next steps of your property purchase." },
  rejected: { heading: "Your KYC submission needs attention", accent: "red", message: "Unfortunately we were unable to approve your KYC submission. Please log in to your Buyer Portal to review the reason and resubmit." },
};

export const sendKycStatusEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    status: v.string(),
    submissionRef: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, name, status, submissionRef, reason }) => {
    const copy = KYC_STATUS_COPY[status];
    if (!copy) return; // no email needed for other statuses (e.g. not_started, pending_customer)

    await hercules.email.send({
      from: FROM,
      to,
      subject: `KYC Update: ${copy.heading}`,
      html: renderBrandedEmail({
        eyebrow: "KYC & Compliance",
        heading: copy.heading,
        greetingName: name,
        accent: copy.accent,
        preheader: copy.message,
        bodyHtml:
          emailCard(
            emailInfoRow("Reference", submissionRef) +
              emailInfoRow("Status", status.replace(/_/g, " "), { bold: true }) +
              (reason ? emailInfoRow(status === "rejected" ? "Reason" : "Details required", reason) : ""),
            copy.accent
          ) + `<p style="margin:14px 0 0;">${escapeHtml(copy.message)}</p>`,
        ctaLabel: "View in Buyer Portal",
        ctaUrl: `${SITE_URL}/client`,
      }),
      text: renderPlainText({
        greetingName: name,
        lines: [`KYC (${submissionRef}) status: ${status.replace(/_/g, " ")}.`, copy.message, reason ? `Note: ${reason}` : ""].filter(Boolean),
      }),
    });
    sendWhatsAppCopy(ctx, phone, [`KYC Update: ${copy.heading}`, copy.message, reason ? `Note: ${reason}` : ""].filter((l): l is string => Boolean(l)));
  },
});

// ── CLIENT: FINANCE / MORTGAGE STATUS CHANGE ──────────────────────
const FINANCE_STATUS_COPY: Record<string, { heading: string; accent: "blue" | "green" | "amber" | "red" | "purple"; message: string }> = {
  application_submitted: { heading: "Your finance application was received", accent: "blue", message: "We've received your finance/mortgage application and it is now queued for review." },
  under_review: { heading: "Your finance application is under review", accent: "blue", message: "Our finance team is reviewing your application. We'll notify you as soon as there's an update." },
  more_info_required: { heading: "We need more information", accent: "amber", message: "We need a few more details to continue processing your finance application. Please log in to your Buyer Portal to see what's required." },
  conditional_approval: { heading: "Your finance application has conditional approval", accent: "amber", message: "Your application has been conditionally approved. Please review the conditions in your Buyer Portal." },
  approved: { heading: "Your finance application has been approved", accent: "green", message: "Congratulations — your finance/mortgage application has been approved. Our team will be in touch with next steps." },
  rejected: { heading: "Your finance application needs attention", accent: "red", message: "Unfortunately we were unable to approve your finance application. Please log in to your Buyer Portal to review the reason." },
};

export const sendFinanceStatusEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    status: v.string(),
    applicationRef: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, name, status, applicationRef, reason }) => {
    const copy = FINANCE_STATUS_COPY[status];
    if (!copy) return;

    await hercules.email.send({
      from: FROM,
      to,
      subject: `Finance Update: ${copy.heading}`,
      html: renderBrandedEmail({
        eyebrow: "Finance & Mortgage",
        heading: copy.heading,
        greetingName: name,
        accent: copy.accent,
        preheader: copy.message,
        bodyHtml:
          emailCard(
            emailInfoRow("Reference", applicationRef) +
              emailInfoRow("Status", status.replace(/_/g, " "), { bold: true }) +
              (reason ? emailInfoRow(status === "rejected" ? "Reason" : "Details required", reason) : ""),
            copy.accent
          ) + `<p style="margin:14px 0 0;">${escapeHtml(copy.message)}</p>`,
        ctaLabel: "View in Buyer Portal",
        ctaUrl: `${SITE_URL}/client`,
      }),
      text: renderPlainText({
        greetingName: name,
        lines: [`Finance application (${applicationRef}) status: ${status.replace(/_/g, " ")}.`, copy.message, reason ? `Note: ${reason}` : ""].filter(Boolean),
      }),
    });
    sendWhatsAppCopy(ctx, phone, [`Finance Update: ${copy.heading}`, copy.message, reason ? `Note: ${reason}` : ""].filter((l): l is string => Boolean(l)));
  },
});

// ── CLIENT: TRANSACTION STATUS UPDATE ─────────────────────────────
export const sendTransactionStatusEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    status: v.string(),
    transactionRef: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, name, status, transactionRef, note }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Transaction Update — ${transactionRef}`,
      html: renderBrandedEmail({
        eyebrow: "Transaction Update",
        heading: `Your transaction is now: ${status.replace(/_/g, " ")}`,
        greetingName: name,
        bodyHtml: emailCard(
          emailInfoRow("Reference", transactionRef) +
            emailInfoRow("Status", status.replace(/_/g, " "), { bold: true }) +
            (note ? emailInfoRow("Note", note) : "")
        ) + `<p style="margin:14px 0 0;">Log in to your Buyer Portal for full details on your purchase progress.</p>`,
        ctaLabel: "View Transaction",
        ctaUrl: `${SITE_URL}/client`,
      }),
      text: renderPlainText({
        greetingName: name,
        lines: [`Transaction ${transactionRef} status updated to: ${status.replace(/_/g, " ")}.`, note ?? ""].filter(Boolean),
      }),
    });
    sendWhatsAppCopy(ctx, phone, [`Transaction Update — ${transactionRef}`, `Transaction ${transactionRef} status updated to: ${status.replace(/_/g, " ")}.`, note ?? ""].filter((l): l is string => Boolean(l)));
  },
});

// ── CLIENT: PAYMENT / RECEIPT CONFIRMATION ────────────────────────
export const sendPaymentConfirmationEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    amountDisplay: v.number(),
    currency: v.string(),
    paymentRef: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, name, amountDisplay, currency, paymentRef, description }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Payment Received — ${paymentRef}`,
      html: renderBrandedEmail({
        eyebrow: "Payment Confirmation",
        heading: "We've received your payment",
        greetingName: name,
        accent: "green",
        preheader: `Payment of ${currency} ${amountDisplay.toLocaleString()} confirmed.`,
        bodyHtml: emailCard(
          emailInfoRow("Reference", paymentRef) +
            emailInfoRow("Amount", `${currency} ${amountDisplay.toLocaleString()}`, { valueColor: "#16a34a", bold: true }) +
            (description ? emailInfoRow("Description", description) : ""),
          "green"
        ) + `<p style="margin:14px 0 0;">Thank you for your payment. A detailed receipt is available in your Buyer Portal.</p>`,
        ctaLabel: "View Receipts",
        ctaUrl: `${SITE_URL}/client`,
      }),
      text: renderPlainText({
        greetingName: name,
        lines: [`Payment received: ${currency} ${amountDisplay.toLocaleString()} (Ref: ${paymentRef}).`],
      }),
    });
    sendWhatsAppCopy(ctx, phone, [`Payment Received — ${paymentRef}`, `Payment received: ${currency} ${amountDisplay.toLocaleString()} (Ref: ${paymentRef}).`]);
  },
});

// ── PARTNER: APPLICATION APPROVED / REJECTED ──────────────────────
export const sendPartnerApplicationDecisionEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    approved: v.boolean(),
    referralCode: v.optional(v.string()),
    commissionRate: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, name, approved, referralCode, commissionRate, reason }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: approved ? "Welcome to the Geodata Partner Program!" : "Update on your Partner application",
      html: renderBrandedEmail({
        eyebrow: "Partner Program",
        heading: approved ? "Your application has been approved" : "An update on your application",
        greetingName: name,
        accent: approved ? "green" : "red",
        preheader: approved ? "You're now an approved Geodata Partner." : "Your partner application was not approved.",
        bodyHtml: approved
          ? emailCard(
              emailInfoRow("Referral code", referralCode ?? "—", { bold: true }) +
                emailInfoRow("Commission rate", `${commissionRate ?? 0}%`),
              "green"
            ) + `<p style="margin:14px 0 0;">Congratulations! You can now share property and blog promo links with your referral code and start earning commissions.</p>`
          : `<p style="margin:0;">Thank you for your interest in the Geodata Partner Program. ${reason ? escapeHtml(reason) : "We were unable to approve your application at this time."}</p>`,
        ctaLabel: approved ? "Go to Partner Portal" : undefined,
        ctaUrl: approved ? `${SITE_URL}/partner` : undefined,
      }),
      text: renderPlainText({
        greetingName: name,
        lines: approved
          ? [`Your Partner application has been approved!`, `Referral code: ${referralCode ?? "—"}`, `Commission rate: ${commissionRate ?? 0}%`]
          : [`Your Partner application was not approved.`, reason ?? ""],
      }),
    });
    sendWhatsAppCopy(ctx, phone, approved
      ? ["Welcome to the Geodata Partner Program!", `Referral code: ${referralCode ?? "—"}`, `Commission rate: ${commissionRate ?? 0}%`]
      : ["Update on your Partner application", `Your Partner application was not approved.`, reason ?? ""].filter((l): l is string => Boolean(l)));
  },
});

// ── ADMIN: NEW INQUIRY SUBMITTED ──────────────────────────────────
export const sendAdminNewInquiryAlert = internalAction({
  args: {
    to: v.array(v.string()),
    adminPhones: v.optional(v.array(v.string())),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    message: v.string(),
    subject: v.optional(v.string()),
  },
  handler: async (ctx, { to, adminPhones, name, email, phone, message, subject }) => {
    if (to.length === 0) return;
    await hercules.email.send({
      from: FROM,
      to,
      subject: `New Inquiry: ${subject ?? name}`,
      html: renderBrandedEmail({
        eyebrow: "New Inquiry",
        heading: "A new inquiry has come in",
        greetingName: "Team",
        bodyHtml: emailCard(
          emailInfoRow("Name", name) +
            emailInfoRow("Email", email) +
            emailInfoRow("Phone", phone) +
            (subject ? emailInfoRow("Subject", subject) : "") +
            `<p style="margin:8px 0 0;color:#334155;font-size:13.5px;">"${escapeHtml(message)}"</p>`
        ),
        ctaLabel: "Open Inquiries",
        ctaUrl: `${SITE_URL}/admin/inquiries`,
      }),
      text: renderPlainText({
        greetingName: "Team",
        lines: [`New inquiry from ${name} (${email}, ${phone}): ${message}`],
      }),
    });
    for (const p of adminPhones ?? []) sendWhatsAppCopy(ctx, p, [`New Inquiry: ${subject ?? name}`, `New inquiry from ${name} (${email}, ${phone}): ${message}`]);
  },
});

// ── ADMIN: NEW PARTNER APPLICATION ────────────────────────────────
export const sendAdminNewPartnerApplicationAlert = internalAction({
  args: { to: v.array(v.string()), adminPhones: v.optional(v.array(v.string())), fullName: v.string(), email: v.string(), phone: v.string() },
  handler: async (ctx, { to, adminPhones, fullName, email, phone }) => {
    if (to.length === 0) return;
    await hercules.email.send({
      from: FROM,
      to,
      subject: `New Partner Application: ${fullName}`,
      html: renderBrandedEmail({
        eyebrow: "Partner Program",
        heading: "A new partner application needs review",
        greetingName: "Team",
        bodyHtml: emailCard(emailInfoRow("Name", fullName) + emailInfoRow("Email", email) + emailInfoRow("Phone", phone)),
        ctaLabel: "Review Applications",
        ctaUrl: `${SITE_URL}/admin/partners`,
      }),
      text: renderPlainText({ greetingName: "Team", lines: [`New partner application from ${fullName} (${email}, ${phone}).`] }),
    });
    for (const p of adminPhones ?? []) sendWhatsAppCopy(ctx, p, [`New Partner Application: ${fullName}`, `New partner application from ${fullName} (${email}, ${phone}).`]);
  },
});

// ── ADMIN: NEW KYC SUBMISSION ──────────────────────────────────────
export const sendAdminNewKycAlert = internalAction({
  args: { to: v.array(v.string()), adminPhones: v.optional(v.array(v.string())), clientName: v.string(), submissionRef: v.string() },
  handler: async (ctx, { to, adminPhones, clientName, submissionRef }) => {
    if (to.length === 0) return;
    await hercules.email.send({
      from: FROM,
      to,
      subject: `New KYC Submission: ${submissionRef}`,
      html: renderBrandedEmail({
        eyebrow: "KYC & Compliance",
        heading: "A new KYC submission needs review",
        greetingName: "Team",
        bodyHtml: emailCard(emailInfoRow("Client", clientName) + emailInfoRow("Reference", submissionRef)),
        ctaLabel: "Review KYC",
        ctaUrl: `${SITE_URL}/admin/kyc`,
      }),
      text: renderPlainText({ greetingName: "Team", lines: [`New KYC submission ${submissionRef} from ${clientName}.`] }),
    });
    for (const p of adminPhones ?? []) sendWhatsAppCopy(ctx, p, [`New KYC Submission: ${submissionRef}`, `New KYC submission ${submissionRef} from ${clientName}.`]);
  },
});

// ── ADMIN: NEW FINANCE APPLICATION ─────────────────────────────────
export const sendAdminNewFinanceAlert = internalAction({
  args: { to: v.array(v.string()), adminPhones: v.optional(v.array(v.string())), clientName: v.string(), applicationRef: v.string(), financeMethod: v.string() },
  handler: async (ctx, { to, adminPhones, clientName, applicationRef, financeMethod }) => {
    if (to.length === 0) return;
    await hercules.email.send({
      from: FROM,
      to,
      subject: `New Finance Application: ${applicationRef}`,
      html: renderBrandedEmail({
        eyebrow: "Finance & Mortgage",
        heading: "A new finance application needs review",
        greetingName: "Team",
        bodyHtml: emailCard(
          emailInfoRow("Client", clientName) + emailInfoRow("Reference", applicationRef) + emailInfoRow("Method", financeMethod.replace(/_/g, " "))
        ),
        ctaLabel: "Review Finance",
        ctaUrl: `${SITE_URL}/admin/finance`,
      }),
      text: renderPlainText({ greetingName: "Team", lines: [`New finance application ${applicationRef} (${financeMethod}) from ${clientName}.`] }),
    });
    for (const p of adminPhones ?? []) sendWhatsAppCopy(ctx, p, [`New Finance Application: ${applicationRef}`, `New finance application ${applicationRef} (${financeMethod}) from ${clientName}.`]);
  },
});

// ── ADMIN: LARGE PAYMENT RECEIVED ─────────────────────────────────
export const sendAdminLargePaymentAlert = internalAction({
  args: { to: v.array(v.string()), adminPhones: v.optional(v.array(v.string())), clientName: v.string(), amountDisplay: v.number(), currency: v.string(), paymentRef: v.string() },
  handler: async (ctx, { to, adminPhones, clientName, amountDisplay, currency, paymentRef }) => {
    if (to.length === 0) return;
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Large Payment Received — ${currency} ${amountDisplay.toLocaleString()}`,
      html: renderBrandedEmail({
        eyebrow: "Payments",
        heading: "A large payment has been received",
        greetingName: "Team",
        accent: "green",
        bodyHtml: emailCard(
          emailInfoRow("Client", clientName) +
            emailInfoRow("Amount", `${currency} ${amountDisplay.toLocaleString()}`, { valueColor: "#16a34a", bold: true }) +
            emailInfoRow("Reference", paymentRef),
          "green"
        ),
        ctaLabel: "Open Payments",
        ctaUrl: `${SITE_URL}/admin/payments`,
      }),
      text: renderPlainText({ greetingName: "Team", lines: [`Large payment received: ${currency} ${amountDisplay.toLocaleString()} from ${clientName} (Ref: ${paymentRef}).`] }),
    });
    for (const p of adminPhones ?? []) sendWhatsAppCopy(ctx, p, [`Large Payment Received — ${currency} ${amountDisplay.toLocaleString()}`, `Large payment received: ${currency} ${amountDisplay.toLocaleString()} from ${clientName} (Ref: ${paymentRef}).`]);
  },
});

// ══════════════════════════════════════════════════════════════════
// IAM & ORGANISATION NOTIFICATIONS
// Notify a staff member directly when their own access, role, or
// organisational placement changes — separate from (and in addition to)
// the Audit Log, which only administrators see.
// ══════════════════════════════════════════════════════════════════

// ── IAM: ORGANISATION ASSIGNMENT CHANGED ──────────────────────────
export const sendOrgAssignmentEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    roleName: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    directorateName: v.optional(v.string()),
    departmentName: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, name, roleName, jobTitle, directorateName, departmentName, reason }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: "Your organisation assignment has been updated",
      html: renderBrandedEmail({
        eyebrow: "Organisation & Access",
        heading: "Your placement in the organisation has changed",
        greetingName: name,
        bodyHtml: emailCard(
          (roleName ? emailInfoRow("System role", roleName, { bold: true }) : "") +
            (jobTitle ? emailInfoRow("Job title", jobTitle) : "") +
            (directorateName ? emailInfoRow("Directorate", directorateName) : "") +
            (departmentName ? emailInfoRow("Department", departmentName) : "") +
            (reason ? emailInfoRow("Reason", reason) : "")
        ) + `<p style="margin:14px 0 0;">Log in to see how this affects what you can access.</p>`,
        ctaLabel: "Open Admin Panel",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({
        greetingName: name,
        lines: [
          "Your organisation assignment has been updated.",
          roleName ? `System role: ${roleName}` : "",
          jobTitle ? `Job title: ${jobTitle}` : "",
          directorateName ? `Directorate: ${directorateName}` : "",
          departmentName ? `Department: ${departmentName}` : "",
          reason ? `Reason: ${reason}` : "",
        ].filter(Boolean),
      }),
    });
    sendWhatsAppCopy(ctx, phone, [
      "Organisation assignment updated",
      roleName ? `System role: ${roleName}` : "",
      jobTitle ? `Job title: ${jobTitle}` : "",
      directorateName ? `Directorate: ${directorateName}` : "",
      departmentName ? `Department: ${departmentName}` : "",
    ].filter((l): l is string => Boolean(l)));
  },
});

// ── IAM: APPROVAL AUTHORITY GRANTED / REVOKED ─────────────────────
export const sendApprovalAuthorityEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    granted: v.boolean(),
    approvalType: v.string(),
    maxAmount: v.optional(v.number()),
  },
  handler: async (ctx, { to, phone, name, granted, approvalType, maxAmount }) => {
    const heading = granted ? "You've been granted new approval authority" : "Approval authority has been revoked";
    await hercules.email.send({
      from: FROM,
      to,
      subject: granted ? `Approval Authority Granted: ${approvalType}` : `Approval Authority Revoked: ${approvalType}`,
      html: renderBrandedEmail({
        eyebrow: "Approval Authority",
        heading,
        greetingName: name,
        accent: granted ? "green" : "amber",
        bodyHtml: emailCard(
          emailInfoRow("Approval type", approvalType, { bold: true }) +
            (granted && maxAmount !== undefined ? emailInfoRow("Maximum amount", `₦${maxAmount.toLocaleString()}`) : ""),
          granted ? "green" : "amber"
        ) + `<p style="margin:14px 0 0;">${granted ? "You can now review and decide on approvals of this type." : "You can no longer decide on approvals of this type."}</p>`,
        ctaLabel: "Open Tasks & Approvals",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({
        greetingName: name,
        lines: [`${heading}: ${approvalType}`, maxAmount !== undefined ? `Maximum amount: ₦${maxAmount.toLocaleString()}` : ""].filter(Boolean),
      }),
    });
    sendWhatsAppCopy(ctx, phone, [heading, `Approval type: ${approvalType}`]);
  },
});

// ── IAM: TEMPORARY ACCESS GRANTED ─────────────────────────────────
export const sendTemporaryAccessGrantedEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    accessType: v.string(),
    grantedKey: v.string(),
    endAt: v.string(),
  },
  handler: async (ctx, { to, phone, name, accessType, grantedKey, endAt }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Temporary Access Granted: ${grantedKey}`,
      html: renderBrandedEmail({
        eyebrow: "Temporary Access",
        heading: "You've been granted temporary access",
        greetingName: name,
        accent: "purple",
        bodyHtml: emailCard(
          emailInfoRow("Type", accessType) +
            emailInfoRow("Access", grantedKey, { bold: true }) +
            emailInfoRow("Expires", endAt),
          "purple"
        ) + `<p style="margin:14px 0 0;">This access will automatically expire on the date above.</p>`,
        ctaLabel: "Open Admin Panel",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({
        greetingName: name,
        lines: [`Temporary ${accessType} "${grantedKey}" granted. Expires ${endAt}.`],
      }),
    });
    sendWhatsAppCopy(ctx, phone, [`Temporary Access Granted: ${grantedKey}`, `Expires ${endAt}.`]);
  },
});

// ── IAM: TEMPORARY ACCESS EXPIRING SOON / EXPIRED ─────────────────
export const sendTemporaryAccessExpiryEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    grantedKey: v.string(),
    endAt: v.string(),
    alreadyExpired: v.boolean(),
  },
  handler: async (ctx, { to, phone, name, grantedKey, endAt, alreadyExpired }) => {
    const heading = alreadyExpired ? "Your temporary access has expired" : "Your temporary access is expiring soon";
    await hercules.email.send({
      from: FROM,
      to,
      subject: `${heading}: ${grantedKey}`,
      html: renderBrandedEmail({
        eyebrow: "Temporary Access",
        heading,
        greetingName: name,
        accent: alreadyExpired ? "red" : "amber",
        bodyHtml: emailCard(
          emailInfoRow("Access", grantedKey, { bold: true }) + emailInfoRow(alreadyExpired ? "Expired on" : "Expires on", endAt),
          alreadyExpired ? "red" : "amber"
        ),
        ctaLabel: "Open Admin Panel",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({ greetingName: name, lines: [`${heading}: ${grantedKey} (${endAt}).`] }),
    });
    sendWhatsAppCopy(ctx, phone, [heading, `${grantedKey} — ${endAt}`]);
  },
});

// ── IAM: APPROVAL DELEGATION STARTED / ENDED ──────────────────────
export const sendApprovalDelegationEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    isDelegate: v.boolean(),
    started: v.boolean(),
    counterpartName: v.string(),
    approvalType: v.string(),
    endAt: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, name, isDelegate, started, counterpartName, approvalType, endAt }) => {
    const heading = started
      ? isDelegate
        ? `You now approve "${approvalType}" on behalf of ${counterpartName}`
        : `${counterpartName} now approves "${approvalType}" on your behalf`
      : isDelegate
        ? `Your delegated approval authority for "${approvalType}" has ended`
        : `Your delegation of "${approvalType}" to ${counterpartName} has ended`;
    await hercules.email.send({
      from: FROM,
      to,
      subject: heading,
      html: renderBrandedEmail({
        eyebrow: "Approval Delegation",
        heading,
        greetingName: name,
        accent: started ? "blue" : "amber",
        bodyHtml: emailCard(
          emailInfoRow("Approval type", approvalType, { bold: true }) +
            (endAt ? emailInfoRow("Active until", endAt) : "")
        ),
        ctaLabel: "Open Admin Panel",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({ greetingName: name, lines: [heading, endAt ? `Active until ${endAt}.` : ""].filter(Boolean) }),
    });
    sendWhatsAppCopy(ctx, phone, [heading, endAt ? `Active until ${endAt}.` : ""].filter((l): l is string => Boolean(l)));
  },
});

// ── IAM: ACCESS REVIEW DUE (to admins/reviewers) ──────────────────
export const sendAccessReviewDueEmail = internalAction({
  args: {
    to: v.array(v.string()),
    adminPhones: v.optional(v.array(v.string())),
    userName: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, { to, adminPhones, userName, reason }) => {
    if (to.length === 0) return;
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Access Review Due: ${userName}`,
      html: renderBrandedEmail({
        eyebrow: "Access Review",
        heading: "An access review is due",
        greetingName: "Team",
        accent: "amber",
        bodyHtml: emailCard(emailInfoRow("User", userName) + emailInfoRow("Reason", reason), "amber"),
        ctaLabel: "Review Access",
        ctaUrl: `${SITE_URL}/admin/users`,
      }),
      text: renderPlainText({ greetingName: "Team", lines: [`Access review due for ${userName}: ${reason}`] }),
    });
    for (const p of adminPhones ?? []) sendWhatsAppCopy(ctx, p, [`Access Review Due: ${userName}`, reason]);
  },
});

// ── IAM: ORGANISATIONAL CHANGE AFFECTING A PERSON ─────────────────
export const sendOrgChangeAffectingUserEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    changeDescription: v.string(),
  },
  handler: async (ctx, { to, phone, name, changeDescription }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: "An organisational change affects you",
      html: renderBrandedEmail({
        eyebrow: "Organisation Update",
        heading: "An organisational change affects you",
        greetingName: name,
        bodyHtml: `<p style="margin:0;">${escapeHtml(changeDescription)}</p>`,
        ctaLabel: "Open Admin Panel",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({ greetingName: name, lines: [changeDescription] }),
    });
    sendWhatsAppCopy(ctx, phone, ["Organisational change affects you", changeDescription]);
  },
});

// ── STRATEGIC PARTNER ENGAGEMENTS ─────────────────────────────────
export const sendPartnerEngagementSubmittedEmail = internalAction({
  args: {
    to: v.array(v.string()),
    adminPhones: v.optional(v.array(v.string())),
    partnerName: v.string(),
    engagementType: v.string(),
  },
  handler: async (ctx, { to, adminPhones, partnerName, engagementType }) => {
    if (to.length === 0) return;
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Partner Engagement Awaiting Approval: ${partnerName}`,
      html: renderBrandedEmail({
        eyebrow: "Strategic Partner Engagements",
        heading: "A partner engagement needs your approval",
        greetingName: "Team",
        accent: "amber",
        bodyHtml: emailCard(emailInfoRow("Partner", partnerName) + emailInfoRow("Engagement Type", engagementType), "amber"),
        ctaLabel: "Review Engagement",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({ greetingName: "Team", lines: [`Partner engagement with ${partnerName} (${engagementType}) is awaiting approval.`] }),
    });
    for (const p of adminPhones ?? []) sendWhatsAppCopy(ctx, p, [`Partner Engagement Awaiting Approval: ${partnerName}`, `Type: ${engagementType}`]);
  },
});

export const sendPartnerEngagementDecisionEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    partnerName: v.string(),
    approved: v.boolean(),
  },
  handler: async (ctx, { to, phone, name, partnerName, approved }) => {
    const heading = approved ? "A partner engagement you liaise on has been approved" : "A partner engagement you liaise on has been rejected";
    await hercules.email.send({
      from: FROM,
      to,
      subject: approved ? `Partner Engagement Approved: ${partnerName}` : `Partner Engagement Rejected: ${partnerName}`,
      html: renderBrandedEmail({
        eyebrow: "Strategic Partner Engagements",
        heading,
        greetingName: name,
        accent: approved ? "green" : "red",
        bodyHtml: emailCard(emailInfoRow("Partner", partnerName) + emailInfoRow("Decision", approved ? "Approved" : "Rejected"), approved ? "green" : "red"),
        ctaLabel: "Open Admin Panel",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({ greetingName: name, lines: [`Partner engagement with ${partnerName} was ${approved ? "approved" : "rejected"}.`] }),
    });
    sendWhatsAppCopy(ctx, phone, [heading, `Partner: ${partnerName}`]);
  },
});

// ── ORG TASKS & APPROVALS ─────────────────────────────────────────
export const sendTaskAssignedEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    taskRef: v.string(),
    title: v.string(),
    priority: v.string(),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, name, taskRef, title, priority, dueDate }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: `New Task Assigned: ${taskRef}`,
      html: renderBrandedEmail({
        eyebrow: "Tasks",
        heading: "You've been assigned a new task",
        greetingName: name,
        bodyHtml: emailCard(
          emailInfoRow("Task", `${taskRef} — ${title}`) +
            emailInfoRow("Priority", priority) +
            (dueDate ? emailInfoRow("Due Date", dueDate) : ""),
        ),
        ctaLabel: "Open Admin Panel",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({ greetingName: name, lines: [`You've been assigned task ${taskRef}: ${title} (priority: ${priority}).`] }),
    });
    sendWhatsAppCopy(ctx, phone, [`New Task Assigned: ${taskRef}`, title, `Priority: ${priority}`]);
  },
});

export const sendApprovalDecisionEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    approvalRef: v.string(),
    summary: v.string(),
    decision: v.string(),
    decisionNote: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, name, approvalRef, summary, decision, decisionNote }) => {
    const approved = decision === "approved";
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Approval ${approved ? "Approved" : "Rejected"}: ${approvalRef}`,
      html: renderBrandedEmail({
        eyebrow: "Approvals",
        heading: `Your approval request was ${decision}`,
        greetingName: name,
        accent: approved ? "green" : "red",
        bodyHtml: emailCard(
          emailInfoRow("Request", `${approvalRef} — ${summary}`) +
            emailInfoRow("Decision", decision) +
            (decisionNote ? emailInfoRow("Note", decisionNote) : ""),
          approved ? "green" : "red",
        ),
        ctaLabel: "Open Admin Panel",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({ greetingName: name, lines: [`Your approval request ${approvalRef} (${summary}) was ${decision}.${decisionNote ? ` Note: ${decisionNote}` : ""}`] }),
    });
    sendWhatsAppCopy(ctx, phone, [`Approval ${decision}: ${approvalRef}`, summary]);
  },
});

export const sendApprovalEscalatedEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    approvalRef: v.string(),
    summary: v.string(),
    escalatedByName: v.string(),
    escalationNote: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, name, approvalRef, summary, escalatedByName, escalationNote }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Approval Escalated To You: ${approvalRef}`,
      html: renderBrandedEmail({
        eyebrow: "Approvals",
        heading: "An approval request has been escalated to you",
        greetingName: name,
        accent: "amber",
        bodyHtml: emailCard(
          emailInfoRow("Request", `${approvalRef} — ${summary}`) +
            emailInfoRow("Escalated By", escalatedByName) +
            (escalationNote ? emailInfoRow("Note", escalationNote) : ""),
          "amber",
        ),
        ctaLabel: "Review Approval",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({ greetingName: name, lines: [`Approval ${approvalRef} (${summary}) was escalated to you by ${escalatedByName}.`] }),
    });
    sendWhatsAppCopy(ctx, phone, [`Approval Escalated To You: ${approvalRef}`, summary]);
  },
});

// ── SALES & ALLOCATIONS ────────────────────────────────────────────
export const sendAllocationConfirmedEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    allocationNumber: v.string(),
    plotLabel: v.string(),
    purchasePrice: v.number(),
  },
  handler: async (ctx, { to, phone, name, allocationNumber, plotLabel, purchasePrice }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Allocation Confirmed: ${allocationNumber}`,
      html: renderBrandedEmail({
        eyebrow: "Allocations",
        heading: "Your plot allocation has been confirmed",
        greetingName: name,
        accent: "green",
        bodyHtml: emailCard(
          emailInfoRow("Allocation No.", allocationNumber) +
            emailInfoRow("Plot", plotLabel) +
            emailInfoRow("Purchase Price", `₦${purchasePrice.toLocaleString()}`),
          "green",
        ),
        ctaLabel: "View in Buyer Portal",
        ctaUrl: `${SITE_URL}/client`,
      }),
      text: renderPlainText({ greetingName: name, lines: [`Your allocation ${allocationNumber} for ${plotLabel} (₦${purchasePrice.toLocaleString()}) has been confirmed.`] }),
    });
    sendWhatsAppCopy(ctx, phone, [`Allocation Confirmed: ${allocationNumber}`, plotLabel, `₦${purchasePrice.toLocaleString()}`]);
  },
});

export const sendAllocationDocumentIssuedEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    allocationNumber: v.string(),
    documentLabel: v.string(),
  },
  handler: async (ctx, { to, phone, name, allocationNumber, documentLabel }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: `${documentLabel} Issued: ${allocationNumber}`,
      html: renderBrandedEmail({
        eyebrow: "Allocations",
        heading: `Your ${documentLabel.toLowerCase()} is ready`,
        greetingName: name,
        bodyHtml: emailCard(emailInfoRow("Allocation No.", allocationNumber) + emailInfoRow("Document", documentLabel)),
        ctaLabel: "View in Buyer Portal",
        ctaUrl: `${SITE_URL}/client`,
      }),
      text: renderPlainText({ greetingName: name, lines: [`Your ${documentLabel} for allocation ${allocationNumber} has been issued and is available in your Buyer Portal.`] }),
    });
    sendWhatsAppCopy(ctx, phone, [`${documentLabel} Issued`, `Allocation ${allocationNumber}`]);
  },
});

export const sendInstallmentReminderEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    amount: v.number(),
    dueDate: v.string(),
    planTitle: v.string(),
    overdue: v.boolean(),
  },
  handler: async (ctx, { to, phone, name, amount, dueDate, planTitle, overdue }) => {
    const heading = overdue ? "Your installment payment is overdue" : "Your installment payment is due soon";
    const subject = overdue ? `Installment Overdue: ${planTitle}` : `Installment Due Soon: ${planTitle}`;
    await hercules.email.send({
      from: FROM,
      to,
      subject,
      html: renderBrandedEmail({
        eyebrow: "Payment Plan",
        heading,
        greetingName: name,
        accent: overdue ? "red" : "amber",
        bodyHtml: emailCard(
          emailInfoRow("Plan", planTitle) + emailInfoRow("Amount Due", `₦${amount.toLocaleString()}`) + emailInfoRow("Due Date", dueDate),
          overdue ? "red" : "amber",
        ),
        ctaLabel: "Make a Payment",
        ctaUrl: `${SITE_URL}/client`,
      }),
      text: renderPlainText({ greetingName: name, lines: [`Installment of ₦${amount.toLocaleString()} for "${planTitle}" ${overdue ? "is overdue" : "is due soon"} (due ${dueDate}).`] }),
    });
    sendWhatsAppCopy(ctx, phone, [subject, `Amount: ₦${amount.toLocaleString()}`, `Due: ${dueDate}`]);
  },
});

// ── STAFF / HR ──────────────────────────────────────────────────────
export const sendLeaveDecisionEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    staffName: v.string(),
    leaveType: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, staffName, leaveType, startDate, endDate, status, notes }) => {
    const approved = status === "approved";
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Leave Request ${approved ? "Approved" : "Update"}: ${leaveType}`,
      html: renderBrandedEmail({
        eyebrow: "HR Leave Management",
        heading: approved ? "Your leave request has been approved" : `Your leave request was ${status}`,
        greetingName: staffName,
        accent: approved ? "green" : "red",
        bodyHtml: emailCard(
          emailInfoRow("Leave type", leaveType) +
            emailInfoRow("From", startDate) +
            emailInfoRow("To", endDate) +
            emailInfoRow("Status", status, { bold: true }) +
            (notes ? emailInfoRow("Note", notes) : ""),
          approved ? "green" : "red",
        ),
        ctaLabel: "View in Staff Portal",
        ctaUrl: `${SITE_URL}/staff`,
      }),
      text: renderPlainText({
        greetingName: staffName,
        lines: [`Your ${leaveType} leave request (${startDate} to ${endDate}) was ${status}.`, notes ?? ""].filter(Boolean),
      }),
    });
    sendWhatsAppCopy(ctx, phone, [`Leave Request ${status}: ${leaveType}`, `${startDate} to ${endDate}`, notes ?? ""].filter((l): l is string => Boolean(l)));
  },
});

export const sendAttendanceIrregularityEmail = internalAction({
  args: {
    to: v.array(v.string()),
    adminPhones: v.optional(v.array(v.string())),
    staffName: v.string(),
    date: v.string(),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { to, adminPhones, staffName, date, status, notes }) => {
    if (to.length === 0) return;
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Attendance Alert: ${staffName} — ${status.replace(/_/g, " ")}`,
      html: renderBrandedEmail({
        eyebrow: "HR Attendance",
        heading: `Attendance irregularity flagged for ${staffName}`,
        greetingName: "Team",
        accent: "amber",
        bodyHtml: emailCard(
          emailInfoRow("Staff", staffName) +
            emailInfoRow("Date", date) +
            emailInfoRow("Status", status.replace(/_/g, " "), { bold: true }) +
            (notes ? emailInfoRow("Note", notes) : ""),
          "amber",
        ),
        ctaLabel: "Open Staff Management",
        ctaUrl: `${SITE_URL}/admin/staff`,
      }),
      text: renderPlainText({
        greetingName: "Team",
        lines: [`${staffName} was marked "${status.replace(/_/g, " ")}" on ${date}.`, notes ?? ""].filter(Boolean),
      }),
    });
    for (const phone of adminPhones ?? []) {
      sendWhatsAppCopy(ctx, phone, [`Attendance Alert: ${staffName}`, `${status.replace(/_/g, " ")} on ${date}`, notes ?? ""].filter((l): l is string => Boolean(l)));
    }
  },
});

export const sendStaffOnboardingEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    fullName: v.string(),
    jobTitle: v.string(),
    department: v.string(),
    startDate: v.string(),
  },
  handler: async (ctx, { to, phone, fullName, jobTitle, department, startDate }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: "Welcome to Geodata World Services",
      html: renderBrandedEmail({
        eyebrow: "Human Resources",
        heading: `Welcome aboard, ${fullName.split(" ")[0]}!`,
        greetingName: fullName,
        accent: "green",
        bodyHtml: emailCard(
          emailInfoRow("Job title", jobTitle) + emailInfoRow("Department", department) + emailInfoRow("Start date", startDate),
          "green",
        ) + `<p style="margin:14px 0 0;">We're excited to have you join the team. Your staff profile is now set up in our system.</p>`,
        ctaLabel: "Visit Website",
        ctaUrl: SITE_URL,
      }),
      text: renderPlainText({ greetingName: fullName, lines: [`Welcome to Geodata World Services as ${jobTitle} in ${department}, starting ${startDate}.`] }),
    });
    sendWhatsAppCopy(ctx, phone, ["Welcome to Geodata World Services!", `${jobTitle} — ${department}`, `Start date: ${startDate}`]);
  },
});

// ── CONSTRUCTION ────────────────────────────────────────────────────
export const sendSiteStatusChangeEmail = internalAction({
  args: {
    to: v.array(v.string()),
    adminPhones: v.optional(v.array(v.string())),
    siteName: v.string(),
    fromStatus: v.string(),
    toStatus: v.string(),
  },
  handler: async (ctx, { to, adminPhones, siteName, fromStatus, toStatus }) => {
    if (to.length === 0) return;
    const isHold = toStatus === "on_hold";
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Site Status Update: ${siteName} — ${toStatus.replace(/_/g, " ")}`,
      html: renderBrandedEmail({
        eyebrow: "Construction",
        heading: `${siteName} is now ${toStatus.replace(/_/g, " ")}`,
        greetingName: "Team",
        accent: isHold ? "amber" : toStatus === "completed" ? "green" : "blue",
        bodyHtml: emailCard(
          emailInfoRow("Site", siteName) +
            emailInfoRow("Previous status", fromStatus.replace(/_/g, " ")) +
            emailInfoRow("New status", toStatus.replace(/_/g, " "), { bold: true }),
          isHold ? "amber" : toStatus === "completed" ? "green" : "blue",
        ),
        ctaLabel: "Open Construction Management",
        ctaUrl: `${SITE_URL}/admin/construction`,
      }),
      text: renderPlainText({
        greetingName: "Team",
        lines: [`${siteName} status changed from ${fromStatus.replace(/_/g, " ")} to ${toStatus.replace(/_/g, " ")}.`],
      }),
    });
    for (const phone of adminPhones ?? []) {
      sendWhatsAppCopy(ctx, phone, [`Site Status Update: ${siteName}`, `${fromStatus.replace(/_/g, " ")} → ${toStatus.replace(/_/g, " ")}`]);
    }
  },
});

export const sendMaterialDeliveryOverdueEmail = internalAction({
  args: {
    to: v.array(v.string()),
    adminPhones: v.optional(v.array(v.string())),
    siteName: v.string(),
    materialName: v.string(),
    supplier: v.optional(v.string()),
    expectedDeliveryDate: v.string(),
  },
  handler: async (ctx, { to, adminPhones, siteName, materialName, supplier, expectedDeliveryDate }) => {
    if (to.length === 0) return;
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Material Delivery Overdue: ${materialName} (${siteName})`,
      html: renderBrandedEmail({
        eyebrow: "Construction",
        heading: `${materialName} delivery is overdue`,
        greetingName: "Team",
        accent: "red",
        bodyHtml: emailCard(
          emailInfoRow("Site", siteName) +
            emailInfoRow("Material", materialName) +
            (supplier ? emailInfoRow("Supplier", supplier) : "") +
            emailInfoRow("Expected delivery", expectedDeliveryDate, { bold: true }),
          "red",
        ),
        ctaLabel: "Open Construction Management",
        ctaUrl: `${SITE_URL}/admin/construction`,
      }),
      text: renderPlainText({
        greetingName: "Team",
        lines: [`${materialName} for ${siteName} was expected on ${expectedDeliveryDate} and has not been marked delivered.`, supplier ? `Supplier: ${supplier}` : ""].filter(Boolean),
      }),
    });
    for (const phone of adminPhones ?? []) {
      sendWhatsAppCopy(ctx, phone, [`Material Overdue: ${materialName}`, `Site: ${siteName}`, `Expected: ${expectedDeliveryDate}`]);
    }
  },
});

// ── SECURITY-SENSITIVE CHANGES ─────────────────────────────────────
export const sendRoleChangedEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    fromRole: v.string(),
    toRole: v.string(),
    changedByName: v.string(),
  },
  handler: async (ctx, { to, phone, name, fromRole, toRole, changedByName }) => {
    await hercules.email.send({
      from: FROM,
      to,
      subject: "Your Account Role Has Changed",
      html: renderBrandedEmail({
        eyebrow: "Security Notice",
        heading: "Your account role was changed",
        greetingName: name,
        accent: "red",
        bodyHtml: emailCard(
          emailInfoRow("Previous role", fromRole.replace(/_/g, " ")) +
            emailInfoRow("New role", toRole.replace(/_/g, " "), { bold: true }) +
            emailInfoRow("Changed by", changedByName),
          "red",
        ) + `<p style="margin:14px 0 0;">If you did not expect this change, please contact your administrator immediately.</p>`,
        ctaLabel: "Open Dashboard",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({
        greetingName: name,
        lines: [`Your account role was changed from ${fromRole.replace(/_/g, " ")} to ${toRole.replace(/_/g, " ")} by ${changedByName}.`, "If you did not expect this, contact your administrator."],
      }),
    });
    sendWhatsAppCopy(ctx, phone, ["Security Notice: Your Account Role Changed", `${fromRole.replace(/_/g, " ")} → ${toRole.replace(/_/g, " ")}`, `By: ${changedByName}`]);
  },
});

export const sendPermissionOverrideEmail = internalAction({
  args: {
    to: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    permissionKey: v.string(),
    effect: v.string(),
    changedByName: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { to, phone, name, permissionKey, effect, changedByName, reason }) => {
    const granted = effect === "grant";
    await hercules.email.send({
      from: FROM,
      to,
      subject: `Permission ${granted ? "Granted" : "Denied"}: ${permissionKey}`,
      html: renderBrandedEmail({
        eyebrow: "Security Notice",
        heading: `A permission was ${granted ? "granted to" : "denied on"} your account`,
        greetingName: name,
        accent: granted ? "green" : "red",
        bodyHtml: emailCard(
          emailInfoRow("Permission", permissionKey) +
            emailInfoRow("Effect", granted ? "Granted" : "Denied", { bold: true }) +
            emailInfoRow("Changed by", changedByName) +
            (reason ? emailInfoRow("Reason", reason) : ""),
          granted ? "green" : "red",
        ) + `<p style="margin:14px 0 0;">If you did not expect this change, please contact your administrator immediately.</p>`,
        ctaLabel: "Open Dashboard",
        ctaUrl: `${SITE_URL}/admin`,
      }),
      text: renderPlainText({
        greetingName: name,
        lines: [`Permission "${permissionKey}" was ${granted ? "granted to" : "denied on"} your account by ${changedByName}.`, reason ?? ""].filter(Boolean),
      }),
    });
    sendWhatsAppCopy(ctx, phone, [`Security Notice: Permission ${granted ? "Granted" : "Denied"}`, permissionKey, `By: ${changedByName}`]);
  },
});

export const sendPartnerEngagementExpiryEmail = internalAction({
  args: {
    to: v.array(v.string()),
    adminPhones: v.optional(v.array(v.string())),
    liaisonEmail: v.optional(v.string()),
    liaisonPhone: v.optional(v.string()),
    liaisonName: v.optional(v.string()),
    partnerName: v.string(),
    endDate: v.string(),
    alreadyExpired: v.boolean(),
  },
  handler: async (ctx, { to, adminPhones, liaisonEmail, liaisonPhone, liaisonName, partnerName, endDate, alreadyExpired }) => {
    const heading = alreadyExpired ? "A partner engagement has expired" : "A partner engagement is expiring soon";
    const subject = alreadyExpired ? `Partner Engagement Expired: ${partnerName}` : `Partner Engagement Expiring Soon: ${partnerName}`;
    const bodyHtml = emailCard(emailInfoRow("Partner", partnerName) + emailInfoRow("End Date", endDate), alreadyExpired ? "red" : "amber");
    const textLines = [`Partner engagement with ${partnerName} ${alreadyExpired ? "has expired" : "is expiring soon"} (end date ${endDate}).`];

    if (to.length > 0) {
      await hercules.email.send({
        from: FROM,
        to,
        subject,
        html: renderBrandedEmail({
          eyebrow: "Strategic Partner Engagements",
          heading,
          greetingName: "Team",
          accent: alreadyExpired ? "red" : "amber",
          bodyHtml,
          ctaLabel: "Review Engagement",
          ctaUrl: `${SITE_URL}/admin`,
        }),
        text: renderPlainText({ greetingName: "Team", lines: textLines }),
      });
      for (const p of adminPhones ?? []) sendWhatsAppCopy(ctx, p, [subject, `End date: ${endDate}`]);
    }

    if (liaisonEmail) {
      await hercules.email.send({
        from: FROM,
        to: liaisonEmail,
        subject,
        html: renderBrandedEmail({
          eyebrow: "Strategic Partner Engagements",
          heading,
          greetingName: liaisonName ?? "there",
          accent: alreadyExpired ? "red" : "amber",
          bodyHtml,
          ctaLabel: "Open Admin Panel",
          ctaUrl: `${SITE_URL}/admin`,
        }),
        text: renderPlainText({ greetingName: liaisonName ?? "there", lines: textLines }),
      });
      sendWhatsAppCopy(ctx, liaisonPhone, [subject, `End date: ${endDate}`]);
    }
  },
});
