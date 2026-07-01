import type { Fetcher } from "@cloudflare/workers-types";

export interface Env {
  /** Service binding to the backend Worker (private). */
  BACKEND: Fetcher;
  /** Apify token — preferred live source (free tier). */
  APIFY_API_TOKEN?: string;
  APIFY_ACTOR_ID?: string;
  /** Google Places key — fallback live source. */
  GOOGLE_PLACES_API_KEY?: string;
  /** Default location the cron sweep searches. */
  DEFAULT_LOCATION?: string;
  /** Optional shared secret protecting the manual fetch trigger. */
  CRON_SECRET?: string;
}
