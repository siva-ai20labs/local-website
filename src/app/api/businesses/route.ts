import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/businesses?category=&status= — list businesses for the dashboard. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category") ?? undefined;
  const status = sp.get("status") ?? undefined;

  const businesses = await prisma.business.findMany({
    where: {
      category: category || undefined,
      status: status || undefined,
    },
    orderBy: [{ status: "asc" }, { rating: "desc" }],
    include: {
      site: { select: { slug: true, template: true } },
      _count: { select: { reviews: true } },
    },
  });

  return Response.json({ businesses });
}
