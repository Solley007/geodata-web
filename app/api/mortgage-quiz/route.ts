import { NextRequest, NextResponse } from "next/server";
import {
  runQuiz, formatNaira, formatNairaFull,
  INCOME_BRACKETS, BEDROOM_OPTIONS, TIMELINE_OPTIONS, APPROVAL_OPTIONS,
  MREIF,
  type QuizAnswers,
} from "@/lib/mortgage-quiz";
import { COMPANY, SOCIAL } from "@/lib/site-content";
import { EMAIL_RE, escapeHtml, getResend } from "@/lib/email-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, income, bedrooms, timeline, approval, depositPct } = body;

    // ── Validation ──────────────────────────────────────────────────
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Please provide your name." }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
    }
    if (!INCOME_BRACKETS.find(b => b.id === income))   return NextResponse.json({ error: "Invalid income." },    { status: 400 });
    if (!BEDROOM_OPTIONS.find(b => b.id === bedrooms)) return NextResponse.json({ error: "Invalid bedrooms." },  { status: 400 });
    if (!TIMELINE_OPTIONS.find(t => t.id === timeline)) return NextResponse.json({ error: "Invalid timeline." }, { status: 400 });
    if (!APPROVAL_OPTIONS.find(a => a.id === approval)) return NextResponse.json({ error: "Invalid approval." }, { status: 400 });
    const cleanDeposit = Math.max(MREIF.minDeposit, Math.min(MREIF.maxDeposit,
      typeof depositPct === "number" ? depositPct : MREIF.defaultDeposit));

    const cleanName  = name.trim().slice(0, 100);
    const cleanEmail = email.trim().toLowerCase();
    const firstName  = cleanName.split(" ")[0];

    // Build the From header reliably:
    //   - if CONTACT_FROM already has "Name <email>" format, use as-is
    //   - otherwise, prepend the brand name
    const rawFrom = process.env.CONTACT_FROM ?? "hello@geodata.com.ng";
    const FROM    = rawFrom.includes("<") ? rawFrom : `Geodata World Services <${rawFrom}>`;

    const answers: QuizAnswers = { income, bedrooms, timeline, approval, depositPct: cleanDeposit };
    const result = runQuiz(answers);
    const { primaryMatch, monthlyPaymentForPrimary, affordabilityRatio } = result;

    // ── Save to Resend audience (fire-and-forget) ───────────────────
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (audienceId) {
      getResend().contacts.create({
        audienceId,
        email: cleanEmail,
        firstName,
        unsubscribed: false,
      }).catch(() => { /* ignore, duplicate emails are fine */ });
    }

    // ── Compose result email ────────────────────────────────────────
    const isCash = approval === "cash";
    const incomeLabel   = INCOME_BRACKETS.find(b => b.id === income)!.label;
    const bedroomsLabel = BEDROOM_OPTIONS.find(b => b.id === bedrooms)!.label;
    const timelineLabel = TIMELINE_OPTIONS.find(t => t.id === timeline)!.label;
    const approvalLabel = APPROVAL_OPTIONS.find(a => a.id === approval)!.label;
    const depositLabel  = `${Math.round(cleanDeposit * 100)}%`;
    const propertyName  = primaryMatch?.title ?? "Southern Bridge City";
    const propertyUrl   = primaryMatch
      ? `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng"}/properties/${primaryMatch.slug}`
      : `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng"}/properties`;

    const subject = primaryMatch
      ? `${firstName}, your match is ${propertyName}`
      : `${firstName}, your Geodata affordability report`;

    // Plain text version (helps spam scores)
    const textBody = `Hi ${firstName},

Thanks for taking the Geodata affordability quiz. Here's your personalised report.

YOUR INPUTS
Monthly income: ${incomeLabel}
Bedrooms: ${bedroomsLabel}
Timeline: ${timelineLabel}
Approval status: ${approvalLabel}
Deposit: ${depositLabel}

${primaryMatch ? `YOUR STRONGEST MATCH
${primaryMatch.title}, ${primaryMatch.priceLabel}
${primaryMatch.location}
${primaryMatch.beds} bed · ${primaryMatch.area} · ${primaryMatch.available} units available

