// app/api/time_entries/active/[userId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized, forbidden } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const { userId } = await params;

    // Users can only fetch their own active entry; admins/managers can fetch anyone's
    if (userId !== sessionUser.id && sessionUser.userType !== 'admin' && sessionUser.userType !== 'manager') {
      return forbidden();
    }

    const entry = await db.prepare(`
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

    return NextResponse.json(entry ?? null);
  } catch (err) {
    console.error("Failed to fetch active entry:", err);
    return NextResponse.json({ error: "Failed to fetch active entry" }, { status: 500 });
  }
}
