import { backendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** GET /api/businesses/[id] — proxied to the backend Worker. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await backendFetch(`/businesses/${id}`);
  return new Response(res.body, { status: res.status, headers: res.headers });
}
