// app/api/admin/create-user/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/firebase/admin";
import db from "@/lib/database";
import { getSessionUser, unauthorized, forbidden } from "@/lib/session";

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();
  if (sessionUser.userType !== 'admin') return forbidden();

  try {
    const { email, password, firstName, lastName, userType } = await req.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "email, password, firstName, and lastName are required" },
        { status: 400 }
      );
    }

    // Create user in Firebase
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    // Add to SQLite
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, first_name, last_name, user_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(userRecord.uid, email, firstName, lastName, userType || 'employee');

    return NextResponse.json({ success: true, userId: userRecord.uid }, { status: 201 });
  } catch (err) {
    console.error("Failed to create user:", err);
    const message = (err as { errorInfo?: { message?: string }; message?: string })?.errorInfo?.message
      || (err as Error)?.message
      || "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}