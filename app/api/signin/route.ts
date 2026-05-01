// app/api/signin/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/firebase/admin";
import db from "@/lib/database";

const ONE_WEEK_MS = 60 * 60 * 24 * 7 * 1000;

export async function POST(req: Request) {
  try {
    const { email, idToken } = await req.json();

    // Verify the user exists in Firebase
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord) {
      return NextResponse.json({ success: false, message: "User does not exist." }, { status: 404 });
    }

    // Check if user is active in SQLite
    const sqlUser = db.prepare(`
      SELECT is_active FROM users WHERE id = ?
    `).get(userRecord.uid) as { is_active: number | boolean } | undefined;

    if (sqlUser && !sqlUser.is_active) {
      return NextResponse.json(
        { success: false, message: "Your account has been deactivated. Please contact an administrator." },
        { status: 403 }
      );
    }

    // Create Firebase session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: ONE_WEEK_MS });

    const res = NextResponse.json({ success: true });
    res.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_WEEK_MS / 1000,
      sameSite: "lax",
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to sign in." }, { status: 400 });
  }
}