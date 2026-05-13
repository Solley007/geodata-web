import { NextRequest, NextResponse } from "next/server";
import { broadcast } from "@/lib/resend-audience";
import { COMPANY } from "@/lib/site-content";

function auth(req: NextRequest) {
  return req.headers.get("x-admin-password") === (process.env.ADMIN_PASSWORD ?? "");
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, slug, excerpt } = await req.json();
    if (!title || !slug) return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });

    const baseUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng";
    const postUrl  = `${baseUrl}/blog/${slug}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F2EC;font-family:Georgia,serif;color:#0A1628;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F2EC;padding:40px 20px;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FAFAF7;">

        <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #E5E0D5;">
          <p style="margin:0;font-family:Georgia,serif;font-size:22px;letter-spacing:-0.01em;color:#0A1628;">
            GEODATA<span style="color:#C9A961;">.</span>
          </p>
          <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#94A0B0;">New blog post</p>
        </td></tr>

        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#94A0B0;">From the Blog</p>
          <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:30px;line-height:1.15;color:#0A1628;letter-spacing:-0.02em;">${title}</h1>
          ${excerpt ? `<p style="margin:0 0 32px;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1F2D3D;">${excerpt}</p>` : ""}
          <table cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:#0F2547;">
              <a href="${postUrl}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:0.15em;color:#FAFAF7;text-decoration:none;">
                Read the post →
              </a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 40px 32px;border-top:1px solid #E5E0D5;background:#F4F2EC;">
          <p style="margin:0;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#94A0B0;">
            ${COMPANY.name} · ${COMPANY.address.full}
            <br>
            <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#94A0B0;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

    const result = await broadcast("blog", {
      subject:  `New post: ${title}`,
      html,
      fromName: "Geodata Blog",
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ success: true, broadcastId: result.broadcastId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed" }, { status: 500 });
  }
}
