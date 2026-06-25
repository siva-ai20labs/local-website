// Shared domain types used across the scraper, generator, and UI.

export type BusinessStatus = "NEW" | "ENRICHED" | "GENERATED";
export type RunStatus = "RUNNING" | "SUCCEEDED" | "FAILED";

/** Branding signals derived from the scraped business. */
export interface Branding {
  /** Suggested brand palette as hex strings. */
  palette: string[];
  /** A short descriptor of the business's vibe, e.g. "cozy & artisanal". */
  vibe: string;
  /** Primary photo URLs (branding reference). */
  photos: string[];
  /** A one-line summary of what the business is about. */
  summary: string;
}

/** A scraped review, normalized. */
export interface ScrapedReview {
  author?: string;
  rating?: number;
  text?: string;
  time?: string; // ISO string
}

/** A normalized business record produced by a scraper adapter. */
export interface ScrapedBusiness {
  placeId: string;
  name: string;
  category: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  /** Google "editorial summary" — a short blurb about the place, if present. */
  editorialSummary?: string;
  /** Google place types, e.g. ["cafe", "restaurant"]. */
  types?: string[];
  reviews: ScrapedReview[];
}

/** The AI-written marketing copy that fills a template. */
export interface SiteCopy {
  tagline: string;
  heroSubtitle: string;
  about: string;
  services: { name: string; description: string }[];
  whyChooseUs: string[];
  callToAction: string;
  /** Hex colors chosen to match the brand. */
  primaryColor: string;
  accentColor: string;
}

/** A scraper adapter: turns a category + location into normalized businesses. */
export interface ScraperAdapter {
  readonly source: string;
  search(category: string, location: string, limit: number): Promise<ScrapedBusiness[]>;
}
