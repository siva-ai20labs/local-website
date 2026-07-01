import type { D1Database } from "@cloudflare/workers-types";
import { getPrisma } from "@local-website/db";
import type { IngestRequest } from "@local-website/types";
import { ingest } from "./enrich";
import { generateSite } from "./generator/generate";

export interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
}

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(init?.headers ?? {}) },
  });
}

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/**
 * Backend API Worker. Owns the D1 database, enrichment, and Claude copy
 * generation. Reached only over private Cloudflare service bindings from the
 * frontend (reads/generate) and the scraper (ingest) — never exposed publicly.
 */
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const { pathname, searchParams } = url;
    const segments = pathname.split("/").filter(Boolean); // e.g. ["businesses", "abc"]
    const method = req.method.toUpperCase();
    const prisma = getPrisma(env.DB);

    try {
      // GET /health
      if (method === "GET" && segments[0] === "health") {
        return json({ ok: true });
      }

      // GET /businesses?category=&status=
      if (method === "GET" && segments[0] === "businesses" && segments.length === 1) {
        const category = searchParams.get("category") || undefined;
        const status = searchParams.get("status") || undefined;
        const businesses = await prisma.business.findMany({
          where: { category, status },
          orderBy: [{ status: "asc" }, { rating: "desc" }],
          include: {
            site: { select: { slug: true, template: true } },
            _count: { select: { reviews: true } },
          },
        });
        return json({ businesses });
      }

      // GET /businesses/:id
      if (method === "GET" && segments[0] === "businesses" && segments.length === 2) {
        const business = await prisma.business.findUnique({
          where: { id: segments[1] },
          include: { reviews: { orderBy: { time: "desc" } }, site: true },
        });
        if (!business) return json({ error: "Business not found" }, { status: 404 });
        return json({ business });
      }

      // GET /runs
      if (method === "GET" && segments[0] === "runs") {
        const runs = await prisma.scrapeRun.findMany({ orderBy: { startedAt: "desc" }, take: 15 });
        return json({ runs });
      }

      // POST /generate/:id
      if (method === "POST" && segments[0] === "generate" && segments.length === 2) {
        const result = await generateSite(prisma, segments[1], {
          apiKey: env.ANTHROPIC_API_KEY,
          model: env.ANTHROPIC_MODEL,
        });
        return json({ ok: true, ...result });
      }

      // GET /preview/:slug — serve the generated self-contained HTML
      if (method === "GET" && segments[0] === "preview" && segments.length === 2) {
        const site = await prisma.generatedSite.findUnique({ where: { slug: segments[1] } });
        if (!site) return html("<h1>Preview not found</h1>", 404);
        return html(site.html);
      }

      // POST /ingest — scraper sends normalized businesses for enrichment + upsert
      if (method === "POST" && segments[0] === "ingest") {
        const payload = (await req.json()) as IngestRequest;
        if (!payload?.businesses || !Array.isArray(payload.businesses)) {
          return json({ ok: false, error: "Invalid ingest payload" }, { status: 400 });
        }
        const result = await ingest(prisma, payload);
        return json({ ok: true, result });
      }

      return json({ error: "Not found" }, { status: 404 });
    } catch (err) {
      return json(
        { ok: false, error: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }
  },
};
