import { backendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** GET /api/runs — proxied to the backend Worker. */
export async function GET() {
  const res = await backendFetch("/runs");
  return new Response(res.body, { status: res.status, headers: res.headers });
}
