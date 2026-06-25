import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/businesses/[id] — full detail for one business. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      reviews: { orderBy: { time: "desc" } },
      site: true,
    },
  });

  if (!business) {
    return Response.json({ error: "Business not found" }, { status: 404 });
  }
  return Response.json({ business });
}
