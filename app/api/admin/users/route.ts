// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'this_week';

    let dateFilter = '';
    const params: string[] = [];

    if (filter === 'this_week') {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      // Match YYYY-MM-DD format used in time_entries.date
      const weekStartDate = weekStart.toISOString().split('T')[0];
      dateFilter = `AND te.date >= '${weekStartDate}'`;
    }

    const users = db.prepare(`
      SELECT
        u.id,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email,
        u.user_type as userType,
        u.is_active as isActive,
        u.created_at as createdAt,
        COALESCE(SUM(te.hours), 0) as totalHours,
        COUNT(DISTINCT te.project_id) as projectCount,
        MAX(te.clock_in) as lastClockIn
      FROM users u
      LEFT JOIN time_entries te ON u.id = te.user_id ${dateFilter}
      GROUP BY u.id
      ORDER BY u.first_name ASC
    `).all(...params);

    return NextResponse.json(users);
  } catch (err) {
    console.error("Failed to fetch admin users:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId, userType, isActive } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (userType !== undefined) {
      db.prepare(`UPDATE users SET user_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(userType, userId);
    }

    if (isActive !== undefined) {
      db.prepare(`UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(isActive ? 1 : 0, userId);
    }

    const updated = db.prepare(`
      SELECT id, first_name as firstName, last_name as lastName, email, user_type as userType, is_active as isActive
      FROM users WHERE id = ?
    `).get(userId);

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update user:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}