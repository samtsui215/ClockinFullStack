// tests/database.test.ts — the libSQL compatibility shim.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import db from '@/lib/database';
import { initSchema, clearDb, seedUsers, fixtures } from './helpers';

beforeAll(initSchema);
beforeEach(async () => {
  await clearDb();
  await seedUsers();
});

describe('database shim', () => {
  it('get() returns a single row, or undefined when none match', async () => {
    const u = await db.prepare('SELECT id, email FROM users WHERE id = ?').get(fixtures.employee.id);
    expect(u).toMatchObject({ id: fixtures.employee.id });

    const none = await db.prepare('SELECT id FROM users WHERE id = ?').get('nobody');
    expect(none).toBeUndefined();
  });

  it('all() returns an array of every matching row', async () => {
    const rows = await db.prepare('SELECT id FROM users').all();
    expect(rows).toHaveLength(3);
  });

  it('run() reports the number of changed rows', async () => {
    const res = await db.prepare("UPDATE users SET first_name = 'X' WHERE user_type = 'employee'").run();
    expect(res.changes).toBe(1);
  });

  it('returns plain objects safe to pass Server -> Client Components', async () => {
    const u = await db.prepare('SELECT id FROM users WHERE id = ?').get(fixtures.employee.id);
    expect(Object.getPrototypeOf(u)).toBe(Object.prototype);

    const rows = await db.prepare('SELECT id FROM users').all();
    expect(Object.getPrototypeOf(rows[0])).toBe(Object.prototype);
  });
});
