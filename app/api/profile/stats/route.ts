// app/api/profile/stats/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized } from "@/lib/session";
import { businessWeekStartDate, addDays } from "@/lib/time";

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const userId = sessionUser.id;

    // Business-week boundaries (YYYY-MM-DD), Monday-start.
    const weekStart = businessWeekStartDate();
    const weekEnd = addDays(weekStart, 6);
    const prevWeekStart = addDays(weekStart, -7);
    const prevWeekEnd = addDays(weekStart, -1);

    // Hours are grouped by the business `date` column.
    const hoursRow = await db.prepare(`
      SELECT COALESCE(SUM(hours), 0) as total
      FROM time_entries
      WHERE user_id = ? AND date >= ? AND date <= ? AND status = 'completed'
    `).get(userId, weekStart, weekEnd) as { total: number };

    const prevHoursRow = await db.prepare(`
      SELECT COALESCE(SUM(hours), 0) as total
      FROM time_entries
      WHERE user_id = ? AND date >= ? AND date <= ? AND status = 'completed'
    `).get(userId, prevWeekStart, prevWeekEnd) as { total: number };

    // Action counts compare against created_at/completed_at (timestamps); a
    // date-only bound works lexicographically against the ISO timestamps.
    const actionsCreatedRow = await db.prepare(`
      SELECT COUNT(*) as total FROM actions
      WHERE user_id = ? AND created_at >= ?
    `).get(userId, weekStart) as { total: number };

    const prevActionsCreatedRow = await db.prepare(`
      SELECT COUNT(*) as total FROM actions
      WHERE user_id = ? AND created_at >= ? AND created_at < ?
    `).get(userId, prevWeekStart, weekStart) as { total: number };

    const actionsCompletedRow = await db.prepare(`
      SELECT COUNT(*) as total FROM actions
      WHERE user_id = ? AND completed_at >= ?
    `).get(userId, weekStart) as { total: number };

    const activeProjectsRow = await db.prepare(`
      SELECT COUNT(DISTINCT project_id) as total FROM time_entries
      WHERE user_id = ? AND date >= ? AND date <= ?
    `).get(userId, weekStart, weekEnd) as { total: number };

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyHours = await Promise.all(days.map(async (day, i) => {
      const dateStr = addDays(weekStart, i);
      const row = await db.prepare(`
        SELECT COALESCE(SUM(hours), 0) as total
        FROM time_entries
        WHERE user_id = ? AND date = ? AND status = 'completed'
      `).get(userId, dateStr) as { total: number };

      return { day, hours: Math.round(row.total * 10) / 10 };
    }));

    const hoursDiff = hoursRow.total - prevHoursRow.total;
    const actionsDiff = actionsCreatedRow.total - prevActionsCreatedRow.total;

    const hoursTrend = prevHoursRow.total === 0
      ? { value: '+0%', isPositive: true }
      : {
          value: `${hoursDiff >= 0 ? '+' : ''}${Math.round((hoursDiff / prevHoursRow.total) * 100)}%`,
          isPositive: hoursDiff >= 0,
        };

    const actionsTrend = prevActionsCreatedRow.total === 0
      ? { value: '+0%', isPositive: true }
      : {
          value: `${actionsDiff >= 0 ? '+' : ''}${Math.round((actionsDiff / prevActionsCreatedRow.total) * 100)}%`,
          isPositive: actionsDiff >= 0,
        };

    return NextResponse.json({
      thisWeek: {
        hours: Math.round(hoursRow.total * 10) / 10,
        notes: actionsCreatedRow.total,
        completedNotes: actionsCompletedRow.total,
        activeProjects: activeProjectsRow.total,
      },
      trends: { hours: hoursTrend, notes: actionsTrend },
      dailyHours,
    });
  } catch (err) {
    console.error("Failed to fetch profile stats:", err);
    return NextResponse.json({ error: "Failed to fetch profile stats" }, { status: 500 });
  }
}
