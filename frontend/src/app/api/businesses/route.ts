import { type NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** GET /api/businesses?category=&status= — proxied to the backend Worker. */
export async function GET(req: NextRequest) {
  const qs = req.nextUrl.search; // includes leading "?" or ""
  const res = await backendFetch(`/businesses${qs}`);
  return new Response(res.body, { status: res.status, headers: res.headers });
}
