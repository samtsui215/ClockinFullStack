// app/admin/users/page.tsx
import UsersTable from './components/UsersTable';
import { getUsers } from '@/lib/actions/user.actions';

export default async function UsersPage() {
  // This runs on the server - safe to call database directly
  const users = await getUsers();
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              {users.length} users found
            </p>
          </div>
          <UsersTable initialUsers={users} />
        </div>
      </div>
    </div>
  );
}