// scripts/migrate.ts — apply the schema + indexes idempotently.
//
// Run against local dev:   npx tsx scripts/migrate.ts
// Run against Turso:       TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/migrate.ts
//
// Every statement uses "IF NOT EXISTS", so this is safe to run repeatedly.
import { initDatabase } from '../lib/database';

initDatabase()
  .then(() => {
    console.log('✅ Schema and indexes applied.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  });
