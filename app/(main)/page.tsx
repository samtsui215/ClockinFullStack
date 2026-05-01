// app/page.tsx (or any protected page)

import { getCurrentUser } from '@/lib/actions/auth.action';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const user = await getCurrentUser();

  // Redirect to sign-in if NOT authenticated
  if (!user){
    redirect('/sign-in');
  } else {
    redirect('/dashboard');
  }


  return <div>Welcome, {user?.firstName}!</div>;
}
