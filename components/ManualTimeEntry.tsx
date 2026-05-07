// components/ManualTimeEntry.tsx
'use client';

import React, { useState } from 'react';
import { Plus, Clock, X, ChevronDown } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  category: string;
}

interface ManualTimeEntryProps {
  userId: string;
  projects: Project[];
  currentProjectId: string | null;
  isClockedIn: boolean;
  onEntryAdded?: () => void;
}

export default function ManualTimeEntry({
  userId,
  projects,
  currentProjectId,
  isClockedIn,
  onEntryAdded,
}: ManualTimeEntryProps) {
  const today = new Date().toISOString().split('T')[0];

  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(currentProjectId ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Don't render at all when clocked in
  if (isClockedIn) return null;

  const resetForm = () => {
    setDate(today);
    setStartTime('');
    setEndTime('');
    setDescription('');
    setProjectId(currentProjectId ?? '');
    setError('');
    setShowForm(false);
  };

  const validate = () => {
    if (!projectId) return 'Please select a project.';
    if (!date) return 'Please select a date.';
    if (!startTime) return 'Please enter a start time.';
    if (!endTime) return 'Please enter an end time.';
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    if (end <= start) return 'End time must be after start time.';
    const now = new Date();
    if (start > now) return 'Start time cannot be in the future.';
    if (end > now) return 'End time cannot be in the future.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');

    const clockIn = new Date(`${date}T${startTime}`).toISOString();
    const clockOut = new Date(`${date}T${endTime}`).toISOString();
    const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = parseFloat((diffMs / 3600000).toFixed(4));

    try {
      const res = await fetch('/api/time_entries/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          date,
          hours,
          clock_in: clockIn,
          clock_out: clockOut,
          description: description.trim() || null,
          status: 'submitted',
        }),
      });

      if (res.ok) {
        onEntryAdded?.();
        resetForm();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save entry.');
      }
    } catch {
      setError('Failed to save entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Button — always stays the same size */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full px-4 py-3 bg-white border-2 border-dashed border-slate-200 hover:border-[#1c3260] hover:bg-slate-50 text-slate-400 hover:text-[#1c3260] rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all group"
      >
        <Plus className="w-4 h-4 transition-transform group-hover:scale-110" />
        Add Time Entry
      </button>

      {/* Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150"
          onClick={resetForm}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1c3260]" />
                <h3 className="text-base font-semibold text-slate-800">Add Time Entry</h3>
              </div>
              <button
                onClick={resetForm}
                className="p-1 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Project selector */}
              <div className="relative">
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full px-3 py-4 pr-8 text-sm border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#1c3260] text-slate-700 bg-white"
                >
                  <option value="">Select a project…</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Date */}
              <input
                type="date"
                value={date}
                max={today}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1c3260] text-slate-700"
              />

              {/* Start / End time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 pl-1">Start time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1c3260] text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 pl-1">End time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1c3260] text-slate-700"
                  />
                </div>
              </div>

              {/* Description */}
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What did you work on? (optional)"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#1c3260] placeholder:text-slate-300 text-slate-700"
              />

              {/* Error */}
              {error && (
                <p className="text-xs text-red-500 px-1">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={resetForm}
                  className="flex-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 px-3 py-2.5 bg-gradient-to-r from-[#1c3260] to-[#4062ad] hover:from-[#16264c] hover:to-[#365399] disabled:from-slate-400 disabled:to-slate-400 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {loading ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}