"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

interface HoursWorkedProps {
  hoursWorked: number;
}

export default function HoursWorkedCard({ hoursWorked }: HoursWorkedProps) {
  return (
    <Link href="/profile">
      <div className="cursor-pointer bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-shadow w-full flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Hours This Week
            </h2>
            <p className="text-[#1c3260] text-4xl font-bold mt-1">
              {hoursWorked}
            </p>
          </div>
          <div className="bg-blue-50 p-3 rounded-full flex-shrink-0">
            <Image
              src="/clock.png"
              alt="Clock icon"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
        </div>
        <p className="text-xs text-[#1c3260] font-medium">View Profile →</p>
      </div>
    </Link>
  );
}