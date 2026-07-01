import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth.js (NextAuth v5) — Google OAuth restricted to the company domain.
 *
 * - JWT sessions (no database adapter needed).
 * - `trustHost: true` is REQUIRED on Cloudflare Workers: Auth.js only
 *   auto-trusts Vercel/CF Pages hosts, not Workers, so without this you get
 *   `UntrustedHost` errors.
 * - The `signIn` callback is the hard gate: only verified emails ending in
 *   ALLOWED_EMAIL_DOMAIN may sign in. The Google `hd` param is a UX hint only,
 *   not a security boundary, so we enforce server-side here too.
 */

const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN ?? "ai20labs.com").toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: { hd: allowedDomain, prompt: "select_account" },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase() ?? "";
      const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      return Boolean(verified) && email.endsWith(`@${allowedDomain}`);
    },
  },
});
