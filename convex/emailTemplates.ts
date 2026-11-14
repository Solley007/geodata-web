// Shared branded HTML email template for all outbound notifications.
// Pure string builder — no Convex/Node dependencies — safe to import from
// any runtime (used exclusively by convex/emails.ts, a "use node" file).
import escapeHtml from "escape-html";

const LOGO_URL = "https://hercules-cdn.com/file_hqjYSAKlVBBRqljHrAkEnfVn";
const BRAND = "#0B4DBB";
const BRAND_DARK = "#0940A0";
const COMPANY = "GEODATA WORLD SERVICES LIMITED";
const SITE_URL = "https://geodata.com.ng";

export type EmailAccent = "blue" | "green" | "amber" | "red" | "purple";

const ACCENTS: Record<EmailAccent, string> = {
  blue: "#0B4DBB",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  purple: "#7c3aed",
};

export type BrandedEmailOptions = {
  /** Hidden preview text shown in inbox lists */
  preheader?: string;
  /** Small uppercase label above the heading, e.g. "KYC Update" */
  eyebrow: string;
  /** Main heading */
  heading: string;
  /** Recipient's name for the greeting line; omit for a generic "Hello," */
  greetingName?: string;
  /** Inner HTML for the message body. Caller is responsible for escaping any dynamic values. */
  bodyHtml: string;
  accent?: EmailAccent;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

/** Renders the full branded HTML email shell used across the app. */
export function renderBrandedEmail(opts: BrandedEmailOptions): string {
  const accentColor = ACCENTS[opts.accent ?? "blue"];
  const greeting = opts.greetingName ? `Hello ${escapeHtml(opts.greetingName)},` : "Hello,";

  return `
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader ?? "")}</div>
<div style="background:#eef2f9;padding:32px 12px;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(15,23,42,0.08);">
    <div style="background:${BRAND};background-image:linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%);padding:28px 32px;text-align:center;">
      <img src="${LOGO_URL}" alt="${COMPANY}" width="48" height="48" style="width:48px;height:48px;border-radius:10px;background:#fff;padding:4px;display:inline-block;margin-bottom:10px;" />
      <div style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.06em;font-family:Georgia,'Playfair Display',serif;">${COMPANY}</div>
    </div>
    <div style="height:4px;background:${accentColor};"></div>
    <div style="padding:32px;">
      <p style="margin:0 0 4px;color:${accentColor};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(opts.eyebrow)}</p>
      <h1 style="margin:2px 0 18px;color:#0f172a;font-size:21px;font-family:Georgia,'Playfair Display',serif;line-height:1.3;">${escapeHtml(opts.heading)}</h1>
      <p style="margin:0 0 14px;color:#334155;font-size:14.5px;">${greeting}</p>
      <div style="color:#334155;font-size:14.5px;line-height:1.65;">${opts.bodyHtml}</div>
      ${
        opts.ctaLabel && opts.ctaUrl
          ? `<div style="margin-top:26px;">
              <a href="${opts.ctaUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 26px;border-radius:10px;">${escapeHtml(opts.ctaLabel)}</a>
            </div>`
          : ""
      }
    </div>
    <div style="background:#f8fafc;padding:20px 32px;border-top:1px solid #eef2f9;">
      <p style="margin:0 0 4px;color:#94a3b8;font-size:11.5px;">${escapeHtml(opts.footerNote ?? "This is an automated message from Geodata World Services ERP.")}</p>
      <p style="margin:0;color:#cbd5e1;font-size:11px;">© ${new Date().getFullYear()} ${COMPANY} · <a href="${SITE_URL}" style="color:#94a3b8;text-decoration:underline;">${SITE_URL.replace("https://", "")}</a></p>
    </div>
  </div>
</div>`;
}

/** Renders a simple info row used inside email body cards (label/value pair). */
export function emailInfoRow(label: string, value: string, opts?: { valueColor?: string; bold?: boolean }): string {
  return `<p style="margin:0 0 4px;color:#64748b;font-size:13px;">${escapeHtml(label)}: <strong style="color:${opts?.valueColor ?? "#0f172a"};${opts?.bold ? "font-weight:700;" : ""}">${escapeHtml(value)}</strong></p>`;
}

/** Renders a bordered card used to highlight a record's key details inside the email body. */
export function emailCard(innerHtml: string, accent: EmailAccent = "blue"): string {
  const accentColor = ACCENTS[accent];
  return `<div style="background:#f8fafc;border-left:4px solid ${accentColor};border-radius:8px;padding:16px 18px;margin:16px 0;">${innerHtml}</div>`;
}

/** Plain-text companion for the branded HTML email — improves deliverability. */
export function renderPlainText(opts: { greetingName?: string; lines: string[]; footer?: string }): string {
  const greeting = opts.greetingName ? `Hello ${opts.greetingName},` : "Hello,";
  return `${greeting}\n\n${opts.lines.join("\n")}\n\n${opts.footer ?? "– Geodata World Services Limited"}`;
}
