import { NextRequest, NextResponse } from "next/server";
import { readUpdates, writeUpdates, deleteImageFile } from "@/lib/fs-admin";

function validateAuth(req: NextRequest): boolean {
  const auth     = req.headers.get("x-admin-password") ?? "";
  const expected = process.env.ADMIN_PASSWORD ?? "";
  return expected.length > 0 && auth === expected;
}

export async function GET(req: NextRequest) {
  if (!validateAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(readUpdates());
}

export async function DELETE(req: NextRequest) {
  if (!validateAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id }  = await req.json();
    const updates = readUpdates();
    const target  = updates.find((u) => u.id === id);
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

    deleteImageFile(target.imageUrl);
    writeUpdates(updates.filter((u) => u.id !== id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
