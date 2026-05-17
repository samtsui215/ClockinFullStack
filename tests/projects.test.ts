// tests/projects.test.ts
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { client } from '@/lib/database';
import { initSchema, clearDb, seedUsers, seedProject, fixtures, jsonRequest, routeParams, count } from './helpers';

const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@/lib/session', () => ({
  getSessionUser,
  unauthorized: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  forbidden: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));

const { GET: listProjects, POST: createProject } = await import('@/app/api/projects/route');
const { GET: getProject, PATCH: patchProject } = await import('@/app/api/projects/[projectId]/route');

beforeAll(initSchema);
beforeEach(async () => {
  await clearDb();
  await seedUsers();
  getSessionUser.mockResolvedValue(fixtures.employee);
});

describe('GET /api/projects', () => {
  it('rejects an unauthenticated request', async () => {
    getSessionUser.mockResolvedValueOnce(null);
    expect((await listProjects(jsonRequest('/api/projects', 'GET'))).status).toBe(401);
  });

  it('lists active, non-archived projects', async () => {
    await seedProject('p1');
    await seedProject('p2', { archived: true });
    const list = await (await listProjects(jsonRequest('/api/projects', 'GET'))).json();
    expect(list.map((p: { id: string }) => p.id)).toEqual(['p1']);
  });

  it('lists archived projects with ?archived=true', async () => {
    await seedProject('p1');
    await seedProject('p2', { archived: true });
    const list = await (await listProjects(jsonRequest('/api/projects?archived=true', 'GET'))).json();
    expect(list.map((p: { id: string }) => p.id)).toEqual(['p2']);
  });
});

describe('POST /api/projects', () => {
  it('creates a project', async () => {
    const res = await createProject(jsonRequest('/api/projects', 'POST', { title: 'New', category: 'Eng' }));
    expect(res.status).toBe(201);
    expect(await count('projects')).toBe(1);
  });

  it('rejects a project without a title or category', async () => {
    const res = await createProject(jsonRequest('/api/projects', 'POST', { title: 'New' }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/projects/[projectId]', () => {
  it('returns a project by id', async () => {
    await seedProject('p1', { title: 'Alpha' });
    const res = await getProject(jsonRequest('/x', 'GET'), routeParams({ projectId: 'p1' }));
    expect((await res.json()).title).toBe('Alpha');
  });

  it('returns 404 for an unknown project', async () => {
    const res = await getProject(jsonRequest('/x', 'GET'), routeParams({ projectId: 'nope' }));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/projects/[projectId]', () => {
  it('forbids an employee from archiving', async () => {
    await seedProject('p1');
    const res = await patchProject(jsonRequest('/x', 'PATCH', { action: 'archive' }), routeParams({ projectId: 'p1' }));
    expect(res.status).toBe(403);
  });

  it('lets an admin archive a project', async () => {
    await seedProject('p1');
    getSessionUser.mockResolvedValueOnce(fixtures.admin);
    const res = await patchProject(jsonRequest('/x', 'PATCH', { action: 'archive' }), routeParams({ projectId: 'p1' }));
    expect(res.status).toBe(200);
    expect((await res.json()).is_archived).toBe(1);
  });

  it('refuses to archive while a user is clocked in', async () => {
    await seedProject('p1');
    const iso = new Date().toISOString();
    await client.execute({
      sql: `INSERT INTO time_entries (id, user_id, project_id, date, hours, clock_in, clock_out, status, billable)
            VALUES ('t1', ?, 'p1', ?, 0, ?, NULL, 'draft', 1)`,
      args: [fixtures.employee.id, iso.slice(0, 10), iso],
    });
    getSessionUser.mockResolvedValueOnce(fixtures.admin);
    const res = await patchProject(jsonRequest('/x', 'PATCH', { action: 'archive' }), routeParams({ projectId: 'p1' }));
    expect(res.status).toBe(400);
  });
});
