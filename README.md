# Local Website — SMB Control Tower

An admin dashboard that **discovers small businesses, reviews their details, and generates a marketing website for each one in minutes** — with a live preview URL.

Built as a production-quality vertical slice:

1. **Scraper** — pulls local businesses (name, rating, reviews, whether they already have a website, branding signals, highlights) from the **Google Places API (New)**. Runs on demand or on a daily cron.
2. **Dashboard** — review every business, its enrichment, and pipeline status; trigger scrapes; fire website generation.
3. **Generator** — picks a responsive template and uses **Claude** to write the marketing copy, then serves a self-contained single-page site at `/preview/<slug>` in seconds.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Prisma 7** (driver-adapter) on **SQLite** for local dev
- **Google Places API (New)** for scraping · **Claude** (`@anthropic-ai/sdk`) for copy

> Runs fully in **demo mode with zero API keys**: the scraper falls back to realistic seed data and the generator falls back to deterministic copy. Add keys to go live.

## Quick start

```bash
npm install            # also runs `prisma generate`
npx prisma migrate dev # create the SQLite database (first time only)
cp .env.example .env   # optional — app runs with everything blank
npm run dev            # http://localhost:3000
```

Open the dashboard, click **Run the scraper** (or **Run daily sweep**), then **Generate site** on any business and **Open preview ↗**.

## Configuration (`.env`)

| Variable | Purpose | Blank behavior |
| --- | --- | --- |
| `GOOGLE_PLACES_API_KEY` | Live scraping via Places API (New) | Realistic demo seed data |
| `ANTHROPIC_API_KEY` | AI-written website copy | Deterministic fallback copy |
| `ANTHROPIC_MODEL` | Copy model (default `claude-opus-4-8`) | — |
| `DEFAULT_LOCATION` | Where the scraper searches | `Austin, TX` |
| `CRON_SECRET` | Protects `POST /api/scrape` | Open access (dev) |
| `DATABASE_URL` | SQLite path (swap for Postgres in prod) | `file:./dev.db` |

## How it flows

```
Google Places (or seed)
        │  search(category, location)
        ▼
   Scraper  ──enrich──▶  branding palette · highlights · hasWebsite
        │  upsert
        ▼
   Business (NEW → ENRICHED)         ── reviewed in the dashboard
        │  "Generate site"
        ▼
   Claude writes copy ─▶ template renders self-contained HTML
        │  save
        ▼
   GeneratedSite (status → GENERATED)  ──▶  /preview/<slug>
```

Every scrape is recorded as a `ScrapeRun` for the activity feed.

## API

| Route | Method | Description |
| --- | --- | --- |
| `/api/scrape` | POST | Scrape one `{category, location}`, or a full category sweep with no body. `forceSeed: true` uses demo data. Honors `CRON_SECRET`. |
| `/api/businesses` | GET | List businesses (`?category=&status=`). |
| `/api/businesses/[id]` | GET | One business with reviews + site. |
| `/api/generate/[id]` | POST | Generate/regenerate the website. Returns `{ slug, previewUrl }`. |
| `/api/runs` | GET | Recent scrape runs. |
| `/preview/[slug]` | GET | The generated site, served as `text/html`. |

### Daily scrape (cron)

Point any scheduler at the scrape endpoint:

```bash
curl -X POST https://your-host/api/scrape \
  -H "Authorization: Bearer $CRON_SECRET"
```

With no body it sweeps the default categories (coffee shops, bakeries, plumbers, yoga studios, barbershops).

## Project layout

```
src/
  app/
    dashboard/page.tsx          # main dashboard (server component)
    businesses/[id]/page.tsx    # business detail + live preview
    preview/[slug]/route.ts     # serves generated HTML
    api/…                       # scrape, businesses, generate, runs
  components/                   # ScrapeControls, GenerateButton, ui
  lib/
    places.ts                   # Google Places (New) adapter
    seed-data.ts                # demo adapter (no key needed)
    scraper.ts                  # orchestration + enrichment
    generator/
      ai-copy.ts                # Claude structured-output copy (+ fallback)
      templates.ts              # self-contained HTML templates
      index.ts                  # assemble + persist
prisma/schema.prisma           # Business · Review · GeneratedSite · ScrapeRun
```

## Notes

- **Swap the scraper source** by implementing the `ScraperAdapter` interface (`src/lib/types.ts`); the live Google adapter is selected automatically when a key is present.
- **Production database**: change `provider` in `prisma/schema.prisma` to `postgresql`, set `DATABASE_URL`, and swap the driver adapter in `src/lib/prisma.ts`.
- `npm run typecheck` runs a fast type-check of app code; `npm run db:studio` opens Prisma Studio.
