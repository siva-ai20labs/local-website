import { type NextRequest } from "next/server";
import { scraperFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

/**
 * POST /api/scrape — manual scrape trigger, proxied to the scraper Worker over
 * the service binding. Body: { category?, location?, limit?, forceSeed? }.
 * (Access is gated by the dashboard session; see the auth middleware.)
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await scraperFetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return new Response(res.body, { status: res.status, headers: res.headers });
}
