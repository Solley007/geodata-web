import { NextRequest, NextResponse } from "next/server";
import { broadcast } from "@/lib/resend-audience";
import { COMPANY } from "@/lib/site-content";
import { getPostBySlug } from "@/lib/blog";

function auth(req: NextRequest) {
  return req.headers.get("x-admin-password") === (process.env.ADMIN_PASSWORD ?? "");
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { slug } = body;
    if (!slug) return NextResponse.json({ error: "Slug is required" }, { status: 400 });

    // Auto-pull post details from the markdown file, no need for the admin to
    // re-enter title/excerpt/cover image. Form overrides still accepted.
    const post = await getPostBySlug(slug);
    if (!post) return NextResponse.json({ error: `Post '${slug}' not found in content/blog/` }, { status: 404 });

    const title       = body.title       ?? post.title;
    const excerpt     = body.excerpt     ?? post.excerpt;
    const coverImage  = body.coverImage  ?? post.coverImage;
    const category    = post.category;
    const author      = post.author;

    const baseUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng";
    const postUrl  = `${baseUrl}/blog/${slug}`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:Helvetica,Arial,sans-serif;color:#0a1628;line-height:1.6;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:24px 12px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;border-collapse:collapse;">

  <!-- ── Brand header with full logo (navy) ─────────────────────── -->
  <tr><td style="padding:22px 30px;background:#0f2547;text-align:center;">
    <img src="${baseUrl}/geodata-full-logo-white.png" alt="Geodata World Services Limited" width="200" style="display:block;width:200px;max-width:200px;height:auto;border:0;outline:none;margin:0 auto;" />
  </td></tr>

  ${coverImage ? `<!-- ── Cover image (full bleed) ────────────────────────────── -->
  <tr><td style="padding:0;line-height:0;">
    <a href="${postUrl}" style="display:block;text-decoration:none;line-height:0;">
      <img src="${coverImage}" alt="${title}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;" />
    </a>
  </td></tr>` : ""}

  <!-- ── Eyebrow + title ──────────────────────────────────────── -->
  <tr><td style="padding:36px 40px 16px;">
    <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#d44455;font-weight:600;">${category ?? "From the blog"}${author ? ` &middot; ${author}` : ""}</p>
    <h1 style="margin:18px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:600;color:#0a1628;line-height:1.15;letter-spacing:-0.018em;">${title}</h1>
  </td></tr>

  ${excerpt ? `<!-- ── Excerpt ──────────────────────────────────────────── -->
  <tr><td style="padding:0 40px 24px;">
    <p style="margin:0;font-size:16px;line-height:1.7;color:#1f2d3d;">${excerpt}</p>
  </td></tr>` : ""}

  <!-- ── CTA ──────────────────────────────────────────────────── -->
  <tr><td style="padding:8px 40px 40px;">
    <table cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:#0f2547;">
        <a href="${postUrl}" style="display:inline-block;padding:16px 32px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#fafaf7;text-decoration:none;">
          Read the full post &rarr;
        </a>
      </td></tr>
    </table>
  </td></tr>

  <!-- ── Divider ──────────────────────────────────────────────── -->
  <tr><td style="padding:0 40px;">
    <div style="height:1px;background:#e5e0d5;line-height:0;font-size:0;">&nbsp;</div>
  </td></tr>

  <!-- ── About / context ──────────────────────────────────────── -->
  <tr><td style="padding:28px 40px 36px;">
    <p style="margin:0 0 10px;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#5c6b7e;">About Geodata</p>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#5c6b7e;">
      Geodata World Services develops real estate across Nigeria &mdash; from MREIF-eligible homes at Southern Bridge City and Estate, to commercial estates and federal road projects. Our blog covers the projects, the policy, and the markets we work in.
    </p>
    <p style="margin:16px 0 0;font-size:13px;">
      <a href="${baseUrl}/properties" style="color:#0a1628;text-decoration:none;border-bottom:1px solid #0a1628;padding-bottom:1px;">Browse residences</a>
      &nbsp;&middot;&nbsp;
      <a href="${baseUrl}/mortgage" style="color:#0a1628;text-decoration:none;border-bottom:1px solid #0a1628;padding-bottom:1px;">MREIF mortgage</a>
      &nbsp;&middot;&nbsp;
      <a href="${baseUrl}/blog" style="color:#0a1628;text-decoration:none;border-bottom:1px solid #0a1628;padding-bottom:1px;">More from the blog</a>
    </p>
  </td></tr>

  <!-- ── Compact navy footer ──────────────────────────────────── -->
  <tr><td style="padding:28px 40px;background:#0f2547;color:#fafaf7;">
    <img src="${baseUrl}/geodata-full-logo-white.png" alt="Geodata World Services Limited" width="160" style="display:block;width:160px;max-width:160px;height:auto;border:0;outline:none;margin:0 0 14px;" />
    <p style="margin:0;font-size:12px;color:#bfd4f2;line-height:1.6;">
      ${COMPANY.address.full}<br/>
      <a href="mailto:hello@geodata.com.ng" style="color:#bfd4f2;text-decoration:none;">hello@geodata.com.ng</a>
      &nbsp;&middot;&nbsp;
      <a href="${baseUrl}" style="color:#bfd4f2;text-decoration:none;">geodata.com.ng</a>
    </p>
    <p style="margin:14px 0 0;font-size:11px;color:#94a0b0;">
      You're receiving this because you subscribed to the Geodata blog. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#bfd4f2;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

    const result = await broadcast("blog", {
      subject:  `New post: ${title}`,
      html,
      fromName: "Geodata World Services",
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ success: true, broadcastId: result.broadcastId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed" }, { status: 500 });
  }
}
