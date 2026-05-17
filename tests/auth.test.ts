// tests/auth.test.ts — signin / signout routes.
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { initSchema, clearDb, seedUsers, fixtures, jsonRequest } from './helpers';
import { client } from '@/lib/database';

const { getUserByEmail, createSessionCookie } = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  createSessionCookie: vi.fn(),
}));
vi.mock('@/firebase/admin', () => ({
  auth: { getUserByEmail, createSessionCookie },
  db: {},
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ set: () => {}, get: () => undefined }),
}));

const { POST: signin } = await import('@/app/api/signin/route');
const { POST: signout } = await import('@/app/api/signout/route');

beforeAll(initSchema);
beforeEach(async () => {
  await clearDb();
  await seedUsers();
  getUserByEmail.mockReset();
  createSessionCookie.mockReset();
});

describe('POST /api/signin', () => {
  it('issues a session for a valid, active user', async () => {
    getUserByEmail.mockResolvedValue({ uid: fixtures.employee.id });
    createSessionCookie.mockResolvedValue('session-cookie-value');
    const res = await signin(jsonRequest('/api/signin', 'POST', { email: fixtures.employee.email, idToken: 'tok' }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('rejects a deactivated account', async () => {
    await client.execute(
      `INSERT INTO users (id, email, first_name, last_name, user_type, is_active)
       VALUES ('off-1', 'off@klm.test', 'O', 'Ff', 'employee', 0)`
    );
    getUserByEmail.mockResolvedValue({ uid: 'off-1' });
    const res = await signin(jsonRequest('/api/signin', 'POST', { email: 'off@klm.test', idToken: 'tok' }));
    expect(res.status).toBe(403);
  });

  it('returns an error when Firebase rejects the user', async () => {
    getUserByEmail.mockRejectedValue(new Error('no such user'));
    const res = await signin(jsonRequest('/api/signin', 'POST', { email: 'ghost@klm.test', idToken: 'tok' }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/signout', () => {
  it('clears the session and reports success', async () => {
    const res = await signout();
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
