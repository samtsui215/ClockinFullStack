// app/dashboard/DashboardClient.tsx
'use client';
import React, { useEffect, useState, useCallback } from "react";
import { Lora } from "next/font/google";
import { ArrowRight, Clock, RefreshCw } from "lucide-react";
import DateTime from "@/components/dateTime";
import ProjectInformation from "@/components/ProjectInformation";
import ClockIn from "@/components/clock-in/ClockIn";
import ActionPanel from "@/components/ActionPanel";
import RecentProjects from "@/components/RecentProjects";
import ManualTimeEntry from "@/components/ManualTimeEntry";
import HoursWorkedCard from "@/components/HoursWorked";

const lora = Lora({ subsets: ["latin"] });

interface Project {
  id: string;
  title: string;
  category: string;
}

interface RecentProject {
  id: string;
  title: string;
  category: string;
  last_used: string;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface DashboardClientProps {
  user: User;
}

function useElapsed(clockInTime: string | null): string {
  const [elapsed, setElapsed] = React.useState("0:00");
  useEffect(() => {
    if (!clockInTime) return;
    const calc = () => {
      const diff = Date.now() - new Date(clockInTime).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(
        h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${m}:${String(s).padStart(2, "0")}`
      );
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [clockInTime]);
  return elapsed;
}

function SwitchModal({
  fromProject,
  toProject,
  clockedInSince,
  switching,
  onConfirm,
  onCancel,
}: {
  fromProject: Project | null;
  toProject: Project | null;
  clockedInSince: string | null;
  switching: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const elapsed = useElapsed(clockedInSince);
  if (!fromProject || !toProject) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mx-auto mb-5">
          <RefreshCw className="w-6 h-6 text-[#1c3260]" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 text-center mb-1">Switch Project?</h3>
        <p className="text-sm text-slate-500 text-center mb-6">
          Your current session will be saved and a new one will start.
        </p>
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">From</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{fromProject.title}</p>
            <p className="text-xs text-slate-400 truncate">{fromProject.category}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#1c3260] uppercase tracking-wide mb-1">To</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{toProject.title}</p>
            <p className="text-xs text-slate-400 truncate">{toProject.category}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mb-6 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          <span>Time on current session: <span className="font-semibold text-slate-700 font-mono">{elapsed}</span></span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={switching}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={switching}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1c3260] to-[#4062ad] hover:from-[#16264c] hover:to-[#365399] text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {switching ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Switching...</>
            ) : (
              <><RefreshCw className="w-4 h-4" />Switch</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [clockedInProjectId, setClockedInProjectId] = useState<string | null>(null);
  const [clockedInSince, setClockedInSince] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [weeklyHours, setWeeklyHours] = useState(0);
  const [pendingSwitchToId, setPendingSwitchToId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const userId = user.id;

  const fetchWeeklyHours = useCallback(() => {
    fetch(`/api/profile/stats?userId=${userId}`)
      .then(res => res.json())
      .then(data => setWeeklyHours(data?.thisWeek?.hours ?? 0))
      .catch(console.error);
  }, [userId]);

  const fetchRecentProjects = useCallback(() => {
    fetch(`/api/recent-projects?userId=${userId}`)
      .then(res => res.json())
      .then((data: RecentProject[]) => setRecentProjects(data))
      .catch(console.error);
  }, [userId]);

  const fetchActiveEntry = useCallback(() => {
    fetch(`/api/time_entries/active/${userId}`)
      .then(res => res.json())
      .then(data => {
        setClockedInProjectId(data?.project_id ?? null);
        setClockedInSince(data?.clock_in ?? null);
        setActiveEntryId(data?.id ?? null);
      })
      .catch(console.error);
  }, [userId]);

  useEffect(() => {
    fetch("/api/projects")
      .then(res => res.json())
      .then((data: Project[]) => {
        setProjects(data);
        const savedProjectId = localStorage.getItem("activeProjectId");
        if (savedProjectId && data.some(p => p.id === savedProjectId)) {
          setSelectedProjectId(savedProjectId);
        } else if (data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchRecentProjects();
    fetchActiveEntry();
    fetchWeeklyHours();
  }, [fetchRecentProjects, fetchActiveEntry, fetchWeeklyHours]);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetch(`/api/projects/${selectedProjectId}`)
      .then(res => res.json())
      .then((data: Project) => {
        setSelectedProject(data);
        setLoading(false);
      })
      .catch(console.error);
  }, [selectedProjectId]);

  const handleClockInOut = useCallback(() => {
    fetchRecentProjects();
    fetchActiveEntry();
    fetchWeeklyHours();
  }, [fetchRecentProjects, fetchActiveEntry, fetchWeeklyHours]);

  const handleProjectChangeRequest = useCallback((projectId: string) => {
    if (clockedInProjectId && projectId !== clockedInProjectId) {
      setPendingSwitchToId(projectId);
    } else {
      localStorage.setItem("activeProjectId", projectId);
      setSelectedProjectId(projectId);
    }
  }, [clockedInProjectId]);

  const handleConfirmSwitch = useCallback(async () => {
    if (!pendingSwitchToId) return;
    setSwitching(true);
    try {
      const res = await fetch('/api/time_entries/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, new_project_id: pendingSwitchToId, description: null }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("activeProjectId", pendingSwitchToId);
        setSelectedProjectId(pendingSwitchToId);
        setClockedInProjectId(pendingSwitchToId);
        setClockedInSince(data.clock_in);
        setActiveEntryId(data.id);
        fetchRecentProjects();
      }
    } catch (err) {
      console.error('Failed to switch project:', err);
    } finally {
      setSwitching(false);
      setPendingSwitchToId(null);
    }
  }, [pendingSwitchToId, userId, fetchRecentProjects]);

  const pendingSwitchToProject = projects.find(p => p.id === pendingSwitchToId) ?? null;
  const clockedInProject = projects.find(p => p.id === clockedInProjectId) ?? null;
  const isClockedIn = clockedInSince !== null;

  if (loading || !selectedProject) {
    return (
      <div className={`min-h-screen bg-[#F9F9F9] flex items-center justify-center ${lora.className}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1c3260] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-hidden bg-[#F9F9F9] p-6 pt-4 ${lora.className}`}>
      <main className="flex flex-col lg:flex-row gap-4 h-full">

        {/* Left column */}
        <div className="flex flex-col gap-4 flex-[1] h-full min-h-0">
          <DateTime />
          <HoursWorkedCard hoursWorked={weeklyHours} />
          <div className="flex-1 min-h-0">
            <RecentProjects
              projects={recentProjects}
              activeProjectId={selectedProjectId}
              clockedInProjectId={clockedInProjectId}
              onProjectSelect={handleProjectChangeRequest}
            />
          </div>
        </div>

        {/* Middle + Right columns */}
        <div className="flex-[8] flex flex-col gap-4 h-full min-h-0">

          {/* Top row: ProjectInformation + ClockIn/ManualTimeEntry column — equal widths */}
          <div className="flex gap-4 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <ProjectInformation
                project={selectedProject}
                projects={projects}
                onProjectChange={handleProjectChangeRequest}
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <ClockIn
                userId={userId}
                projectId={selectedProject.id}
                clockedInSince={clockedInSince}
                onClockInOut={handleClockInOut}
              />
              <ManualTimeEntry
                userId={userId}
                projects={projects}
                currentProjectId={selectedProject.id}
                isClockedIn={isClockedIn}
                onEntryAdded={handleClockInOut}
              />
            </div>
          </div>

          {/* Bottom: Actions panel — takes remaining height */}
          <div className="w-full pl-6 flex-1 flex flex-col min-h-0">
            <ActionPanel
              projectId={selectedProject.id}
              userId={userId}
              activeEntryId={activeEntryId}
              isClockedIn={isClockedIn}
            />
          </div>
        </div>

      </main>

      {pendingSwitchToId && (
        <SwitchModal
          fromProject={clockedInProject}
          toProject={pendingSwitchToProject}
          clockedInSince={clockedInSince}
          switching={switching}
          onConfirm={handleConfirmSwitch}
          onCancel={() => setPendingSwitchToId(null)}
        />
      )}
    </div>
  );
}