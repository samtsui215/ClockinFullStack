// components/Navbar.tsx
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="w-full h-24 bg-[#1c3260] text-white px-1.5 flex justify-between items-center">
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
      <div className="space-x-6 text-lg font-medium pr-6">
        <Link href="/dashboard">Home</Link>
        <Link href="/projects">Projects and Notes</Link>
        <Link href="/profile">Profile</Link>
      </div>
    </nav>
  );
}
