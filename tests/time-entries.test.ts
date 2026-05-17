// tests/time-entries.test.ts — clock-in / clock-out / switch / manual / active / history.
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { client } from '@/lib/database';
import { businessDate } from '@/lib/time';
import {
  initSchema, clearDb, seedUsers, seedProject, fixtures, jsonRequest, routeParams, row, count,
} from './helpers';

const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@/lib/session', () => ({
  getSessionUser,
  unauthorized: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  forbidden: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));

const { POST: clockIn } = await import('@/app/api/time_entries/clock-in/route');
const { POST: clockOut } = await import('@/app/api/time_entries/clock-out/route');
const { POST: switchProject } = await import('@/app/api/time_entries/switch/route');
const { POST: manualEntry } = await import('@/app/api/time_entries/manual/route');
const { GET: activeEntry } = await import('@/app/api/time_entries/active/route');
const { GET: activeByUser } = await import('@/app/api/time_entries/active/[userId]/route');
const { GET: history } = await import('@/app/api/time_entries/history/route');

const HOUR = 3_600_000;

/** Inserts an open (clocked-in) time entry directly. */
async function openEntry(id: string, userId: string, projectId: string, clockIn: Date) {
  const iso = clockIn.toISOString();
  await client.execute({
    sql: `INSERT INTO time_entries (id, user_id, project_id, date, hours, clock_in, clock_out, status, billable, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, ?, NULL, 'draft', 1, ?, ?)`,
    args: [id, userId, projectId, iso.slice(0, 10), iso, iso, iso],
  });
}

beforeAll(initSchema);
beforeEach(async () => {
  await clearDb();
  await seedUsers();
  await seedProject('proj-1');
  await seedProject('proj-2', { title: 'Second Project' });
  getSessionUser.mockResolvedValue(fixtures.employee);
});

describe('POST /api/time_entries/clock-in', () => {
  it('rejects an unauthenticated request', async () => {
    getSessionUser.mockResolvedValueOnce(null);
    const res = await clockIn(jsonRequest('/api/time_entries/clock-in', 'POST', { project_id: 'proj-1' }));
    expect(res.status).toBe(401);
  });

  it('creates an entry stamped with the business date', async () => {
    const res = await clockIn(jsonRequest('/api/time_entries/clock-in', 'POST', { project_id: 'proj-1' }));
    expect(res.status).toBe(201);
    const entry = await res.json();
    expect(entry.date).toBe(businessDate(new Date()));
    expect(entry.clock_out).toBeNull();
    expect(await count('time_entries')).toBe(1);
  });

  it('blocks a second clock-in while a recent session is open', async () => {
    await openEntry('open-1', fixtures.employee.id, 'proj-1', new Date(Date.now() - HOUR));
    const res = await clockIn(jsonRequest('/api/time_entries/clock-in', 'POST', { project_id: 'proj-1' }));
    expect(res.status).toBe(400);
    expect(await count('time_entries')).toBe(1);
  });

  it('refuses to clock in to an archived project', async () => {
    await seedProject('proj-archived', { archived: true });
    const res = await clockIn(jsonRequest('/api/time_entries/clock-in', 'POST', { project_id: 'proj-archived' }));
    expect(res.status).toBe(400);
  });

  it('auto-closes a forgotten (stale) session, then clocks in', async () => {
    await openEntry('stale-1', fixtures.employee.id, 'proj-1', new Date(Date.now() - 20 * HOUR));
    const res = await clockIn(jsonRequest('/api/time_entries/clock-in', 'POST', { project_id: 'proj-2' }));
    expect(res.status).toBe(201);

    const stale = await row<{ clock_out: string; status: string; hours: number }>(
      'SELECT clock_out, status, hours FROM time_entries WHERE id = ?', ['stale-1']
    );
    expect(stale!.clock_out).not.toBeNull();
    expect(stale!.status).toBe('needs_review');
    expect(stale!.hours).toBe(12); // capped at MAX_SESSION_HOURS
    expect(await count('time_entries')).toBe(2);
  });
});

