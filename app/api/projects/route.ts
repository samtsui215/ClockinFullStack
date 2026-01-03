import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET() {
  try {
    const stmt = db.prepare(`SELECT id, title, category FROM projects`);
    const projects = stmt.all();
    return NextResponse.json(projects);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}
