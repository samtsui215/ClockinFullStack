// app/api/profile/activity/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "5");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Get recent completed actions with project info
    const actions = db.prepare(`
      SELECT 
        a.id,
        a.description,
        a.started_at,
        a.completed_at,
        p.title as project_title,
        p.category as project_category
      FROM actions a
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.user_id = ? AND a.completed_at IS NOT NULL
      ORDER BY a.completed_at DESC
      LIMIT ?
    `).all(userId, limit) as Array<{
      id: string;
      description: string;
      started_at: string;
      completed_at: string;
      project_title: string;
      project_category: string;
    }>;

    const activities = actions.map(a => ({
      id: a.id,
      type: 'task' as const,
      title: a.project_title || 'Unknown Project',
      description: a.description,
      timestamp: a.completed_at,
    }));

    return NextResponse.json(activities);
  } catch (err) {
    console.error("Failed to fetch profile activity:", err);
    return NextResponse.json({ error: "Failed to fetch profile activity" }, { status: 500 });
  }
}