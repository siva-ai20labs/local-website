import type { PrismaClient } from "@local-website/db";
import type { Branding, IngestRequest, IngestResult, ScrapedBusiness } from "@local-website/types";

/** Brand palettes keyed loosely by category for nicer generated sites. */
const PALETTES: Record<string, string[]> = {
  "coffee shops": ["#3b2417", "#a9744f", "#e8dcc8"],
  bakeries: ["#7a3b2e", "#e0a458", "#f7ecd9"],
  plumbers: ["#0f3a5f", "#2a9d8f", "#eef4f7"],
  "yoga studios": ["#3d405b", "#81b29a", "#f4f1de"],
  barbershops: ["#1f1f1f", "#b08968", "#ece5dd"],
  default: ["#1d3557", "#e63946", "#f1faee"],
};

export function deriveBranding(b: ScrapedBusiness): Branding {
  const key = b.category.toLowerCase();
  const palette = PALETTES[key] ?? PALETTES.default;

  const priceWord =
    b.priceLevel === undefined
      ? ""
      : b.priceLevel <= 1
        ? "affordable"
        : b.priceLevel >= 3
          ? "upscale"
          : "approachable";
  const ratingWord = (b.rating ?? 0) >= 4.5 ? "highly-rated" : "trusted";
  const vibe = [priceWord, ratingWord].filter(Boolean).join(" & ") || "local favorite";

  const summary =
    b.editorialSummary ??
    `${b.name} is a ${vibe} ${b.category.replace(/s$/, "")} known for quality and service.`;

  return {
    palette,
    vibe,
    photos: b.photoUrl ? [b.photoUrl] : [],
    summary,
  };
}

export function deriveHighlights(b: ScrapedBusiness): string[] {
  const highlights: string[] = [];
  if ((b.rating ?? 0) >= 4.5) highlights.push(`${b.rating}★ average rating`);
  if ((b.reviewCount ?? 0) >= 100) highlights.push(`${b.reviewCount}+ customer reviews`);
  if (b.priceLevel !== undefined && b.priceLevel <= 1) highlights.push("Budget-friendly pricing");
  if (b.priceLevel !== undefined && b.priceLevel >= 3) highlights.push("Premium experience");
  if (!b.website) highlights.push("No website yet — prime opportunity");

  // Pull a couple of theme words from review text.
  const text = b.reviews.map((r) => r.text ?? "").join(" ").toLowerCase();
  const themes: [RegExp, string][] = [
    [/friendly|staff|service/, "Friendly, attentive service"],
    [/quality|craft|fresh/, "Quality craftsmanship"],
    [/cozy|atmosphere|vibe/, "Welcoming atmosphere"],
    [/recommend|gem|favorite/, "Loved by locals"],
  ];
  for (const [re, label] of themes) {
    if (re.test(text) && highlights.length < 6) highlights.push(label);
  }
  return highlights.slice(0, 6);
}

/**
 * Ingest a batch of scraped businesses: record a ScrapeRun, enrich each
 * business, and upsert it (plus its reviews) into D1. This is the single
 * DB-writing path — the scraper Worker fetches from external sources and POSTs
 * the normalized results here.
 */
export async function ingest(prisma: PrismaClient, payload: IngestRequest): Promise<IngestResult> {
  const { category, location, source, businesses } = payload;

  const run = await prisma.scrapeRun.create({
    data: { category, location, source, status: "RUNNING" },
  });

  try {
    let created = 0;
    let updated = 0;

    for (const b of businesses) {
      const branding = deriveBranding(b);
      const highlights = deriveHighlights(b);

      const existing = await prisma.business.findUnique({
        where: { placeId: b.placeId },
        select: { id: true, status: true },
      });

      const data = {
        name: b.name,
        category: b.category,
        address: b.address,
        phone: b.phone,
        website: b.website,
        hasWebsite: Boolean(b.website),
        rating: b.rating,
        reviewCount: b.reviewCount ?? 0,
        priceLevel: b.priceLevel,
        latitude: b.latitude,
        longitude: b.longitude,
        photoUrl: b.photoUrl,
        brandingJson: JSON.stringify(branding),
        highlightsJson: JSON.stringify(highlights),
        // Don't downgrade a business that already has a generated site.
        status: existing?.status === "GENERATED" ? "GENERATED" : "ENRICHED",
        scrapeRunId: run.id,
        scrapedAt: new Date(),
      };

      const saved = await prisma.business.upsert({
        where: { placeId: b.placeId },
        create: { placeId: b.placeId, ...data },
        update: data,
      });

      if (existing) updated++;
      else created++;

      // Refresh reviews.
      await prisma.review.deleteMany({ where: { businessId: saved.id } });
      for (const r of b.reviews) {
        await prisma.review.create({
          data: {
            businessId: saved.id,
            author: r.author,
            rating: r.rating,
            text: r.text,
            time: r.time ? new Date(r.time) : undefined,
          },
        });
      }
    }

    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: { status: "SUCCEEDED", found: businesses.length, created, updated, finishedAt: new Date() },
    });

    return { runId: run.id, source, found: businesses.length, created, updated };
  } catch (err) {
    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}
