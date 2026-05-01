// app/projects/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth.action';
import ProjectsClient from './ProjectsClient';

export default async function ProjectsPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/sign-in');

  return <ProjectsClient user={{
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    userType: user.userType,
  }} />;
}