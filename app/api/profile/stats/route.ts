// app/api/profile/stats/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get current week start and end
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Get last week's dates for comparison
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);

    // Total hours this week
    const thisWeekHours = db.prepare(`
      SELECT COALESCE(SUM(hours), 0) as total
      FROM time_entries
      WHERE user_id = ? 
        AND date >= ? 
        AND date < ?
    `).get(userId, weekStart.toISOString(), weekEnd.toISOString()) as { total: number };

    // Total hours last week
    const lastWeekHours = db.prepare(`
      SELECT COALESCE(SUM(hours), 0) as total
      FROM time_entries
      WHERE user_id = ? 
        AND date >= ? 
        AND date < ?
    `).get(userId, lastWeekStart.toISOString(), lastWeekEnd.toISOString()) as { total: number };

    // Notes created this week
    const thisWeekNotes = db.prepare(`
      SELECT COUNT(*) as count
      FROM notes
      WHERE user_id = ? 
        AND created_at >= ? 
        AND created_at < ?
    `).get(userId, weekStart.toISOString(), weekEnd.toISOString()) as { count: number };

    // Notes created last week
    const lastWeekNotes = db.prepare(`
      SELECT COUNT(*) as count
      FROM notes
      WHERE user_id = ? 
        AND created_at >= ? 
        AND created_at < ?
    `).get(userId, lastWeekStart.toISOString(), lastWeekEnd.toISOString()) as { count: number };

    // Completed notes this week
    const completedNotes = db.prepare(`
      SELECT COUNT(*) as count
      FROM notes
      WHERE user_id = ? 
        AND completed = 1
        AND updated_at >= ?
        AND updated_at < ?
    `).get(userId, weekStart.toISOString(), weekEnd.toISOString()) as { count: number };

    // Active projects (UPDATED: Based on time clocked THIS WEEK)
    const activeProjects = db.prepare(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM projects p
      INNER JOIN time_entries t ON p.id = t.project_id
      WHERE t.user_id = ?
        AND p.is_active = 1
        AND t.date >= ? 
        AND t.date < ?
    `).get(userId, weekStart.toISOString(), weekEnd.toISOString()) as { count: number };

    // Daily breakdown for the week
    const dailyHours = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(weekStart);
      dayStart.setDate(weekStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      // Note: Check your time_entries table schema - adjust column names if needed
      // Common columns: hours, duration, time_spent, etc.
      const result = db.prepare(`
        SELECT COALESCE(SUM(hours), 0) as hours
        FROM time_entries
        WHERE user_id = ? 
          AND date >= ? 
          AND date < ?
      `).get(userId, dayStart.toISOString(), dayEnd.toISOString()) as { hours: number };

      dailyHours.push({
        day: days[i],
        hours: Number(result.hours.toFixed(1)),
      });
    }

    // Calculate trends
    const hoursTrend = lastWeekHours.total > 0
      ? (((thisWeekHours.total - lastWeekHours.total) / lastWeekHours.total) * 100).toFixed(1)
      : thisWeekHours.total > 0 ? '100.0' : '0.0';

    const notesTrend = lastWeekNotes.count > 0
      ? (((thisWeekNotes.count - lastWeekNotes.count) / lastWeekNotes.count) * 100).toFixed(1)
      : thisWeekNotes.count > 0 ? '100.0' : '0.0';

    return NextResponse.json({
      thisWeek: {
        hours: Number(thisWeekHours.total.toFixed(1)),
        notes: thisWeekNotes.count,
        completedNotes: completedNotes.count,
        activeProjects: activeProjects.count,
      },
      trends: {
        hours: {
          value: `${Math.abs(Number(hoursTrend))}%`,
          isPositive: Number(hoursTrend) >= 0,
        },
        notes: {
          value: `${Math.abs(Number(notesTrend))}%`,
          isPositive: Number(notesTrend) >= 0,
        },
      },
      dailyHours,
    });

  } catch (err) {
    console.error("Failed to fetch profile stats:", err);
    return NextResponse.json({ error: "Failed to fetch profile stats" }, { status: 500 });
  }
}