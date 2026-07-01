import type { ScraperAdapter, ScrapedBusiness, ScrapedReview } from "@local-website/types";

/**
 * Google Places API (v1) adapter.
 *
 * Uses the modern `places:searchText` endpoint, which returns business
 * details, photos, and a handful of reviews in a single call. Requires a key
 * with the "Places API (New)" enabled.
 */

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

// Fields we ask Google for. Keep this tight — billing is per-field-tier.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.location",
  "places.photos",
  "places.editorialSummary",
  "places.types",
  "places.reviews",
].join(",");

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

interface PlacesV1Place {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  location?: { latitude?: number; longitude?: number };
  photos?: { name?: string }[];
  editorialSummary?: { text?: string };
  types?: string[];
  reviews?: {
    authorAttribution?: { displayName?: string };
    rating?: number;
    text?: { text?: string };
    publishTime?: string;
  }[];
}

function photoMediaUrl(photoName: string, apiKey: string): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1000&key=${apiKey}`;
}

function mapReviews(place: PlacesV1Place): ScrapedReview[] {
  return (place.reviews ?? []).map((r) => ({
    author: r.authorAttribution?.displayName,
    rating: r.rating,
    text: r.text?.text,
    time: r.publishTime,
  }));
}

function mapPlace(place: PlacesV1Place, category: string, apiKey: string): ScrapedBusiness {
  const photoName = place.photos?.[0]?.name;
  return {
    placeId: place.id,
    name: place.displayName?.text ?? "Unknown business",
    category,
    address: place.formattedAddress,
    phone: place.nationalPhoneNumber,
    website: place.websiteUri,
    rating: place.rating,
    reviewCount: place.userRatingCount ?? 0,
    priceLevel: place.priceLevel ? PRICE_LEVEL_MAP[place.priceLevel] : undefined,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    photoUrl: photoName ? photoMediaUrl(photoName, apiKey) : undefined,
    editorialSummary: place.editorialSummary?.text,
    types: place.types,
    reviews: mapReviews(place),
  };
}

export class GooglePlacesAdapter implements ScraperAdapter {
  readonly source = "google_places";

  constructor(private readonly apiKey: string) {}

  async search(category: string, location: string, limit: number): Promise<ScrapedBusiness[]> {
    const textQuery = `${category} in ${location}`;
    const res = await fetch(SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: Math.min(limit, 20), // v1 caps a single page at 20
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Google Places API error ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as { places?: PlacesV1Place[] };
    return (data.places ?? []).map((p) => mapPlace(p, category, this.apiKey));
  }
}

/** Returns the live Google adapter, or null if no API key is configured. */
export function getGooglePlacesAdapter(apiKey?: string): GooglePlacesAdapter | null {
  if (!apiKey) return null;
  return new GooglePlacesAdapter(apiKey);
}
