// `/api/notes/[noteId]/route.ts`
import { NextResponse } from "next/server";
import db from "@/lib/database";

// Delete a note
export async function DELETE(
  req: Request,
  { params }: { params: { noteId: string } }
) {
  const { noteId } = params;

  if (!noteId) {
    return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
  }

  try {
    const stmt = db.prepare("DELETE FROM notes WHERE id = ?");
    const info = stmt.run(noteId);
    if (info.changes === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DB delete failed:", err);
    return NextResponse.json({ error: "DB delete failed" }, { status: 500 });
  }
}

// Update note content
export async function PUT(
  req: Request,
  { params }: { params: { noteId: string } }
) {
  const { noteId } = params;
  const body = await req.json();
  const { content } = body;

  if (!noteId || content === undefined) {
    return NextResponse.json({ error: "Missing noteId or content" }, { status: 400 });
  }

  try {
    const stmt = db.prepare("UPDATE notes SET content = ?, updated_at = datetime('now') WHERE id = ?");
    const info = stmt.run(content, noteId);
    if (info.changes === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DB update failed:", err);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }
}

// Update note completed status
export async function PATCH(
  req: Request,
  { params }: { params: { noteId: string } }
) {
  const { noteId } = params;
  const body = await req.json();
  const { completed } = body;

  if (!noteId || completed === undefined) {
    return NextResponse.json({ error: "Missing noteId or completed status" }, { status: 400 });
  }

  try {
    const stmt = db.prepare("UPDATE notes SET completed = ?, updated_at = datetime('now') WHERE id = ?");
    const info = stmt.run(completed ? 1 : 0, noteId);
    if (info.changes === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DB update failed:", err);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }
}
