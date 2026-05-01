// lib/actions/auth.action.ts
'use server';

import { db, auth } from "@/firebase/admin";
import { cookies } from "next/headers";
import { getSQLUser, addUserToSQL } from "@/lib/actions/user.actions";

const ONE_WEEK = 60 * 60 * 24 * 7; // seconds

interface SignInParams {
  email: string;
  idToken: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  status?: string;
  needsSetup?: boolean;
  userType?: string;
  firstName?: string;
  lastName?: string;
  weeklyCapacity?: number;
  isActive?: boolean;
}

export async function signIn(params: SignInParams) {
  const { email, idToken } = params;

  try {
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord) {
      return { success: false, message: "User does not exist." };
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: ONE_WEEK * 1000,
    });

    const cookieStore = await cookies();
    cookieStore.set({
      name: "session",
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONE_WEEK,
    });

    return { success: true, message: "Signed in successfully." };
  } catch (error) {
    console.error("Sign-in error:", error);
    return { success: false, message: "Failed to log in." };
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) return null;

    const decodedClaims = await auth.verifySessionCookie(sessionCookie, false);

    // 1. Try to get user from SQL database
    const sqlUser = await getSQLUser(decodedClaims.uid);

    if (sqlUser) {
      // If user has been deactivated, clear their session and return null
      // SQLite returns 0/1 for booleans, so we coerce with == instead of ===
      if (!sqlUser.isActive) {
        const cookieStore = await cookies();
        cookieStore.set({ name: "session", value: "", maxAge: 0, path: "/" });
        return null;
      }
      return sqlUser;
    }

    // 2. If not in SQL, get from Firebase and add to SQL
    const userRecord = await auth.getUser(decodedClaims.uid);

    const displayName = userRecord.displayName || '';
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || userRecord.email?.split('@')[0] || 'User';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    await addUserToSQL({
      id: decodedClaims.uid,
      email: userRecord.email || '',
      firstName,
      lastName,
      userType: 'employee',
    });

    return await getSQLUser(decodedClaims.uid);

  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.set({ name: "session", value: "", maxAge: 0, path: "/" });
}

export async function createUserAccount(userData: {
  email: string;
  password: string;
  displayName?: string;
}) {
  if (!userData.email || !userData.password) {
    throw new Error("Email and password are required");
  }

  try {
    const userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName,
    });

    await db.collection("users").doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: userRecord.displayName || '',
      createdAt: new Date().toISOString(),
      status: 'active',
      lastLogin: null,
    });

    return { success: true, userId: userRecord.uid, message: "User account created successfully" };
  } catch (error) {
    console.error("Error creating user account:", error);
    return { success: false };
  }
}