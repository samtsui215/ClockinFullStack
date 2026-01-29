// app/api/time_entries/clock-out/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entry_id } = body;

    if (!entry_id) {
      return NextResponse.json({ error: "Entry ID is required" }, { status: 400 });
    }

    // Get the existing entry
    const entry = db.prepare(`
      SELECT id, clock_in, clock_out 
      FROM time_entries 
      WHERE id = ?
    `).get(entry_id) as { id: string; clock_in: string; clock_out: string | null } | undefined;

    if (!entry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    if (entry.clock_out) {
      return NextResponse.json(
        { error: "This entry has already been clocked out" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const clockInTime = new Date(entry.clock_in);
    const clockOutTime = new Date(now);

    // Calculate hours (difference in milliseconds / 1000 / 60 / 60)
    const diffInMs = clockOutTime.getTime() - clockInTime.getTime();
    const hours = diffInMs / (1000 * 60 * 60);
    const roundedHours = Math.round(hours * 100) / 100; // Round to 2 decimal places

    // Update the entry with clock_out time and calculated hours
    const stmt = db.prepare(`
      UPDATE time_entries 
      SET 
        clock_out = ?,
        hours = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(now, roundedHours, 'completed', now, entry_id);

    // Return the updated entry
    const updatedEntry = db.prepare(`
      SELECT 
        id, user_id, project_id, date, hours,
        clock_in, clock_out, status, billable
      FROM time_entries 
      WHERE id = ?
    `).get(entry_id);

    return NextResponse.json(updatedEntry);

  } catch (err) {
    console.error("Clock-out failed:", err);
    return NextResponse.json({ error: "Failed to clock out" }, { status: 500 });
  }
}