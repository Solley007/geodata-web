import { NextRequest, NextResponse } from "next/server";
import { readSiteUpdates, writeSiteUpdates } from "@/lib/site-updates";
import { generateSlug } from "@/lib/site-updates-types";
import type { SiteUpdate } from "@/lib/site-updates-types";

function auth(req: NextRequest): boolean {
  const got = req.headers.get("x-admin-password") ?? "";
  const want = process.env.ADMIN_PASSWORD ?? "";
  return want.length > 0 && got === want;
}

// GET — public read of all updates (no auth — same as the static JSON)
export async function GET() {
  return NextResponse.json(readSiteUpdates());
}

// POST — create a new update
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const updates = readSiteUpdates();

    // Auto-generate slug, ensure uniqueness
    let slug = generateSlug(body.title, body.date);
    let suffix = 2;
    while (updates.some((u) => u.slug === slug)) {
      slug = `${generateSlug(body.title, body.date)}-${suffix++}`;
    }

    const newUpdate: SiteUpdate = {
      id:          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      slug,
      date:        body.date,
      title:       body.title.trim(),
      body:        (body.body ?? "").trim(),
      projectSlug: body.projectSlug,
      mediaType:   body.mediaType,
      coverImage:  body.coverImage,
      videoUrl:    body.videoUrl,
      gallery:     body.gallery,
    };

    updates.unshift(newUpdate);
    writeSiteUpdates(updates);
    return NextResponse.json({ success: true, update: newUpdate });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — edit an existing update by id
export async function PUT(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const updates = readSiteUpdates();
    const idx = updates.findIndex((u) => u.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Update not found" }, { status: 404 });

    const existing = updates[idx];
    const updated: SiteUpdate = {
      ...existing,
      date:        body.date        ?? existing.date,
      title:       (body.title ?? existing.title).trim(),
      body:        (body.body ?? existing.body ?? "").trim(),
      projectSlug: body.projectSlug ?? existing.projectSlug,
      mediaType:   body.mediaType   ?? existing.mediaType,
      // Media fields: only overwrite if a new value was provided
      coverImage:  body.coverImage  ?? existing.coverImage,
      videoUrl:    body.videoUrl    !== undefined ? body.videoUrl : existing.videoUrl,
      gallery:     body.gallery     !== undefined ? body.gallery  : existing.gallery,
    };

    // If title or date changed, regenerate slug
    if (body.title !== existing.title || body.date !== existing.date) {
      let newSlug = generateSlug(updated.title, updated.date);
      let suffix = 2;
      while (updates.some((u, i) => i !== idx && u.slug === newSlug)) {
        newSlug = `${generateSlug(updated.title, updated.date)}-${suffix++}`;
      }
      updated.slug = newSlug;
    }

    updates[idx] = updated;
    writeSiteUpdates(updates);
    return NextResponse.json({ success: true, update: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — by id
export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await req.json();
    const updates = readSiteUpdates();
    writeSiteUpdates(updates.filter((u) => u.id !== id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
