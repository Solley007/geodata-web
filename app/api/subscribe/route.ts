import { NextRequest, NextResponse } from "next/server";
import { subscribe, type SubscriptionCategory } from "@/lib/resend-audience";

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
    return NextResponse.json({ success: true, addedTo: result.addedTo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
