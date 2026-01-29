// app/api/notes/[projectId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { randomUUID } from "crypto";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }  // ← Changed to Promise
) {
  const { projectId } = await params;  // ← Added await
  
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  try {
    const stmt = db.prepare(`
      SELECT 
        n.id,
        n.user_id,
        n.project_id,
        n.content,
        n.created_at,
        n.updated_at,
        n.completed,
        u.first_name,
        u.last_name,
        u.email
      FROM notes n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.project_id = ?
      ORDER BY n.completed ASC, n.created_at DESC
    `);

    const notes = stmt.all(projectId);
    return NextResponse.json(notes);
  } catch (err) {
    console.error("Failed to fetch notes:", err);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }  // ← Changed to Promise
) {
  const { projectId } = await params;  // ← Added await

  try {
    const body = await req.json();
    const { userId, content } = body;

    if (!userId || !content) {
      return NextResponse.json(
        { error: "userId and content are required" },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO notes (
        id, user_id, project_id, content, 
        completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?)
    `);

    stmt.run(id, userId, projectId, content, now, now);

    const newNote = db.prepare(`
      SELECT 
        n.id,
        n.user_id,
        n.project_id,
        n.content,
        n.created_at,
        n.updated_at,
        n.completed,
        u.first_name,
        u.last_name,
        u.email
      FROM notes n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.id = ?
    `).get(id);

    return NextResponse.json(newNote, { status: 201 });
  } catch (err) {
    console.error("Failed to create note:", err);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}