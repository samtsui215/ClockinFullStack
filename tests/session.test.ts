// tests/session.test.ts — the real getSessionUser (Firebase + cookie mocked).
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { client } from '@/lib/database';
import { initSchema, clearDb, seedUsers, fixtures } from './helpers';

const { cookie, verifySessionCookie } = vi.hoisted(() => ({
  cookie: { value: undefined as string | undefined },
  verifySessionCookie: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'session' && cookie.value ? { value: cookie.value } : undefined),
  }),
}));
vi.mock('@/firebase/admin', () => ({ auth: { verifySessionCookie }, db: {} }));

const { getSessionUser } = await import('@/lib/session');

beforeAll(initSchema);
beforeEach(async () => {
  await clearDb();
  await seedUsers();
  cookie.value = undefined;
  verifySessionCookie.mockReset();
});

describe('getSessionUser', () => {
  it('returns null when there is no session cookie', async () => {
    expect(await getSessionUser()).toBeNull();
  });

  it('returns null when the session cookie is invalid', async () => {
    cookie.value = 'tampered';
    verifySessionCookie.mockRejectedValue(new Error('invalid'));
    expect(await getSessionUser()).toBeNull();
  });

  it('returns the user for a valid session cookie', async () => {
    cookie.value = 'valid';
    verifySessionCookie.mockResolvedValue({ uid: fixtures.employee.id });
    const user = await getSessionUser();
    expect(user?.id).toBe(fixtures.employee.id);
    expect(user?.userType).toBe('employee');
  });

  it('returns null for a deactivated user', async () => {
    await client.execute(
      `INSERT INTO users (id, email, first_name, last_name, user_type, is_active)
       VALUES ('off-1', 'off@klm.test', 'O', 'Ff', 'employee', 0)`
    );
    cookie.value = 'valid';
    verifySessionCookie.mockResolvedValue({ uid: 'off-1' });
    expect(await getSessionUser()).toBeNull();
  });
});
