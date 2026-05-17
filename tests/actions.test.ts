// tests/actions.test.ts
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { client } from '@/lib/database';
import { initSchema, clearDb, seedUsers, seedProject, fixtures, jsonRequest, routeParams, row } from './helpers';

const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@/lib/session', () => ({
  getSessionUser,
  unauthorized: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  forbidden: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));

const { GET: listActions, POST: createAction } = await import('@/app/api/actions/route');
const { PATCH: patchAction, PUT: editAction, DELETE: deleteAction } = await import('@/app/api/actions/[actionId]/route');
const { GET: projectActions } = await import('@/app/api/actions/project/[projectId]/route');
const { GET: activeAction } = await import('@/app/api/actions/active/[userId]/route');

async function seedAction(id: string, ownerId: string, opts: { group?: string; completed?: boolean } = {}) {
  const iso = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO actions (id, group_id, user_id, project_id, description, started_at, completed_at,
            accumulated_seconds, carried_over, created_at)
          VALUES (?, ?, ?, 'proj-1', 'Do work', ?, ?, 0, 0, ?)`,
    args: [id, opts.group ?? id, ownerId, iso, opts.completed ? iso : null, iso],
  });
}

beforeAll(initSchema);
beforeEach(async () => {
  await clearDb();
  await seedUsers();
  await seedProject('proj-1');
  getSessionUser.mockResolvedValue(fixtures.employee);
});

describe('GET /api/actions', () => {
  it('rejects an unauthenticated request', async () => {
    getSessionUser.mockResolvedValueOnce(null);
    expect((await listActions(jsonRequest('/api/actions?projectId=proj-1', 'GET'))).status).toBe(401);
  });

  it('requires a projectId', async () => {
    expect((await listActions(jsonRequest('/api/actions', 'GET'))).status).toBe(400);
  });

  it('returns the user in-progress actions for a project', async () => {
    await seedAction('a1', fixtures.employee.id);
    await seedAction('a2', fixtures.employee.id, { completed: true });
    const list = await (await listActions(jsonRequest('/api/actions?projectId=proj-1', 'GET'))).json();
    expect(list.map((a: { id: string }) => a.id)).toEqual(['a1']);
  });
});

describe('POST /api/actions', () => {
  it('creates an action', async () => {
    const res = await createAction(jsonRequest('/api/actions', 'POST', { project_id: 'proj-1', description: 'New task' }));
    expect(res.status).toBe(201);
    expect((await res.json()).description).toBe('New task');
  });

  it('rejects a missing description', async () => {
    const res = await createAction(jsonRequest('/api/actions', 'POST', { project_id: 'proj-1' }));
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/actions/[actionId]', () => {
  it('completes an action', async () => {
    await seedAction('a1', fixtures.employee.id);
    const res = await patchAction(jsonRequest('/x', 'PATCH', {}), routeParams({ actionId: 'a1' }));
    expect(res.status).toBe(200);
    const updated = await row<{ completed_at: string }>('SELECT completed_at FROM actions WHERE id = ?', ['a1']);
    expect(updated!.completed_at).not.toBeNull();
  });

  it('returns 404 for an unknown action', async () => {
    const res = await patchAction(jsonRequest('/x', 'PATCH', {}), routeParams({ actionId: 'ghost' }));
    expect(res.status).toBe(404);
  });

  it('completes a whole group with completeGroup', async () => {
    await seedAction('a1', fixtures.employee.id, { group: 'g1' });
    await seedAction('a2', fixtures.employee.id, { group: 'g1' });
    const res = await patchAction(jsonRequest('/x', 'PATCH', { completeGroup: true }), routeParams({ actionId: 'a1' }));
    expect(res.status).toBe(200);
    const open = await row<{ n: number }>('SELECT COUNT(*) AS n FROM actions WHERE completed_at IS NULL', []);
    expect(Number(open!.n)).toBe(0);
  });
});

describe('PUT / DELETE /api/actions/[actionId]', () => {
  it('edits an action description', async () => {
    await seedAction('a1', fixtures.employee.id);
    const res = await editAction(jsonRequest('/x', 'PUT', { description: 'Renamed' }), routeParams({ actionId: 'a1' }));
    expect(res.status).toBe(200);
  });

  it("forbids editing another user's action", async () => {
    await seedAction('a1', fixtures.manager.id);
    const res = await editAction(jsonRequest('/x', 'PUT', { description: 'x' }), routeParams({ actionId: 'a1' }));
    expect(res.status).toBe(403);
  });

  it('deletes the user own action', async () => {
    await seedAction('a1', fixtures.employee.id);
    const res = await deleteAction(jsonRequest('/x', 'DELETE'), routeParams({ actionId: 'a1' }));
    expect(res.status).toBe(200);
  });

  it("forbids deleting another user's action", async () => {
    await seedAction('a1', fixtures.manager.id);
    const res = await deleteAction(jsonRequest('/x', 'DELETE'), routeParams({ actionId: 'a1' }));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/actions/project & active', () => {
  it('lists every action on a project', async () => {
    await seedAction('a1', fixtures.employee.id);
    await seedAction('a2', fixtures.manager.id);
    const list = await (await projectActions(jsonRequest('/x', 'GET'), routeParams({ projectId: 'proj-1' }))).json();
    expect(list).toHaveLength(2);
  });

  it('returns the active action for a user', async () => {
    await seedAction('a1', fixtures.employee.id);
    const res = await activeAction(jsonRequest('/x', 'GET'), routeParams({ userId: fixtures.employee.id }));
    expect((await res.json()).id).toBe('a1');
  });

  it("forbids an employee reading another user's active action", async () => {
    const res = await activeAction(jsonRequest('/x', 'GET'), routeParams({ userId: fixtures.manager.id }));
    expect(res.status).toBe(403);
  });
});
