import { backendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

/**
 * POST /api/generate/[id] — proxied to the backend Worker, which runs the
 * template + AI-copy pipeline and returns a preview slug.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await backendFetch(`/generate/${id}`, { method: "POST" });
  return new Response(res.body, { status: res.status, headers: res.headers });
}
