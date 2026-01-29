'use client';

import React, { useEffect, useState } from 'react';
import Timer from './Timer';
import { LogOut, Play } from 'lucide-react';

interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  clock_in: string;
  clock_out: string | null;
  status: string;
  hours: number;
}

interface ClockInProps {
  userId: string;
  projectId: string | null;
  onClockInOut?: () => void;
}

const ClockIn: React.FC<ClockInProps> = ({
  userId,
  projectId,
  onClockInOut,
}) => {
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchCurrentEntry = async () => {
    try {
      const res = await fetch(`/api/time_entries/active/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentEntry(data || null);
      }
    } catch (err) {
      console.error('Failed to fetch current entry:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentEntry();
  }, [userId]);

  const handleClockIn = async () => {
    if (!projectId) {
      alert('Select a project first');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/time_entries/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, project_id: projectId }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentEntry(data);
        onClockInOut?.();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to clock in');
      }
    } catch {
      alert('Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;

    setLoading(true);
    try {
      const res = await fetch('/api/time_entries/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: currentEntry.id }),
      });

      if (res.ok) {
        setCurrentEntry(null);
        onClockInOut?.();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to clock out');
      }
    } catch {
      alert('Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 max-w-lg ml-6 flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-[#1c3260] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (currentEntry) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6.5 max-w-250 ml-6">
        <div className="space-y-3">
          <h3 className="text-center text-sm font-semibold text-slate-800">
            Currently Clocked In
          </h3>

          <div className="py-2 bg-slate-50 rounded-xl border border-slate-200">
            <Timer clockInTime={currentEntry.clock_in} />
            <p className="text-center text-xs text-slate-500 mt-1">
              Started at {new Date(currentEntry.clock_in).toLocaleTimeString()}
            </p>
          </div>

          <button
            onClick={handleClockOut}
            disabled={loading}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {loading ? 'Clocking Out...' : 'Clock Out'}
          </button>
        </div>
      </div>
    );
  } else {
    return (
      <div className="bg-white rounded-2xl shadow-md p-4 max-w-lg ml-6">
        <button
          onClick={handleClockIn}
          disabled={loading || !projectId}
          className="w-full px-4 py-3 bg-gradient-to-r from-[#1c3260] to-[#4062ad] hover:from-[#16264c] hover:to-[#365399] disabled:from-slate-400 disabled:to-slate-400 text-white rounded-2xl font-semibold flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          {loading ? 'Clocking In...' : 'Clock In'}
        </button>
      </div>
    );
  }
};

export default ClockIn;
