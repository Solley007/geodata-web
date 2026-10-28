import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Checks the x-admin-password header against ADMIN_PASSWORD.
 * Always fails when ADMIN_PASSWORD is unset, so a missing env var
 * can never leave the admin routes open.
 */
export function isAdmin(req: NextRequest): boolean {
  const want = process.env.ADMIN_PASSWORD ?? "";
  if (!want) return false;
  const got = Buffer.from(req.headers.get("x-admin-password") ?? "");
  const expected = Buffer.from(want);
  return got.length === expected.length && timingSafeEqual(got, expected);
}
