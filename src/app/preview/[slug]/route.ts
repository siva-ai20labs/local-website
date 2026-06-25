import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /preview/[slug] — serve the generated, self-contained HTML site.
 * Returns text/html so it renders as a real page (open directly or in an iframe).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const site = await prisma.generatedSite.findUnique({ where: { slug } });

  if (!site) {
    return new Response("<h1>Preview not found</h1>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(site.html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
