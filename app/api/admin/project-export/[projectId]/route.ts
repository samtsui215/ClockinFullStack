// app/api/admin/project-export/[projectId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized, forbidden } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.userType !== 'admin' && user.userType !== 'manager') return forbidden();

  const { projectId } = await params;
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  try {
    const project = await db.prepare(`
      SELECT id, title, category, client, budgeted_hours, start_date, end_date
      FROM projects WHERE id = ?
    `).get(projectId) as { id: string; title: string; category: string; client: string | null; budgeted_hours: number | null; start_date: string | null; end_date: string | null } | undefined;

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // All completed time entry sessions for this project
    const timeEntries = await db.prepare(`
      SELECT
        te.date,
        te.clock_in,
        te.clock_out,
        te.hours,
        te.description,
        u.first_name,
        u.last_name,
        u.email
      FROM time_entries te
      INNER JOIN users u ON te.user_id = u.id
      WHERE te.project_id = ? AND te.clock_out IS NOT NULL
      ORDER BY te.date ASC, te.clock_in ASC
    `).all(projectId);

    // All actions for this project with computed duration
    const actions = await db.prepare(`
      SELECT
        a.description,
        a.started_at,
        a.completed_at,
        CASE
          WHEN a.accumulated_seconds > 0 THEN a.accumulated_seconds
          WHEN a.completed_at IS NOT NULL
          THEN CAST((julianday(a.completed_at) - julianday(a.started_at)) * 86400 AS INTEGER)
          ELSE 0
        END as duration_seconds,
        u.first_name,
        u.last_name,
        u.email
      FROM actions a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.project_id = ?
      ORDER BY a.started_at ASC
    `).all(projectId);

    return NextResponse.json({ project, timeEntries, actions });
  } catch (err) {
    console.error("Failed to fetch project export data:", err);
    return NextResponse.json({ error: "Failed to fetch export data" }, { status: 500 });
  }
}
