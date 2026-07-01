import type { IngestRequest, IngestResult, ScraperAdapter } from "@local-website/types";
import { getApifyAdapter } from "./apify";
import { getGooglePlacesAdapter } from "./places";
import { SeedAdapter } from "./seed";
import type { Env } from "./env";

/** Default category set the scheduled cron sweeps. */
export const DEFAULT_CATEGORIES = [
  "coffee shops",
  "bakeries",
  "plumbers",
  "yoga studios",
  "barbershops",
];

/**
 * Choose the adapter (unless forceSeed): Apify is the preferred live source
 * (free tier), then Google Places if configured, else demo seed data.
 */
export function pickAdapter(env: Env, forceSeed = false): ScraperAdapter {
  if (!forceSeed) {
    const apify = getApifyAdapter(env.APIFY_API_TOKEN, env.APIFY_ACTOR_ID);
    if (apify) return apify;
    const google = getGooglePlacesAdapter(env.GOOGLE_PLACES_API_KEY);
    if (google) return google;
  }
  return new SeedAdapter();
}

/** Describes the active source, for logging/observability. */
export function activeSource(env: Env): { live: boolean; label: string } {
  if (env.APIFY_API_TOKEN) return { live: true, label: "Apify · Google Maps" };
  if (env.GOOGLE_PLACES_API_KEY) return { live: true, label: "Google Places" };
  return { live: false, label: "Demo seed data" };
}

export interface ScrapeOptions {
  category: string;
  location: string;
  limit?: number;
  forceSeed?: boolean;
}

/**
 * Run one scrape and hand the results to the backend for enrichment + storage.
 * The scraper never touches the database directly — the backend owns D1.
 */
export async function runAndIngest(env: Env, opts: ScrapeOptions): Promise<IngestResult> {
  const { category, location, limit = 12, forceSeed = false } = opts;
  const adapter = pickAdapter(env, forceSeed);

  const businesses = await adapter.search(category, location, limit);
  const payload: IngestRequest = { category, location, source: adapter.source, businesses };

  // Private service binding — host is arbitrary; only the path is routed.
  const res = await env.BACKEND.fetch("https://backend/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Backend ingest failed ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { ok: boolean; result?: IngestResult; error?: string };
  if (!data.ok || !data.result) {
    throw new Error(data.error ?? "Ingest returned no result");
  }
  return data.result;
}
