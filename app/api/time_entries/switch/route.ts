// app/api/time_entries/switch/route.ts
import { NextResponse } from "next/server";
import { client } from "@/lib/database";
import { randomUUID } from "crypto";
import { getSessionUser, unauthorized } from "@/lib/session";
import { businessDate, MAX_SESSION_MS } from "@/lib/time";

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
    const today = businessDate(now);

    const tx = await client.transaction("write");
    try {
      const activeRes = await tx.execute({
        sql: `SELECT id, project_id, clock_in FROM time_entries
              WHERE user_id = ? AND clock_out IS NULL LIMIT 1`,
        args: [user_id],
      });
      const active = activeRes.rows[0] as unknown as
        | { id: string; project_id: string | null; clock_in: string }
        | undefined;

      if (active) {
        // Close the old session, capping a forgotten one at MAX_SESSION_MS.
        const clockInMs = new Date(active.clock_in).getTime();
        let oldClockOut = now;
        let oldStatus = 'completed';
        if (new Date(now).getTime() - clockInMs > MAX_SESSION_MS) {
          oldClockOut = new Date(clockInMs + MAX_SESSION_MS).toISOString();
          oldStatus = 'needs_review';
        }
        const hours = Math.round(
          ((new Date(oldClockOut).getTime() - clockInMs) / 3_600_000) * 100
        ) / 100;

        await tx.execute({
          sql: `UPDATE time_entries
                SET clock_out = ?, hours = ?, status = ?, description = ?, updated_at = ?
                WHERE id = ?`,
          args: [oldClockOut, hours, oldStatus, description || null, now, active.id],
        });

        if (active.project_id) {
          await tx.execute({
            sql: `UPDATE actions
                  SET completed_at = ?,
                      accumulated_seconds = accumulated_seconds + MAX(0, CAST(
                        (julianday(?) - julianday(COALESCE(last_resumed_at, started_at))) * 86400.0
                      AS INTEGER)),
                      last_resumed_at = NULL
                  WHERE user_id = ? AND project_id = ? AND completed_at IS NULL AND carried_over = 0`,
            args: [oldClockOut, oldClockOut, user_id, active.project_id],
          });
          await tx.execute({
            sql: `UPDATE actions SET completed_at = ?
                  WHERE user_id = ? AND project_id = ? AND completed_at IS NULL AND carried_over = 1`,
            args: [oldClockOut, user_id, active.project_id],
          });
        }
      }

      // Resume any carried-over actions on the project being switched to.
      await tx.execute({
        sql: `UPDATE actions
              SET last_resumed_at = ?, carried_over = 0
              WHERE user_id = ? AND project_id = ? AND carried_over = 1 AND completed_at IS NULL`,
        args: [now, user_id, new_project_id],
      });

      const newId = randomUUID();
      await tx.execute({
        sql: `INSERT INTO time_entries (
                id, user_id, project_id, date, hours,
                clock_in, clock_out, status, billable, created_at, updated_at
              ) VALUES (?, ?, ?, ?, 0, ?, NULL, 'draft', 1, ?, ?)`,
        args: [newId, user_id, new_project_id, today, now, now, now],
      });

      const newRes = await tx.execute({
        sql: `SELECT id, user_id, project_id, date, hours, clock_in, clock_out, status
              FROM time_entries WHERE id = ?`,
        args: [newId],
      });

      await tx.commit();
      return NextResponse.json(newRes.rows[0], { status: 201 });
    } catch (e) {
      try { await tx.rollback(); } catch { /* already closed */ }
      throw e;
    }
  } catch (err) {
    console.error("Switch failed:", err);
    return NextResponse.json({ error: "Failed to switch project" }, { status: 500 });
  }
}
