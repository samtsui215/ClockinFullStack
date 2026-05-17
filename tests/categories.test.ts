// tests/categories.test.ts
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { client } from '@/lib/database';
import { initSchema, clearDb, seedUsers, fixtures, jsonRequest, count } from './helpers';

const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@/lib/session', () => ({
  getSessionUser,
  unauthorized: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  forbidden: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));

const { GET: listCategories, POST: createCategory } = await import('@/app/api/categories/route');

beforeAll(initSchema);
beforeEach(async () => {
  await clearDb();
  await seedUsers();
  getSessionUser.mockResolvedValue(fixtures.employee);
});

describe('GET /api/categories', () => {
  it('rejects an unauthenticated request', async () => {
    getSessionUser.mockResolvedValueOnce(null);
    expect((await listCategories()).status).toBe(401);
  });

  it('lists categories ordered by name', async () => {
    await client.execute(`INSERT INTO categories (id, name) VALUES ('c1', 'Zeta'), ('c2', 'Alpha')`);
    const list = await (await listCategories()).json();
    expect(list.map((c: { name: string }) => c.name)).toEqual(['Alpha', 'Zeta']);
  });
});

describe('POST /api/categories', () => {
  it('creates a category', async () => {
    const res = await createCategory(jsonRequest('/api/categories', 'POST', { name: 'Engineering' }));
    expect(res.status).toBe(201);
    expect(await count('categories')).toBe(1);
  });

  it('rejects a blank name', async () => {
    const res = await createCategory(jsonRequest('/api/categories', 'POST', { name: '   ' }));
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate name', async () => {
    await createCategory(jsonRequest('/api/categories', 'POST', { name: 'Engineering' }));
    const res = await createCategory(jsonRequest('/api/categories', 'POST', { name: 'Engineering' }));
    expect(res.status).toBe(409);
  });
});
