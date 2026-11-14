import type { UserIdentity } from "convex/server";

// The value stored in users.tokenIdentifier for the signed-in user.
// Convex Auth's own tokenIdentifier changes with every session, so auth.ts
// puts the stable value in a `tid` claim. Falls back to tokenIdentifier for
// tests that use withIdentity().
export function tokenOf(identity: UserIdentity): string {
  return typeof identity.tid === "string" ? identity.tid : identity.tokenIdentifier;
}
