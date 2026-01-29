'use client';
import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  clockInTime: string;
}

const Timer: React.FC<TimerProps> = ({ clockInTime }) => {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(clockInTime).getTime();
      const now = new Date().getTime();
      const diff = now - start;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setElapsed(formatted);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [clockInTime]);

  return (
    <div className="flex items-center justify-center gap-1 py-1">
      <Clock className="w-4 h-4 text-[#1c3260]" />
      <span className="text-lg font-mono font-semibold text-slate-900">
        {elapsed}
      </span>
    </div>
  );
};

export default Timer;
