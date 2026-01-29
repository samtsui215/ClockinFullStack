// app/api/time_entries/active/[userId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }  // ← Changed to Promise
) {
  try {
    const { userId } = await params;  // ← Added await

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get active time entry (where clock_out is NULL)
    const entry = db.prepare(`
      SELECT 
        te.id,
        te.user_id,
        te.project_id,
        te.date,
        te.hours,
        te.clock_in,
        te.clock_out,
        te.status,
        te.billable,
        p.title as project_title,
        p.category as project_category
      FROM time_entries te
      LEFT JOIN projects p ON te.project_id = p.id
      WHERE te.user_id = ? AND te.clock_out IS NULL
      ORDER BY te.clock_in DESC
      LIMIT 1
    `).get(userId);

    if (!entry) {
      return NextResponse.json(null);
    }

    return NextResponse.json(entry);

  } catch (err) {
    console.error("Failed to fetch active entry:", err);
    return NextResponse.json({ error: "Failed to fetch active entry" }, { status: 500 });
  }
}