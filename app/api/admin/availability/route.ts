import { NextRequest, NextResponse } from "next/server";
import { readAvailability, writeAvailability } from "@/lib/availability";
import { UNIT_STATUSES, type AvailabilityData } from "@/lib/availability-types";
import { getAllPropertySlugs } from "@/lib/property-data";

function auth(req: NextRequest): boolean {
  const got  = req.headers.get("x-admin-password") ?? "";
  const want = process.env.ADMIN_PASSWORD ?? "";
  return want.length > 0 && got === want;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(readAvailability());
}

// PUT, replace the full availability document
export async function PUT(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const slugs = new Set(getAllPropertySlugs());

    if (!Array.isArray(body?.plots)) {
      return NextResponse.json({ error: "Missing plots" }, { status: 400 });
    }
    for (const plot of body.plots) {
      if (!slugs.has(plot?.slug)) {
        return NextResponse.json({ error: `Unknown property: ${plot?.slug}` }, { status: 400 });
      }
      if (!Array.isArray(plot.units) || plot.units.some(
        (u: any) => typeof u?.id !== "string" || !UNIT_STATUSES.includes(u?.status)
      )) {
        return NextResponse.json({ error: `Invalid units for ${plot.slug}` }, { status: 400 });
      }
    }

    const data: AvailabilityData = {
      updatedAt: new Date().toISOString().slice(0, 10),
      plots: body.plots.map((p: any) => ({
        slug:  p.slug,
        units: p.units.map((u: any) => ({ id: u.id, status: u.status })),
      })),
    };
    writeAvailability(data);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
