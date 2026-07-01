import type { ExecutionContext, ScheduledController } from "@cloudflare/workers-types";
import type { IngestResult } from "@local-website/types";
import type { Env } from "./env";
import { DEFAULT_CATEGORIES, activeSource, runAndIngest } from "./scrape";

const DEFAULT_LOCATION = "Austin, TX";

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(init?.headers ?? {}) },
  });
}

function authorized(req: Request, env: Env): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return true; // open when no secret is configured
  const header = req.headers.get("authorization") ?? req.headers.get("x-cron-secret") ?? "";
  return header === secret || header === `Bearer ${secret}`;
}

/** Sweep the default categories and ingest each via the backend. */
async function sweep(env: Env, location: string): Promise<IngestResult[]> {
  const runs: IngestResult[] = [];
  for (const category of DEFAULT_CATEGORIES) {
    try {
      runs.push(await runAndIngest(env, { category, location }));
    } catch (err) {
      console.error(`[scraper] sweep failed for "${category}":`, err);
    }
  }
  return runs;
}

/**
 * Scraper Worker.
 *
 * - `scheduled`: the daily cron sweep across DEFAULT_CATEGORIES.
 * - `fetch`: a manual trigger (called by the frontend over a service binding,
 *   or by curl when a CRON_SECRET is set). Body: { category?, location?, limit?,
 *   forceSeed? }. With a category it scrapes one; without, it sweeps all.
 */
export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const location = env.DEFAULT_LOCATION ?? DEFAULT_LOCATION;
    console.log(`[scraper] cron sweep — source: ${activeSource(env).label}`);
    ctx.waitUntil(sweep(env, location).then((runs) => {
      const total = runs.reduce((n, r) => n + r.found, 0);
      console.log(`[scraper] cron sweep done — ${runs.length} runs, ${total} businesses`);
    }));
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, source: activeSource(env) });
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    if (!authorized(req, env)) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { category?: string; location?: string; limit?: number; forceSeed?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine — treat as a full sweep
    }

    const location = body.location ?? env.DEFAULT_LOCATION ?? DEFAULT_LOCATION;
    const limit = body.limit ?? 12;
    const forceSeed = Boolean(body.forceSeed);

    try {
      if (body.category) {
        const result = await runAndIngest(env, { category: body.category, location, limit, forceSeed });
        return json({ ok: true, runs: [result] });
      }
      const runs = await sweep(env, location);
      return json({ ok: true, runs });
    } catch (err) {
      return json(
        { ok: false, error: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }
  },
};
