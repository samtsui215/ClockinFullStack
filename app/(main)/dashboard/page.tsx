// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth.action';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  // Server-side auth check - this runs before page renders
  const user = await getCurrentUser();
  
  // If no user, redirect to sign-in
  if (!user) {
    redirect('/sign-in');
  }

  // Pass user to client component
  return <DashboardClient user={user} />;
}