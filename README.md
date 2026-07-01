# Local Website — SMB Control Tower

An admin dashboard that **discovers small businesses, reviews their details, and
generates a marketing website for each one in minutes** — with a live preview URL.

Built as a production-quality vertical slice and deployed as a **Cloudflare
Workers monorepo**:

1. **Scraper** — pulls local businesses (name, rating, reviews, whether they
   already have a website, branding signals, highlights) from **Apify's Google
   Maps actor** (free tier — no paid Google key), with Google Places as an
   optional fallback. Runs on demand or on a daily cron.
2. **Dashboard** — review every business, its enrichment, and pipeline status;
   trigger scrapes; fire website generation. Gated behind Google login
   (company-domain only).
3. **Generator** — picks a responsive template and uses **Claude** to write the
   marketing copy, then serves a self-contained single-page site at
   `/preview/<slug>` in seconds.

> Runs fully in **demo mode with zero API keys**: the scraper falls back to
> realistic seed data and the generator falls back to deterministic copy. Add
> keys to go live.

## Architecture

Three Cloudflare Workers plus two shared packages, wired over **private service
bindings** — only the frontend has a public URL.

```
        ┌────────── service binding ──────────┐
browser → frontend ─ service binding → backend → D1
              └──── service binding → scraper ─┘ (also → backend)
```

| Workspace       | Role                                                        | Public? |
| --------------- | ----------------------------------------------------------- | ------- |
| `frontend/`     | Next.js 16 UI + Auth.js (Google login), on OpenNext         | ✅ yes  |
| `backend/`      | API + Prisma + **D1** + Claude copy-gen; owns all DB writes | ❌ no   |
| `scraper/`      | Cron Worker (Apify/Places) → POSTs to backend `/ingest`     | ❌ no   |
| `packages/db`   | Prisma schema + D1 client (`getPrisma(env.DB)`)             | —       |
| `packages/types`| Shared domain types across all workers                      | —       |

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**, on
  **@opennextjs/cloudflare**
- **Tailwind CSS v4**
- **Prisma 7** (driver-adapter) on **Cloudflare D1** (SQLite-compatible)
- **Apify** (Google Maps actor) for scraping · **Claude**
  (`@anthropic-ai/sdk`) for copy · **Auth.js** (NextAuth v5) for Google login

## Quick start (local UI)

```bash
npm install                       # installs all workspaces
npm run dev -w frontend           # http://localhost:3000 (frontend only)
```

The frontend's dashboard calls the backend and scraper over service bindings.
For the **full local stack** (dashboard → backend → D1, manual scrapes), run each
worker with `wrangler dev` so the bindings connect — see
[`DEPLOY.md` › Local development](./DEPLOY.md#local-development).

## Deploying

Everything Cloudflare-specific (D1 creation, migrations, secrets, deploy order,
Google OAuth setup) is in **[`DEPLOY.md`](./DEPLOY.md)**. In short:

```bash
npx wrangler login
npx wrangler d1 create local-website-db      # paste id into backend/wrangler.jsonc
npm run deploy -w backend
npm run deploy -w scraper
npm run deploy -w frontend                   # OpenNext build + deploy
```

## Configuration

Non-secret vars (model, default location, allowed login domain) live in each
worker's `wrangler.jsonc`. Secrets are set with `wrangler secret put <NAME>`;
`.dev.vars.example` in each worker lists what to copy into a local `.dev.vars`.

| Secret                | Worker   | Purpose                                       |
| --------------------- | -------- | --------------------------------------------- |
| `ANTHROPIC_API_KEY`   | backend  | AI-written copy (blank → deterministic copy)  |
| `APIFY_API_TOKEN`     | scraper  | Live scraping (blank → Google, then seed)     |
| `GOOGLE_PLACES_API_KEY` | scraper| Optional scraping fallback                    |
| `CRON_SECRET`         | scraper  | Protects the manual scrape trigger            |
| `AUTH_SECRET`         | frontend | Auth.js session signing (`npx auth secret`)   |
| `GOOGLE_CLIENT_ID/SECRET` | frontend | Google OAuth credentials                  |

## How it flows

```
Apify / Google Places (or seed)          [scraper worker]
        │  search(category, location)
        ▼
   POST /ingest ─────────────────────────▶ [backend worker]
        │  enrich: branding palette · highlights · hasWebsite
        ▼
   Business (NEW → ENRICHED)  ── reviewed in the dashboard  [frontend worker]
        │  "Generate site"  →  POST /generate/:id
        ▼
   Claude writes copy ─▶ template renders self-contained HTML   [backend]
        │  save to D1
        ▼
   GeneratedSite (status → GENERATED)  ──▶  /preview/<slug>
```

Every scrape is recorded as a `ScrapeRun` for the dashboard activity feed.

## Backend API (private — reached only via service bindings)

| Route             | Method | Description                                        |
| ----------------- | ------ | -------------------------------------------------- |
| `/businesses`     | GET    | List businesses (`?category=&status=`).            |
| `/businesses/:id` | GET    | One business with reviews + generated site.        |
| `/generate/:id`   | POST   | Generate/regenerate the site. Returns `{ slug }`.  |
| `/runs`           | GET    | Recent scrape runs.                                |
| `/preview/:slug`  | GET    | The generated site, served as `text/html`.         |
| `/ingest`         | POST   | Scraper posts normalized businesses to enrich+save.|

The scraper exposes `POST /` (manual trigger, `{category?, location?, forceSeed?}`)
and runs a daily cron sweep of the default categories.

## Notes

- **Swap the scraper source** by implementing the `ScraperAdapter` interface
  (`packages/types`); the live adapter is selected automatically when a key is
  present (`scraper/src/scrape.ts`).
- **The backend owns D1** — the scraper and frontend never touch the database
  directly; they call the backend over service bindings.
- `packages/db/prisma/schema.prisma` targets `runtime = "cloudflare"`; run
  `npm run generate -w @local-website/db` after changing the schema.
</content>
</invoke>
