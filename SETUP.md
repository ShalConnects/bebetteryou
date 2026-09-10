# Setup

1. `npm install && npm run dev` — quotes load from `data/quotes.json` with no env.
2. For auth/admin: `cp env.example .env.local`, set `NEXTAUTH_SECRET` (`openssl rand -base64 32`), `NEXTAUTH_URL`, `ADMIN_EMAIL`.
3. `npm run check:env` — confirm config.
4. Production/Vercel: also `MONGODB_URI`, `BLOB_READ_WRITE_TOKEN`.

Full notes: [README.md](./README.md).
