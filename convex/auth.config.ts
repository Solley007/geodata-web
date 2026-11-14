import { AuthConfig } from "convex/server";

// Convex Auth (see auth.ts). CONVEX_SITE_URL is set automatically by Convex.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
