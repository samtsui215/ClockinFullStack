import { NextResponse } from "next/server";
import db from "@/lib/database";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const body = await req.json();
  const { projectId, userId, userName, content } = body;

  if (projectId && userId && content && userName) {
    const stmt = db.prepare(`
      INSERT INTO notes (id, project_id, user_id, content)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(randomUUID(), projectId, userId, userName, content);
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
}
