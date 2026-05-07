// app/api/projects/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { randomUUID } from "crypto";
import { getSessionUser, unauthorized } from "@/lib/session";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const stmt = db.prepare("SELECT id, title, category FROM projects WHERE is_active = 1");
    const projects = stmt.all();
    return NextResponse.json(projects);
  } catch (err) {
    console.error("Failed to fetch projects:", err);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const body = await req.json();
    const { title, category, description, client, budgeted_hours, start_date, end_date } = body;
    const created_by = sessionUser.id;

    // Validation
    if (!title || !category) {
      return NextResponse.json(
        { error: "Title and category are required" },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO projects (
        id, title, category, description, client, budgeted_hours, 
        start_date, end_date, created_by, created_at, updated_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    stmt.run(
      id,
      title,
      category,
      description || null,
      client || null,
      budgeted_hours || null,
      start_date || null,
      end_date || null,
      created_by || null,
      now,
      now
    );

    // Return the newly created project
    const newProject = db.prepare("SELECT id, title, category FROM projects WHERE id = ?").get(id);
    
    return NextResponse.json(newProject, { status: 201 });
  } catch (err) {
    console.error("Failed to create project:", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}