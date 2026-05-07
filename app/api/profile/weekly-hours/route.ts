// app/api/profile/weekly-hours/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized } from "@/lib/session";

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const weekOffset = Math.max(-52, Math.min(0, parseInt(searchParams.get("weekOffset") || "0")));
    const userId = sessionUser.id;

    const now = new Date();
    const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday + weekOffset * 7);
    weekStart.setHours(0, 0, 0, 0);

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

    const totalHours = Math.round(dailyHours.reduce((s, d) => s + d.hours, 0) * 10) / 10;

    return NextResponse.json({ dailyHours, totalHours, weekStart: weekStart.toISOString() });
  } catch (err) {
    console.error("Failed to fetch weekly hours:", err);
    return NextResponse.json({ error: "Failed to fetch weekly hours" }, { status: 500 });
  }
}
