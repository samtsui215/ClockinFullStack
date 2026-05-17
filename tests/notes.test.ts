// tests/notes.test.ts — note routes + the security fixes (auth, ownership).
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { client } from '@/lib/database';
import { initSchema, clearDb, seedUsers, seedProject, fixtures, jsonRequest, routeParams, count } from './helpers';

const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@/lib/session', () => ({
  getSessionUser,
  unauthorized: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  forbidden: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));

const { POST: createNoteRoot } = await import('@/app/api/notes/route');
const { GET: listNotes, POST: createNote } = await import('@/app/api/notes/[projectId]/route');
const { DELETE: deleteNote, PUT: editNote, PATCH: toggleNote } = await import('@/app/api/notes/note/[noteId]/route');

async function seedNote(id: string, ownerId: string, projectId = 'proj-1', message = 'A note') {
  await client.execute({
    sql: `INSERT INTO notes (id, project_id, user_id, message, completed, priority)
          VALUES (?, ?, ?, ?, 0, 'medium')`,
    args: [id, projectId, ownerId, message],
  });
}

beforeAll(initSchema);
beforeEach(async () => {
  await clearDb();
  await seedUsers();
  await seedProject('proj-1');
  getSessionUser.mockResolvedValue(fixtures.employee);
});

describe('notes — authentication', () => {
  it('POST /api/notes rejects an unauthenticated request', async () => {
    getSessionUser.mockResolvedValueOnce(null);
    const res = await createNoteRoot(jsonRequest('/api/notes', 'POST', { projectId: 'proj-1', message: 'hi' }));
    expect(res.status).toBe(401);
  });

  it('GET /api/notes/[projectId] rejects an unauthenticated request', async () => {
    getSessionUser.mockResolvedValueOnce(null);
    const res = await listNotes(jsonRequest('/x', 'GET'), routeParams({ projectId: 'proj-1' }));
    expect(res.status).toBe(401);
  });

  it('DELETE rejects an unauthenticated request', async () => {
    getSessionUser.mockResolvedValueOnce(null);
    const res = await deleteNote(jsonRequest('/x', 'DELETE'), routeParams({ noteId: 'n1' }));
    expect(res.status).toBe(401);
  });
});

describe('notes — create & list', () => {
  it('creates a note and stores the session user as author', async () => {
    const res = await createNote(jsonRequest('/x', 'POST', { message: 'Hello' }), routeParams({ projectId: 'proj-1' }));
    expect(res.status).toBe(201);
    const note = await res.json();
    expect(note.user_id).toBe(fixtures.employee.id);
    expect(note.message).toBe('Hello');
  });

  it('rejects a note without a message', async () => {
    const res = await createNote(jsonRequest('/x', 'POST', {}), routeParams({ projectId: 'proj-1' }));
    expect(res.status).toBe(400);
  });

  it('lists notes for a project', async () => {
    await seedNote('n1', fixtures.employee.id);
    const list = await (await listNotes(jsonRequest('/x', 'GET'), routeParams({ projectId: 'proj-1' }))).json();
    expect(list).toHaveLength(1);
  });
});

describe('notes — ownership (IDOR fix)', () => {
  it('lets the owner delete their note', async () => {
    await seedNote('n1', fixtures.employee.id);
    const res = await deleteNote(jsonRequest('/x', 'DELETE'), routeParams({ noteId: 'n1' }));
    expect(res.status).toBe(200);
    expect(await count('notes')).toBe(0);
  });

  it("forbids deleting another user's note", async () => {
    await seedNote('n1', fixtures.manager.id);
    const res = await deleteNote(jsonRequest('/x', 'DELETE'), routeParams({ noteId: 'n1' }));
    expect(res.status).toBe(403);
    expect(await count('notes')).toBe(1);
  });

  it('lets an admin delete any note', async () => {
    await seedNote('n1', fixtures.manager.id);
    getSessionUser.mockResolvedValueOnce(fixtures.admin);
    const res = await deleteNote(jsonRequest('/x', 'DELETE'), routeParams({ noteId: 'n1' }));
    expect(res.status).toBe(200);
  });

  it('returns 404 deleting an unknown note', async () => {
    const res = await deleteNote(jsonRequest('/x', 'DELETE'), routeParams({ noteId: 'ghost' }));
    expect(res.status).toBe(404);
  });

  it("forbids editing another user's note", async () => {
    await seedNote('n1', fixtures.manager.id);
    const res = await editNote(jsonRequest('/x', 'PUT', { message: 'hacked' }), routeParams({ noteId: 'n1' }));
    expect(res.status).toBe(403);
  });

  it('lets the owner edit their note', async () => {
    await seedNote('n1', fixtures.employee.id);
    const res = await editNote(jsonRequest('/x', 'PUT', { message: 'updated' }), routeParams({ noteId: 'n1' }));
    expect(res.status).toBe(200);
  });

  it('lets a manager toggle a note complete', async () => {
    await seedNote('n1', fixtures.employee.id);
    getSessionUser.mockResolvedValueOnce(fixtures.manager);
    const res = await toggleNote(jsonRequest('/x', 'PATCH', { completed: true }), routeParams({ noteId: 'n1' }));
    expect(res.status).toBe(200);
  });
});
