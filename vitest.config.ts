import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': resolve(process.cwd(), '.') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // setup.ts points the DB at a per-process temp file before modules load.
    setupFiles: ['./tests/setup.ts'],
    env: {
      COMPANY_TIMEZONE: 'America/New_York',
    },
  },
});
