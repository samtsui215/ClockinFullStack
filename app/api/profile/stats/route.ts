// app/api/profile/stats/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized } from "@/lib/session";

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const userId = sessionUser.id;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekStart);

    const weekStartISO = weekStart.toISOString();
    const prevWeekStartISO = prevWeekStart.toISOString();
    const prevWeekEndISO = prevWeekEnd.toISOString();

    const hoursRow = db.prepare(`
      SELECT COALESCE(SUM(hours), 0) as total
      FROM time_entries
      WHERE user_id = ? AND clock_in >= ? AND status = 'completed'
    `).get(userId, weekStartISO) as { total: number };

    const prevHoursRow = db.prepare(`
      SELECT COALESCE(SUM(hours), 0) as total
      FROM time_entries
      WHERE user_id = ? AND clock_in >= ? AND clock_in < ? AND status = 'completed'
    `).get(userId, prevWeekStartISO, prevWeekEndISO) as { total: number };

    const actionsCreatedRow = db.prepare(`
      SELECT COUNT(*) as total FROM actions
      WHERE user_id = ? AND created_at >= ?
    `).get(userId, weekStartISO) as { total: number };

    const prevActionsCreatedRow = db.prepare(`
      SELECT COUNT(*) as total FROM actions
      WHERE user_id = ? AND created_at >= ? AND created_at < ?
    `).get(userId, prevWeekStartISO, prevWeekEndISO) as { total: number };

    const actionsCompletedRow = db.prepare(`
      SELECT COUNT(*) as total FROM actions
      WHERE user_id = ? AND completed_at >= ?
    `).get(userId, weekStartISO) as { total: number };

    const activeProjectsRow = db.prepare(`
      SELECT COUNT(DISTINCT project_id) as total FROM time_entries
      WHERE user_id = ? AND clock_in >= ?
    `).get(userId, weekStartISO) as { total: number };

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyHours = days.map((day, i) => {
      const dayStart = new Date(weekStart);
      dayStart.setDate(weekStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const row = db.prepare(`
        SELECT COALESCE(SUM(hours), 0) as total
        FROM time_entries
        WHERE user_id = ? AND clock_in >= ? AND clock_in < ? AND status = 'completed'
      `).get(userId, dayStart.toISOString(), dayEnd.toISOString()) as { total: number };

      return { day, hours: Math.round(row.total * 10) / 10 };
    });

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
