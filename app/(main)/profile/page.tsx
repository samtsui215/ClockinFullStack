// app/profile/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth.action';
import { ProfileClient } from './components/ProfileClient';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/signin');
  }

  return <ProfileClient user={user} />;
}