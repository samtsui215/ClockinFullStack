'use client';
import React, { useEffect, useState, useCallback } from "react";
import { Plus, CheckCircle2, Edit2, Trash2, Layers, Check, AlertTriangle, History, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Action {
  id: string;
  group_id: string;
  user_id: string;
  project_id: string;
  description: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  accumulated_seconds: number;
  carried_over: number;
  last_resumed_at: string | null;
}

interface ActionGroup {
  group_id: string;
  actions: Action[];
  started_at: string;
  completed_at: string | null;
  accumulated_seconds: number;
  carried_over: number;
  last_resumed_at: string | null;
}

interface PastSession {
  id: string;
  clock_in: string;
  clock_out: string;
  hours: number;
  project_id: string;
  project_title: string;
  display_label: string;
}

interface ActionPanelProps {
  projectId: string;
  userId: string;
  activeEntryId: string | null;
  isClockedIn: boolean;
}

function groupActions(actions: Action[]): ActionGroup[] {
  const map = new Map<string, Action[]>();
  for (const a of actions) {
    if (!map.has(a.group_id)) map.set(a.group_id, []);
    map.get(a.group_id)!.push(a);
  }
  return Array.from(map.entries()).map(([group_id, acts]) => ({
    group_id,
    actions: acts,
    started_at: acts[0].started_at,
    completed_at: acts.every(a => a.completed_at) ? acts[acts.length - 1].completed_at : null,
    accumulated_seconds: acts[0].accumulated_seconds ?? 0,
    carried_over: acts[0].carried_over ?? 0,
    last_resumed_at: acts[0].last_resumed_at ?? null,
  }));
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

// Live duration ticker for the in-progress group
function GroupTimer({ group }: { group: ActionGroup }) {
  const [seconds, setSeconds] = useState(() => {
    const acc = group.accumulated_seconds ?? 0;
    if (group.carried_over) return acc;
    if (group.last_resumed_at) {
      return acc + Math.floor((Date.now() - new Date(group.last_resumed_at).getTime()) / 1000);
    }
    return acc;
  });

  useEffect(() => {
    if (group.carried_over || !group.last_resumed_at) return;
    const acc = group.accumulated_seconds ?? 0;
    const calc = () => setSeconds(acc + Math.floor((Date.now() - new Date(group.last_resumed_at!).getTime()) / 1000));
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [group.carried_over, group.last_resumed_at, group.accumulated_seconds]);

  return (
    <span className="text-sm font-mono font-semibold text-[#1c3260]">{formatDuration(seconds)}</span>
  );
}

export default function ActionPanel({ projectId, userId, activeEntryId, isClockedIn }: ActionPanelProps) {
  const [actions, setActions] = useState<Action[]>([]);
  const [newActionText, setNewActionText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [pendingCompleteGroupId, setPendingCompleteGroupId] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Log Past Action modal
  const [showLogPastModal, setShowLogPastModal] = useState(false);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [pastSessionsLoading, setPastSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [pastDesc, setPastDesc] = useState('');
  const [pastHours, setPastHours] = useState('0');
  const [pastMinutes, setPastMinutes] = useState('0');
  const [logPastLoading, setLogPastLoading] = useState(false);
  const [logPastError, setLogPastError] = useState('');

  const fetchActions = useCallback(async () => {
    if (!projectId || !userId) return;
    try {
      const res = await fetch(`/api/actions?userId=${userId}&projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setActions(data);
        const inProgress = data.filter((a: Action) => !a.completed_at && !a.carried_over);
        setActiveGroupId(inProgress.length > 0 ? inProgress[0].group_id : null);
      }
    } catch (err) {
      console.error('Failed to fetch actions:', err);
    }
  }, [projectId, userId]);

  useEffect(() => { fetchActions(); }, [fetchActions]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchActions(); }, [isClockedIn]);

  const openLogPastModal = async () => {
    setShowLogPastModal(true);
    setPastSessionsLoading(true);
    try {
      const res = await fetch(`/api/time_entries/history?userId=${userId}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setPastSessions(data);
        if (data.length > 0) setSelectedSessionId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setPastSessionsLoading(false);
    }
  };

  const handleLogPastAction = async () => {
    setLogPastError('');
    if (!pastDesc.trim()) { setLogPastError('Please describe what you worked on.'); return; }
    if (!selectedSessionId) { setLogPastError('Please select a session.'); return; }
    const durationMinutes = parseInt(pastHours || '0') * 60 + parseInt(pastMinutes || '0');
    if (durationMinutes <= 0) { setLogPastError('Duration must be at least 1 minute.'); return; }

    const session = pastSessions.find(s => s.id === selectedSessionId);
    if (!session) { setLogPastError('Session not found.'); return; }

    if (durationMinutes > Math.ceil(session.hours * 60) + 5) {
      setLogPastError(`Duration can't exceed the session length (${Math.floor(session.hours)}h ${Math.round((session.hours % 1) * 60)}m).`);
      return;
    }

    setLogPastLoading(true);
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          project_id: session.project_id,
          description: pastDesc.trim(),
          time_entry_id: selectedSessionId,
          duration_minutes: durationMinutes,
          retroactive: true,
        }),
      });
      if (res.ok) {
        setShowLogPastModal(false);
        setPastDesc(''); setPastHours('0'); setPastMinutes('0'); setSelectedSessionId(''); setLogPastError('');
        fetchActions();
      } else {
        const data = await res.json();
        setLogPastError(data.error || 'Failed to log action.');
      }
    } catch {
      setLogPastError('An error occurred. Please try again.');
    } finally {
      setLogPastLoading(false);
    }
  };

  const handleAddAction = async () => {
    if (!newActionText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId, project_id: projectId, description: newActionText,
          time_entry_id: activeEntryId, group_id: activeGroupId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveGroupId(data.group_id);
        setNewActionText(''); setShowAddForm(false);
        fetchActions();
      }
    } catch (err) { console.error('Failed to add action:', err); }
    finally { setLoading(false); }
  };

  const handleCompleteGroup = async () => {
    if (!pendingCompleteGroupId) return;
    const actionInGroup = actions.find(a => a.group_id === pendingCompleteGroupId);
    if (!actionInGroup) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/actions/${actionInGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completeGroup: true }),
      });
      if (res.ok) {
        setActiveGroupId(null); setShowCompleteConfirm(false); setPendingCompleteGroupId(null);
        fetchActions();
      }
    } catch (err) { console.error('Failed to complete group:', err); }
    finally { setLoading(false); }
  };

  const handleEdit = async (actionId: string) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`/api/actions/${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editText }),
      });
      if (res.ok) { setEditingId(null); setEditText(''); fetchActions(); }
    } catch (err) { console.error('Failed to edit action:', err); }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/actions/${pendingDeleteId}`, { method: 'DELETE' });
      if (res.ok) { setShowDeleteConfirm(false); setPendingDeleteId(null); fetchActions(); }
    } catch (err) { console.error('Failed to delete action:', err); }
    finally { setLoading(false); }
  };

  const groups = groupActions(actions);
  const inProgressGroup = groups.find(g => !g.completed_at) ?? null;
  const inProgressActions = actions.filter(a => !a.completed_at);

  return (
    <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Actions</h2>
        <div className="flex gap-2">
          {!isClockedIn && (
            <Button
              onClick={openLogPastModal}
              variant="outline"
              className="border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 text-sm"
            >
              <History className="w-4 h-4 mr-1.5" />
              Log Past Action
            </Button>
          )}
          {isClockedIn && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-[#1c3260] text-white hover:bg-[#16264c] px-6 py-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Action
            </Button>
          )}
        </div>
      </div>

      {/* Add action form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
          <textarea
            value={newActionText} onChange={e => setNewActionText(e.target.value)}
            placeholder="What are you working on?" rows={2} autoFocus
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1c3260] placeholder:text-slate-300"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddAction(); }
              if (e.key === 'Escape') { setShowAddForm(false); setNewActionText(''); }
            }}
          />
          {activeGroupId && <p className="text-xs text-slate-400">This will be added to the current group</p>}
          <div className="flex gap-2">
            <button onClick={() => { setShowAddForm(false); setNewActionText(''); }}
              className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-semibold">
              Cancel
            </button>
            <button onClick={handleAddAction} disabled={loading || !newActionText.trim()}
              className="flex-1 px-3 py-2 bg-[#1c3260] hover:bg-[#16264c] disabled:bg-slate-400 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" />
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Actions list */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {inProgressActions.length === 0 && !showAddForm && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <p className="text-center">
              {isClockedIn
                ? 'No actions in progress. Click "Add Action" to start.'
                : 'Clock in to start adding actions, or use "Log Past Action" to record missed work.'}
            </p>
          </div>
        )}

        {/* In-progress / carried-over group */}
        {inProgressGroup && (
          <div className={`border-2 rounded-xl overflow-hidden ${inProgressGroup.carried_over ? 'border-amber-200' : 'border-[#1c3260]/20'}`}>
            <div className={`px-4 py-3 flex items-center justify-between ${inProgressGroup.carried_over ? 'bg-amber-50' : 'bg-blue-50'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <Layers className={`w-4 h-4 ${inProgressGroup.carried_over ? 'text-amber-600' : 'text-[#1c3260]'}`} />
                <span className={`text-sm font-semibold uppercase tracking-wide ${inProgressGroup.carried_over ? 'text-amber-700' : 'text-[#1c3260]'}`}>
                  {inProgressGroup.carried_over ? 'Carried Over' : 'In Progress'}
                  {' · '}{inProgressGroup.actions.length} {inProgressGroup.actions.length === 1 ? 'action' : 'actions'}
                </span>
                {/* Duration badge */}
                {(inProgressGroup.accumulated_seconds > 0 || inProgressGroup.last_resumed_at) && (
                  <span className="flex items-center gap-1 text-xs bg-white/70 px-2 py-0.5 rounded-full border border-slate-200">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {inProgressGroup.carried_over
                      ? <span className="text-amber-700 font-medium">{formatDuration(inProgressGroup.accumulated_seconds)} (paused)</span>
                      : <GroupTimer group={inProgressGroup} />
                    }
                  </span>
                )}
                {!inProgressGroup.carried_over && inProgressGroup.accumulated_seconds > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                    Resumed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm text-slate-400 hidden sm:block">
                  {formatTime(inProgressGroup.started_at)}
                </span>
                {isClockedIn && !inProgressGroup.carried_over && (
                  <button
                    onClick={() => { setPendingCompleteGroupId(inProgressGroup.group_id); setShowCompleteConfirm(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {inProgressGroup.actions.map(action => (
                <div key={action.id} className="px-4 py-4">
                  {editingId === action.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} autoFocus
                        className="w-full px-3 py-2 text-base border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1c3260]" />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditingId(null); setEditText(''); }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-semibold">
                          Cancel
                        </button>
                        <button onClick={() => handleEdit(action.id)}
                          className="px-3 py-1.5 bg-[#1c3260] hover:bg-[#16264c] text-white rounded-lg text-sm font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base text-slate-800 leading-snug">{action.description}</p>
                      {action.user_id === userId && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingId(action.id); setEditText(action.description); }}
                            className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setPendingDeleteId(action.id); setShowDeleteConfirm(true); }}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150"
          onClick={() => { setShowDeleteConfirm(false); setPendingDeleteId(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Delete Action?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">This action will be permanently deleted and cannot be recovered.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteConfirm(false); setPendingDeleteId(null); }} disabled={loading}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={loading}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete group confirmation modal ── */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150"
          onClick={() => { setShowCompleteConfirm(false); setPendingCompleteGroupId(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Complete this Action?</h3>
            <p className="text-sm text-slate-500 text-center mb-2">
              All {inProgressGroup?.actions.length} action{inProgressGroup?.actions.length !== 1 ? 's' : ''} in this group will be marked as complete.
            </p>
            {inProgressGroup && (
              <div className="bg-slate-50 rounded-xl p-3 mb-6 space-y-1">
                {inProgressGroup.actions.map(a => (
                  <p key={a.id} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-slate-300 mt-0.5">•</span>{a.description}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowCompleteConfirm(false); setPendingCompleteGroupId(null); }} disabled={loading}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleCompleteGroup} disabled={loading}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? 'Completing...' : 'Complete Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Past Action modal ── */}
      {showLogPastModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150"
          onClick={() => setShowLogPastModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1c3260]/10">
                  <History className="w-5 h-5 text-[#1c3260]" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Log Past Action</h3>
              </div>
              <button onClick={() => setShowLogPastModal(false)} className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-5">
              Forgot to log what you worked on? Select the session and describe the action.
            </p>

            {logPastError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{logPastError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Session</label>
                {pastSessionsLoading ? (
                  <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                ) : pastSessions.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No completed sessions found.</p>
                ) : (
                  <select
                    value={selectedSessionId}
                    onChange={e => setSelectedSessionId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1c3260] bg-white"
                  >
                    {pastSessions.map(s => (
                      <option key={s.id} value={s.id}>{s.display_label}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">What did you work on?</label>
                <textarea
                  value={pastDesc} onChange={e => setPastDesc(e.target.value)}
                  placeholder="Describe the action..." rows={2} autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#1c3260] placeholder:text-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">How long did it take?</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#1c3260]">
                      <input
                        type="number" min="0" max="23" value={pastHours}
                        onChange={e => setPastHours(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm text-right focus:outline-none"
                      />
                      <span className="px-3 text-sm text-slate-400 bg-slate-50 border-l border-slate-200 py-2.5">h</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#1c3260]">
                      <input
                        type="number" min="0" max="59" value={pastMinutes}
                        onChange={e => setPastMinutes(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm text-right focus:outline-none"
                      />
                      <span className="px-3 text-sm text-slate-400 bg-slate-50 border-l border-slate-200 py-2.5">m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowLogPastModal(false); setPastDesc(''); setPastHours('0'); setPastMinutes('0'); setLogPastError(''); }}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogPastAction}
                disabled={logPastLoading || pastSessions.length === 0}
                className="flex-1 px-4 py-3 bg-[#1c3260] hover:bg-[#16264c] text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {logPastLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {logPastLoading ? 'Logging...' : 'Log Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
