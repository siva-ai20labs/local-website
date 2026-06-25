import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/runs — recent scrape runs for the activity feed. */
export async function GET() {
  const runs = await prisma.scrapeRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 15,
  });
  return Response.json({ runs });
}
