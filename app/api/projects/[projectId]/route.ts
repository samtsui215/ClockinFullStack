// app/api/projects/[projectId]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }  // ← Changed to Promise
) {
  const { projectId } = await params;  // ← Added await

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