// app/admin/AdminClient.tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Users, BarChart2, Plus, Shield, UserCheck, UserX, ChevronDown, Search, RefreshCw, FolderOpen } from 'lucide-react';
import { Lora } from 'next/font/google';

const lora = Lora({ subsets: ['latin'] });

type Tab = 'users' | 'reporting';
type ReportingView = 'all_users' | 'by_project';
type HoursFilter = 'this_week' | 'all_time';

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  isActive: boolean | number;
  createdAt: string;
  totalHours: number;
  projectCount: number;
  lastClockIn: string | null;
}

interface Project {
  id: string;
  title: string;
  category: string;
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

interface AdminClientProps {
  currentUserId: string;
}

function formatElapsed(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700 border border-purple-200',
    manager: 'bg-blue-100 text-blue-700 border border-blue-200',
    employee: 'bg-slate-100 text-slate-600 border border-slate-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[role] || styles.employee}`}>
      {role}
    </span>
  );
}

export default function AdminClient({ currentUserId }: AdminClientProps) {
  const [tab, setTab] = useState<Tab>('users');
  const [reportingView, setReportingView] = useState<ReportingView>('all_users');
  const [hoursFilter, setHoursFilter] = useState<HoursFilter>('this_week');

  // Users tab
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: '', lastName: '', email: '', password: '', userType: 'employee' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Reporting - by project
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectUserStats, setProjectUserStats] = useState<ProjectUserStat[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loadingProjectStats, setLoadingProjectStats] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/users?filter=${hoursFilter}`);
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [hoursFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then((data: Project[]) => setProjects(data))
      .catch(console.error);
  }, []);

  const fetchProjectStats = useCallback(async () => {
    if (!selectedProject) return;
    setLoadingProjectStats(true);
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
      setLoadingProjectStats(false);
    }
  }, [selectedProject]);

  useEffect(() => { fetchProjectStats(); }, [fetchProjectStats]);

  const handleUpdateUser = async (userId: string, updates: { userType?: string; isActive?: boolean }) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleAddUser = async () => {
    setAddError('');
    if (!addForm.email || !addForm.password || !addForm.firstName || !addForm.lastName) {
      setAddError('All fields are required.');
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddUser(false);
        setAddForm({ firstName: '', lastName: '', email: '', password: '', userType: 'employee' });
        fetchUsers();
      } else {
        setAddError(data.error || 'Failed to create user.');
      }
    } catch (err) {
      setAddError('An error occurred.');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`min-h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 ${lora.className}`}>
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-[#1c3260] rounded-xl">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Admin Panel</h1>
            </div>
            <p className="text-slate-500 ml-14">Manage users, roles, and view team reporting</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${tab === 'users' ? 'bg-[#1c3260] text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
          >
            <Users className="w-5 h-5" />
            User Management
          </button>
          <button
            onClick={() => setTab('reporting')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${tab === 'reporting' ? 'bg-[#1c3260] text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
          >
            <BarChart2 className="w-5 h-5" />
            Reporting
          </button>
        </div>

        {/* ── USER MANAGEMENT TAB ── */}
        {tab === 'users' && (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1c3260] bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={fetchUsers} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-[#1c3260] transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1c3260] text-white rounded-xl hover:bg-[#4062ad] transition-all font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Add User
                </button>
              </div>
            </div>

            {/* Add User Form */}
            {showAddUser && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Create New User</h3>
                {addError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{addError}</div>
                )}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">First Name</label>
                    <input type="text" value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c3260]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Last Name</label>
                    <input type="text" value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c3260]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                    <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c3260]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Temporary Password</label>
                    <input type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c3260]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Role</label>
                    <select value={addForm.userType} onChange={e => setAddForm(f => ({ ...f, userType: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c3260] bg-white">
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setShowAddUser(false); setAddError(''); setAddForm({ firstName: '', lastName: '', email: '', password: '', userType: 'employee' }); }}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium">
                    Cancel
                  </button>
                  <button onClick={handleAddUser} disabled={addLoading}
                    className="px-4 py-2 bg-[#1c3260] text-white rounded-lg hover:bg-[#4062ad] transition-colors font-medium disabled:opacity-50 flex items-center gap-2">
                    {addLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {addLoading ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </div>
            )}

            {/* Users table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
              {loadingUsers ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-4 border-[#1c3260] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">User</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Last Active</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1c3260] to-[#4062ad] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {u.firstName?.[0]}{u.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{u.firstName} {u.lastName}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {u.id === currentUserId ? (
                            <RoleBadge role={u.userType} />
                          ) : (
                            <select
                              value={u.userType}
                              onChange={e => handleUpdateUser(u.id, { userType: e.target.value })}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#1c3260]"
                            >
                              <option value="employee">Employee</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {u.lastClockIn
                            ? new Date(u.lastClockIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {u.id !== currentUserId && (
                            <button
                              onClick={() => handleUpdateUser(u.id, { isActive: !u.isActive })}
                              className={`flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                u.isActive
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {u.isActive ? <><UserX className="w-3.5 h-3.5" />Deactivate</> : <><UserCheck className="w-3.5 h-3.5" />Reactivate</>}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── REPORTING TAB ── */}
        {tab === 'reporting' && (
          <div className="space-y-6">
            {/* Reporting sub-tabs */}
            <div className="flex items-center justify-between">
              <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setReportingView('all_users')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${reportingView === 'all_users' ? 'bg-[#1c3260] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  All Users
                </button>
                <button
                  onClick={() => setReportingView('by_project')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${reportingView === 'by_project' ? 'bg-[#1c3260] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  By Project
                </button>
              </div>

              {reportingView === 'all_users' && (
                <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setHoursFilter('this_week')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${hoursFilter === 'this_week' ? 'bg-[#1c3260] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setHoursFilter('all_time')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${hoursFilter === 'all_time' ? 'bg-[#1c3260] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    All Time
                  </button>
                </div>
              )}
            </div>

            {/* All Users reporting view */}
            {reportingView === 'all_users' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                {loadingUsers ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-4 border-[#1c3260] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">User</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Hours {hoursFilter === 'this_week' ? 'This Week' : 'All Time'}
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Projects</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.filter(u => u.isActive).map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1c3260] to-[#4062ad] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {u.firstName?.[0]}{u.lastName?.[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{u.firstName} {u.lastName}</p>
                                <p className="text-xs text-slate-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 max-w-[120px] bg-slate-100 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-[#1c3260] to-[#4062ad] h-2 rounded-full"
                                  style={{ width: `${Math.min((Number(u.totalHours) / (hoursFilter === 'this_week' ? 40 : 500)) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-slate-800 tabular-nums">
                                {Number(u.totalHours).toFixed(1)}h
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{u.projectCount} project{u.projectCount !== 1 ? 's' : ''}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {u.lastClockIn
                              ? new Date(u.lastClockIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* By Project reporting view */}
            {reportingView === 'by_project' && (
              <div className="grid grid-cols-3 gap-6">
                {/* Project list */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" /> Projects
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {projects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProject(p)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                          selectedProject?.id === p.id
                            ? 'bg-[#1c3260] text-white shadow-md'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <p className="font-medium text-sm">{p.title}</p>
                        <p className={`text-xs mt-0.5 ${selectedProject?.id === p.id ? 'text-blue-200' : 'text-slate-400'}`}>{p.category}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Project stats */}
                <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-lg p-6 overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
                  {!selectedProject ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                      <p>← Select a project to view team stats</p>
                    </div>
                  ) : loadingProjectStats ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-[#1c3260] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-6 flex-shrink-0">
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">{selectedProject.title}</h3>
                          <p className="text-sm text-slate-400">{selectedProject.category}</p>
                        </div>
                        <div className="flex gap-4 text-center">
                          <div className="bg-slate-50 rounded-xl px-4 py-2">
                            <p className="text-2xl font-bold text-[#1c3260]">
                              {projectUserStats.reduce((s, u) => s + Number(u.totalHours), 0).toFixed(1)}h
                            </p>
                            <p className="text-xs text-slate-400">Total Hours</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl px-4 py-2">
                            <p className="text-2xl font-bold text-[#1c3260]">{projectUserStats.length}</p>
                            <p className="text-xs text-slate-400">Contributors</p>
                          </div>
                          {activeUsers.length > 0 && (
                            <div className="bg-emerald-50 rounded-xl px-4 py-2">
                              <p className="text-2xl font-bold text-emerald-600">{activeUsers.length}</p>
                              <p className="text-xs text-slate-400">Clocked In Now</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3">
                        {activeUsers.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Currently Active</p>
                            {activeUsers.map(u => (
                              <div key={u.id} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="text-sm font-semibold text-emerald-800">{u.firstName} {u.lastName}</span>
                                </div>
                                <span className="text-xs text-emerald-600 font-medium">{formatElapsed(u.clockedInSince)} elapsed</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {projectUserStats.length === 0 ? (
                          <p className="text-slate-400 text-center py-8">No users have worked on this project yet.</p>
                        ) : (
                          <>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">All Contributors</p>
                            {projectUserStats.map(u => (
                              <div key={u.id} className="border border-slate-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1c3260] to-[#4062ad] flex items-center justify-center text-white text-xs font-bold">
                                      {u.firstName?.[0]}{u.lastName?.[0]}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-800 text-sm">{u.firstName} {u.lastName}</p>
                                      <p className="text-xs text-slate-400">{u.sessionCount} session{u.sessionCount !== 1 ? 's' : ''}</p>
                                    </div>
                                  </div>
                                  <span className="text-xl font-bold text-[#1c3260]">{Number(u.totalHours).toFixed(1)}h</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-center">
                                  <div className="bg-emerald-50 rounded-lg p-2">
                                    <p className="text-base font-bold text-emerald-600">{u.completedActions}</p>
                                    <p className="text-xs text-slate-400">Actions Completed</p>
                                  </div>
                                  <div className="bg-blue-50 rounded-lg p-2">
                                    <p className="text-base font-bold text-blue-600">{u.inProgressActions}</p>
                                    <p className="text-xs text-slate-400">In Progress</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}