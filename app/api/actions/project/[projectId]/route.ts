// app/api/actions/project/[projectId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Fetch all actions for this project, grouped by group_id
    // In-progress (completed_at IS NULL) first, then completed ordered by most recent
    const actions = db.prepare(`
      SELECT 
        a.*,
        u.first_name,
        u.last_name,
        u.email
      FROM actions a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.project_id = ?
      ORDER BY 
        CASE WHEN a.completed_at IS NULL THEN 0 ELSE 1 END ASC,
        a.started_at DESC
    `).all(projectId);

    return NextResponse.json(actions);
  } catch (err) {
    console.error("Failed to fetch project actions:", err);
    return NextResponse.json({ error: "Failed to fetch project actions" }, { status: 500 });
  }
}