// ---------------------------------------------------------------------------
// /api/contact — server-side email delivery
// ---------------------------------------------------------------------------
// Receives form submissions from /contact, validates input, and sends an
// email to hello@geodata.com.ng via Resend.
//
// SETUP REQUIRED:
//   1. Sign up at https://resend.com (free tier: 100 emails/day, 3000/month)
//   2. Verify your sending domain (geodata.com.ng) — takes ~10 min via DNS
//   3. Generate an API key in the Resend dashboard
//   4. Add to .env.local:
//        RESEND_API_KEY=re_xxxxxxxxxxxx
//        CONTACT_FROM=hello@geodata.com.ng
//        CONTACT_TO=hello@geodata.com.ng
//   5. Add the same env vars to Vercel before deploying
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { Resend } from "resend";

interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  interest: string;
  message: string;
}

// Whitelist of valid interest values — guards against arbitrary input
const VALID_INTERESTS = [
  "Specific property",
  "Schedule a visit",
  "MREIF mortgage",
  "Investment opportunity",
  "Sales partnership",
  "Other",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactPayload;

    // Validation — fail fast with clear errors
    if (!body.name?.trim() || body.name.length > 200) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (!body.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!body.message?.trim() || body.message.length > 5000) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    if (!VALID_INTERESTS.includes(body.interest)) {
      return NextResponse.json({ error: "Invalid interest" }, { status: 400 });
    }

    // Resend init — fails clearly if env not configured
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CONTACT_FROM;
    const to = process.env.CONTACT_TO;

    if (!apiKey || !from || !to) {
      console.error("Contact API: missing env config");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    // Email body — plain HTML, editorial styling, easy to read in any client
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; padding: 32px;">
        <div style="margin: 0 0 32px;">
          <img src="https://geodata.com.ng/icon-180.png" alt="Geodata" width="48" height="48" style="display: block; width: 48px; height: 48px;" />
        </div>
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #6B7280; margin: 0 0 8px;">
          New enquiry · ${escapeHtml(body.interest)}
        </p>
        <h1 style="font-size: 24px; color: #0F2547; margin: 0 0 24px;">
          ${escapeHtml(body.name)}
        </h1>

        <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E0D5; color: #5C6B7E; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; width: 100px;">
              Email
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E0D5; color: #0A1628;">
              <a href="mailto:${escapeHtml(body.email)}" style="color: #0F2547;">${escapeHtml(body.email)}</a>
            </td>
          </tr>
          ${
            body.phone
              ? `<tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E0D5; color: #5C6B7E; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">
                    Phone
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E0D5; color: #0A1628;">
                    <a href="tel:${escapeHtml(body.phone)}" style="color: #0F2547;">${escapeHtml(body.phone)}</a>
                  </td>
                </tr>`
              : ""
          }
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E0D5; color: #5C6B7E; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">
              Interest
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E0D5; color: #0A1628;">
              ${escapeHtml(body.interest)}
            </td>
          </tr>
        </table>

        <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: #6B7280; margin: 32px 0 12px;">
          Message
        </p>
        <p style="color: #0A1628; line-height: 1.6; white-space: pre-wrap; margin: 0;">
          ${escapeHtml(body.message)}
        </p>

        <hr style="margin: 40px 0; border: none; border-top: 1px solid #E5E0D5;" />
        <p style="color: #94A0B0; font-size: 12px; margin: 0;">
          Sent from geodata.com.ng contact form
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: `Geodata Website <${from}>`,
      to: [to],
      replyTo: body.email,
      subject: `[Enquiry · ${body.interest}] ${body.name}`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** Defang HTML to prevent injection in the email body */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
