// app/api/time_entries/history/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized } from "@/lib/session";

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const userId = sessionUser.id;

    const entries = await db.prepare(`
      SELECT
        te.id,
        te.clock_in,
        te.clock_out,
        te.hours,
        te.date,
        p.id        AS project_id,
        p.title     AS project_title,
        p.category  AS project_category
      FROM time_entries te
      LEFT JOIN projects p ON te.project_id = p.id
      WHERE te.user_id = ?
        AND te.clock_out IS NOT NULL
        AND te.status = 'completed'
      ORDER BY te.clock_in DESC
      LIMIT ?
    `).all(userId, limit) as Array<{
      id: string; clock_in: string; clock_out: string; hours: number; date: string;
      project_id: string; project_title: string; project_category: string;
    }>;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = entries.map(e => {
      const d = new Date(e.clock_in);
      const label = `${dayNames[d.getDay()]} ${monNames[d.getMonth()]} ${d.getDate()} · ${e.project_title || 'Unknown Project'} · ${Number(e.hours).toFixed(1)}h`;
      return { ...e, display_label: label };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to fetch history:", err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
