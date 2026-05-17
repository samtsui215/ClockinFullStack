// app/api/actions/[actionId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized, forbidden } from "@/lib/session";

// PATCH - complete an individual action OR an entire group
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ actionId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const { actionId } = await params;
    const body = await req.json().catch(() => ({}));
    const completeGroup = body?.completeGroup === true;

    const action = await db.prepare(`
      SELECT id, group_id, user_id, completed_at FROM actions WHERE id = ?
    `).get(actionId) as { id: string; group_id: string; user_id: string; completed_at: string | null } | undefined;

    if (!action) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    if (action.user_id !== sessionUser.id && sessionUser.userType !== 'admin' && sessionUser.userType !== 'manager') {
      return forbidden();
    }

    const now = new Date().toISOString();

    if (completeGroup) {
      await db.prepare(`
        UPDATE actions SET completed_at = ? WHERE group_id = ? AND completed_at IS NULL
      `).run(now, action.group_id);

      const groupActions = await db.prepare(`SELECT * FROM actions WHERE group_id = ?`).all(action.group_id);
      return NextResponse.json({ group_id: action.group_id, actions: groupActions });
    } else {
      if (action.completed_at) {
        return NextResponse.json({ error: "Action already completed" }, { status: 400 });
      }
      await db.prepare(`UPDATE actions SET completed_at = ? WHERE id = ?`).run(now, actionId);
      return NextResponse.json(await db.prepare(`SELECT * FROM actions WHERE id = ?`).get(actionId));
    }
  } catch (err) {
    console.error("Failed to complete action:", err);
    return NextResponse.json({ error: "Failed to complete action" }, { status: 500 });
  }
}

// PUT - edit an action's description
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ actionId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const { actionId } = await params;
    const { description } = await req.json();

    if (!description?.trim()) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const action = await db.prepare(`SELECT user_id FROM actions WHERE id = ?`).get(actionId) as { user_id: string } | undefined;
    if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });
    if (action.user_id !== sessionUser.id && sessionUser.userType !== 'admin') return forbidden();

    const info = await db.prepare(`
      UPDATE actions SET description = ? WHERE id = ? AND completed_at IS NULL
    `).run(description.trim(), actionId);

    if (info.changes === 0) {
      return NextResponse.json({ error: "Action not found or already completed" }, { status: 404 });
    }

    return NextResponse.json(await db.prepare(`SELECT * FROM actions WHERE id = ?`).get(actionId));
  } catch (err) {
    console.error("Failed to edit action:", err);
    return NextResponse.json({ error: "Failed to edit action" }, { status: 500 });
  }
}

// DELETE - delete an action
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ actionId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const { actionId } = await params;

    const action = await db.prepare(`SELECT user_id FROM actions WHERE id = ?`).get(actionId) as { user_id: string } | undefined;
    if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });
    if (action.user_id !== sessionUser.id && sessionUser.userType !== 'admin') return forbidden();

    await db.prepare(`DELETE FROM actions WHERE id = ?`).run(actionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete action:", err);
    return NextResponse.json({ error: "Failed to delete action" }, { status: 500 });
  }
}
