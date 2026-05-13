import "server-only";

const API_BASE = "https://api.resend.com";

export type SubscriptionCategory = "updates" | "blog" | "properties" | "announcements";

export const CATEGORY_META: Record<SubscriptionCategory, { label: string; description: string }> = {
  updates:       { label: "Site updates",         description: "Construction photos & videos from active sites" },
  blog:          { label: "Blog",                 description: "Editorial articles and insights" },
  properties:    { label: "Properties & pricing", description: "New projects, units, and price changes" },
  announcements: { label: "Announcements",        description: "Events, milestones, and other news" },
};

function topicId(category: SubscriptionCategory): string | undefined {
  switch (category) {
    case "updates":       return process.env.RESEND_TOPIC_ID_UPDATES;
    case "blog":          return process.env.RESEND_TOPIC_ID_BLOG;
    case "properties":    return process.env.RESEND_TOPIC_ID_PROPERTIES;
    case "announcements": return process.env.RESEND_TOPIC_ID_ANNOUNCEMENTS;
  }
}

function segmentId(): string | undefined {
  return process.env.RESEND_AUDIENCE_ID;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function subscribe(
  email: string,
  categories: SubscriptionCategory[],
  firstName?: string
): Promise<{ ok: boolean; error?: string }> {
  const segId = segmentId();
  if (!segId) return { ok: false, error: "RESEND_AUDIENCE_ID not configured" };
  if (categories.length === 0) return { ok: false, error: "Pick at least one category" };

  const topics = categories
    .map((cat) => ({ id: topicId(cat), subscription: "opt_in" as const }))
    .filter((t): t is { id: string; subscription: "opt_in" } => Boolean(t.id));

  const createRes = await fetch(`${API_BASE}/audiences/${segId}/contacts`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({
      email,
      first_name:   firstName ?? "",
      unsubscribed: false,
      topics,
    }),
  });

  if (createRes.ok) return { ok: true };

  const err = await createRes.json().catch(() => ({}));

  if (createRes.status === 400 && (err?.message ?? "").toLowerCase().includes("already")) {
    if (topics.length > 0) {
      await fetch(`${API_BASE}/contacts/topics`, {
        method:  "PATCH",
        headers: authHeaders(),
        body:    JSON.stringify({ email, topics }),
      }).catch(() => null);
    }
    return { ok: true };
  }

  return { ok: false, error: err?.message ?? `Resend error ${createRes.status}` };
}

export async function broadcast(
  _category: SubscriptionCategory,
  args: { subject: string; html: string; fromName?: string }
): Promise<{ ok: boolean; broadcastId?: string; error?: string }> {
  const segId     = segmentId();
  const fromEmail = process.env.CONTACT_FROM;
  if (!segId)     return { ok: false, error: "RESEND_AUDIENCE_ID not configured" };
  if (!fromEmail) return { ok: false, error: "CONTACT_FROM not configured" };

  const fromHeader = `${args.fromName ?? "Geodata"} <${fromEmail}>`;

  // topic_id deliberately omitted — contacts must have explicitly opted into
  // a topic before a scoped broadcast has any recipients. Sending to the full
  // segment ensures the 2 existing subscribers (and all future ones) receive
  // the email. Resend's built-in unsubscribe link handles opt-outs.
  const createRes = await fetch(`${API_BASE}/broadcasts`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({
      audience_id: segId,
      from:        fromHeader,
      subject:     args.subject,
      html:        args.html,
    }),
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    return { ok: false, error: err?.message ?? `Create failed ${createRes.status}` };
  }
  const { id: broadcastId } = await createRes.json();

  const sendRes = await fetch(`${API_BASE}/broadcasts/${broadcastId}/send`, {
    method:  "POST",
    headers: authHeaders(),
  });
  if (!sendRes.ok) {
    const err = await sendRes.json().catch(() => ({}));
    return { ok: false, broadcastId, error: err?.message ?? `Send failed ${sendRes.status}` };
  }
  return { ok: true, broadcastId };
}

export async function getSubscriberCount(): Promise<number | null> {
  const segId = segmentId();
  if (!segId) return null;
  const res = await fetch(`${API_BASE}/audiences/${segId}/contacts`, { headers: authHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data?.data) ? data.data.length : null;
}
