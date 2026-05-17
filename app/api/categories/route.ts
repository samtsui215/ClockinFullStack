// app/api/categories/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/database";
import { randomUUID } from "crypto";
import { getSessionUser, unauthorized } from "@/lib/session";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const categories = await db.prepare(`
      SELECT id, name, parent_id, created_at
      FROM categories
      ORDER BY name
    `).all();

    return NextResponse.json(categories);
  } catch (err) {
    console.error("Failed to fetch categories:", err);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  try {
    const body = await req.json();
    const { name, parent_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const existing = await db.prepare(`SELECT id FROM categories WHERE name = ?`).get(name.trim());
    if (existing) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO categories (id, name, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name.trim(), parent_id ?? null, now, now);

    const newCategory = await db.prepare(
      "SELECT id, name, parent_id, created_at FROM categories WHERE id = ?"
    ).get(id);

    return NextResponse.json(newCategory, { status: 201 });
  } catch (err) {
    console.error("Failed to create category:", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
