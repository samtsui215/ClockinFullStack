import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;

  try {
    const stmt = db.prepare("SELECT id, title, category FROM projects WHERE id = ?");
    const project = stmt.get(projectId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}
