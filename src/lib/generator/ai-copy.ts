import Anthropic from "@anthropic-ai/sdk";
import type { Branding, SiteCopy } from "../types";

/**
 * Generates marketing copy for a business's website.
 *
 * Strategy: "templates + AI-filled copy". A fixed responsive template provides
 * the layout; Claude writes the words (tagline, about, services, etc.) as a
 * structured JSON object so it drops cleanly into the template.
 *
 * Falls back to deterministic copy when ANTHROPIC_API_KEY is absent or the API
 * errors, so site generation always succeeds in a demo.
 */

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

// JSON schema for structured outputs. Note: structured outputs disallow
// numeric/length constraints and require additionalProperties:false + required.
const COPY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tagline: { type: "string" },
    heroSubtitle: { type: "string" },
    about: { type: "string" },
    services: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["name", "description"],
      },
    },
    whyChooseUs: { type: "array", items: { type: "string" } },
    callToAction: { type: "string" },
    primaryColor: { type: "string" },
    accentColor: { type: "string" },
  },
  required: [
    "tagline",
    "heroSubtitle",
    "about",
    "services",
    "whyChooseUs",
    "callToAction",
    "primaryColor",
    "accentColor",
  ],
} as const;

export interface CopyInput {
  name: string;
  category: string;
  address?: string | null;
  rating?: number | null;
  reviewCount?: number;
  branding: Branding;
  highlights: string[];
  reviewSnippets: string[];
}

function buildPrompt(input: CopyInput): string {
  return [
    `You are a senior conversion copywriter building a one-page marketing website for a small business.`,
    `Write warm, specific, benefit-driven copy — concrete, never generic filler.`,
    ``,
    `BUSINESS`,
    `- Name: ${input.name}`,
    `- Category: ${input.category}`,
    input.address ? `- Location: ${input.address}` : ``,
    input.rating ? `- Rating: ${input.rating}★ (${input.reviewCount ?? 0} reviews)` : ``,
    `- Vibe: ${input.branding.vibe}`,
    `- Summary: ${input.branding.summary}`,
    input.highlights.length ? `- Highlights: ${input.highlights.join("; ")}` : ``,
    input.reviewSnippets.length
      ? `- What customers say: ${input.reviewSnippets.map((s) => `"${s}"`).join(" ")}`
      : ``,
    ``,
    `REQUIREMENTS`,
    `- tagline: 3-6 words, punchy.`,
    `- heroSubtitle: one sentence under the tagline.`,
    `- about: 2-3 sentences, first or third person, inviting.`,
    `- services: 3-4 concrete offerings appropriate to a ${input.category} with a short benefit each.`,
    `- whyChooseUs: 3-4 short bullet points.`,
    `- callToAction: a single CTA button label (2-4 words).`,
    `- primaryColor & accentColor: hex codes that suit the brand vibe (suggested palette: ${input.branding.palette.join(", ")}).`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Deterministic fallback so generation never hard-fails. */
export function fallbackCopy(input: CopyInput): SiteCopy {
  const [primary, accent] = input.branding.palette;
  const noun = input.category.replace(/s$/, "");
  return {
    tagline: `Your Local ${noun.replace(/\b\w/g, (c) => c.toUpperCase())}`,
    heroSubtitle: input.branding.summary,
    about: `${input.name} has earned a reputation as a ${input.branding.vibe} ${noun}${
      input.address ? ` in the neighborhood` : ""
    }. We care about the details and the people we serve — come see why customers keep coming back.`,
    services: [
      { name: "Our Signature Offering", description: `Everything you'd expect from a top-tier ${noun}, done right.` },
      { name: "Personal Service", description: "Friendly, attentive help from people who know their craft." },
      { name: "Consistent Quality", description: "The same great experience every single visit." },
    ],
    whyChooseUs: [
      input.rating ? `${input.rating}★ rated by ${input.reviewCount ?? 0}+ customers` : "Trusted by the community",
      "Locally owned and operated",
      "Quality you can count on",
    ],
    callToAction: "Get in Touch",
    primaryColor: primary ?? "#1d3557",
    accentColor: accent ?? "#e63946",
  };
}

interface CopyResult {
  copy: SiteCopy;
  model: string | null;
}

export async function generateCopy(input: CopyInput): Promise<CopyResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { copy: fallbackCopy(input), model: null };
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: buildPrompt(input) }],
      output_config: {
        format: { type: "json_schema", schema: COPY_SCHEMA },
      },
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text block in model response");
    }
    const copy = JSON.parse(textBlock.text) as SiteCopy;
    return { copy, model: response.model };
  } catch (err) {
    console.error("[ai-copy] generation failed, using fallback:", err);
    return { copy: fallbackCopy(input), model: null };
  }
}
