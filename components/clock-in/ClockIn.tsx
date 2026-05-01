'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import Timer from './Timer';
import { LogOut, Play, Clock, AlertCircle, X, BookmarkMinus } from 'lucide-react';

interface ClockInProps {
  userId: string;
  projectId: string | null;
  clockedInSince: string | null;
  onClockInOut?: () => void;
}

interface ActionSummary {
  description: string;
}

// ─── Forgot to Clock Out modal ────────────────────────────────────────────────
function ForgotClockOutModal({
  clockedInSince,
  onConfirm,
  onCancel,
}: {
  clockedInSince: string;
  onConfirm: (pastTime: string) => void;
  onCancel: () => void;
}) {
  const clockInDate = new Date(clockedInSince);
  const defaultEnd = new Date(Math.min(clockInDate.getTime() + 3600000, Date.now()));
  const toLocalTimeInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [pastTime, setPastTime] = useState(toLocalTimeInput(defaultEnd));
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const selected = new Date(pastTime);
    if (selected <= clockInDate) { setError('Clock-out time must be after your clock-in time.'); return; }
    if (selected > new Date()) { setError('Clock-out time cannot be in the future.'); return; }
    onConfirm(selected.toISOString());
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-50">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Forgot to Clock Out?</h3>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-1">
          You clocked in at{' '}
          <span className="font-semibold text-slate-700">
            {clockInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {' '}on{' '}
          <span className="font-semibold text-slate-700">
            {clockInDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
          . Enter the time you actually stopped working.
        </p>
        <div className="mt-4 mb-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            When did you stop working?
          </label>
          <input
            type="datetime-local"
            value={pastTime}
            min={toLocalTimeInput(clockInDate)}
            max={toLocalTimeInput(new Date())}
            onChange={e => { setPastTime(e.target.value); setError(''); }}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700"
          />
          {error && <p className="text-xs text-red-500 mt-1.5 pl-1">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm} className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            Clock Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Carry-over modal ──────────────────────────────────────────────────────────
function CarryOverModal({
  actions,
  loading,
  onLeaveForLater,
  onCompleteAndClockOut,
  onCancel,
}: {
  actions: ActionSummary[];
  loading: boolean;
  onLeaveForLater: () => void;
  onCompleteAndClockOut: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50">
              <BookmarkMinus className="w-5 h-5 text-[#1c3260]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Actions Still In Progress</h3>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          You have {actions.length} action{actions.length !== 1 ? 's' : ''} that {actions.length !== 1 ? 'aren\'t' : 'isn\'t'} finished yet. What would you like to do?
        </p>

        <div className="bg-slate-50 rounded-xl p-3 mb-6 space-y-1.5">
          {actions.map((a, i) => (
            <p key={i} className="text-sm text-slate-700 flex items-start gap-2">
              <span className="text-slate-300 mt-0.5 flex-shrink-0">•</span>
              {a.description}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onLeaveForLater}
            disabled={loading}
            className="w-full px-4 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <BookmarkMinus className="w-4 h-4" />
            Leave for Later — resume next session
          </button>
          <button
            onClick={onCompleteAndClockOut}
            disabled={loading}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Mark Complete &amp; Clock Out
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
const ClockIn: React.FC<ClockInProps> = ({ userId, projectId, clockedInSince, onClockInOut }) => {
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showCarryOverModal, setShowCarryOverModal] = useState(false);
  const [carryOverActions, setCarryOverActions] = useState<ActionSummary[]>([]);
  const [pendingEntry, setPendingEntry] = useState<{ id: string; clockOutTime?: string } | null>(null);

  const isClockedIn = clockedInSince !== null;

  // Shared: fetch active entry + check for in-progress actions, show modal or proceed
  async function initiateClockOut(clockOutTime?: string) {
    setLoading(true);
    try {
      const activeRes = await fetch(`/api/time_entries/active/${userId}`);
      const active = await activeRes.json();
      if (!active?.id) { toast.error('No active session found'); setLoading(false); return; }

      if (projectId) {
        const actionsRes = await fetch(`/api/actions?userId=${userId}&projectId=${projectId}`);
        const actions = await actionsRes.json();
        const liveActions = (Array.isArray(actions) ? actions : []).filter(
          (a: { carried_over: number; completed_at: string | null }) => !a.completed_at && !a.carried_over
        );

        if (liveActions.length > 0) {
          setPendingEntry({ id: active.id, clockOutTime });
          setCarryOverActions(liveActions.map((a: { description: string }) => ({ description: a.description })));
          setShowCarryOverModal(true);
          setLoading(false);
          return;
        }
      }

      await doClockOut(active.id, clockOutTime, false);
    } catch {
      toast.error('Failed to clock out. Please try again.');
      setLoading(false);
    }
  }

  async function doClockOut(entryId: string, clockOutTime: string | undefined, carryOver: boolean) {
    setLoading(true);
    try {
      const res = await fetch('/api/time_entries/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId, carry_over: carryOver, clock_out: clockOutTime }),
      });
      if (res.ok) {
        toast.success(carryOver ? 'Clocked out — actions saved for your next session' : 'Clocked out successfully');
        setShowCarryOverModal(false);
        setShowForgotModal(false);
        setPendingEntry(null);
        setCarryOverActions([]);
        onClockInOut?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to clock out');
      }
    } catch {
      toast.error('Failed to clock out. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleClockIn = async () => {
    if (!projectId) { toast.error('Select a project first'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/time_entries/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, project_id: projectId }),
      });
      if (res.ok) {
        toast.success('Clocked in successfully');
        onClockInOut?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to clock in');
      }
    } catch {
      toast.error('Failed to clock in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isClockedIn) {
    return (
      <>
        <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col justify-center">
          <div className="space-y-2">
            <h3 className="text-center text-sm font-semibold text-slate-800">Currently Clocked In</h3>
            <div className="py-1 bg-slate-50 rounded-xl border border-slate-200">
              <Timer clockInTime={clockedInSince} />
              <p className="text-center text-xs text-slate-500 mt-1">
                Started at {new Date(clockedInSince).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => initiateClockOut()}
              disabled={loading}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {loading ? 'Clocking Out...' : 'Clock Out'}
            </button>
            <button
              onClick={() => setShowForgotModal(true)}
              disabled={loading}
              className="w-full px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Forgot to Clock Out?
            </button>
          </div>
        </div>

        {showForgotModal && clockedInSince && (
          <ForgotClockOutModal
            clockedInSince={clockedInSince}
            onConfirm={pastTime => { setShowForgotModal(false); initiateClockOut(pastTime); }}
            onCancel={() => setShowForgotModal(false)}
          />
        )}

        {showCarryOverModal && pendingEntry && (
          <CarryOverModal
            actions={carryOverActions}
            loading={loading}
            onLeaveForLater={() => doClockOut(pendingEntry.id, pendingEntry.clockOutTime, true)}
            onCompleteAndClockOut={() => doClockOut(pendingEntry.id, pendingEntry.clockOutTime, false)}
            onCancel={() => { setShowCarryOverModal(false); setPendingEntry(null); setCarryOverActions([]); }}
          />
        )}
      </>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-10 min-h-[100px] flex items-center">
      <button
        onClick={handleClockIn}
        disabled={loading || !projectId}
        className="w-full px-4 py-5 bg-gradient-to-r from-[#1c3260] to-[#4062ad] hover:from-[#16264c] hover:to-[#365399] disabled:from-slate-400 disabled:to-slate-400 text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all"
      >
        <Play className="w-6 h-6" />
        {loading ? 'Clocking In...' : 'Clock In'}
      </button>
    </div>
  );
};

export default ClockIn;
