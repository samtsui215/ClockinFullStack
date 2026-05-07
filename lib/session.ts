// lib/session.ts — server-side session verification for API routes
import { auth } from '@/firebase/admin';
import { cookies } from 'next/headers';
import db from '@/lib/database';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  isActive: number;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return null;

    const decoded = await auth.verifySessionCookie(sessionCookie, true);

    const user = db.prepare(`
      SELECT id, email,
             first_name AS firstName, last_name AS lastName,
             user_type AS userType, is_active AS isActive
      FROM users WHERE id = ?
    `).get(decoded.uid) as SessionUser | undefined;

    if (!user || !user.isActive) return null;
    return user;
  } catch {
    return null;
  }
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function forbidden() {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
