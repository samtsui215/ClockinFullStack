// app/api/signin/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/firebase/admin";

const ONE_WEEK_MS = 60 * 60 * 24 * 7 * 1000;

export async function POST(req: Request) {
  try {
    const { email, idToken } = await req.json();

    // Verify the user exists
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord) {
      return NextResponse.json({ success: false, message: "User does not exist." }, { status: 404 });
    }

    // Create Firebase session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: ONE_WEEK_MS });

    // Send response with cookie
    const res = NextResponse.json({ success: true });
    res.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_WEEK_MS / 1000, // in seconds
      sameSite: "lax",
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to sign in." }, { status: 400 });
  }
}
