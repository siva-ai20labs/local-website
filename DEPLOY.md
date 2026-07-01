# Deploying to Cloudflare

This monorepo deploys as **three Cloudflare Workers**:

| Directory   | Worker name                | Role                                           | Public? |
| ----------- | -------------------------- | ---------------------------------------------- | ------- |
| `frontend/` | `local-website-frontend`   | Next.js UI + Auth.js (Google login)            | ✅ yes  |
| `backend/`  | `local-website-backend`    | API + Prisma + **D1** + Anthropic copy-gen     | ❌ no   |
| `scraper/`  | `local-website-scraper`    | Cron Worker (Apify/Places) → ingest to backend | ❌ no   |

Wiring: `frontend → backend` and `frontend → scraper` and `scraper → backend` via **private service bindings**. Only the frontend has a public URL.

```
        ┌────────── service binding ──────────┐
browser → frontend ─ service binding → backend → D1
              └──── service binding → scraper ─┘ (also → backend)
```

---

## 0. One-time prerequisites

```bash
npm install                 # from the repo root (installs all workspaces)
npx wrangler login          # authenticate the Cloudflare account
```

> Node 20.19+ required (Prisma 7 / Wrangler 4).

---

## 1. Re-enable the Cloudflare Prisma runtime

`packages/db/prisma/schema.prisma` has `runtime = "cloudflare"` **commented out**
(it stalls Prisma's engine download on slow/sandboxed networks). Re-enable it on
a normal network before deploying:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
  runtime  = "cloudflare"   // ← uncomment this line
}
```

Then generate the client:

```bash
cd packages/db && npx prisma generate
```

---

## 2. Create the D1 database

```bash
npx wrangler d1 create local-website-db
```

Copy the printed `database_id` into **`backend/wrangler.jsonc`**, replacing
`REPLACE_WITH_D1_DATABASE_ID`.

---

## 3. Create + apply the schema migration

The initial migration is already generated at
`packages/db/prisma/migrations/0001_init.sql`. To regenerate it after a schema
change (Prisma 7 uses `--to-schema`, not the removed `--to-schema-datamodel`):

```bash
cd packages/db
npm run migrate:diff > prisma/migrations/0001_init.sql
```

Apply it to D1 (local and remote):

```bash
# apply (run from the backend dir so it uses backend/wrangler.jsonc's DB binding)
cd ../../backend
npx wrangler d1 execute local-website-db --local  --file=../packages/db/prisma/migrations/0001_init.sql
npx wrangler d1 execute local-website-db --remote --file=../packages/db/prisma/migrations/0001_init.sql
```

---

## 4. Set secrets (per worker)

```bash
# backend
cd backend
npx wrangler secret put ANTHROPIC_API_KEY

# scraper
cd ../scraper
npx wrangler secret put APIFY_API_TOKEN
npx wrangler secret put GOOGLE_PLACES_API_KEY   # optional fallback
npx wrangler secret put CRON_SECRET             # optional

# frontend
cd ../frontend
npx wrangler secret put AUTH_SECRET             # e.g. output of: npx auth secret
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Non-secret vars (model name, default location, allowed domain) live in each
worker's `wrangler.jsonc` under `"vars"`.

---

## 5. Deploy (order matters for service bindings)

Deploy the bound services first so the bindings resolve:

```bash
npm run deploy -w backend
npm run deploy -w scraper
npm run deploy -w frontend     # builds via OpenNext, then deploys
```

---

## 6. Point Google OAuth at the deployed URL

In Google Cloud Console → Credentials → your OAuth client, add:

- **Authorized redirect URI:**
  `https://local-website-frontend.<your-subdomain>.workers.dev/api/auth/callback/google`
- (and the matching origin under Authorized JavaScript origins)

If host inference is unreliable behind Cloudflare's proxy, also set
`AUTH_URL` to the canonical frontend origin (wrangler var or secret).
`trustHost: true` is already set in `src/auth.ts` (required on Workers).

---

## Local development

- **Frontend UI only:** `npm run dev -w frontend` (reads `frontend/.env`).
  Service-binding calls need the other workers running — see below.
- **A worker in isolation:** `npm run dev -w backend` / `-w scraper`
  (copy each `.dev.vars.example` → `.dev.vars` first).
- **Full local stack with bindings:** run each worker's `wrangler dev` and use
  Wrangler's multi-worker/dev-registry so the `BACKEND`/`SCRAPER` service
  bindings connect locally. The frontend preview path is
  `npm run preview -w frontend` (OpenNext build + local Workers runtime).

## Trigger a scrape manually

The scraper runs daily on its cron. To run it on demand, the dashboard's
"Run the scraper" controls POST to `/api/scrape` (frontend → scraper binding).
You can also `wrangler dev`/deploy the scraper and POST to it directly with the
`CRON_SECRET`.
