// app/api/admin/project-stats/[projectId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Per-user hours + action counts for this project
    const userStats = db.prepare(`
      SELECT
        u.id,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email,
        ROUND(COALESCE(SUM(
          CASE
            WHEN te.clock_out IS NOT NULL
            THEN (julianday(te.clock_out) - julianday(te.clock_in)) * 24
            ELSE 0
          END
        ), 0), 2) as totalHours,
        COUNT(te.id) as sessionCount,
        MIN(te.clock_in) as firstClockIn,
        MAX(te.clock_in) as lastClockIn,
        (
          SELECT COUNT(*) FROM actions a
          WHERE a.user_id = u.id AND a.project_id = te.project_id AND a.completed_at IS NOT NULL
        ) as completedActions,
        (
          SELECT COUNT(*) FROM actions a
          WHERE a.user_id = u.id AND a.project_id = te.project_id AND a.completed_at IS NULL
        ) as inProgressActions
      FROM users u
      INNER JOIN time_entries te ON u.id = te.user_id AND te.project_id = ?
      GROUP BY u.id
      ORDER BY totalHours DESC
    `).all(projectId);

    // Users currently clocked in on this project
    const activeUsers = db.prepare(`
      SELECT
        u.id,
        u.first_name as firstName,
        u.last_name as lastName,
        te.clock_in as clockedInSince
      FROM time_entries te
      INNER JOIN users u ON te.user_id = u.id
      WHERE te.project_id = ? AND te.clock_out IS NULL
    `).all(projectId);

    return NextResponse.json({ userStats, activeUsers });
  } catch (err) {
    console.error("Failed to fetch project stats:", err);
    return NextResponse.json({ error: "Failed to fetch project stats", detail: String(err) }, { status: 500 });
  }
}