describe('POST /api/time_entries/clock-out', () => {
  it('rejects an unauthenticated request', async () => {
    getSessionUser.mockResolvedValueOnce(null);
    const res = await clockOut(jsonRequest('/api/time_entries/clock-out', 'POST', { entry_id: 'x' }));
    expect(res.status).toBe(401);
  });

  it('closes an open entry and records the hours', async () => {
    await openEntry('e1', fixtures.employee.id, 'proj-1', new Date(Date.now() - 2 * HOUR));
    const res = await clockOut(jsonRequest('/api/time_entries/clock-out', 'POST', { entry_id: 'e1' }));
    expect(res.status).toBe(200);
    const entry = await res.json();
    expect(entry.status).toBe('completed');
    expect(entry.hours).toBeGreaterThan(1.9);
    expect(entry.hours).toBeLessThan(2.1);
  });

  it('returns 404 for an unknown entry', async () => {
    const res = await clockOut(jsonRequest('/api/time_entries/clock-out', 'POST', { entry_id: 'nope' }));
    expect(res.status).toBe(404);
  });

  it("forbids clocking out another user's entry", async () => {
    await openEntry('e2', fixtures.manager.id, 'proj-1', new Date(Date.now() - HOUR));
    const res = await clockOut(jsonRequest('/api/time_entries/clock-out', 'POST', { entry_id: 'e2' }));
    expect(res.status).toBe(403);
  });

  it('rejects an entry that is already clocked out', async () => {
    const iso = new Date(Date.now() - 3 * HOUR).toISOString();
    await client.execute({
      sql: `INSERT INTO time_entries (id, user_id, project_id, date, hours, clock_in, clock_out, status, billable)
            VALUES ('done', ?, 'proj-1', ?, 1, ?, ?, 'completed', 1)`,
      args: [fixtures.employee.id, iso.slice(0, 10), iso, new Date().toISOString()],
    });
    const res = await clockOut(jsonRequest('/api/time_entries/clock-out', 'POST', { entry_id: 'done' }));
    expect(res.status).toBe(400);
  });

  it('caps a session over 12h and flags it for review', async () => {
    await openEntry('long', fixtures.employee.id, 'proj-1', new Date(Date.now() - 20 * HOUR));
    const res = await clockOut(jsonRequest('/api/time_entries/clock-out', 'POST', { entry_id: 'long' }));
    const entry = await res.json();
    expect(entry.hours).toBe(12);
    expect(entry.status).toBe('needs_review');
  });
});

describe('POST /api/time_entries/switch', () => {
  it('closes the current session and opens one on the new project', async () => {
    await openEntry('cur', fixtures.employee.id, 'proj-1', new Date(Date.now() - HOUR));
    const res = await switchProject(jsonRequest('/api/time_entries/switch', 'POST', { new_project_id: 'proj-2' }));
    expect(res.status).toBe(201);
    const newEntry = await res.json();
    expect(newEntry.project_id).toBe('proj-2');
    expect(newEntry.clock_out).toBeNull();

    const old = await row<{ clock_out: string }>('SELECT clock_out FROM time_entries WHERE id = ?', ['cur']);
    expect(old!.clock_out).not.toBeNull();
  });

  it('requires new_project_id', async () => {
    const res = await switchProject(jsonRequest('/api/time_entries/switch', 'POST', {}));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/time_entries/manual', () => {
  it('creates a manual entry', async () => {
    const res = await manualEntry(jsonRequest('/api/time_entries/manual', 'POST', {
      project_id: 'proj-1',
      date: '2026-05-10',
      hours: 4,
      clock_in: '2026-05-10T13:00:00Z',
      clock_out: '2026-05-10T17:00:00Z',
      description: 'Backfilled work',
    }));
    expect(res.status).toBe(201);
    expect(await count('time_entries')).toBe(1);
  });

  it('refuses a manual entry while clocked in', async () => {
    await openEntry('open', fixtures.employee.id, 'proj-1', new Date());
    const res = await manualEntry(jsonRequest('/api/time_entries/manual', 'POST', {
      project_id: 'proj-1', date: '2026-05-10', hours: 4,
      clock_in: '2026-05-10T13:00:00Z', clock_out: '2026-05-10T17:00:00Z',
    }));
    expect(res.status).toBe(409);
  });
});

describe('GET /api/time_entries/active', () => {
  it('returns the open entry, or null when none', async () => {
    const empty = await activeEntry();
    expect(await empty.json()).toBeNull();

    await openEntry('a1', fixtures.employee.id, 'proj-1', new Date());
    const res = await activeEntry();
    const entry = await res.json();
    expect(entry.id).toBe('a1');
  });
});

describe('GET /api/time_entries/active/[userId]', () => {
  it('lets a user read their own active entry', async () => {
    await openEntry('mine', fixtures.employee.id, 'proj-1', new Date());
    const res = await activeByUser(jsonRequest('/x', 'GET'), routeParams({ userId: fixtures.employee.id }));
    expect((await res.json()).id).toBe('mine');
  });

  it("forbids an employee reading another user's active entry", async () => {
    const res = await activeByUser(jsonRequest('/x', 'GET'), routeParams({ userId: fixtures.manager.id }));
    expect(res.status).toBe(403);
  });

  it("lets an admin read another user's active entry", async () => {
    getSessionUser.mockResolvedValueOnce(fixtures.admin);
    await openEntry('theirs', fixtures.employee.id, 'proj-1', new Date());
    const res = await activeByUser(jsonRequest('/x', 'GET'), routeParams({ userId: fixtures.employee.id }));
    expect((await res.json()).id).toBe('theirs');
  });
});

describe('GET /api/time_entries/history', () => {
  it('returns the user completed entries', async () => {
    const iso = new Date(Date.now() - 4 * HOUR).toISOString();
    await client.execute({
      sql: `INSERT INTO time_entries (id, user_id, project_id, date, hours, clock_in, clock_out, status, billable)
            VALUES ('h1', ?, 'proj-1', ?, 3, ?, ?, 'completed', 1)`,
      args: [fixtures.employee.id, iso.slice(0, 10), iso, new Date().toISOString()],
    });
    const res = await history(jsonRequest('/api/time_entries/history', 'GET'));
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('h1');
  });
});
