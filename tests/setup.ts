// tests/setup.ts — runs before any test module loads.
// Points the database at a throwaway temp file unique to this worker process,
// so tests never touch the real dev database.
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync } from 'fs';

const dbPath = join(tmpdir(), `klm-test-${process.pid}.db`);
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  try { rmSync(dbPath + suffix); } catch { /* nothing to remove */ }
}
process.env.TURSO_DATABASE_URL = `file:${dbPath}`;
