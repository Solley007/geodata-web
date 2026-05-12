import { NextRequest, NextResponse } from "next/server";
import { readUpdates, writeUpdates, saveImage } from "@/lib/fs-admin";
import type { PropertyPhase } from "@/lib/property-data";

function validateAuth(req: NextRequest): boolean {
  const auth     = req.headers.get("x-admin-password") ?? "";
  const expected = process.env.ADMIN_PASSWORD ?? "";
  return expected.length > 0 && auth === expected;
}

export async function POST(req: NextRequest) {
  if (!validateAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData    = await req.formData();
    const file        = formData.get("file") as File | null;
    const phase       = formData.get("phase") as PropertyPhase;
    const date        = formData.get("date") as string;
    const caption     = formData.get("caption") as string;
    const propertySlug = formData.get("propertySlug") as string;

    if (!file || !phase || !date || !propertySlug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const buffer   = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/jpeg";

    // Save image to /public/construction/
    const imageUrl = saveImage(buffer, mimeType, propertySlug, phase);

    // Add to metadata JSON
    const updates  = readUpdates();
    const newEntry = {
      id:           `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      phase,
      date,
      caption:      caption.trim(),
      imageUrl,
      propertySlug,
    };
    updates.unshift(newEntry);
    writeUpdates(updates);

    return NextResponse.json({ success: true, update: newEntry });
  } catch (err: any) {
    console.error("[Admin Upload]", err);
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 });
  }
}
