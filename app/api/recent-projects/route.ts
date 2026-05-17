// app/api/recent-projects/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized } from "@/lib/session";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const rows = await db.prepare(`
      SELECT
        p.id,
        p.title,
        p.category,
        MAX(te.clock_in) as last_used
      FROM time_entries te
      INNER JOIN projects p ON te.project_id = p.id
      WHERE te.user_id = ?
        AND te.clock_in IS NOT NULL
        AND p.is_active = 1
      GROUP BY p.id, p.title, p.category
      ORDER BY last_used DESC
      LIMIT 5
    `).all(sessionUser.id) as {
      id: string;
      title: string;
      category: string;
      last_used: string;
    }[];

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Failed to fetch recent projects:", err);
    return NextResponse.json({ error: "Failed to fetch recent projects" }, { status: 500 });
  }
}
