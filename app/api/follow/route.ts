import { NextResponse } from "next/server";
import { Resend } from "resend";
import { followTopicId, upsertContact } from "@/lib/resend-audience";
import { getPropertyBySlug } from "@/lib/property-data";

// ---------------------------------------------------------------------------
// "Follow this residence", from <FollowUnit /> on property pages.
// 1. Opts the visitor in to that typology's Resend topic, so the admin can
//    email them when a new construction update goes up (see /api/admin/notify).
// 2. Emails the sales inbox, a follower has named the exact unit they want.
// ---------------------------------------------------------------------------

const resend = new Resend(process.env.RESEND_API_KEY);

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(req: Request) {
  try {
    const { email, slug } = await req.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const property = typeof slug === "string" ? getPropertyBySlug(slug) : undefined;
    if (!property) return NextResponse.json({ error: "Unknown property" }, { status: 400 });

    // 1. Topic subscription, only when the topic has been set up in Resend
    const topicId = followTopicId(property.slug);
    let subscribed = false;
    if (topicId) {
      const result = await upsertContact(email, [topicId]);
      subscribed = result.ok;
      if (!result.ok) console.error("[follow] Resend contact failed:", result.error);
    } else {
      console.warn(`[follow] No Resend topic configured for ${property.slug}`);
    }

    // 2. Lead notification to sales
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng";
    const safeEmail = escapeHtml(email);
    const lead = await resend.emails.send({
      from:    process.env.CONTACT_FROM ?? "hello@geodata.com.ng",
      to:      process.env.CONTACT_TO ?? "hello@geodata.com.ng",
      subject: `New follower: ${property.title} — ${email}`,
      html: `
<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;background:#F4F2EC;padding:40px 20px;color:#0A1628;">
  <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;margin:0 auto;background:#FAFAF7;">
    <tr><td style="padding:22px 30px;background:#0f2547;text-align:center;">
      <img src="${site}/geodata-full-logo-white.png" alt="Geodata World Services Limited" width="200" style="display:block;width:200px;max-width:200px;height:auto;border:0;outline:none;margin:0 auto;" />
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;font-weight:400;">New residence follower</h1>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Email:</strong> ${safeEmail}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Residence:</strong> ${escapeHtml(property.title)} (${escapeHtml(property.locationContext.address)})</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Added to update emails:</strong> ${subscribed ? "Yes" : "No, Resend topic not configured"}</p>
      <p style="margin:24px 0 0;font-size:13px;color:#5c6b7e;">
        This person asked to follow construction on this exact typology. Treat as a warm lead.
      </p>
    </td></tr>
  </table>
</body></html>`,
    });

    if (!subscribed && lead.error) {
      console.error("[follow] Lead email failed:", lead.error);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[follow]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
