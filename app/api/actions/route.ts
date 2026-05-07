// app/api/actions/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { randomUUID } from "crypto";
import { getSessionUser, unauthorized } from "@/lib/session";

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const actions = db.prepare(`
      SELECT id, group_id, time_entry_id, user_id, project_id, description,
             started_at, completed_at, created_at,
             accumulated_seconds, carried_over, last_resumed_at
      FROM actions
      WHERE user_id = ? AND project_id = ? AND completed_at IS NULL
      ORDER BY started_at ASC
    `).all(sessionUser.id, projectId);

    return NextResponse.json(actions);
  } catch (err) {
    console.error("Failed to fetch actions:", err);
    return NextResponse.json({ error: "Failed to fetch actions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const body = await req.json();
    const { project_id, description, time_entry_id, group_id, retroactive, duration_minutes } = body;
    const user_id = sessionUser.id;

    if (!project_id || !description?.trim()) {
      return NextResponse.json(
        { error: "project_id and description are required" },
        { status: 400 }
      );
    }

    if (retroactive) {
      if (!time_entry_id || !duration_minutes || duration_minutes <= 0) {
        return NextResponse.json(
          { error: "time_entry_id and duration_minutes are required for retroactive actions" },
          { status: 400 }
        );
      }

      const entry = db.prepare(
        `SELECT clock_in FROM time_entries WHERE id = ? AND user_id = ?`
      ).get(time_entry_id, user_id) as { clock_in: string } | undefined;

      if (!entry) {
        return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
      }

      const id = randomUUID();
      const newGroupId = randomUUID();
      const startedAt = entry.clock_in;
      const completedAt = new Date(
        new Date(entry.clock_in).getTime() + duration_minutes * 60_000
      ).toISOString();
      const accumulatedSeconds = duration_minutes * 60;

      db.prepare(`
        INSERT INTO actions (
          id, group_id, time_entry_id, user_id, project_id, description,
          started_at, completed_at, accumulated_seconds, carried_over, last_resumed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)
      `).run(id, newGroupId, time_entry_id, user_id, project_id, description.trim(),
             startedAt, completedAt, accumulatedSeconds, new Date().toISOString());

      return NextResponse.json(db.prepare(`SELECT * FROM actions WHERE id = ?`).get(id), { status: 201 });
    }

    const id = randomUUID();
    const resolvedGroupId = group_id || randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO actions (
        id, group_id, time_entry_id, user_id, project_id, description,
        started_at, last_resumed_at, accumulated_seconds, carried_over, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    `).run(id, resolvedGroupId, time_entry_id || null, user_id, project_id,
           description.trim(), now, now, now);

    const action = db.prepare(`SELECT * FROM actions WHERE id = ?`).get(id) as Record<string, unknown>;
    return NextResponse.json({ ...action, group_id: resolvedGroupId }, { status: 201 });
  } catch (err) {
    console.error("Failed to create action:", err);
    return NextResponse.json({ error: "Failed to create action" }, { status: 500 });
  }
}
