import { generateSite } from "@/lib/generator";

export const dynamic = "force-dynamic";

/**
 * POST /api/generate/[id] — generate (or regenerate) a website for a business.
 * Fires the template + AI-copy pipeline and returns a preview URL.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await generateSite(id);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
