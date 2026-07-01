/// <reference types="@cloudflare/workers-types" />

// Types for the Cloudflare bindings + vars available via getCloudflareContext().
// Regenerate the binding portion with `npm run cf-typegen` once deployed.

interface CloudflareEnv {
  ASSETS: Fetcher;
  /** Private service binding to the backend Worker (reads + generate). */
  BACKEND: Fetcher;
  /** Private service binding to the scraper Worker (manual trigger). */
  SCRAPER: Fetcher;

  /** Only emails ending in this domain may sign in. */
  ALLOWED_EMAIL_DOMAIN: string;

  // Auth.js secrets (set via `wrangler secret put`).
  AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}
