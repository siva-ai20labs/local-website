import type { PrismaClient } from "@local-website/db";
import type { Branding } from "@local-website/types";
import { generateCopy, type CopyInput, type CopyOptions } from "./ai-copy";
import { pickTemplate, renderTemplate, type RenderInput } from "./templates";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function parseBranding(json: string | null): Branding {
  const fallback: Branding = {
    palette: ["#1d3557", "#e63946", "#f1faee"],
    vibe: "local favorite",
    photos: [],
    summary: "",
  };
  if (!json) return fallback;
  try {
    return JSON.parse(json) as Branding;
  } catch {
    return fallback;
  }
}

function parseHighlights(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

export interface GenerateResult {
  slug: string;
  template: string;
  model: string | null;
  previewUrl: string;
}

/**
 * Generates (or regenerates) a website for a business: writes AI copy, renders
 * a template, and persists the self-contained HTML for preview.
 */
export async function generateSite(
  prisma: PrismaClient,
  businessId: string,
  opts: CopyOptions = {},
): Promise<GenerateResult> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { reviews: { take: 3, orderBy: { time: "desc" } } },
  });
  if (!business) throw new Error(`Business not found: ${businessId}`);

  const branding = parseBranding(business.brandingJson);
  const highlights = parseHighlights(business.highlightsJson);
  const reviewSnippets = business.reviews.map((r) => r.text ?? "").filter(Boolean).slice(0, 3);

  const copyInput: CopyInput = {
    name: business.name,
    category: business.category,
    address: business.address,
    rating: business.rating,
    reviewCount: business.reviewCount,
    branding,
    highlights,
    reviewSnippets,
  };

  const { copy, model } = await generateCopy(copyInput, opts);

  const template = pickTemplate(business.name);
  const renderInput: RenderInput = {
    name: business.name,
    category: business.category,
    address: business.address,
    phone: business.phone,
    photoUrl: business.photoUrl,
    rating: business.rating,
    reviewCount: business.reviewCount,
    highlights,
    reviews: business.reviews.map((r) => ({ author: r.author, text: r.text, rating: r.rating })),
    copy,
  };
  const html = renderTemplate(template, renderInput);

  const slug = `${slugify(business.name)}-${business.id.slice(-6)}`;

  await prisma.generatedSite.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, slug, template, html, copyJson: JSON.stringify(copy), model },
    update: { slug, template, html, copyJson: JSON.stringify(copy), model },
  });

  await prisma.business.update({
    where: { id: business.id },
    data: { status: "GENERATED" },
  });

  return { slug, template, model, previewUrl: `/preview/${slug}` };
}
