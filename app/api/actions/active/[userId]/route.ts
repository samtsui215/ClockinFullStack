// app/api/actions/active/[userId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const action = db.prepare(`
      SELECT 
        a.*,
        p.title as project_title,
        p.category as project_category
      FROM actions a
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.user_id = ? AND a.completed_at IS NULL
      ORDER BY a.started_at DESC
      LIMIT 1
    `).get(userId);

    return NextResponse.json(action || null);
  } catch (err) {
    console.error("Failed to fetch active action:", err);
    return NextResponse.json({ error: "Failed to fetch active action" }, { status: 500 });
  }
}