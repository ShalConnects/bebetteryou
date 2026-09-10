# BeBetterYou

Motivational quote cards — browse, filter, and share. Admin tools generate cards and post to social.

**Stack:** Next.js 15 · React 19 · Tailwind · NextAuth · MongoDB · Vercel Blob (prod images)

## Quick start

```bash
npm install
npm run dev                 # quotes work with no .env (data/quotes.json)
cp env.example .env.local   # auth/admin: NEXTAUTH_*, ADMIN_EMAIL
npm run check:env           # verify .env.local
```

## Env (essentials)

| Variable | Purpose |
|----------|---------|
| *(none)* | Local browse — quotes from `data/quotes.json` |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Sign-in |
| `ADMIN_EMAIL` | Quote create / social / lead list |
| `MONGODB_URI` | Auth + durable quote catalog (prod) |
| `BLOB_READ_WRITE_TOKEN` | Quote images **and print files** on Vercel |
| `ENABLE_PRICING` / `ENABLE_API_DOCS` | Opt-in SaaS leftovers (`true` to enable) |

See `env.example` for OAuth, Stripe, Resend, and social API keys.

## Layout

```
app/                 # routes (quotes, auth, dashboard, api)
components/site/     # product UI (header, grid, pager, quote form)
components/          # shared: Hero, AuthCard, Pricing, checkout
config/              # site, quotes, social, app
libs/                # quotes store/assets, auth, seo, social
data/quotes.json     # seeded catalog (local + merge with Mongo)
public/quotes/       # local card JPGs
```

## Quotes persistence

- **Local:** writes `public/quotes/` + `data/quotes.json`
- **Vercel:** Mongo catalog + Blob images (`BLOB_READ_WRITE_TOKEN` required)

Admin: `/dashboard/quotes` (sign in as `ADMIN_EMAIL`).

## Print shop

Off unless `NEXT_PUBLIC_ENABLE_PRINT_SHOP=true`. Needs `PRINTFUL_API_KEY`,
`PRINTFUL_STORE_ID` (a *native* store — a WooCommerce-linked one rejects direct
orders), `MONGODB_URI`, and `BLOB_READ_WRITE_TOKEN` on Vercel.

Printful fetches print files itself, both to quote shipping and later to produce
the item, so shipping estimates cannot work against `localhost` — `SITE_URL`
must name a host Printful can reach. Bump `printRevision` when the renderer
changes, but never delete the old files: live orders still point at them.

**Only quotes with a `text` field can be printed.** Most of the catalog is
scanned artwork with the words baked into the JPEG and nothing to typeset, so
`isPrintableQuote` gates the card link, both pages and all three api routes.

Customisation is deliberately a short allowlist, not free input: products and
placements in `config/print-products.js`, typeface, type size and line spacing
in `config/print-styles.js`. Print files are permanent and content-addressed, so
every option multiplies stored artwork — three typefaces times three sizes times
three spacings times credit on/off is 54 files per quote, product and colour.

Print files are 300dpi and the renderer will not set type below 0.2in, which is
roughly where DTG detail closes up. Where a quote cannot fit legibly — a long one
on a mug wrap, say — it is refused with a 422 rather than printed outside the
print area; the designer disables *Continue* in that state. `measurePrintFile`
exposes the fit if you need to check a combination without rendering.

Front and back tee prints share one file: Printful's two print areas (1010x1346
and 1031x1375) are both 3:4, so only the preview frame and the order payload
differ.

Orders: `/dashboard/print-orders`.

## Analytics

First-party and self-hosted at `/dashboard/analytics`: which channels send
visitors, which pages they read, which quotes they download, and where they
share them. On unless `NEXT_PUBLIC_ENABLE_ANALYTICS=false`, and it stores events
in Mongo, or in `data/analytics-events.json` when `MONGODB_URI` is unset locally.

There is no cookie and no third party, so no consent banner is needed. A visitor
is a salted SHA-256 of IP and user agent that **rotates every day**, so counts
are daily uniques and no visit can be linked to the day before. Set
`ANALYTICS_SALT` to pin the salt; it otherwise borrows `NEXTAUTH_SECRET`. A Mongo
TTL index drops events after `retentionDays` (400) on its own.

First-touch attribution — the referrer or UTM tags that started the visit — is
held in `sessionStorage` and sent with every event, so a download three pages in
still credits the channel that brought the person. Page views only fire inside
the public shell, so admin traffic never lands in the numbers. `libs/analytics.js`
summarises in JS rather than an aggregation pipeline, which keeps one code path
for Mongo and the local file; `summaryEventCap` bounds what a render will read.

## Scripts

```bash
npm run generate:quote -- --n 1 --text "Your quote"
npm run import:quotes
npm run import:quotes -- --tags-only   # merge WP tags into existing catalog
npm run check:env
```
