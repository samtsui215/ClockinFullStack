// app/api/notes/[projectId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { randomUUID } from "crypto";
import { getSessionUser, unauthorized } from "@/lib/session";

const NOTE_SELECT = `
  SELECT
    n.id,
    n.user_id,
    n.project_id,
    n.message,
    n.note_type,
    n.completed,
    n.priority,
    n.created_at,
    n.updated_at,
    u.first_name,
    u.last_name,
    u.email
  FROM notes n
  LEFT JOIN users u ON n.user_id = u.id
`;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const { projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  try {
    const notes = await db.prepare(`
      ${NOTE_SELECT}
      WHERE n.project_id = ?
      ORDER BY n.completed ASC, n.created_at DESC
    `).all(projectId);
    return NextResponse.json(notes);
  } catch (err) {
    console.error("Failed to fetch notes:", err);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const { projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { message, priority } = body;

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO notes (
        id, user_id, project_id, message, priority,
        completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, sessionUser.id, projectId, message.trim(), priority ?? 'medium', now, now);

    const newNote = await db.prepare(`${NOTE_SELECT} WHERE n.id = ?`).get(id);
    return NextResponse.json(newNote, { status: 201 });
  } catch (err) {
    console.error("Failed to create note:", err);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
