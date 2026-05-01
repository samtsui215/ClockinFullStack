// app/(main)/layout.tsx
import Navbar from "@/components/NavBar";
import { getCurrentUser } from "@/lib/actions/auth.action";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Navbar userType={user?.userType} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}