"use client";

import React, { useState, useEffect } from "react";

export default function DateTime() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatWeekday = (date: Date) =>
    date.toLocaleDateString("en-US", { weekday: "long" });

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  if (!currentTime) return null;

  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-900 mb-1 uppercase tracking-wide pl-1">
        {formatWeekday(currentTime)}
      </h1>
      <p className="text-xl text-gray-700 mb-1 uppercase pl-1">
        {`${formatDate(currentTime)} | ${formatTime(currentTime)}`}
      </p>
    </div>
  );
}
