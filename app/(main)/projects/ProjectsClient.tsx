// app/projects/ProjectsClient.tsx
'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, FolderOpen, Layers, Clock, CheckCircle2, Edit2, Trash2, Check, X, Users, Timer, ChevronDown, ChevronRight, History, Archive, RotateCcw } from 'lucide-react';
import { Lora } from 'next/font/google';

const lora = Lora({ subsets: ['latin'] });

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType?: string;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  category: string;
  is_archived?: number;
}

interface Action {
  id: string;
  group_id: string;
  user_id: string;
  project_id: string;
  description: string;
  started_at: string;
  completed_at: string | null;
  carried_over?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
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

interface ActionGroup {
  group_id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  actions: Action[];
  started_at: string;
  completed_at: string | null;
}

interface ProjectUserStat {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalHours: number;
  sessionCount: number;
  firstClockIn: string | null;
  lastClockIn: string | null;
  completedActions: number;
  inProgressActions: number;
}

interface ActiveUser {
  id: string;
  firstName: string;
  lastName: string;
  clockedInSince: string;
}

interface TeamActiveSession {
  entry_id: string;
  clock_in: string;
  user_id: string;
  first_name: string;
  last_name: string;
  project_id: string;
  project_title: string;
  project_category: string;
}

interface ProjectsClientProps {
  user: User;
}

function groupActions(actions: Action[]): ActionGroup[] {
  const map = new Map<string, Action[]>();
  for (const a of actions) {
    if (!map.has(a.group_id)) map.set(a.group_id, []);
    map.get(a.group_id)!.push(a);
  }
  return Array.from(map.entries()).map(([group_id, acts]) => ({
    group_id,
    user_id: acts[0].user_id,
    first_name: acts[0].first_name,
    last_name: acts[0].last_name,
    email: acts[0].email,
    actions: acts,
    started_at: acts[0].started_at,
    completed_at: acts.every(a => a.completed_at) ? acts[acts.length - 1].completed_at : null,
  }));
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatElapsed(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ProjectsClient({ user }: ProjectsClientProps) {
  const isAdmin = user.userType === 'admin';
  const isElevated = isAdmin || user.userType === 'manager';

  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [adminView, setAdminView] = useState<'actions' | 'users'>('actions');
  const [projectUserStats, setProjectUserStats] = useState<ProjectUserStat[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const [teamActivity, setTeamActivity] = useState<TeamActiveSession[]>([]);
  const [teamActivityOpen, setTeamActivityOpen] = useState(false);
  const [loadingTeamActivity, setLoadingTeamActivity] = useState(false);

  // Active entry (to know if user is clocked in and to which project)
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [clockedInProjectId, setClockedInProjectId] = useState<string | null>(null);

  // Add action inline form
  const [showAddActionForm, setShowAddActionForm] = useState(false);
  const [newActionText, setNewActionText] = useState('');
  const [addActionLoading, setAddActionLoading] = useState(false);

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

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [addCategoryParentId, setAddCategoryParentId] = useState<string | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const [showingArchives, setShowingArchives] = useState(false);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [archiveConfirmProject, setArchiveConfirmProject] = useState<Project | null>(null);
  const [unarchiveConfirmProject, setUnarchiveConfirmProject] = useState<Project | null>(null);

  const userId = user.id;

  const filteredProjects = selectedCategory ? projects.filter(p => p.category === selectedCategory.name) : [];

  // Restore selection from localStorage once categories are loaded
  const restoredRef = useRef(false);
  useEffect(() => {
    if (categories.length === 0 || restoredRef.current) return;
    restoredRef.current = true;
    const savedCatId = localStorage.getItem('selectedCategoryId');
    const savedExpandedIds = localStorage.getItem('expandedCategoryIds');
    const savedProject = localStorage.getItem('selectedProject');
    if (savedCatId) {
      const cat = categories.find(c => c.id === savedCatId);
      if (cat) setSelectedCategory(cat);
    }
    if (savedExpandedIds) {
      try { setExpandedIds(new Set(JSON.parse(savedExpandedIds))); } catch { /* ignore */ }
    }
    if (savedProject) {
      try { setSelectedProject(JSON.parse(savedProject)); } catch { /* ignore */ }
    }
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('selectedCategoryId', selectedCategory?.id ?? '');
  }, [selectedCategory]);

  useEffect(() => {
    localStorage.setItem('expandedCategoryIds', JSON.stringify([...expandedIds]));
  }, [expandedIds]);

  useEffect(() => {
    if (selectedProject) localStorage.setItem('selectedProject', JSON.stringify(selectedProject));
  }, [selectedProject]);

  const fetchTeamActivity = useCallback(async () => {
    if (!isElevated) return;
    setLoadingTeamActivity(true);
    try {
      const res = await fetch('/api/admin/team-activity');
      if (res.ok) {
        const data = await res.json();
        setTeamActivity(data.activeSessions ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch team activity:', err);
    } finally {
      setLoadingTeamActivity(false);
    }
  }, [isElevated]);

  useEffect(() => {
    if (isElevated) fetchTeamActivity();
  }, [isElevated, fetchTeamActivity]);

  const fetchActiveEntry = useCallback(async () => {
    try {
      const res = await fetch('/api/time_entries/active');
      const data = await res.json();
      setActiveEntryId(data?.id ?? null);
      setClockedInProjectId(data?.project_id ?? null);
    } catch (err) {
      console.error('Failed to fetch active entry:', err);
    }
  }, [userId]);

  useEffect(() => { fetchActiveEntry(); }, [fetchActiveEntry]);

  const handleAddAction = async () => {
    if (!newActionText.trim() || !selectedProject) return;
    const userActiveGroupId = actions.find(
      a => a.user_id === userId && !a.completed_at && !a.carried_over
    )?.group_id ?? null;
    setAddActionLoading(true);
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject.id,
          description: newActionText.trim(),
          time_entry_id: activeEntryId,
          group_id: userActiveGroupId,
        }),
      });
      if (res.ok) {
        setNewActionText('');
        setShowAddActionForm(false);
        fetchActions();
      }
    } catch (err) {
      console.error('Failed to add action:', err);
    } finally {
      setAddActionLoading(false);
    }
  };

  const openLogPastModal = async () => {
    setShowLogPastModal(true);
    setPastSessionsLoading(true);
    try {
      const res = await fetch('/api/time_entries/history?limit=10');
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

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then((data: Category[]) => setCategories(data))
      .catch(err => console.error('Failed to fetch categories:', err));
  }, []);

  const fetchArchivedProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects?archived=true');
      if (res.ok) setArchivedProjects(await res.json());
    } catch (err) {
      console.error('Failed to fetch archived projects:', err);
    }
  }, []);

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then((data: Project[]) => setProjects(data))
      .catch(err => console.error('Failed to fetch projects:', err));
    fetchArchivedProjects();
  }, [fetchArchivedProjects]);

  const fetchActions = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/actions/project/${selectedProject.id}`);
      if (res.ok) setActions(await res.json());
    } catch (err) {
      console.error('Failed to fetch actions:', err);
    }
  }, [selectedProject]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const fetchProjectStats = useCallback(async () => {
    if (!selectedProject || !isElevated) return;
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/admin/project-stats/${selectedProject.id}`);
      if (res.ok) {
        const data = await res.json();
        setProjectUserStats(data.userStats || []);
        setActiveUsers(data.activeUsers || []);
      }
    } catch (err) {
      console.error('Failed to fetch project stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [selectedProject, isElevated]);

  useEffect(() => {
    if (adminView === 'users') fetchProjectStats();
  }, [adminView, fetchProjectStats]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim(), parent_id: addCategoryParentId }),
      });
      if (res.ok) {
        const newCategory = await res.json();
        setCategories(prev => [...prev, newCategory]);
        if (addCategoryParentId) {
          setExpandedIds(prev => new Set([...prev, addCategoryParentId]));
        }
        setNewCategoryName('');
        setShowAddCategory(false);
        setAddCategoryParentId(null);
      } else {
        const error = await res.json();
        alert(`Failed to add: ${error.error}`);
      }
    } catch (err) { console.error(err); }
  };

  const handleAddProject = async () => {
    if (!newProjectTitle.trim() || !newProjectCategory) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newProjectTitle, category: newProjectCategory, created_by: userId }),
      });
      if (res.ok) {
        const newProject = await res.json();
        setProjects(prev => [...prev, newProject]);
        setNewProjectTitle('');
        setNewProjectCategory('');
        setShowAddProject(false);
      } else {
        const error = await res.json();
        alert(`Failed to add project: ${error.error}`);
      }
    } catch (err) { console.error(err); }
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

  const handleDelete = async (actionId: string) => {
    if (!window.confirm('Delete this action?')) return;
    try {
      const res = await fetch(`/api/actions/${actionId}`, { method: 'DELETE' });
      if (res.ok) fetchActions();
    } catch (err) { console.error('Failed to delete action:', err); }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setArchivedProjects(prev => [...prev, updated]);
        if (selectedProject?.id === projectId) setSelectedProject(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to archive project');
      }
    } catch (err) { console.error(err); }
  };

  const handleUnarchiveProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unarchive' }),
      });
      if (res.ok) {
        const updated = await res.json();
        setArchivedProjects(prev => prev.filter(p => p.id !== projectId));
        setProjects(prev => [...prev, updated]);
        if (selectedProject?.id === projectId) setSelectedProject(updated);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to unarchive project');
      }
    } catch (err) { console.error(err); }
  };

  const actionGroups = groupActions(actions);
  const inProgressGroups = actionGroups.filter(g => !g.completed_at);
  const completedGroups = actionGroups.filter(g => g.completed_at);
  const isClockedIn = clockedInProjectId !== null;
  const isClockedInToSelectedProject = clockedInProjectId === selectedProject?.id;

  const toggleExpand = (catId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  const renderTree = (parentId: string | null, depth: number): React.ReactNode => {
    const children = categories
      .filter(c => (c.parent_id ?? null) === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (children.length === 0) return null;
    return children.map(cat => {
      const hasChildren = categories.some(c => c.parent_id === cat.id);
      const isExpanded = expandedIds.has(cat.id);
      const isSelected = selectedCategory?.id === cat.id;
      const projectCount = projects.filter(p => p.category === cat.name).length;
      return (
        <div key={cat.id}>
          <div
            style={{ paddingLeft: `${depth * 16 + 4}px` }}
            className={`group flex items-center gap-1 py-1.5 pr-2 rounded-lg transition-all cursor-pointer ${
              isSelected ? 'bg-[#1c3260] text-white shadow-sm' : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            {/* Expand toggle */}
            <button
              onClick={e => { e.stopPropagation(); toggleExpand(cat.id); }}
              className="w-5 h-5 flex items-center justify-center flex-shrink-0 rounded"
            >
              {hasChildren
                ? isExpanded
                  ? <ChevronDown className={`w-3.5 h-3.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`} />
                  : <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`} />
                : <span className="w-3.5 h-3.5 block" />}
            </button>

            {/* Name — clicking selects */}
            <button
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedProject(null);
                setShowingArchives(false);
                if (hasChildren && !expandedIds.has(cat.id)) toggleExpand(cat.id);
              }}
              className="flex-1 text-left text-sm font-medium flex items-center justify-between min-w-0 gap-2"
            >
              <span className="truncate">{cat.name}</span>
              {projectCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  isSelected ? 'bg-white/20 text-white/80' : 'bg-slate-100 text-slate-500'
                }`}>
                  {projectCount}
                </span>
              )}
            </button>

            {/* Inline add-sub button (visible on hover) */}
            <button
              onClick={e => {
                e.stopPropagation();
                setAddCategoryParentId(cat.id);
                setShowAddCategory(true);
                if (!isExpanded) toggleExpand(cat.id);
              }}
              title={`Add sub-category under ${cat.name}`}
              className={`opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded flex-shrink-0 ${
                isSelected ? 'hover:bg-white/20 text-white/70' : 'hover:bg-slate-200 text-slate-400'
              }`}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {hasChildren && isExpanded && renderTree(cat.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className={`h-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex flex-col ${lora.className}`}>
      <div className="max-w-[1800px] mx-auto w-full flex flex-col flex-1 min-h-0">
        <h1 className="text-4xl font-bold text-slate-800 mb-8 tracking-tight flex-shrink-0">Project Management</h1>

        {isElevated && (
          <div className="mb-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex-shrink-0">
            <button
              onClick={() => { setTeamActivityOpen(o => !o); if (!teamActivityOpen) fetchTeamActivity(); }}
              className="w-full flex items-center justify-between px-5 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-800">All Activity</span>
                {teamActivity.length > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">{teamActivity.length} working now</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${teamActivityOpen ? 'rotate-180' : ''}`} />
            </button>
            {teamActivityOpen && (
              <div className="px-5 pb-4 border-t border-slate-100 pt-3">
                {loadingTeamActivity ? (
                  <p className="text-xs text-slate-400">Loading...</p>
                ) : teamActivity.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">No one is clocked in right now.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {teamActivity.map(s => (
                      <div key={s.entry_id} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1c3260] to-[#4062ad] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {s.first_name?.[0]}{s.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{s.first_name} {s.last_name}</p>
                          <p className="text-xs text-slate-400 truncate">{s.project_title || 'No project'}</p>
                        </div>
                        <span className="text-xs text-slate-400 font-mono flex-shrink-0">{formatElapsed(s.clock_in)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">

          {/* Column 1: Category Tree */}
          <div className="bg-white rounded-2xl shadow-lg p-6 overflow-hidden flex flex-col border border-slate-200">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-[#1c3260]" />
                Categories
              </h2>
              <button
                onClick={() => { setAddCategoryParentId(null); setShowAddCategory(true); }}
                className="p-2 bg-[#1c3260] text-white rounded-lg hover:bg-[#4062ad] transition-all hover:scale-105 active:scale-95"
                title="Add top-level category"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="flex-1">
                {categories.filter(c => !c.parent_id).length === 0 ? (
                  <div className="text-slate-400 text-center py-8">
                    <p className="mb-2">No categories yet</p>
                    <p className="text-sm">Click + to create one</p>
                  </div>
                ) : renderTree(null, 0)}
              </div>
              <div className="border-t border-slate-100 pt-3 mt-3 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowingArchives(true);
                    setSelectedCategory(null);
                    setSelectedProject(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    showingArchives ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Archive className="w-4 h-4 flex-shrink-0" />
                  <span>Archives</span>
                  {archivedProjects.length > 0 && (
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                      showingArchives ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {archivedProjects.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {showAddCategory && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex-shrink-0">
                {addCategoryParentId && (
                  <p className="text-xs text-slate-500 mb-2">
                    Sub-category of <span className="font-semibold">{categories.find(c => c.id === addCategoryParentId)?.name}</span>
                  </p>
                )}
                <input
                  type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                  placeholder={addCategoryParentId ? 'Sub-category name...' : 'Category name...'} autoFocus
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-[#1c3260]"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddCategory();
                    if (e.key === 'Escape') { setShowAddCategory(false); setNewCategoryName(''); setAddCategoryParentId(null); }
                  }}
                />
                <div className="flex gap-2">
                  <button onClick={handleAddCategory} className="flex-1 px-3 py-2 bg-[#1c3260] text-white rounded-lg hover:bg-[#4062ad] transition-colors">Add</button>
                  <button onClick={() => { setShowAddCategory(false); setNewCategoryName(''); setAddCategoryParentId(null); }} className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Projects */}
          <div className="bg-white rounded-2xl shadow-lg p-6 overflow-hidden flex flex-col border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">
                {showingArchives ? 'Archives' : selectedCategory ? `${selectedCategory.name} Projects` : 'Select a Category'}
              </h2>
              {selectedCategory && !showingArchives && (
                <button onClick={() => { setNewProjectCategory(selectedCategory.name); setShowAddProject(true); }} className="p-2 bg-[#1c3260] text-white rounded-lg hover:bg-[#4062ad] transition-all hover:scale-105 active:scale-95">
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>

            {showingArchives ? (
              <div className="flex-1 overflow-y-auto space-y-2">
                {archivedProjects.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No archived projects</p>
                ) : archivedProjects.map(project => (
                  <div key={project.id} className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedProject(project); setAdminView('actions'); }}
                      className={`flex-1 text-left px-4 py-3 rounded-xl transition-all ${selectedProject?.id === project.id ? 'bg-amber-100 text-amber-900 shadow-md scale-[1.02]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:scale-[1.01]'}`}
                    >
                      <span className="font-medium">{project.title}</span>
                      <span className="block text-xs text-slate-400 mt-0.5">{project.category}</span>
                    </button>
                    {isElevated && (
                      <button
                        onClick={() => setUnarchiveConfirmProject(project)}
                        title="Unarchive project"
                        className="flex items-center gap-1.5 px-2.5 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex-shrink-0 text-xs font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedCategory ? (
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredProjects.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No projects in this category</p>
                ) : filteredProjects.map(project => (
                  <div key={project.id} className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedProject(project); setAdminView('actions'); }}
                      className={`flex-1 text-left px-4 py-3 rounded-xl transition-all ${selectedProject?.id === project.id ? 'bg-[#1c3260] text-white shadow-md scale-[1.02]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:scale-[1.01]'}`}
                    >
                      <span className="font-medium">{project.title}</span>
                    </button>
                    {isElevated && (
                      <button
                        onClick={() => setArchiveConfirmProject(project)}
                        title="Archive project"
                        className="flex items-center gap-1.5 px-2.5 py-2 text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex-shrink-0 text-xs font-semibold"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Archive
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <p>← Select a category to view projects</p>
              </div>
            )}

            {showAddProject && !showingArchives && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="text" value={newProjectTitle} onChange={e => setNewProjectTitle(e.target.value)}
                  placeholder="Project name..." autoFocus
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-[#1c3260]"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddProject(); if (e.key === 'Escape') { setShowAddProject(false); setNewProjectTitle(''); } }}
                />
                <div className="flex gap-2">
                  <button onClick={handleAddProject} className="flex-1 px-3 py-2 bg-[#1c3260] text-white rounded-lg hover:bg-[#4062ad] transition-colors">Add</button>
                  <button onClick={() => { setShowAddProject(false); setNewProjectTitle(''); }} className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Actions + Admin Team Panel */}
          <div className="bg-white rounded-2xl shadow-lg p-6 overflow-hidden flex flex-col border border-slate-200">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {adminView === 'actions' ? <Layers className="w-5 h-5 text-[#1c3260]" /> : <Users className="w-5 h-5 text-[#1c3260]" />}
                <h2 className="text-xl font-semibold text-slate-800">
                  {!selectedProject ? 'Select a Project' : adminView === 'actions' ? `${selectedProject.title} Actions` : `${selectedProject.title} — Team`}
                </h2>
                {selectedProject?.is_archived ? (
                  <span className="text-xs font-semibold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Archived</span>
                ) : null}
              </div>
              {isElevated && selectedProject && (
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                  <button
                    onClick={() => setAdminView('actions')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${adminView === 'actions' ? 'bg-[#1c3260] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Actions
                  </button>
                  <button
                    onClick={() => { setAdminView('users'); fetchProjectStats(); }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${adminView === 'users' ? 'bg-[#1c3260] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Team
                  </button>
                </div>
              )}
            </div>

            {!selectedProject ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <p>← Select a project to view actions</p>
              </div>
            ) : adminView === 'users' && isElevated ? (
              /* Admin: Team view */
              <div className="flex-1 overflow-y-auto space-y-3">
                {loadingStats ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-8 h-8 border-4 border-[#1c3260] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {activeUsers.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Currently Clocked In</p>
                        {activeUsers.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-sm font-semibold text-emerald-800">{u.firstName} {u.lastName}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-emerald-600">
                              <Timer className="w-3 h-3" />
                              {formatElapsed(u.clockedInSince)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">All Contributors</p>
                    {projectUserStats.length === 0 ? (
                      <p className="text-slate-400 text-center py-8">No users have worked on this project yet.</p>
                    ) : projectUserStats.map(u => (
                      <div key={u.id} className="border border-slate-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 text-sm">{u.firstName} {u.lastName}</span>
                          <span className="text-xs text-slate-400">{u.email}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-[#1c3260]">{Number(u.totalHours).toFixed(1)}h</p>
                            <p className="text-xs text-slate-400">Total Hours</p>
                          </div>
                          <div className="bg-emerald-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-emerald-600">{u.completedActions}</p>
                            <p className="text-xs text-slate-400">Completed</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-blue-600">{u.inProgressActions}</p>
                            <p className="text-xs text-slate-400">In Progress</p>
                          </div>
                        </div>
                        {u.lastClockIn && (
                          <p className="text-xs text-slate-400">Last active: {new Date(u.lastClockIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ) : (
              /* Actions view */
              <>
                {/* Add / Log Past buttons */}
                {!selectedProject?.is_archived && (
                  <div className="flex gap-2 mb-3 flex-shrink-0">
                    {isClockedInToSelectedProject && (
                      <button
                        onClick={() => setShowAddActionForm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c3260] hover:bg-[#16264c] text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Action
                      </button>
                    )}
                    {!isClockedIn && (
                      <button
                        onClick={openLogPastModal}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                        Log Past Action
                      </button>
                    )}
                  </div>
                )}

                {/* Inline add form */}
                {showAddActionForm && (
                  <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2 flex-shrink-0">
                    <textarea
                      value={newActionText}
                      onChange={e => setNewActionText(e.target.value)}
                      placeholder="What are you working on?" rows={2} autoFocus
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1c3260] placeholder:text-slate-300"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddAction(); }
                        if (e.key === 'Escape') { setShowAddActionForm(false); setNewActionText(''); }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowAddActionForm(false); setNewActionText(''); }}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddAction}
                        disabled={addActionLoading || !newActionText.trim()}
                        className="flex-1 px-3 py-1.5 bg-[#1c3260] hover:bg-[#16264c] disabled:bg-slate-400 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {addActionLoading ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}

              <div className="flex-1 overflow-y-auto space-y-4">
                {actionGroups.length === 0 && !showAddActionForm && (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <p className="text-center text-sm">
                      {isClockedInToSelectedProject
                        ? 'No actions yet. Click "Add Action" to log what you\'re working on.'
                        : 'No actions for this project yet.'}
                    </p>
                  </div>
                )}
                {inProgressGroups.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">In Progress</p>
                    {inProgressGroups.map(group => (
                      <div key={group.group_id} className="border-2 border-[#1c3260]/20 rounded-xl overflow-hidden">
                        <div className="bg-blue-50 px-3 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-xs font-semibold text-[#1c3260]">
                              {group.first_name && group.last_name ? `${group.first_name} ${group.last_name}` : group.email || 'Unknown'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{formatTime(group.started_at)}
                          </span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {group.actions.map(action => (
                            <div key={action.id} className="px-3 py-2">
                              {isAdmin && editingId === action.id ? (
                                <div className="flex flex-col gap-2">
                                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} autoFocus
                                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1c3260]" />
                                  <div className="flex gap-2 justify-end">
                                    <button onClick={() => { setEditingId(null); setEditText(''); }} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                    <button onClick={() => handleEdit(action.id)} className="p-1 text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm text-slate-700">{action.description}</p>
                                  {isAdmin && (
                                    <div className="flex gap-1 flex-shrink-0">
                                      <button onClick={() => { setEditingId(action.id); setEditText(action.description); }} className="p-1 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleDelete(action.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {group.actions.length > 1 && (
                          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100">
                            <span className="text-xs text-slate-400 flex items-center gap-1"><Layers className="w-3 h-3" />{group.actions.length} actions grouped</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {completedGroups.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Completed</p>
                    {completedGroups.map(group => (
                      <div key={group.group_id} className="border border-slate-200 rounded-xl overflow-hidden opacity-75">
                        <div className="bg-slate-50 px-3 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-xs font-semibold text-slate-600">
                              {group.first_name && group.last_name ? `${group.first_name} ${group.last_name}` : group.email || 'Unknown'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {formatTime(group.started_at)} → {formatTime(group.completed_at!)} · {formatDuration(group.started_at, group.completed_at!)}
                          </span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {group.actions.map(action => (
                            <div key={action.id} className="px-3 py-2 flex items-start justify-between gap-2">
                              <p className="text-sm text-slate-500 line-through">{action.description}</p>
                              {isAdmin && (
                                <button onClick={() => handleDelete(action.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                              )}
                            </div>
                          ))}
                        </div>
                        {group.actions.length > 1 && (
                          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100">
                            <span className="text-xs text-slate-400 flex items-center gap-1"><Layers className="w-3 h-3" />{group.actions.length} actions completed together</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Log Past Action modal */}
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
                <X className="w-5 h-5" />
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
                      <input type="number" min="0" max="23" value={pastHours} onChange={e => setPastHours(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm text-right focus:outline-none" />
                      <span className="px-3 text-sm text-slate-400 bg-slate-50 border-l border-slate-200 py-2.5">h</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#1c3260]">
                      <input type="number" min="0" max="59" value={pastMinutes} onChange={e => setPastMinutes(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm text-right focus:outline-none" />
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

      {/* Archive confirmation modal */}
      {archiveConfirmProject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150" onClick={() => setArchiveConfirmProject(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 flex-shrink-0">
                <Archive className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Archive Project?</h3>
                <p className="text-sm text-slate-500">This project will be read-only and no one can clock in.</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 mb-6">
              <p className="font-semibold text-slate-800">{archiveConfirmProject.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{archiveConfirmProject.category}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setArchiveConfirmProject(null)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { handleArchiveProject(archiveConfirmProject.id); setArchiveConfirmProject(null); }}
                className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unarchive confirmation modal */}
      {unarchiveConfirmProject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150" onClick={() => setUnarchiveConfirmProject(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 flex-shrink-0">
                <RotateCcw className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Restore Project?</h3>
                <p className="text-sm text-slate-500">This project will become active again and accept clock-ins.</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 mb-6">
              <p className="font-semibold text-slate-800">{unarchiveConfirmProject.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{unarchiveConfirmProject.category}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setUnarchiveConfirmProject(null)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { handleUnarchiveProject(unarchiveConfirmProject.id); setUnarchiveConfirmProject(null); }}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}