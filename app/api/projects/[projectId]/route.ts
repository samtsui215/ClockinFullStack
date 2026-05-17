// app/api/projects/[projectId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized, forbidden } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const { projectId } = await params;

  try {
    const project = await db.prepare(
      "SELECT id, title, category, is_archived FROM projects WHERE id = ? AND is_active = 1"
    ).get(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (err) {
    console.error("Failed to fetch project:", err);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.userType !== 'admin' && user.userType !== 'manager') return forbidden();

  const { projectId } = await params;
  const { action } = await req.json();

  try {
    if (action === 'archive') {
      const active = await db.prepare(
        `SELECT id FROM time_entries WHERE project_id = ? AND clock_out IS NULL LIMIT 1`
      ).get(projectId);
      if (active) return NextResponse.json({ error: "Cannot archive a project while someone is clocked in" }, { status: 400 });
      await db.prepare(`UPDATE projects SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(projectId);
    } else if (action === 'unarchive') {
      await db.prepare(`UPDATE projects SET is_archived = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(projectId);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await db.prepare(`SELECT id, title, category, is_archived FROM projects WHERE id = ?`).get(projectId);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update project:", err);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}
