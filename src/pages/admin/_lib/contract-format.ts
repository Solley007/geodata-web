import { ConvexError } from "convex/values";
import { format } from "date-fns";

export function errorMessage(err: unknown, fallback: string) {
  return err instanceof ConvexError ? (err.data as { message: string }).message : fallback;
}

/** Format a YYYY-MM-DD calendar day without shifting it across time zones. */
export function formatDay(d: string) {
  return format(new Date(`${d}T00:00:00`), "d MMM yyyy");
}
