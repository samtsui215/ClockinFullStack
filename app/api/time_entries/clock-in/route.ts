// app/api/time_entries/clock-in/route.ts
import { NextResponse } from "next/server";
import { client } from "@/lib/database";
import type { Transaction } from "@libsql/client";
import { randomUUID } from "crypto";
import { getSessionUser, unauthorized } from "@/lib/session";
import { businessDate, MAX_SESSION_MS } from "@/lib/time";

type StaleEntry = { id: string; clock_in: string; project_id: string | null };

/**
 * Closes a forgotten ("stale") session: caps it at clock_in + MAX_SESSION_MS,
 * flags it 'needs_review', and completes its in-progress actions accordingly.
 */
async function closeStaleEntry(tx: Transaction, entry: StaleEntry, userId: string) {
  const cappedOut = new Date(
    new Date(entry.clock_in).getTime() + MAX_SESSION_MS
  ).toISOString();
  const hours = Math.round((MAX_SESSION_MS / 3_600_000) * 100) / 100;

  await tx.execute({
    sql: `UPDATE time_entries
          SET clock_out = ?, hours = ?, status = 'needs_review', updated_at = ?
          WHERE id = ?`,
    args: [cappedOut, hours, new Date().toISOString(), entry.id],
  });

  if (entry.project_id) {
    await tx.execute({
      sql: `UPDATE actions
            SET completed_at = ?,
                accumulated_seconds = accumulated_seconds + MAX(0, CAST(
                  (julianday(?) - julianday(COALESCE(last_resumed_at, started_at))) * 86400.0
                AS INTEGER)),
                last_resumed_at = NULL
            WHERE user_id = ? AND project_id = ? AND completed_at IS NULL AND carried_over = 0`,
      args: [cappedOut, cappedOut, userId, entry.project_id],
    });
    await tx.execute({
      sql: `UPDATE actions SET completed_at = ?
            WHERE user_id = ? AND project_id = ? AND completed_at IS NULL AND carried_over = 1`,
      args: [cappedOut, userId, entry.project_id],
    });
  }
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const body = await req.json();
    const { project_id } = body;
    const user_id = sessionUser.id;

    const tx = await client.transaction("write");
    try {
      // Is there already an open session?
      const activeRes = await tx.execute({
        sql: `SELECT id, clock_in, project_id FROM time_entries
              WHERE user_id = ? AND clock_out IS NULL`,
        args: [user_id],
      });
      const active = activeRes.rows[0] as unknown as StaleEntry | undefined;

      if (active) {
        const age = Date.now() - new Date(active.clock_in).getTime();
        if (age <= MAX_SESSION_MS) {
          // A genuinely active session — block the new clock-in.
          await tx.rollback();
          return NextResponse.json(
            { error: "You already have an active clock-in session" },
            { status: 400 }
          );
        }
        // Forgotten clock-out — auto-close it (capped + flagged) and continue.
        await closeStaleEntry(tx, active, user_id);
      }

      // Project archived guard.
      if (project_id) {
        const projRes = await tx.execute({
          sql: `SELECT is_archived FROM projects WHERE id = ?`,
          args: [project_id],
        });
        const project = projRes.rows[0] as unknown as { is_archived: number } | undefined;
        if (project?.is_archived) {
          await tx.rollback();
          return NextResponse.json(
            { error: "Cannot clock in to an archived project" },
            { status: 400 }
          );
        }
      }

      const id = randomUUID();
      const now = new Date().toISOString();
      const today = businessDate(now);

      await tx.execute({
        sql: `INSERT INTO time_entries (
                id, user_id, project_id, date, hours,
                clock_in, clock_out, status, billable, created_at, updated_at
              ) VALUES (?, ?, ?, ?, 0, ?, NULL, 'draft', 1, ?, ?)`,
        args: [id, user_id, project_id || null, today, now, now, now],
      });

      if (project_id) {
        await tx.execute({
          sql: `UPDATE actions
                SET last_resumed_at = ?, carried_over = 0
                WHERE user_id = ? AND project_id = ? AND carried_over = 1 AND completed_at IS NULL`,
          args: [now, user_id, project_id],
        });
      }

      const newRes = await tx.execute({
        sql: `SELECT id, user_id, project_id, date, hours, clock_in, clock_out, status, billable
              FROM time_entries WHERE id = ?`,
        args: [id],
      });

      await tx.commit();
      return NextResponse.json(newRes.rows[0], { status: 201 });
    } catch (e) {
      try { await tx.rollback(); } catch { /* already closed */ }
      throw e;
    }
  } catch (err) {
    console.error("Clock-in failed:", err);
    return NextResponse.json({ error: "Failed to clock in" }, { status: 500 });
  }
}
