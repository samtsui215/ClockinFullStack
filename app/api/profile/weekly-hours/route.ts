// app/api/profile/weekly-hours/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized } from "@/lib/session";
import { businessWeekStartDate, addDays } from "@/lib/time";

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const weekOffset = Math.max(-52, Math.min(0, parseInt(searchParams.get("weekOffset") || "0")));
    const userId = sessionUser.id;

    // Monday (business date) of the requested week.
    const weekStart = businessWeekStartDate(new Date(), weekOffset);

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

    const totalHours = Math.round(dailyHours.reduce((s, d) => s + d.hours, 0) * 10) / 10;

    return NextResponse.json({ dailyHours, totalHours, weekStart });
  } catch (err) {
    console.error("Failed to fetch weekly hours:", err);
    return NextResponse.json({ error: "Failed to fetch weekly hours" }, { status: 500 });
  }
}
