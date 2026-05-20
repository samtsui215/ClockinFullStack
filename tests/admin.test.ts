// tests/admin.test.ts — admin-only routes (users, team-activity, create-user, stats, export).
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { client } from '@/lib/database';
import { businessDate, businessWeekStartDate } from '@/lib/time';
import { initSchema, clearDb, seedUsers, seedProject, fixtures, jsonRequest, routeParams, row } from './helpers';

const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
const { createUser } = vi.hoisted(() => ({ createUser: vi.fn() }));
vi.mock('@/lib/session', () => ({
  getSessionUser,
  unauthorized: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  forbidden: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));
vi.mock('@/firebase/admin', () => ({ auth: { createUser }, db: {} }));

const { GET: listUsers, PATCH: patchUser } = await import('@/app/api/admin/users/route');
const { GET: teamActivity } = await import('@/app/api/admin/team-activity/route');
const { POST: createUserRoute } = await import('@/app/api/admin/create-user/route');
const { GET: projectStats } = await import('@/app/api/admin/project-stats/[projectId]/route');
const { GET: projectExport } = await import('@/app/api/admin/project-export/[projectId]/route');

async function completed(id: string, userId: string, hours: number) {
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO time_entries (id, user_id, project_id, date, hours, clock_in, clock_out, status, billable)
          VALUES (?, ?, 'proj-1', ?, ?, ?, ?, 'completed', 1)`,
    args: [id, userId, businessDate(new Date()), hours, now, now],
  });
}

beforeAll(initSchema);
beforeEach(async () => {
  await clearDb();
  await seedUsers();
  await seedProject('proj-1');
  getSessionUser.mockResolvedValue(fixtures.admin);
  createUser.mockReset();
});

describe('GET /api/admin/users', () => {
  it('forbids an employee', async () => {
    getSessionUser.mockResolvedValueOnce(fixtures.employee);
    expect((await listUsers(jsonRequest('/api/admin/users?filter=all_time', 'GET'))).status).toBe(403);
  });

  it('returns users with their weekly capacity', async () => {
    const list = await (await listUsers(jsonRequest('/api/admin/users?filter=all_time', 'GET'))).json();
    expect(list).toHaveLength(3);
    expect(list[0]).toHaveProperty('weeklyCapacity');
  });

  it('sums weekly hours for the this_week filter', async () => {
    await completed('t1', fixtures.employee.id, 7);
    const weekStart = businessWeekStartDate();
    const list = await (await listUsers(
      jsonRequest(`/api/admin/users?filter=this_week&weekStart=${weekStart}`, 'GET')
    )).json();
    const eve = list.find((u: { id: string }) => u.id === fixtures.employee.id);
    expect(Number(eve.totalHours)).toBe(7);
  });

  it('returns the all-time last clock-in even with the this_week filter', async () => {
    // An entry from months ago — outside any current week window.
    await client.execute({
      sql: `INSERT INTO time_entries (id, user_id, project_id, date, hours, clock_in, clock_out, status, billable)
            VALUES ('old', ?, 'proj-1', '2025-01-15', 4, '2025-01-15T13:00:00Z', '2025-01-15T17:00:00Z', 'completed', 1)`,
      args: [fixtures.employee.id],
    });
    const weekStart = businessWeekStartDate();
    const list = await (await listUsers(
      jsonRequest(`/api/admin/users?filter=this_week&weekStart=${weekStart}`, 'GET')
    )).json();
    const eve = list.find((u: { id: string }) => u.id === fixtures.employee.id);
    // lastClockIn must populate from all-time, not from the week filter.
    expect(eve.lastClockIn).toBeTruthy();
    // But this-week hours stay zero since the entry is outside the window.
    expect(Number(eve.totalHours)).toBe(0);
  });
});

describe('PATCH /api/admin/users', () => {
  it('forbids a manager from changing roles', async () => {
    getSessionUser.mockResolvedValueOnce(fixtures.manager);
    const res = await patchUser(jsonRequest('/api/admin/users', 'PATCH', { userId: fixtures.employee.id, userType: 'admin' }));
    expect(res.status).toBe(403);
  });

  it('lets an admin change a user role', async () => {
    const res = await patchUser(jsonRequest('/api/admin/users', 'PATCH', { userId: fixtures.employee.id, userType: 'manager' }));
    expect(res.status).toBe(200);
    const u = await row<{ user_type: string }>('SELECT user_type FROM users WHERE id = ?', [fixtures.employee.id]);
    expect(u!.user_type).toBe('manager');
  });
});

describe('GET /api/admin/team-activity', () => {
  it('reports active sessions and team hours', async () => {
    const now = new Date().toISOString();
    await client.execute({
      sql: `INSERT INTO time_entries (id, user_id, project_id, date, hours, clock_in, clock_out, status, billable)
            VALUES ('open', ?, 'proj-1', ?, 0, ?, NULL, 'draft', 1)`,
      args: [fixtures.employee.id, businessDate(new Date()), now],
    });
    await completed('t1', fixtures.manager.id, 10);
    const data = await (await teamActivity()).json();
    expect(data.activeCount).toBe(1);
    expect(data.teamHoursThisWeek).toBe(10);
    expect(data.employeeCount).toBe(3);
  });
});

describe('POST /api/admin/create-user', () => {
  it('forbids a non-admin', async () => {
    getSessionUser.mockResolvedValueOnce(fixtures.manager);
    const res = await createUserRoute(jsonRequest('/api/admin/create-user', 'POST', {
      email: 'x@klm.test', password: 'pw', firstName: 'X', lastName: 'Y',
    }));
    expect(res.status).toBe(403);
  });

  it('creates a Firebase + SQL user', async () => {
    createUser.mockResolvedValue({ uid: 'new-uid' });
    const res = await createUserRoute(jsonRequest('/api/admin/create-user', 'POST', {
      email: 'newbie@klm.test', password: 'pw', firstName: 'New', lastName: 'Bie', userType: 'employee',
    }));
    expect(res.status).toBe(201);
    expect(createUser).toHaveBeenCalledOnce();
    const u = await row('SELECT id FROM users WHERE id = ?', ['new-uid']);
    expect(u).toBeDefined();
  });
});

describe('GET /api/admin/project-stats & project-export', () => {
  it('returns per-user stats for a project', async () => {
    await completed('t1', fixtures.employee.id, 6);
    const data = await (await projectStats(jsonRequest('/x', 'GET'), routeParams({ projectId: 'proj-1' }))).json();
    expect(data.userStats).toHaveLength(1);
    expect(Number(data.userStats[0].totalHours)).toBe(6);
  });

  it('exports project time entries', async () => {
    await completed('t1', fixtures.employee.id, 6);
    const data = await (await projectExport(jsonRequest('/x', 'GET'), routeParams({ projectId: 'proj-1' }))).json();
    expect(data.project.id).toBe('proj-1');
    expect(data.timeEntries).toHaveLength(1);
  });

  it('returns 404 exporting an unknown project', async () => {
    const res = await projectExport(jsonRequest('/x', 'GET'), routeParams({ projectId: 'ghost' }));
    expect(res.status).toBe(404);
  });
});
