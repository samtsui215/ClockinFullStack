# Deploying to Vercel

This app was migrated from local SQLite (`better-sqlite3`) to **Turso** (hosted
libSQL) so it can run on Vercel's serverless infrastructure, which has no
persistent filesystem.

## 1. Create the Turso database

Install the Turso CLI and sign in:

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup        # or: turso auth login
```

Create the database **from the existing `database.db` file** — this imports the
current schema and all data in one step:

```bash
turso db create klm-tracker --from-file database.db
```

Get the two values the app needs:

```bash
turso db show klm-tracker --url        # -> TURSO_DATABASE_URL  (libsql://...)
turso db tokens create klm-tracker     # -> TURSO_AUTH_TOKEN
```

## 2. Environment variables

The app reads these at runtime. Locally they go in `.env.local`; on Vercel they
go in **Project Settings → Environment Variables**.

| Variable | Source |
| --- | --- |
| `TURSO_DATABASE_URL` | `turso db show klm-tracker --url` |
| `TURSO_AUTH_TOKEN` | `turso db tokens create klm-tracker` |
| `FIREBASE_PROJECT_ID` | Firebase service account |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account |
| `FIREBASE_PRIVATE_KEY` | Firebase service account (paste with `\n` escapes — the code un-escapes them) |
| `COMPANY_TIMEZONE` | Optional. Business timezone for date/week grouping. Defaults to `America/New_York`. |

The Firebase **client** config (`firebase/client.ts`) is hardcoded and public,
so it needs no env vars.

### Local development

`TURSO_DATABASE_URL` is optional locally — if unset, the app falls back to the
local `file:database.db`, so existing local dev keeps working unchanged. To
develop against the live Turso DB instead, set both Turso variables in
`.env.local`.

## 3. Deploy

```bash
git add -A && git commit -m "Migrate to Turso for Vercel deployment"
git push
```

Then import the repo at [vercel.com/new](https://vercel.com/new), add the
environment variables from step 2, and deploy.

## Notes

- `database.db` is now gitignored. It is only a local-dev convenience and the
  source for the one-time Turso import — production data lives in Turso.
- **Schema & indexes:** `scripts/migrate.ts` applies the schema and indexes
  idempotently. Run it against Turso once after creating the database:

  ```bash
  TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/migrate.ts
  ```

  (Locally, just `npx tsx scripts/migrate.ts` — it uses `file:database.db`.)
  The `initDatabase()` export in `lib/database.ts` is the single source of truth
  for the schema.
