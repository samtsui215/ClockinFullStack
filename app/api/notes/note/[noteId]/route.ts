// app/api/notes/note/[noteId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized, forbidden } from "@/lib/session";

type NoteOwner = { id: string; user_id: string };

async function getNote(noteId: string): Promise<NoteOwner | undefined> {
  return await db
    .prepare("SELECT id, user_id FROM notes WHERE id = ?")
    .get<NoteOwner>(noteId);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const { noteId } = await params;
  if (!noteId) {
    return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
  }

  try {
    const note = await getNote(noteId);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    if (note.user_id !== sessionUser.id && sessionUser.userType !== 'admin') {
      return forbidden();
    }

    await db.prepare("DELETE FROM notes WHERE id = ?").run(noteId);
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
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const { noteId } = await params;
  const { message } = await req.json();

  if (!noteId || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Missing noteId or message" }, { status: 400 });
  }

  try {
    const note = await getNote(noteId);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    if (note.user_id !== sessionUser.id && sessionUser.userType !== 'admin') {
      return forbidden();
    }

    await db.prepare(
      "UPDATE notes SET message = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(message.trim(), noteId);
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
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const { noteId } = await params;
  const { completed } = await req.json();

  if (!noteId || completed === undefined) {
    return NextResponse.json({ error: "Missing noteId or completed status" }, { status: 400 });
  }

  try {
    const note = await getNote(noteId);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    if (
      note.user_id !== sessionUser.id &&
      sessionUser.userType !== 'admin' &&
      sessionUser.userType !== 'manager'
    ) {
      return forbidden();
    }

    await db.prepare(
      "UPDATE notes SET completed = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(completed ? 1 : 0, noteId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DB update failed:", err);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }
}
