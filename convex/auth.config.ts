import { AuthConfig } from "convex/server";

// Hercules sign-in is only registered when its env vars are set, so the
// backend can deploy to a new Convex project before auth is replaced.
const authority = process.env.HERCULES_OIDC_AUTHORITY;
const clientId = process.env.HERCULES_OIDC_CLIENT_ID;

export default {
  providers:
    authority && clientId
      ? [{ domain: authority, applicationID: clientId }]
      : [],
} satisfies AuthConfig;
