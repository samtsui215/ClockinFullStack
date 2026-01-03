// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUsers, updateUserRole } from '@/lib/actions/user.actions';

export async function GET() {
  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, userType } = await request.json();
    
    if (!userId || !userType) {
      return NextResponse.json(
        { error: 'Missing userId or userType' }, 
        { status: 400 }
      );
    }

    await updateUserRole(userId, userType);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}