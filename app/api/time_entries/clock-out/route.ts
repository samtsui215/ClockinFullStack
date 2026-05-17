// app/api/time_entries/clock-out/route.ts
import { NextResponse } from "next/server";
import { client } from "@/lib/database";
import { getSessionUser, unauthorized, forbidden } from "@/lib/session";
import { MAX_SESSION_MS } from "@/lib/time";

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const body = await req.json();
    const { entry_id, clock_out: customClockOut, description, carry_over } = body;

    if (!entry_id) {
      return NextResponse.json({ error: "Entry ID is required" }, { status: 400 });
    }

    const entryRes = await client.execute({
      sql: `SELECT id, user_id, project_id, clock_in, clock_out
            FROM time_entries WHERE id = ?`,
      args: [entry_id],
    });
    const entry = entryRes.rows[0] as unknown as
      | { id: string; user_id: string; project_id: string | null; clock_in: string; clock_out: string | null }
      | undefined;

    if (!entry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }
    if (entry.user_id !== sessionUser.id) return forbidden();
    if (entry.clock_out) {
      return NextResponse.json({ error: "This entry has already been clocked out" }, { status: 400 });
    }

    let clockOutTime: string;
    if (customClockOut) {
      const custom = new Date(customClockOut);
      if (isNaN(custom.getTime())) {
        return NextResponse.json({ error: "Invalid clock-out time" }, { status: 400 });
      }
      if (custom <= new Date(entry.clock_in)) {
        return NextResponse.json({ error: "Clock-out time must be after clock-in time" }, { status: 400 });
      }
      if (custom > new Date()) {
        return NextResponse.json({ error: "Clock-out time cannot be in the future" }, { status: 400 });
      }
      clockOutTime = custom.toISOString();
    } else {
      clockOutTime = new Date().toISOString();
    }

    // Forgotten clock-out guard: cap an over-long session and flag it for review.
    let status = 'completed';
    const clockInMs = new Date(entry.clock_in).getTime();
    if (new Date(clockOutTime).getTime() - clockInMs > MAX_SESSION_MS) {
      clockOutTime = new Date(clockInMs + MAX_SESSION_MS).toISOString();
      status = 'needs_review';
    }

    const diffMs = new Date(clockOutTime).getTime() - clockInMs;
    const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    const now = new Date().toISOString();

    const tx = await client.transaction("write");
    try {
      if (carry_over) {
        // Pause active (non-carried-over) actions: bank their elapsed time.
        await tx.execute({
          sql: `UPDATE actions
                SET accumulated_seconds = accumulated_seconds + MAX(0, CAST(
                      (julianday(?) - julianday(COALESCE(last_resumed_at, started_at))) * 86400.0
                    AS INTEGER)),
                    carried_over = 1,
                    last_resumed_at = NULL
                WHERE user_id = ? AND project_id = ? AND completed_at IS NULL AND carried_over = 0`,
          args: [clockOutTime, entry.user_id, entry.project_id],
        });
      } else {
        // Complete active actions — accumulate their time then mark done.
        await tx.execute({
          sql: `UPDATE actions
                SET completed_at = ?,
                    accumulated_seconds = accumulated_seconds + MAX(0, CAST(
                      (julianday(?) - julianday(COALESCE(last_resumed_at, started_at))) * 86400.0
                    AS INTEGER)),
                    last_resumed_at = NULL
                WHERE user_id = ? AND project_id = ? AND completed_at IS NULL AND carried_over = 0`,
          args: [clockOutTime, clockOutTime, entry.user_id, entry.project_id],
        });
        // Also complete any already-carried-over actions (frozen time).
        await tx.execute({
          sql: `UPDATE actions SET completed_at = ?
                WHERE user_id = ? AND project_id = ? AND completed_at IS NULL AND carried_over = 1`,
          args: [clockOutTime, entry.user_id, entry.project_id],
        });
      }

      await tx.execute({
        sql: `UPDATE time_entries
              SET clock_out = ?, hours = ?, status = ?, description = ?, updated_at = ?
              WHERE id = ?`,
        args: [clockOutTime, hours, status, description || null, now, entry_id],
      });

      await tx.commit();
    } catch (e) {
      try { await tx.rollback(); } catch { /* already closed */ }
      throw e;
    }

    const updated = await client.execute({
      sql: `SELECT id, user_id, project_id, date, hours, clock_in, clock_out, status, description
            FROM time_entries WHERE id = ?`,
      args: [entry_id],
    });
    return NextResponse.json(updated.rows[0]);
  } catch (err) {
    console.error("Clock-out failed:", err);
    return NextResponse.json({ error: "Failed to clock out" }, { status: 500 });
  }
}
