import { NextRequest, NextResponse } from "next/server";
import { broadcast, getSubscriberCount } from "@/lib/resend-audience";
import { readSiteUpdates } from "@/lib/site-updates";
import { PROJECTS } from "@/lib/projects-data";
import { formatUpdateDate } from "@/lib/site-updates-types";

function auth(req: NextRequest): boolean {
  const got  = req.headers.get("x-admin-password") ?? "";
  const want = process.env.ADMIN_PASSWORD ?? "";
  return want.length > 0 && got === want;
}

// GET — subscriber count for admin dashboard
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const count = await getSubscriberCount();
  return NextResponse.json({ count });
}

// POST — broadcast a specific update to all subscribers
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { updateId } = await req.json();
    const updates = readSiteUpdates();
    const update  = updates.find((u) => u.id === updateId);
    if (!update) return NextResponse.json({ error: "Update not found" }, { status: 404 });

    const project   = PROJECTS.find((p) => p.slug === update.projectSlug);
    const projectName = project?.title ?? update.projectSlug;
    const baseUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng";
    const updateUrl = `${baseUrl}/updates/${update.slug}`;

    // Excerpt — first 220 chars of body
    const excerpt = (update.body || "").slice(0, 220).trim()
      + ((update.body?.length ?? 0) > 220 ? "…" : "");

    // Build the HTML email — branded, simple, mobile-friendly
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${update.title}</title>
</head>
<body style="margin:0;padding:0;background:#F4F2EC;font-family:Georgia,serif;color:#0A1628;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F2EC;padding:40px 20px;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FAFAF7;">

        <!-- Header -->
        <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #E5E0D5;">
          <p style="margin:0;font-family:Georgia,serif;font-size:22px;letter-spacing:-0.01em;color:#0A1628;">
            GEODATA<span style="color:#C9A961;">.</span>
          </p>
          <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#94A0B0;">
            World Services Limited
          </p>
        </td></tr>

        <!-- Cover image -->
        ${update.coverImage ? `
        <tr><td style="padding:0;">
          <img src="${update.coverImage}" alt="${update.title.replace(/"/g, '&quot;')}"
            style="display:block;width:100%;height:auto;max-height:400px;object-fit:cover;" />
        </td></tr>` : ""}

        <!-- Content -->
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#94A0B0;">
            ${projectName} · ${formatUpdateDate(update.date)}
          </p>
          <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:30px;line-height:1.15;color:#0A1628;letter-spacing:-0.02em;">
            ${update.title}
          </h1>
          <p style="margin:0 0 32px;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1F2D3D;">
            ${excerpt}
          </p>
          <table cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:#0F2547;">
              <a href="${updateUrl}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:0.15em;color:#FAFAF7;text-decoration:none;">
                Read the full update →
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px 32px;border-top:1px solid #E5E0D5;background:#F4F2EC;">
          <p style="margin:0;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#94A0B0;">
            Geodata World Services Limited · Plot 93, Cadastral Zone B10, Dakibiyu, FCT Abuja
            <br>
            You're receiving this because you subscribed to construction updates at
            <a href="${baseUrl}" style="color:#0F2547;text-decoration:none;">geodata.com.ng</a>.
            <br>
            <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#94A0B0;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

    const subject = `${projectName}: ${update.title}`;

    const result = await broadcast("updates", {
      subject,
      html,
      fromName: "Geodata Updates",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, broadcastId: result.broadcastId });
  } catch (err: any) {
    console.error("[Admin Notify]", err);
    return NextResponse.json({ error: err.message ?? "Notify failed" }, { status: 500 });
  }
}
