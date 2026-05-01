// app/api/time_entries/manual/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/database';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  try {
    const {
      user_id,
      project_id,
      date,
      hours,
      clock_in,
      clock_out,
      description,
      status = 'submitted',
    } = await req.json();

    if (!user_id || !project_id || !date || hours == null || !clock_in || !clock_out) {
      return NextResponse.json(
        { error: 'user_id, project_id, date, hours, clock_in, and clock_out are required' },
        { status: 400 }
      );
    }

    if (hours <= 0) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Ensure no active (open) entry exists for this user
    const activeEntry = db.prepare(`
      SELECT id FROM time_entries
      WHERE user_id = ? AND clock_out IS NULL
    `).get(user_id);

    if (activeEntry) {
      return NextResponse.json(
        { error: 'You are currently clocked in. Please clock out before adding a manual entry.' },
        { status: 409 }
      );
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO time_entries
        (id, user_id, project_id, date, hours, description, billable, status, clock_in, clock_out, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `).run(id, user_id, project_id, date, hours, description ?? null, status, clock_in, clock_out, now, now);

    const entry = db.prepare(`SELECT * FROM time_entries WHERE id = ?`).get(id);
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error('Failed to create manual time entry:', err);
    return NextResponse.json({ error: 'Failed to create time entry' }, { status: 500 });
  }
}