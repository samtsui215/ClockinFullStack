// app/api/projects/[projectId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getSessionUser, unauthorized } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const { projectId } = await params;

  try {
    const stmt = db.prepare("SELECT id, title, category FROM projects WHERE id = ? AND is_active = 1");
    const project = stmt.get(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (err) {
    console.error("Failed to fetch project:", err);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}