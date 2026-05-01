// app/admin/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth.action';
import AdminClient from './Adminclient';

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/sign-in');
  if (user.userType !== 'admin') redirect('/dashboard');

  return <AdminClient currentUserId={user.id} />;
}