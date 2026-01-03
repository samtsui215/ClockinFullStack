// `/api/notes/[projectId]/route.ts`
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { randomUUID } from "crypto";

// GET notes for a project
export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const stmt = db.prepare(`
    SELECT 
      notes.id,
      notes.user_id,
      notes.project_id,
      notes.content,
      notes.created_at,
      notes.updated_at,
      notes.completed,
      users.first_name,
      users.last_name,
      users.email
    FROM notes
    JOIN users ON users.id = notes.user_id
    WHERE notes.project_id = ?
    ORDER BY notes.created_at DESC
  `);

  const notes = stmt.all(projectId);
  return NextResponse.json(notes);
}

// POST a new note
export async function POST(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;
  const body = await req.json();
  const { userId, content } = body;

  // Log values received from frontend
  console.log("POST body:", { projectId, userId, content });

  if (!projectId || !userId || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    // Check if user exists
    const userCheck = db.prepare("SELECT id FROM users WHERE id = ?");
    const userExists = userCheck.get(userId);
    
    if (!userExists) {
      console.error("User not found:", userId);
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    // Check if project exists
    const projectCheck = db.prepare("SELECT id FROM projects WHERE id = ?");
    const projectExists = projectCheck.get(projectId);
    
    if (!projectExists) {
      console.error("Project not found:", projectId);
      return NextResponse.json({ error: "Project not found in database" }, { status: 404 });
    }

    const stmt = db.prepare(`
      INSERT INTO notes (id, user_id, project_id, content, created_at, updated_at, completed)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 0)
    `);
    stmt.run(randomUUID(), userId, projectId, content);
  } catch (err) {
    console.error("DB insert failed:", err);
    return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}