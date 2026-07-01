import type { ScraperAdapter, ScrapedBusiness, ScrapedReview } from "@local-website/types";

/**
 * Deterministic demo adapter. Generates realistic-looking small businesses so
 * the dashboard is usable without any API key. Implements the same
 * ScraperAdapter interface as the live adapters, so the scraper code is uniform.
 *
 * It's seeded off the category + an index so repeated runs of the same category
 * upsert the same placeIds rather than ballooning the table.
 */

const NAME_PARTS: Record<string, { prefixes: string[]; suffixes: string[] }> = {
  default: {
    prefixes: ["Golden", "Sunrise", "Maple", "Iron", "Blue Door", "Cedar", "Harbor", "Willow", "Copper", "Lark"],
    suffixes: ["& Co.", "House", "Collective", "Studio", "Works", "Corner", "Lane", "Bros", "Market", "Room"],
  },
  "coffee shops": {
    prefixes: ["Daily Grind", "Hidden Bean", "Foglifter", "Morning Ritual", "Crema", "Steam", "Third Wave", "Wildflower", "Roast & Co", "Press"],
    suffixes: ["Coffee", "Roasters", "Café", "Espresso Bar", "Coffee House", "& Tea", "Coffee Co.", "Brews", "Coffeehouse", "Coffee Lab"],
  },
  plumbers: {
    prefixes: ["Rapid", "Anchor", "TruFlow", "Summit", "Reliable", "ProDrain", "BlueLine", "Pinnacle", "Allstar", "Hometown"],
    suffixes: ["Plumbing", "Plumbing & Heating", "Drain Services", "Pipeworks", "Plumbing Co.", "Mechanical", "Plumbing LLC", "Water Works", "Plumbers", "Rooter"],
  },
  bakeries: {
    prefixes: ["Sweet Crumb", "Flour & Salt", "Rise", "Buttercup", "Hearth", "Golden Loaf", "Sugar Pine", "Dough", "Honeycomb", "Levain"],
    suffixes: ["Bakery", "Bakehouse", "Patisserie", "Bread Co.", "& Pastry", "Bakery & Café", "Breads", "Confections", "Bake Shop", "Boulangerie"],
  },
  "yoga studios": {
    prefixes: ["Still Point", "Lotus", "Breath", "Anchor", "Ember", "Drift", "Rooted", "Tide", "Open Sky", "Quiet Mind"],
    suffixes: ["Yoga", "Yoga Studio", "Movement", "Wellness", "Yoga & Pilates", "Flow", "Yoga Collective", "Studio", "Yoga House", "Mindful Movement"],
  },
  barbershops: {
    prefixes: ["Sharp", "The Gentleman's", "Fade", "Old Town", "Razor", "Kingsman", "Clip", "Heritage", "Stag", "Main Street"],
    suffixes: ["Barbershop", "Barbers", "Cuts", "Grooming Co.", "Barber Lounge", "Shave Parlor", "& Co.", "Barbering", "Chair Co.", "Barber Studio"],
  },
};

const VIBE_PHOTOS = [
  "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1000",
  "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=1000",
  "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1000",
  "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1000",
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1000",
];

const STREETS = ["Main St", "Oak Ave", "2nd St", "Market St", "Elm St", "Mission St", "Highland Ave", "Pearl St", "Cedar Ln", "Union St"];
const FIRST = ["Jamie", "Alex", "Morgan", "Priya", "Diego", "Sam", "Taylor", "Nia", "Owen", "Lena"];
const LAST = ["R.", "T.", "M.", "K.", "S.", "L.", "P.", "C.", "B.", "H."];

const REVIEW_SNIPPETS = [
  "Absolutely loved this place — friendly staff and great quality.",
  "Solid experience, will definitely come back.",
  "A neighborhood gem. Highly recommend to anyone nearby.",
  "Good value and consistent. My go-to in the area.",
  "Service was a little slow but the quality made up for it.",
  "Exceeded my expectations. Can't wait to return.",
  "Cozy atmosphere and the team really knows their craft.",
  "Decent, but parking can be tricky on weekends.",
];

// A tiny seeded PRNG so runs are deterministic per (category, index).
function rng(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function makeReviews(rand: () => number, count: number): ScrapedReview[] {
  const n = Math.min(count, 3);
  const reviews: ScrapedReview[] = [];
  for (let i = 0; i < n; i++) {
    reviews.push({
      author: `${pick(rand, FIRST)} ${pick(rand, LAST)}`,
      rating: Math.round((3.5 + rand() * 1.5) * 2) / 2,
      text: pick(rand, REVIEW_SNIPPETS),
      time: new Date(Date.now() - Math.floor(rand() * 1000 * 60 * 60 * 24 * 120)).toISOString(),
    });
  }
  return reviews;
}

export class SeedAdapter implements ScraperAdapter {
  readonly source = "seed";

  async search(category: string, location: string, limit: number): Promise<ScrapedBusiness[]> {
    const key = category.toLowerCase();
    const parts = NAME_PARTS[key] ?? NAME_PARTS.default;
    const out: ScrapedBusiness[] = [];

    for (let i = 0; i < limit; i++) {
      const rand = rng(`${key}|${location}|${i}`);
      const name = `${pick(rand, parts.prefixes)} ${pick(rand, parts.suffixes)}`;
      const rating = Math.round((3.6 + rand() * 1.4) * 10) / 10;
      const reviewCount = 12 + Math.floor(rand() * 480);
      // ~45% of small businesses have no real website — the prime targets.
      const hasSite = rand() > 0.55;

      out.push({
        placeId: `seed_${key.replace(/\s+/g, "-")}_${i}`,
        name,
        category,
        address: `${100 + Math.floor(rand() * 1899)} ${pick(rand, STREETS)}, ${location}`,
        phone: `(${200 + Math.floor(rand() * 700)}) ${100 + Math.floor(rand() * 899)}-${1000 + Math.floor(rand() * 8999)}`,
        website: hasSite ? `https://www.${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com` : undefined,
        rating,
        reviewCount,
        priceLevel: 1 + Math.floor(rand() * 3),
        latitude: 30 + rand() * 10,
        longitude: -100 - rand() * 20,
        photoUrl: pick(rand, VIBE_PHOTOS),
        editorialSummary: `${name} is a well-loved ${category.replace(/s$/, "")} serving the ${location} area.`,
        types: [key.replace(/\s+/g, "_")],
        reviews: makeReviews(rand, reviewCount),
      });
    }
    return out;
  }
}
