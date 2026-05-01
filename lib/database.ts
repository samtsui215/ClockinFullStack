// lib/database.ts
import Database from 'better-sqlite3';

const db = new Database('database.db');

export function initDatabase() {
  db.exec(`
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (time_entry_id) REFERENCES time_entries(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
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
  `);

  // Migrations for existing databases — silently skip if column already exists
  const migrations = [
    'ALTER TABLE time_entries ADD COLUMN clock_in DATETIME',
    'ALTER TABLE time_entries ADD COLUMN clock_out DATETIME',
    'ALTER TABLE actions ADD COLUMN accumulated_seconds INTEGER DEFAULT 0',
    'ALTER TABLE actions ADD COLUMN carried_over INTEGER DEFAULT 0',
    'ALTER TABLE actions ADD COLUMN last_resumed_at DATETIME',
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* already exists */ }
  }
}

export function createNote(
  id: string,
  projectId: string,
  userId: string,
  message: string,
  priority: string
) {
  if (projectId) {
    const stmt = db.prepare(`
      INSERT INTO notes (id, project_id, user_id, message, priority)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, projectId, userId, message, priority);
  } else {
    throw new Error("Project ID is required");
  }
}

// Initialize the database when this file is imported
initDatabase();

export default db;