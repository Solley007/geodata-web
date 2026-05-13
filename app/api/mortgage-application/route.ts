import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { COMPANY } from "@/lib/site-content";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, employment, incomeRange, propertyOfInterest, additionalInfo } = body;

    if (!name || !email || !phone || !employment || !incomeRange || !propertyOfInterest) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fromEmail = process.env.CONTACT_FROM;
    const toEmail   = process.env.CONTACT_TO ?? COMPANY.email;
    if (!fromEmail) return NextResponse.json({ error: "Email not configured" }, { status: 500 });

    // --- Email to team ---
    const teamHtml = `
<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;background:#F4F2EC;padding:40px 20px;color:#0A1628;">
  <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;margin:0 auto;background:#FAFAF7;">
    <tr><td style="padding:32px 40px 16px;border-bottom:1px solid #E5E0D5;">
      <p style="margin:0;font-family:Georgia,serif;font-size:20px;letter-spacing:-0.01em;">
        GEODATA<span style="color:#C9A961;">.</span>
      </p>
      <p style="margin:6px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#94A0B0;">
        New MREIF mortgage enquiry
      </p>
    </td></tr>

    <tr><td style="padding:32px 40px;">
      <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:24px;line-height:1.2;color:#0A1628;">
        ${name}
      </h1>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:14px;">
        <tr><td style="padding:8px 0;border-bottom:1px solid #F4F2EC;color:#94A0B0;width:160px;">Phone</td>
            <td style="padding:8px 0;border-bottom:1px solid #F4F2EC;">${phone}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #F4F2EC;color:#94A0B0;">Email</td>
            <td style="padding:8px 0;border-bottom:1px solid #F4F2EC;"><a href="mailto:${email}" style="color:#0F2547;">${email}</a></td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #F4F2EC;color:#94A0B0;">Employment</td>
            <td style="padding:8px 0;border-bottom:1px solid #F4F2EC;">${employment}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #F4F2EC;color:#94A0B0;">Monthly income</td>
            <td style="padding:8px 0;border-bottom:1px solid #F4F2EC;">${incomeRange}</td></tr>
        <tr><td style="padding:8px 0;color:#94A0B0;vertical-align:top;">Property of interest</td>
            <td style="padding:8px 0;">${propertyOfInterest}</td></tr>
      </table>

      ${additionalInfo ? `
      <div style="margin-top:24px;padding-top:24px;border-top:1px solid #E5E0D5;">
        <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#94A0B0;">Additional notes</p>
        <p style="margin:0;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1F2D3D;white-space:pre-wrap;">${additionalInfo}</p>
      </div>` : ""}

      <p style="margin:32px 0 0;font-size:12px;color:#94A0B0;">
        Submitted ${new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
      </p>
    </td></tr>
  </table>
</body></html>`.trim();

    await resend.emails.send({
      from:     `Geodata MREIF <${fromEmail}>`,
      to:       toEmail,
      replyTo:  email,
      subject:  `MREIF enquiry — ${name} — ${propertyOfInterest}`,
      html:     teamHtml,
    });

    // --- Confirmation to applicant ---
    const userHtml = `
<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;background:#F4F2EC;padding:40px 20px;color:#0A1628;">
  <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;margin:0 auto;background:#FAFAF7;">
    <tr><td style="padding:32px 40px 16px;border-bottom:1px solid #E5E0D5;">
      <p style="margin:0;font-family:Georgia,serif;font-size:20px;letter-spacing:-0.01em;">
        GEODATA<span style="color:#C9A961;">.</span>
      </p>
    </td></tr>

    <tr><td style="padding:36px 40px;">
      <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;line-height:1.2;letter-spacing:-0.01em;">
        Thank you, ${name.split(" ")[0]}.
      </h1>
      <p style="margin:0 0 16px;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;">
        We've received your MREIF mortgage enquiry for <strong>${propertyOfInterest}</strong>.
      </p>
      <p style="margin:0 0 16px;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;">
        A member of our team will reach out within one business day to walk you through pre-qualification and the formal application process with Zenith Bank.
      </p>
      <p style="margin:24px 0 0;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1F2D3D;">
        In the meantime, feel free to call or message us:<br>
        <a href="tel:${COMPANY.phone.replace(/\s/g, "")}" style="color:#0F2547;">${COMPANY.phone}</a> · <a href="mailto:${COMPANY.email}" style="color:#0F2547;">${COMPANY.email}</a>
      </p>
    </td></tr>

    <tr><td style="padding:20px 40px 28px;border-top:1px solid #E5E0D5;background:#F4F2EC;">
      <p style="margin:0;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:12px;color:#94A0B0;">
        ${COMPANY.name} · ${COMPANY.address.full}
      </p>
    </td></tr>
  </table>
</body></html>`.trim();

    await resend.emails.send({
      from:    `Geodata <${fromEmail}>`,
      to:      email,
      subject: "We've received your MREIF mortgage enquiry",
      html:    userHtml,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Mortgage application error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to submit" }, { status: 500 });
  }
}
