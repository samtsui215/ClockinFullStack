// app/api/time_entries/clock-in/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, project_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if user already has an active clock-in
    const existing = db.prepare(`
      SELECT id FROM time_entries 
      WHERE user_id = ? AND clock_out IS NULL
    `).get(user_id);

    if (existing) {
      return NextResponse.json(
        { error: "You already have an active clock-in session" },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Create new time entry with clock_in
    const stmt = db.prepare(`
      INSERT INTO time_entries (
        id, user_id, project_id, date, hours, 
        clock_in, clock_out, status, billable,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      user_id,
      project_id || null,
      today,
      0, // hours will be calculated on clock out
      now, // clock_in
      null, // clock_out
      'draft',
      1, // billable
      now,
      now
    );

    // Resume any carried-over actions for this user+project
    if (project_id) {
      db.prepare(`
        UPDATE actions
        SET last_resumed_at = ?, carried_over = 0
        WHERE user_id = ? AND project_id = ? AND carried_over = 1 AND completed_at IS NULL
      `).run(now, user_id, project_id);
    }

    // Return the created entry
    const newEntry = db.prepare(`
      SELECT 
        id, user_id, project_id, date, hours,
        clock_in, clock_out, status, billable
      FROM time_entries 
      WHERE id = ?
    `).get(id);

    return NextResponse.json(newEntry, { status: 201 });

  } catch (err) {
    console.error("Clock-in failed:", err);
    return NextResponse.json({ error: "Failed to clock in" }, { status: 500 });
  }
}