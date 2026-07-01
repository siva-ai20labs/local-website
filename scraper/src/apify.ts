import type { ScraperAdapter, ScrapedBusiness, ScrapedReview } from "@local-website/types";

/**
 * Apify adapter — scrapes Google Maps via an Apify actor.
 *
 * Apify has a free tier (monthly credits + a free API token), so this avoids
 * Google's paid Places API key. We use the synchronous run endpoint, which
 * starts the actor, waits for it to finish, and returns the dataset items in
 * one call.
 *
 * Default actor: `compass/crawler-google-places` (returns reviews + photos).
 */

const DEFAULT_ACTOR = "compass~crawler-google-places";

interface ApifyPlace {
  placeId?: string;
  fid?: string;
  url?: string;
  title?: string;
  categoryName?: string;
  address?: string;
  street?: string;
  phone?: string;
  phoneUnformatted?: string;
  website?: string;
  totalScore?: number;
  reviewsCount?: number;
  price?: string;
  location?: { lat?: number; lng?: number };
  imageUrl?: string;
  imageUrls?: string[];
  description?: string;
  reviews?: {
    name?: string;
    text?: string | null;
    stars?: number;
    publishedAtDate?: string;
  }[];
}

/** "$$" -> 2, "$$$" -> 3. Returns undefined for non-$ price strings. */
function priceToLevel(price?: string): number | undefined {
  if (!price) return undefined;
  const m = /^\$+/.exec(price.trim());
  return m ? m[0].length : undefined;
}

function mapReviews(place: ApifyPlace): ScrapedReview[] {
  return (place.reviews ?? [])
    .filter((r) => r.text || r.name)
    .slice(0, 3)
    .map((r) => ({
      author: r.name ?? undefined,
      rating: r.stars,
      text: r.text ?? undefined,
      time: r.publishedAtDate,
    }));
}

function mapPlace(place: ApifyPlace, category: string): ScrapedBusiness {
  return {
    placeId: place.placeId ?? place.fid ?? place.url ?? `apify_${place.title}`,
    name: place.title ?? "Unknown business",
    category,
    address: place.address ?? place.street ?? undefined,
    phone: place.phone ?? place.phoneUnformatted ?? undefined,
    website: place.website ?? undefined,
    rating: place.totalScore,
    reviewCount: place.reviewsCount ?? 0,
    priceLevel: priceToLevel(place.price),
    latitude: place.location?.lat,
    longitude: place.location?.lng,
    photoUrl: place.imageUrl ?? place.imageUrls?.[0],
    editorialSummary: place.description,
    types: place.categoryName ? [place.categoryName] : undefined,
    reviews: mapReviews(place),
  };
}

export class ApifyAdapter implements ScraperAdapter {
  readonly source = "apify";

  constructor(
    private readonly token: string,
    private readonly actorId: string = DEFAULT_ACTOR,
  ) {}

  async search(category: string, location: string, limit: number): Promise<ScrapedBusiness[]> {
    const url = `https://api.apify.com/v2/acts/${this.actorId}/run-sync-get-dataset-items`;

    const input = {
      searchStringsArray: [`${category} in ${location}`],
      maxCrawledPlacesPerSearch: limit,
      language: "en",
      maxReviews: 3,
      maxImages: 1,
      scrapeReviewsPersonalData: false,
      skipClosedPlaces: false,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Apify API error ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as ApifyPlace[] | { error?: { message?: string } };
    if (!Array.isArray(data)) {
      throw new Error(`Apify run did not return items: ${JSON.stringify(data).slice(0, 200)}`);
    }

    return data.map((p) => mapPlace(p, category));
  }
}

/** Returns the Apify adapter, or null if no token is configured. */
export function getApifyAdapter(token?: string, actorId?: string): ApifyAdapter | null {
  if (!token) return null;
  return new ApifyAdapter(token, actorId || DEFAULT_ACTOR);
}
