"use client";

import React from "react";
import { Clock, ChevronRight, RefreshCw } from "lucide-react";

interface RecentProject {
  id: string;
  title: string;
  category: string;
  last_used: string;
}

interface RecentProjectsProps {
  projects: RecentProject[];
  activeProjectId: string | null;
  clockedInProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

export default function RecentProjects({
  projects,
  activeProjectId,
  clockedInProjectId,
  onProjectSelect,
}: RecentProjectsProps) {
  const isClockedIn = clockedInProjectId !== null;

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-[#1c3260]" />
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Recent Projects
        </h2>
        {isClockedIn && (
          <span className="ml-auto text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
            Clocked In
          </span>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No recent projects yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.slice(0, 5).map((project, index) => {
            const isActive = project.id === activeProjectId;
            const isClockedIntoThis = project.id === clockedInProjectId;
            const willSwitch = isClockedIn && !isClockedIntoThis;

            return (
              <button
                key={project.id}
                onClick={() => onProjectSelect(project.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between group
                  ${isClockedIntoThis
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
                    : isActive
                    ? "bg-[#1c3260] border-[#1c3260] text-white shadow-md"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:border-[#1c3260] hover:bg-blue-50"
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center
                    ${isClockedIntoThis
                      ? "bg-white text-emerald-600"
                      : isActive
                      ? "bg-white text-[#1c3260]"
                      : "bg-[#1c3260] text-white"
                    }`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${isActive || isClockedIntoThis ? "text-white" : "text-slate-800"}`}>
                      {project.title}
                    </p>
                    <p className={`text-xs truncate ${isClockedIntoThis ? "text-emerald-100" : isActive ? "text-blue-200" : "text-slate-400"}`}>
                      {project.category} &bull; {timeAgo(project.last_used)}
                    </p>
                  </div>
                </div>

                {willSwitch ? (
                  <RefreshCw className="w-4 h-4 flex-shrink-0 text-slate-300 group-hover:text-[#1c3260] transition-colors" />
                ) : (
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5
                    ${isActive || isClockedIntoThis ? "text-white/50" : "text-slate-300 group-hover:text-[#1c3260]"}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}