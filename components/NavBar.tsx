// components/NavBar.tsx
'use client';
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface NavBarProps {
  userType?: string;
}

export default function Navbar({ userType }: NavBarProps) {
  const pathname = usePathname();
  const isAdmin = userType === 'admin';

  const linkClass = (href: string) =>
    `transition-colors hover:text-blue-200 ${pathname === href ? 'text-blue-300 font-semibold' : ''}`;

  return (
    <nav className="w-full h-24 bg-[#1c3260] text-white px-1.5 flex justify-between items-center flex-shrink-0">
      {/* Left side (Logo / Brand) */}
      <Link href="/dashboard" className="relative h-full w-52">
        <Image
          src="/KLM_LogoBLUE.png"
          alt="KLM Logo"
          fill
          className="object-contain"
          priority
          sizes="(max-width: 768px) 200px, 250px"
        />
      </Link>

      {/* Right side (Links) */}
      <div className="flex items-center space-x-6 text-lg font-medium pr-6">
        <Link href="/dashboard" className={linkClass('/dashboard')}>Home</Link>
        <Link href="/projects" className={linkClass('/projects')}>Projects and Actions</Link>
        <Link href="/profile" className={linkClass('/profile')}>Profile</Link>
        {isAdmin && (
          <Link
            href="/admin"
            className={`px-4 py-1.5 rounded-lg border border-white/30 bg-white/10 hover:bg-white/20 transition-all ${pathname === '/admin' ? 'bg-white/25 border-white/50' : ''}`}
          >
            Admin
          </Link>
        )}
      </div>
    </nav>
  );
}