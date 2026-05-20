// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized, forbidden } from "@/lib/session";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.userType !== 'admin' && user.userType !== 'manager') return forbidden();

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'this_week';

    let dateFilter = '';
    const params: string[] = [];

    if (filter === 'this_week') {
      const weekStartParam = searchParams.get('weekStart');
      let weekStart: Date;
      if (weekStartParam) {
        weekStart = new Date(weekStartParam + 'T00:00:00');
      } else {
        const now = new Date();
        weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
      }
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      dateFilter = 'AND te.date >= ? AND te.date <= ?';
      params.push(weekStart.toISOString().split('T')[0]);
      params.push(weekEnd.toISOString().split('T')[0]);
    }

    const users = await db.prepare(`
      SELECT
        u.id,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email,
        u.user_type as userType,
        u.weekly_capacity as weeklyCapacity,
        u.is_active as isActive,
        u.created_at as createdAt,
        COALESCE(SUM(te.hours), 0) as totalHours,
        COUNT(DISTINCT te.project_id) as projectCount,
        -- lastClockIn is all-time, not filtered by the week — "Last Active"
        -- should keep showing real activity even when this week is empty.
        (SELECT MAX(clock_in) FROM time_entries WHERE user_id = u.id) as lastClockIn
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
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.userType !== 'admin') return forbidden();

  try {
    const { userId, userType, isActive } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (userType !== undefined) {
      await db.prepare(`UPDATE users SET user_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(userType, userId);
    }

    if (isActive !== undefined) {
      await db.prepare(`UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(isActive ? 1 : 0, userId);
    }

    const updated = await db.prepare(`
      SELECT id, first_name as firstName, last_name as lastName, email, user_type as userType, is_active as isActive
      FROM users WHERE id = ?
    `).get(userId);

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update user:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
