// tests/profile.test.ts — profile stats / weekly-hours / activity + recent-projects.
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { client } from '@/lib/database';
import { businessDate } from '@/lib/time';
import { initSchema, clearDb, seedUsers, seedProject, fixtures, jsonRequest } from './helpers';

const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@/lib/session', () => ({
  getSessionUser,
  unauthorized: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  forbidden: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));

const { GET: getStats } = await import('@/app/api/profile/stats/route');
const { GET: getWeekly } = await import('@/app/api/profile/weekly-hours/route');
const { GET: getActivity } = await import('@/app/api/profile/activity/route');
const { GET: getRecent } = await import('@/app/api/recent-projects/route');

/** Inserts a completed time entry dated today (business date). */
async function completedEntry(id: string, hours: number) {
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO time_entries (id, user_id, project_id, date, hours, clock_in, clock_out, status, billable)
          VALUES (?, ?, 'proj-1', ?, ?, ?, ?, 'completed', 1)`,
    args: [id, fixtures.employee.id, businessDate(new Date()), hours, now, now],
  });
}

beforeAll(initSchema);
beforeEach(async () => {
  await clearDb();
  await seedUsers();
  await seedProject('proj-1');
  getSessionUser.mockResolvedValue(fixtures.employee);
});

describe('GET /api/profile/stats', () => {
  it('rejects an unauthenticated request', async () => {
    getSessionUser.mockResolvedValueOnce(null);
    expect((await getStats(jsonRequest('/api/profile/stats', 'GET'))).status).toBe(401);
  });

  it('sums this week hours from the business date column', async () => {
    await completedEntry('t1', 5);
    await completedEntry('t2', 3);
    const data = await (await getStats(jsonRequest('/api/profile/stats', 'GET'))).json();
    expect(data.thisWeek.hours).toBe(8);
    expect(data.dailyHours).toHaveLength(7);
  });
});

describe('GET /api/profile/weekly-hours', () => {
  it('returns seven daily buckets and a weekly total', async () => {
    await completedEntry('t1', 6);
    const data = await (await getWeekly(jsonRequest('/api/profile/weekly-hours?weekOffset=0', 'GET'))).json();
    expect(data.dailyHours).toHaveLength(7);
    expect(data.totalHours).toBe(6);
  });
});

describe('GET /api/profile/activity', () => {
  it('returns completed actions as activity items', async () => {
    const now = new Date().toISOString();
    await client.execute({
      sql: `INSERT INTO actions (id, group_id, user_id, project_id, description, started_at, completed_at,
              accumulated_seconds, carried_over, created_at)
            VALUES ('a1', 'a1', ?, 'proj-1', 'Finished task', ?, ?, 0, 0, ?)`,
      args: [fixtures.employee.id, now, now, now],
    });
    const list = await (await getActivity(jsonRequest('/api/profile/activity', 'GET'))).json();
    expect(list).toHaveLength(1);
    expect(list[0].description).toBe('Finished task');
  });
});

describe('GET /api/recent-projects', () => {
  it('returns projects the user has clocked into', async () => {
    await completedEntry('t1', 4);
    const list = await (await getRecent()).json();
    expect(list.map((p: { id: string }) => p.id)).toEqual(['proj-1']);
  });
});
