// lib/database.ts
import { createClient, type Client, type InValue } from '@libsql/client';

// Local dev defaults to the SQLite file; production reads Turso credentials.
const url = process.env.TURSO_DATABASE_URL ?? 'file:database.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export const client: Client = createClient({ url, authToken });

type Row = Record<string, unknown>;

export interface Statement {
  get<T = Row>(...args: InValue[]): Promise<T | undefined>;
  all<T = Row>(...args: InValue[]): Promise<T[]>;
  run(...args: InValue[]): Promise<{ changes: number; lastInsertRowid: bigint | undefined }>;
}

/**
 * Compatibility shim mimicking better-sqlite3's `db.prepare(sql).get/all/run(...)`
 * API on top of libSQL. `prepare()` is synchronous; the terminal calls are async,
 * so every call site needs `await` on `.get()` / `.all()` / `.run()`.
 */
function prepare(sql: string): Statement {
  return {
    async get<T = Row>(...args: InValue[]): Promise<T | undefined> {
      const res = await client.execute({ sql, args });
      const row = res.rows[0];
      // libSQL Row objects are not plain objects — spread into one so the
      // result is safe to pass from Server to Client Components.
      return row ? ({ ...row } as unknown as T) : undefined;
    },
    async all<T = Row>(...args: InValue[]): Promise<T[]> {
      const res = await client.execute({ sql, args });
      return res.rows.map((row) => ({ ...row })) as unknown as T[];
    },
    async run(...args: InValue[]) {
      const res = await client.execute({ sql, args });
      return { changes: res.rowsAffected, lastInsertRowid: res.lastInsertRowid };
    },
  };
}

const db = { prepare };

/**
 * Creates the schema on a fresh database. Not run automatically — production
 * uses a Turso DB imported from the existing database.db, which already has
 * the schema. Kept for bootstrapping a brand-new (empty) database.
 */
export async function initDatabase() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      first_name TEXT,
      last_name TEXT,
      user_type TEXT DEFAULT 'employee',
      weekly_capacity INTEGER DEFAULT 40,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      client TEXT,
      budgeted_hours INTEGER,
      start_date DATETIME,
      end_date DATETIME,
      is_active BOOLEAN DEFAULT 1,
      is_archived INTEGER DEFAULT 0,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      user_id TEXT,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      project_id TEXT,
      date DATE NOT NULL,
      hours REAL NOT NULL,
      description TEXT,
      billable BOOLEAN DEFAULT 1,
      status TEXT DEFAULT 'draft',
      clock_in DATETIME,
      clock_out DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      time_entry_id TEXT,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      description TEXT NOT NULL,
      started_at DATETIME NOT NULL,
      completed_at DATETIME,
      accumulated_seconds INTEGER DEFAULT 0,
      carried_over INTEGER DEFAULT 0,
      last_resumed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (time_entry_id) REFERENCES time_entries(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      parent_id TEXT REFERENCES categories(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      user_id TEXT,
      message TEXT NOT NULL,
      note_type TEXT DEFAULT 'comment',
      completed BOOLEAN DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Indexes for the hot query paths (lookups by user/project/date).
    CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_user_open ON time_entries(user_id, clock_out);
    CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
    CREATE INDEX IF NOT EXISTS idx_actions_user_project ON actions(user_id, project_id);
    CREATE INDEX IF NOT EXISTS idx_actions_project ON actions(project_id);
    CREATE INDEX IF NOT EXISTS idx_actions_group ON actions(group_id);
    CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
  `);
}

export async function createNote(
  id: string,
  projectId: string,
  userId: string,
  message: string,
  priority: string
) {
  if (!projectId) throw new Error("Project ID is required");
  await client.execute({
    sql: `INSERT INTO notes (id, project_id, user_id, message, priority)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, projectId, userId, message, priority],
  });
}

export default db;
