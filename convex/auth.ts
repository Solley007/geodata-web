import { convexAuth } from "@convex-dev/auth/server";
import { Email } from "@convex-dev/auth/providers/Email";
import { ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { onNewSelfSignup } from "./users";

// Sign-in by 6-digit email code, sent through Resend.
// Needs AUTH_RESEND_KEY and AUTH_EMAIL_FROM set on the Convex deployment.
const EmailCode = Email({
  id: "email-code",
  maxAge: 15 * 60,
  async generateVerificationToken() {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    return n.toString().padStart(6, "0");
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) throw new Error("AUTH_RESEND_KEY is not set");
    const from = process.env.AUTH_EMAIL_FROM ?? "Geodata World Services <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Your Geodata sign-in code: ${token}`,
        text: `Your sign-in code is ${token}\n\nIt expires in 15 minutes. If you did not ask for this, you can ignore this email.\n\nGeodata World Services`,
        html: `<div style="font-family:Arial,sans-serif;color:#0a1628;max-width:420px">
  <p>Your sign-in code is</p>
  <p style="font-size:30px;font-weight:bold;letter-spacing:6px;margin:8px 0 16px">${token}</p>
  <p style="color:#555">It expires in 15 minutes. If you did not ask for this, you can ignore this email.</p>
  <p style="color:#555">Geodata World Services</p>
</div>`,
      }),
    });
    if (!res.ok) throw new Error(`Could not send sign-in email: ${await res.text()}`);
  },
});

async function findUserByEmail(ctx: MutationCtx, email: string) {
  const lower = email.trim().toLowerCase();
  const exact = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", lower))
    .first();
  if (exact) return exact;
  // Older records may have mixed-case emails.
  for await (const u of ctx.db.query("users")) {
    if (u.email?.trim().toLowerCase() === lower) return u;
  }
  return null;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [EmailCode],
  jwt: {
    // Existing code identifies users by users.tokenIdentifier (see tokenOf in
    // authIdentity.ts), so carry it in the token along with email and name.
    customClaims: async (ctx, { userId }) => {
      const user = await ctx.db.get(userId);
      return { tid: user?.tokenIdentifier, email: user?.email, name: user?.name };
    },
  },
  callbacks: {
    // Link sign-ins to existing users (including Hercules-era accounts and
    // admin pre-registrations) by verified email, so roles carry over.
    async createOrUpdateUser(ctx, { existingUserId, profile }): Promise<Id<"users">> {
      if (existingUserId) return existingUserId as Id<"users">;
      const email = profile.email?.trim().toLowerCase();
      if (!email) throw new ConvexError("An email address is needed to sign in");

      const match = await findUserByEmail(ctx, email);
      if (match) {
        if (match.isActive === false) throw new ConvexError("This account has been deactivated");
        if (match.tokenIdentifier.startsWith("pre:")) {
          await ctx.db.patch(match._id, { tokenIdentifier: `convex|${match._id}` });
        }
        await ctx.db.patch(match._id, { emailVerificationTime: Date.now() });
        return match._id;
      }

      const userId = await ctx.db.insert("users", {
        tokenIdentifier: "",
        email,
        emailVerificationTime: Date.now(),
        role: "client",
        isActive: true,
        preRegistered: false,
      });
      await ctx.db.patch(userId, { tokenIdentifier: `convex|${userId}` });
      await onNewSelfSignup(ctx, userId, email, undefined);
      return userId;
    },
    async beforeSessionCreation(ctx, { userId }) {
      const user = await ctx.db.get(userId as Id<"users">);
      if (user?.isActive === false) throw new ConvexError("This account has been deactivated");
    },
  },
});
