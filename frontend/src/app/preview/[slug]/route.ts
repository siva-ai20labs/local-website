import { backendFetch } from "@/lib/backend";

export const dynamic = "force-dynamic";

/**
 * GET /preview/[slug] — serve the generated self-contained HTML site, proxied
 * from the backend Worker so it renders directly or in the dashboard iframe.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await backendFetch(`/preview/${slug}`);
  return new Response(res.body, {
    status: res.status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
