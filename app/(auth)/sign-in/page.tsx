//app/(auth)/sign-in/page.tsx
import AuthForm from '@/components/AuthForm';
import { getCurrentUser } from '@/lib/actions/auth.action';
import { redirect } from 'next/navigation';

export default async function SignInPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/'); // already signed in → go to home
  }

  return (
    <div className="auth-page">
      <AuthForm type={'sign-in'} />
    </div>
  );
}
