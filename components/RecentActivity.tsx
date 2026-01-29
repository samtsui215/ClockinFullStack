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
      <div className="cursor-pointer bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow max-w-sm w-70 h-full flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Active Projects
          </h2>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Clocked into this week
          </p>
        </div>

        <div className="flex items-center justify-between pr-1">
          <p className="text-[#1c3260] text-5xl font-bold">
            {projectCount}
          </p>
          <div className="bg-blue-50 p-3 rounded-full">
            <Image
                src="/folder.png"
                alt="Folder icon"
                width={40}
                height={40}
                className="object-contain"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}