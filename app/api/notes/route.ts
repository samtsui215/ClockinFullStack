import { NextResponse } from "next/server";
import db from "@/lib/database";
import { randomUUID } from "crypto";
import { getSessionUser, unauthorized } from "@/lib/session";

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const body = await req.json();
    const { projectId, message, priority } = body;

    if (!projectId || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "projectId and message are required" },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO notes (id, project_id, user_id, message, priority, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, projectId, sessionUser.id, message.trim(), priority ?? 'medium', now, now);

    const newNote = await db.prepare(`SELECT * FROM notes WHERE id = ?`).get(id);
    return NextResponse.json(newNote, { status: 201 });
  } catch (err) {
    console.error("Failed to create note:", err);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
