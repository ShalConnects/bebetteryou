# Machine handoff

Continue BeBetterYou on a new computer. Stack, env keys, and scripts stay in `README.md` / `env.example`. Do not put secrets in this file.

Cursor chats stay on the old PC. Do not rely on the sidebar here.

## First run

1. Clone https://github.com/ShalConnects/bebetteryou
2. Copy `.env.local` from the old machine (gitignored). `cp env.example .env.local` is a blank fallback only.
3. Copy any uncommitted work (below) or commit it on the old machine first.
4. Same GitHub + Vercel + Cursor accounts. Prod: https://vercel.com/shalauddin-kaders-projects/be-better-you
5. `npm install` then `npm run dev`. Quotes browse without env; auth/admin/social need `.env.local`.

Optional local-only (also gitignored): `OriginalWP/` if you still need the old WordPress dump.

## Uncommitted on the old machine (2026-09-12)

- `app/layout.js`
- `config/site.js` — brand after logo revert: `logo` `/brand/logo.png`, mark/favicon `/brand/fav.png`, wordmark `BetterYou`

## How we work

Ask first (`don't do anything, tell me first?`), then the smallest DRY change. Config in `config/`, data in `data/`, queries in `libs/`, UI in `components/` / `app/`.

## Decisions to keep

- **Tags** are the glue (string names, not shared IDs). Quote ↔ scripture ↔ blog ↔ book is a hybrid: infer from tags, add explicit links only when inference is wrong.
- **Books** (Amazon affiliate) sit next to quotes/blog when `enableBooks` is on.
- **Social auto-post** distributes quotes; it does not create that content graph.
- **Print shop** stays off unless `NEXT_PUBLIC_ENABLE_PRINT_SHOP=true`. See README.
- **Analytics** is first-party at `/dashboard/analytics` unless `NEXT_PUBLIC_ENABLE_ANALYTICS=false`.

## Open

- Google/AI indexing extras were discussed, not clearly finished.
- `GOOGLE_CLIENT_ID` may be unset; Google sign-in can show without working.
- If `.next` looks corrupted after a copy, delete `.next` and restart `npm run dev`.
