/**
 * Save as: app/api/availability-alert/route.ts
 *
 * Receives availability-alert signups from <NotifyMe /> and emails the
 * sales inbox. Uses the same Resend setup as your other routes.
 * No database needed: the inbox is the CRM for now.
 */
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, property, typology } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!property || !typology) {
      return NextResponse.json({ error: "Missing context" }, { status: 400 });
    }

    const to = process.env.CONTACT_TO ?? "hello@geodata.com.ng";
    const from = process.env.CONTACT_FROM ?? "hello@geodata.com.ng";
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng";

    await resend.emails.send({
      from,
      to,
      subject: `Availability alert: ${typology} — ${String(email)}`,
      html: `
<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;background:#F4F2EC;padding:40px 20px;color:#0A1628;">
  <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;margin:0 auto;background:#FAFAF7;">
    <tr><td style="padding:22px 30px;background:#0f2547;text-align:center;">
      <img src="${site}/geodata-full-logo-white.png" alt="Geodata World Services Limited" width="200" style="display:block;width:200px;max-width:200px;height:auto;border:0;outline:none;margin:0 auto;" />
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;font-weight:400;">New availability alert</h1>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Email:</strong> ${String(email)}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Property:</strong> ${String(property)}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Typology:</strong> ${String(typology)}</p>
      <p style="margin:24px 0 0;font-size:13px;color:#5c6b7e;">
        This person wants to be told when availability or pricing changes.
        They have named the exact unit they want. Treat as a warm lead.
      </p>
    </td></tr>
  </table>
</body></html>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("availability-alert error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
