// app/api/time_entries/switch/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { randomUUID } from "crypto";
import { getSessionUser, unauthorized } from "@/lib/session";

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const { new_project_id, description } = await req.json();
    const user_id = sessionUser.id;

    if (!new_project_id) {
      return NextResponse.json({ error: "new_project_id is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const today = now.split("T")[0];

    const switchProject = db.transaction(() => {
      const active = db.prepare(`
        SELECT id, clock_in FROM time_entries
        WHERE user_id = ? AND clock_out IS NULL LIMIT 1
      `).get(user_id) as { id: string; clock_in: string } | undefined;

      if (active) {
        const diffMs = new Date(now).getTime() - new Date(active.clock_in).getTime();
        const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        db.prepare(`
          UPDATE time_entries
          SET clock_out = ?, hours = ?, status = 'completed', description = ?, updated_at = ?
          WHERE id = ?
        `).run(now, hours, description || null, now, active.id);

        const oldEntry = db.prepare(
          `SELECT project_id FROM time_entries WHERE id = ?`
        ).get(active.id) as { project_id: string } | undefined;
        if (oldEntry?.project_id) {
          db.prepare(`
            UPDATE actions
            SET completed_at = ?,
                accumulated_seconds = accumulated_seconds + MAX(0, CAST(
                  (julianday(?) - julianday(COALESCE(last_resumed_at, started_at))) * 86400.0
                AS INTEGER)),
                last_resumed_at = NULL
            WHERE user_id = ? AND project_id = ? AND completed_at IS NULL AND carried_over = 0
          `).run(now, now, user_id, oldEntry.project_id);
          db.prepare(`
            UPDATE actions SET completed_at = ?
            WHERE user_id = ? AND project_id = ? AND completed_at IS NULL AND carried_over = 1
          `).run(now, user_id, oldEntry.project_id);
        }
      }

      db.prepare(`
        UPDATE actions
        SET last_resumed_at = ?, carried_over = 0
        WHERE user_id = ? AND project_id = ? AND carried_over = 1 AND completed_at IS NULL
      `).run(now, user_id, new_project_id);

      const newId = randomUUID();
      db.prepare(`
        INSERT INTO time_entries (
          id, user_id, project_id, date, hours,
          clock_in, clock_out, status, billable, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, ?, NULL, 'draft', 1, ?, ?)
      `).run(newId, user_id, new_project_id, today, now, now, now);

      return db.prepare(`
        SELECT id, user_id, project_id, date, hours, clock_in, clock_out, status
        FROM time_entries WHERE id = ?
      `).get(newId);
    });

    const newEntry = switchProject();
    return NextResponse.json(newEntry, { status: 201 });
  } catch (err) {
    console.error("Switch failed:", err);
    return NextResponse.json({ error: "Failed to switch project" }, { status: 500 });
  }
}
