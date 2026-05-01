// app/api/time_entries/clock-out/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entry_id, clock_out: customClockOut, description, carry_over } = body;

    if (!entry_id) {
      return NextResponse.json({ error: "Entry ID is required" }, { status: 400 });
    }

    const entry = db.prepare(`
      SELECT id, user_id, project_id, clock_in, clock_out
      FROM time_entries WHERE id = ?
    `).get(entry_id) as { id: string; user_id: string; project_id: string; clock_in: string; clock_out: string | null } | undefined;

    if (!entry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }
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

    if (carry_over) {
      // Pause active (non-carried-over) actions: bank their elapsed time
      db.prepare(`
        UPDATE actions
        SET accumulated_seconds = accumulated_seconds + MAX(0, CAST(
              (julianday(?) - julianday(COALESCE(last_resumed_at, started_at))) * 86400.0
            AS INTEGER)),
            carried_over = 1,
            last_resumed_at = NULL
        WHERE user_id = ? AND project_id = ? AND completed_at IS NULL AND carried_over = 0
      `).run(clockOutTime, entry.user_id, entry.project_id);
    } else {
      // Complete active actions — accumulate their time then mark done
      db.prepare(`
        UPDATE actions
        SET completed_at = ?,
            accumulated_seconds = accumulated_seconds + MAX(0, CAST(
              (julianday(?) - julianday(COALESCE(last_resumed_at, started_at))) * 86400.0
            AS INTEGER)),
            last_resumed_at = NULL
        WHERE user_id = ? AND project_id = ? AND completed_at IS NULL AND carried_over = 0
      `).run(clockOutTime, clockOutTime, entry.user_id, entry.project_id);

      // Also complete any already-carried-over actions (frozen time, no accumulation)
      db.prepare(`
        UPDATE actions SET completed_at = ?
        WHERE user_id = ? AND project_id = ? AND completed_at IS NULL AND carried_over = 1
      `).run(clockOutTime, entry.user_id, entry.project_id);
    }

    const diffMs = new Date(clockOutTime).getTime() - new Date(entry.clock_in).getTime();
    const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE time_entries
      SET clock_out = ?, hours = ?, status = 'completed', description = ?, updated_at = ?
      WHERE id = ?
    `).run(clockOutTime, hours, description || null, now, entry_id);

    return NextResponse.json(
      db.prepare(`SELECT id, user_id, project_id, date, hours, clock_in, clock_out, status, description FROM time_entries WHERE id = ?`).get(entry_id)
    );

  } catch (err) {
    console.error("Clock-out failed:", err);
    return NextResponse.json({ error: "Failed to clock out" }, { status: 500 });
  }
}
