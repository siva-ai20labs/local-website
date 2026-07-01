import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Service-binding clients for the private backend and scraper Workers.
 *
 * The frontend never touches D1 directly — it calls the backend Worker (reads,
 * generate) and the scraper Worker (manual scrape trigger) over Cloudflare
 * service bindings. The host in the URL is arbitrary; only the path is routed.
 */

type Binding = { fetch: (input: string, init?: RequestInit) => Promise<Response> };

async function binding(name: "BACKEND" | "SCRAPER"): Promise<Binding> {
  const { env } = await getCloudflareContext({ async: true });
  const b = (env as unknown as Record<string, Binding | undefined>)[name];
  if (!b) throw new Error(`Service binding ${name} is not configured`);
  return b;
}

export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  return (await binding("BACKEND")).fetch(`https://backend${path}`, init);
}

export async function scraperFetch(path: string, init?: RequestInit): Promise<Response> {
  return (await binding("SCRAPER")).fetch(`https://scraper${path}`, init);
}

// ---- Shapes the UI consumes (backend serializes Prisma rows to JSON; dates
// arrive as ISO strings). ----

export interface BusinessRow {
  id: string;
  name: string;
  category: string;
  rating: number | null;
  reviewCount: number;
  hasWebsite: boolean;
  status: string;
  scrapedAt: string;
  site: { slug: string; template?: string } | null;
  _count: { reviews: number };
}

export interface RunRow {
  id: string;
  category: string | null;
  source: string;
  status: string;
  found: number;
  created: number;
  error: string | null;
  startedAt: string;
}

export interface ReviewRow {
  id: string;
  author: string | null;
  rating: number | null;
  text: string | null;
}

export interface BusinessDetail {
  id: string;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  hasWebsite: boolean;
  rating: number | null;
  reviewCount: number;
  priceLevel: number | null;
  photoUrl: string | null;
  status: string;
  brandingJson: string | null;
  highlightsJson: string | null;
  reviews: ReviewRow[];
  site: { slug: string; template: string; model: string | null } | null;
}

/** Source indicator for the dashboard (from the scraper's /health). */
export async function fetchActiveSource(): Promise<{ live: boolean; label: string }> {
  try {
    const res = await scraperFetch("/health");
    const data = (await res.json()) as { source?: { live: boolean; label: string } };
    return data.source ?? { live: false, label: "Demo seed data" };
  } catch {
    return { live: false, label: "Demo seed data" };
  }
}
