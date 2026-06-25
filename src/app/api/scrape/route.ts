import { type NextRequest } from "next/server";
import { runScrape, DEFAULT_CATEGORIES } from "@/lib/scraper";

// This route hits external APIs and writes the DB — never cache it.
export const dynamic = "force-dynamic";

const DEFAULT_LOCATION = process.env.DEFAULT_LOCATION ?? "Austin, TX";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // open in local dev when no secret is configured
  const header = req.headers.get("authorization") ?? req.headers.get("x-cron-secret") ?? "";
  return header === secret || header === `Bearer ${secret}`;
}

/**
 * Trigger a scrape.
 *
 * - With a JSON body `{ category, location?, limit?, forceSeed? }`: scrapes one
 *   category.
 * - With no body (the daily cron path): sweeps DEFAULT_CATEGORIES.
 *
 * Protect with the CRON_SECRET env var (sent as `Authorization: Bearer <secret>`).
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    category?: string;
    location?: string;
    limit?: number;
    forceSeed?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — treat as a full sweep
  }

  const location = body.location ?? DEFAULT_LOCATION;
  const limit = body.limit ?? 12;
  const forceSeed = Boolean(body.forceSeed);

  try {
    if (body.category) {
      const result = await runScrape({ category: body.category, location, limit, forceSeed });
      return Response.json({ ok: true, runs: [result] });
    }

    // Daily sweep across the default categories.
    const runs = [];
    for (const category of DEFAULT_CATEGORIES) {
      runs.push(await runScrape({ category, location, limit, forceSeed }));
    }
    return Response.json({ ok: true, runs });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
