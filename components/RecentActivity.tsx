"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

interface RecentActivityProps {
  projectCount: number;
}

export default function RecentActivity({ projectCount }: RecentActivityProps) {
  return (
    <Link href="/profile">
      <div className="cursor-pointer bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow max-w-sm w-70">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Recent Project Activity
        </h2>
       <div className="flex items-center justify-between pr-1">
        <p className="text-[#1c3260] text-3xl font-bold pl-3">
            {projectCount}
        </p>
        <Image
            src="/folder.png"
            alt="Folder icon"
            width={64}
            height={64}
            className="object-contain"
        />
        </div>
      </div>
    </Link>
  );
}
