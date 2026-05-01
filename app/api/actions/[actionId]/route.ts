// app/api/actions/[actionId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";

// PATCH - complete an individual action OR an entire group
// If body contains { completeGroup: true }, completes all actions in the same group
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const { actionId } = await params;
    const body = await req.json().catch(() => ({}));
    const completeGroup = body?.completeGroup === true;

    if (!actionId) {
      return NextResponse.json({ error: "actionId is required" }, { status: 400 });
    }

    const action = db.prepare(`
      SELECT id, group_id, completed_at FROM actions WHERE id = ?
    `).get(actionId) as { id: string; group_id: string; completed_at: string | null } | undefined;

    if (!action) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (completeGroup) {
      // Complete all actions in this group at the same timestamp
      db.prepare(`
        UPDATE actions SET completed_at = ? WHERE group_id = ? AND completed_at IS NULL
      `).run(now, action.group_id);

      const groupActions = db.prepare(`
        SELECT * FROM actions WHERE group_id = ?
      `).all(action.group_id);

      return NextResponse.json({ group_id: action.group_id, actions: groupActions });
    } else {
      if (action.completed_at) {
        return NextResponse.json({ error: "Action already completed" }, { status: 400 });
      }
      db.prepare(`UPDATE actions SET completed_at = ? WHERE id = ?`).run(now, actionId);
      const updated = db.prepare(`SELECT * FROM actions WHERE id = ?`).get(actionId);
      return NextResponse.json(updated);
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
  try {
    const { actionId } = await params;
    const { description } = await req.json();

    if (!actionId || !description?.trim()) {
      return NextResponse.json({ error: "actionId and description are required" }, { status: 400 });
    }

    const info = db.prepare(`
      UPDATE actions SET description = ? WHERE id = ? AND completed_at IS NULL
    `).run(description.trim(), actionId);

    if (info.changes === 0) {
      return NextResponse.json({ error: "Action not found or already completed" }, { status: 404 });
    }

    const updated = db.prepare(`SELECT * FROM actions WHERE id = ?`).get(actionId);
    return NextResponse.json(updated);
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
  try {
    const { actionId } = await params;

    const info = db.prepare(`DELETE FROM actions WHERE id = ?`).run(actionId);

    if (info.changes === 0) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete action:", err);
    return NextResponse.json({ error: "Failed to delete action" }, { status: 500 });
  }
}