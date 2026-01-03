'use client';

import React from "react";
import Link from "next/link";
import Image from "next/image";

interface HoursWorkedProps {
  hoursWorked: number;
}

export default function HoursWorkedCard({ hoursWorked }: HoursWorkedProps) {
  return (
    <Link href="/profile">
      <div className="cursor-pointer bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow max-w-sm w-70">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Project Hours
        </h2>
        <div className="flex items-center">
          <p className="text-[#1c3260] text-3xl font-bold pl-3">
            {hoursWorked}
          </p>
          <div className="flex-grow ml-4" />
          <Image
            src="/clock.png"
            alt="Clock icon"
            width={80}
            height={80}
            className="object-contain"
          />
        </div>
      </div>
    </Link>
  );
}
