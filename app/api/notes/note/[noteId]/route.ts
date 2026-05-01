// `/api/notes/[noteId]/route.ts`
import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params;

  if (!noteId) {
    return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
  }

  try {
    const info = db.prepare("DELETE FROM notes WHERE id = ?").run(noteId);
    if (info.changes === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DB delete failed:", err);
    return NextResponse.json({ error: "DB delete failed" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params;
  const { content } = await req.json();

  if (!noteId || content === undefined) {
    return NextResponse.json({ error: "Missing noteId or content" }, { status: 400 });
  }

  try {
    const info = db.prepare(
      "UPDATE notes SET message = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(content, noteId);
    if (info.changes === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DB update failed:", err);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params;
  const { completed } = await req.json();

  if (!noteId || completed === undefined) {
    return NextResponse.json({ error: "Missing noteId or completed status" }, { status: 400 });
  }

  try {
    const info = db.prepare(
      "UPDATE notes SET completed = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(completed ? 1 : 0, noteId);
    if (info.changes === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DB update failed:", err);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }
}
