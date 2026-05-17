// tests/helpers.ts — shared test harness: in-memory DB setup, fixtures, seeding.
import { client, initDatabase } from '@/lib/database';

/** Creates the schema. Call once per test file in beforeAll(). */
export async function initSchema() {
  await initDatabase();
}

/** Wipes every table. Call in beforeEach() before seeding. */
export async function clearDb() {
  await client.executeMultiple(`
    DELETE FROM notes;
    DELETE FROM actions;
    DELETE FROM time_entries;
    DELETE FROM project_members;
    DELETE FROM projects;
    DELETE FROM categories;
    DELETE FROM users;
  `);
}

/** Standard users. Shape matches both DB rows and SessionUser. */
export const fixtures = {
  employee: { id: 'emp-1', email: 'eve@klm.test', firstName: 'Eve', lastName: 'Employee', userType: 'employee', isActive: 1 },
  manager: { id: 'mgr-1', email: 'mia@klm.test', firstName: 'Mia', lastName: 'Manager', userType: 'manager', isActive: 1 },
  admin: { id: 'adm-1', email: 'al@klm.test', firstName: 'Al', lastName: 'Admin', userType: 'admin', isActive: 1 },
};

/** Inserts the three standard users. */
export async function seedUsers(weeklyCapacity = 40) {
  for (const u of [fixtures.employee, fixtures.manager, fixtures.admin]) {
    await client.execute({
      sql: `INSERT INTO users (id, email, first_name, last_name, user_type, weekly_capacity, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)`,
      args: [u.id, u.email, u.firstName, u.lastName, u.userType, weeklyCapacity],
    });
  }
}

/** Inserts a project and returns its id. */
export async function seedProject(
  id = 'proj-1',
  opts: { title?: string; category?: string; archived?: boolean } = {}
) {
  await client.execute({
    sql: `INSERT INTO projects (id, title, category, is_active, is_archived, created_by)
          VALUES (?, ?, ?, 1, ?, ?)`,
    args: [id, opts.title ?? 'Test Project', opts.category ?? 'Engineering', opts.archived ? 1 : 0, fixtures.admin.id],
  });
  return id;
}

/** Builds a JSON Request for a route handler. */
export function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(`http://test${url}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Wraps a value as the `{ params }` arg Next.js passes to dynamic routes. */
export function routeParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

/** Reads a count straight from the test DB. */
export async function count(table: string, where = '1=1', args: unknown[] = []) {
  const res = await client.execute({
    sql: `SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`,
    args: args as never,
  });
  return Number(res.rows[0].n);
}

/** Reads a single row from the test DB. */
export async function row<T = Record<string, unknown>>(sql: string, args: unknown[] = []) {
  const res = await client.execute({ sql, args: args as never });
  return res.rows[0] as T | undefined;
}
