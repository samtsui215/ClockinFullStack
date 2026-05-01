// app/api/auth/signout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear the session cookie
    cookieStore.set({
      name: 'session',
      value: '',
      maxAge: 0,
      path: '/',
    });

    return NextResponse.json({ success: true, message: 'Signed out successfully' });
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to sign out' },
      { status: 500 }
    );
  }
}