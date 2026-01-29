// app/api/profile/activity/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get recent notes with project info
    const recentNotes = db.prepare(`
      SELECT 
        n.id,
        n.content,
        n.created_at,
        n.completed,
        p.title as project_title,
        p.category
      FROM notes n
      INNER JOIN projects p ON n.project_id = p.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ?
    `).all(userId, limit) as Array<{
      id: string;
      content: string;
      created_at: string;
      completed: boolean;
      project_title: string;
      category: string;
    }>;

    // Format activities
    const activities = recentNotes.map(note => ({
      id: note.id,
      type: note.completed ? 'task' as const : 'note' as const,
      title: note.completed ? 'Completed task' : 'Created note',
      description: `${note.content.substring(0, 60)}${note.content.length > 60 ? '...' : ''} in ${note.project_title}`,
      timestamp: note.created_at,
    }));

    return NextResponse.json(activities);

  } catch (err) {
    console.error("Failed to fetch activity:", err);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}