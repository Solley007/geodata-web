import { AuthConfig } from "convex/server";

// No sign-in provider yet. Hercules OIDC was removed when moving to our own
// Convex project; the replacement provider (Convex Auth or Clerk) goes here.
export default {
  providers: [],
} satisfies AuthConfig;
