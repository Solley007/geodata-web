import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { subscribe, type SubscriptionCategory, CATEGORY_META } from "@/lib/resend-audience";
import { COMPANY } from "@/lib/site-content";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const VALID_CATS = new Set<SubscriptionCategory>(["updates", "blog", "properties", "announcements"]);

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, categories } = await req.json();

    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ error: "Pick at least one category." }, { status: 400 });
    }
    const cats = Array.from(new Set(
      categories.filter((c: any): c is SubscriptionCategory => typeof c === "string" && VALID_CATS.has(c as SubscriptionCategory))
    ));
    if (cats.length === 0) {
      return NextResponse.json({ error: "No valid categories selected." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName  = typeof firstName === "string" ? firstName.trim().slice(0, 80) : undefined;

    const result = await subscribe(cleanEmail, cats, cleanName);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // ── Send confirmation email ─────────────────────────────────────────
    const fromEmail = process.env.CONTACT_FROM;
    if (fromEmail) {

      const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng";
      const firstName = cleanName ? cleanName.split(" ")[0] : null;

      const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to Geodata</title></head>
<body style="margin:0;padding:0;background:#F4F2EC;font-family:-apple-system,Helvetica Neue,Arial,sans-serif;color:#0A1628;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F2EC;padding:32px 16px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FAFAF7;">

  <tr><td style="padding:28px 40px 20px;border-bottom:1px solid #E5E0D5;">
    <p style="margin:0;font-family:Georgia,serif;font-size:20px;letter-spacing:-0.01em;color:#0A1628;">
      GEODATA<span style="color:#C9A961;">.</span>
    </p>
  </td></tr>

  <tr><td style="padding:36px 40px 32px;">

    <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:26px;line-height:1.2;letter-spacing:-0.02em;color:#0A1628;">
      ${firstName ? `Welcome, ${firstName}.` : "Welcome."}
    </p>

    <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#1F2D3D;">
      You're now subscribed to updates from Geodata World Services. We build residential and commercial developments in Abuja and across Nigeria — and we try to be thoughtful about the emails we send.
    </p>

    <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#1F2D3D;">
      Based on your preferences, you'll hear from us about: <strong>${cats.map((c) => CATEGORY_META[c].label).join(", ")}</strong>.
    </p>

    <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#1F2D3D;">
      That means construction photos from our active sites, articles on real estate and building well in Nigeria, news when new properties become available, and the occasional announcement when we hit a milestone worth sharing. We don't send newsletters for the sake of it — you'll only hear from us when there's something worth saying.
    </p>

    <p style="margin:0 0 32px;font-size:15px;line-height:1.75;color:#1F2D3D;">
      If you'd like to know more about what we're currently building — Southern Bridge City, a 321-unit residential development in Idu, Abuja — the site is a good place to start.
    </p>

    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr><td style="background:#0F2547;">
        <a href="${siteUrl}" style="display:inline-block;padding:14px 28px;font-size:12px;text-transform:uppercase;letter-spacing:0.15em;color:#FAFAF7;text-decoration:none;font-family:-apple-system,Helvetica Neue,Arial,sans-serif;">
          Explore Southern Bridge City →
        </a>
      </td></tr>
    </table>

    <p style="margin:0;font-size:13px;line-height:1.7;color:#94A0B0;">
      Questions? Reply to this email or reach us at <a href="tel:${COMPANY.phone.replace(/\s/g,"")}" style="color:#94A0B0;">${COMPANY.phone}</a>. We read every message.
    </p>

  </td></tr>

  <tr><td style="padding:20px 40px 24px;border-top:1px solid #E5E0D5;background:#F0EDE7;">
    <p style="margin:0;font-size:12px;line-height:1.7;color:#94A0B0;">
      ${COMPANY.name} &middot; ${COMPANY.address.full}<br>
      You're receiving this because you subscribed at ${siteUrl.replace(/^https?:\/\//,"")}. &nbsp;
      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#94A0B0;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

      const text = [
        firstName ? `Welcome, ${firstName}.` : "Welcome.",
        "",
        `You're now subscribed to updates from Geodata World Services.`,
        "",
        `You'll hear from us about: ${cats.map((c) => CATEGORY_META[c].label).join(", ")}.`,
        "",
        `That means construction photos from our active sites, articles on real estate and building in Nigeria, news when new properties become available, and occasional announcements. We only send emails when there's something worth saying.`,
        "",
        `To explore what we're currently building — Southern Bridge City, a 321-unit residential development in Idu, Abuja — visit: ${siteUrl}`,
        "",
        `Questions? Reply to this email or call us on ${COMPANY.phone}.`,
        "",
        "---",
        `${COMPANY.name}`,
        `${COMPANY.address.full}`,
        `Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`,
      ].join("\n");

      // Fire-and-forget — don't fail the subscription if the welcome email fails
      await resend.emails.send({
        from:    `Geodata <${fromEmail}>`,
        to:      cleanEmail,
        subject: firstName ? `Welcome, ${firstName} — you're subscribed` : "Welcome — you're subscribed to Geodata",
        html,
        text,
        headers: {
          "List-Unsubscribe": `<mailto:${fromEmail}?subject=Unsubscribe>, <${siteUrl}/unsubscribe>`,
        },
      }).catch((err) => console.error("Welcome email failed:", err));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
