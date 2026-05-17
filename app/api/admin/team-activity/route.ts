// app/api/admin/team-activity/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized, forbidden } from "@/lib/session";
import { businessWeekStartDate } from "@/lib/time";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.userType !== 'admin' && user.userType !== 'manager') return forbidden();

  try {
    const activeSessions = await db.prepare(`
      SELECT
        te.id         AS entry_id,
        te.clock_in,
        u.id          AS user_id,
        u.first_name,
        u.last_name,
        p.id          AS project_id,
        p.title       AS project_title,
        p.category    AS project_category
      FROM time_entries te
      JOIN  users    u ON te.user_id    = u.id
      LEFT JOIN projects p ON te.project_id = p.id
      WHERE te.clock_out IS NULL
      ORDER BY te.clock_in ASC
    `).all() as Array<{
      entry_id: string; clock_in: string;
      user_id: string; first_name: string; last_name: string;
      project_id: string; project_title: string; project_category: string;
    }>;

    const weekStart = businessWeekStartDate();
    const weeklyRow = await db.prepare(`
      SELECT COALESCE(SUM(hours), 0) AS total
      FROM time_entries
      WHERE date >= ? AND status = 'completed'
    `).get(weekStart) as { total: number };

    const employeeCount = await db.prepare(
      `SELECT COUNT(*) AS cnt FROM users WHERE is_active = 1`
    ).get() as { cnt: number };

    return NextResponse.json({
      activeSessions,
      teamHoursThisWeek: Math.round(weeklyRow.total * 10) / 10,
      activeCount: activeSessions.length,
      employeeCount: employeeCount.cnt,
    });
  } catch (err) {
    console.error("Failed to fetch team activity:", err);
    return NextResponse.json({ error: "Failed to fetch team activity" }, { status: 500 });
  }
}