${!isCash ? `MORTGAGE BREAKDOWN (MREIF 9.75% fixed, 20 years)
Property price:      ${primaryMatch.priceLabel}
Deposit (${depositLabel}):${" ".repeat(Math.max(1, 9 - depositLabel.length))}${formatNaira(primaryMatch.price * cleanDeposit)}
Loan amount:         ${formatNaira(primaryMatch.price * (1 - cleanDeposit))}
Monthly payment:     ${formatNaira(monthlyPaymentForPrimary)}
% of your income:    ${Math.round(affordabilityRatio * 100)}%` : `As a cash buyer, total outlay is ${primaryMatch.priceLabel}.`}

See full details: ${propertyUrl}` : `We couldn't find an exact match for your bedroom preference within your budget, but our team can suggest closest alternatives. Reply to this email and we'll help.`}

NEXT STEPS
• Reserve a viewing: WhatsApp +234 704 762 0492
• Browse all residences: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng"}/properties
${approval === "no" ? `• Start your MREIF application: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng"}/mortgage/application` : ""}

This calculation is indicative. Final approval depends on bank assessment by an MREIF Eligible Financial Institution. We're happy to walk you through the process.

Warm regards,
The Geodata team

${COMPANY.name}
${COMPANY.address}
Reply to this email to start a conversation.`;

    // Rich HTML version
    const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:Helvetica,Arial,sans-serif;color:#0a1628;line-height:1.6;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;">

  <!-- ── Brand header ─────────────────────────────────────────── -->
  <tr><td style="padding:22px 30px;background:#0f2547;text-align:center;">
    <img src="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng"}/geodata-full-logo-white.png" alt="Geodata World Services Limited" width="200" style="display:block;width:200px;max-width:200px;height:auto;border:0;outline:none;margin:0 auto;" />
  </td></tr>

  <tr><td style="padding:36px 40px 24px;border-bottom:1px solid #e5e0d5;">
    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#5c6b7e;">Your affordability report</p>
    <h1 style="margin:14px 0 0;font-size:28px;font-weight:600;color:#0a1628;line-height:1.2;">Hi ${escapeHtml(firstName)},</h1>
  </td></tr>

  <tr><td style="padding:32px 40px 8px;">
    <p style="margin:0 0 16px;font-size:15px;color:#0a1628;">
      Thanks for taking the quiz. Based on your inputs and a ${depositLabel} deposit, here's where you sit at Southern Bridge.
    </p>
  </td></tr>

  ${primaryMatch ? `<tr><td style="padding:8px 40px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf7;border-left:3px solid #d44455;">
      <tr><td style="padding:24px;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#5c6b7e;">Your strongest match</p>
        <h2 style="margin:8px 0 4px;font-size:24px;font-weight:600;color:#0a1628;">${primaryMatch.title}</h2>
        <p style="margin:0;font-size:14px;color:#5c6b7e;">${primaryMatch.location} · ${primaryMatch.beds} bed · ${primaryMatch.area}</p>
        <p style="margin:16px 0 0;font-size:20px;font-weight:600;color:#a93340;">${primaryMatch.priceLabel}</p>
      </td></tr>
    </table>
  </td></tr>` : ""}

  ${primaryMatch && !isCash ? `<tr><td style="padding:0 40px 32px;">
    <p style="margin:0 0 14px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#5c6b7e;">Mortgage breakdown, MREIF 9.75% fixed, 20 years</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e0d5;">
      <tr><td style="padding:12px 0;border-bottom:1px solid #e5e0d5;font-size:14px;color:#5c6b7e;">Property price</td><td style="padding:12px 0;border-bottom:1px solid #e5e0d5;font-size:14px;color:#0a1628;text-align:right;font-weight:600;">${primaryMatch.priceLabel}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #e5e0d5;font-size:14px;color:#5c6b7e;">Deposit (${depositLabel})</td><td style="padding:12px 0;border-bottom:1px solid #e5e0d5;font-size:14px;color:#0a1628;text-align:right;font-weight:600;">${formatNaira(primaryMatch.price * cleanDeposit)}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #e5e0d5;font-size:14px;color:#5c6b7e;">Loan amount</td><td style="padding:12px 0;border-bottom:1px solid #e5e0d5;font-size:14px;color:#0a1628;text-align:right;font-weight:600;">${formatNaira(primaryMatch.price * (1 - cleanDeposit))}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #e5e0d5;font-size:14px;color:#5c6b7e;">Monthly payment</td><td style="padding:12px 0;border-bottom:1px solid #e5e0d5;font-size:16px;color:#a93340;text-align:right;font-weight:700;">${formatNaira(monthlyPaymentForPrimary)}</td></tr>
      <tr><td style="padding:12px 0;font-size:14px;color:#5c6b7e;">% of your income</td><td style="padding:12px 0;font-size:14px;color:#0a1628;text-align:right;font-weight:600;">${Math.round(affordabilityRatio * 100)}%</td></tr>
    </table>
  </td></tr>` : ""}

  ${primaryMatch && isCash ? `<tr><td style="padding:0 40px 32px;">
    <p style="margin:0;font-size:15px;color:#0a1628;">As a cash buyer, your total outlay is <strong>${primaryMatch.priceLabel}</strong>. We can fast-track your reservation and walk you through the allocation process.</p>
  </td></tr>` : ""}

  <tr><td style="padding:0 40px 32px;">
    <p style="margin:0 0 18px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#5c6b7e;">Next steps</p>
    ${primaryMatch ? `<a href="${propertyUrl}" style="display:inline-block;background:#0f2547;color:#fafaf7;text-decoration:none;padding:14px 24px;font-size:14px;font-weight:600;margin:0 8px 8px 0;">See full residence</a>` : ""}
    <a href="${SOCIAL.whatsapp}?text=${encodeURIComponent(`Hi, I'm ${cleanName} and I'd like to discuss ${propertyName}.`)}" style="display:inline-block;background:#d44455;color:#ffffff;text-decoration:none;padding:14px 24px;font-size:14px;font-weight:600;margin:0 8px 8px 0;">Reserve a viewing</a>
  </td></tr>

  <tr><td style="padding:28px 40px 32px;background:#0F2547;color:#fafaf7;border-top:1px solid #0a1628;">
    <img src="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng"}/geodata-full-logo-white.png" alt="Geodata World Services Limited" width="180" style="display:block;width:180px;max-width:180px;height:auto;border:0;outline:none;margin:0 0 20px 0;" />
    <p style="margin:0 0 14px;font-size:13px;color:#bfd4f2;line-height:1.6;">
      This calculation is indicative. Final approval depends on bank assessment by an MREIF Eligible Financial Institution. Reply to this email if you'd like us to walk you through the next steps personally.
    </p>
    <p style="margin:0;font-size:12px;color:#94a0b0;line-height:1.5;">
      ${COMPANY.address}<br/>
      <a href="mailto:hello@geodata.com.ng" style="color:#bfd4f2;text-decoration:none;">hello@geodata.com.ng</a> · <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng"}" style="color:#bfd4f2;text-decoration:none;">geodata.com.ng</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

    // Send (fire-and-forget, saving the data matters more than email delivery)
    try {
      await getResend().emails.send({
        from: FROM,
        to: cleanEmail,
        subject,
        text: textBody,
        html: htmlBody,
        headers: {
          "List-Unsubscribe": `<mailto:${process.env.CONTACT_TO ?? "hello@geodata.com.ng"}?subject=unsubscribe>`,
        },
      });
    } catch (err) {
      console.error("[mortgage-quiz] email send failed", err);
    }

    // Also notify the team
    try {
      await getResend().emails.send({
        from: FROM,
        to: process.env.CONTACT_TO ?? "hello@geodata.com.ng",
        replyTo: cleanEmail,
        subject: `New affordability quiz lead, ${cleanName}`,
        text: `${cleanName} (${cleanEmail}) completed the affordability quiz.

Income: ${incomeLabel}
Bedrooms: ${bedroomsLabel}
Timeline: ${timelineLabel}
Approval: ${approvalLabel}
Deposit: ${depositLabel}

Matched: ${primaryMatch ? `${primaryMatch.title} (${primaryMatch.priceLabel})` : "No direct match, closest alternatives shown"}
${primaryMatch && !isCash ? `Monthly payment: ${formatNaira(monthlyPaymentForPrimary)} (${Math.round(affordabilityRatio * 100)}% of income)` : ""}

Reply to this email to reach ${firstName} directly.`,
      });
    } catch (err) {
      console.error("[mortgage-quiz] team notification failed", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mortgage-quiz] error", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
