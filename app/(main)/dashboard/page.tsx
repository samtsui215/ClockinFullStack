'use client';
import React, { useEffect, useState } from "react";
import { Lora } from "next/font/google";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import DateTime from "@/components/dateTime";
import RecentActivity from "@/components/RecentActivity";
import HoursWorkedCard from "@/components/HoursWorked";
import ProjectInformation from "@/components/ProjectInformation";
import ClockIn from "@/components/clock-in/ClockIn";
import ProjectNotes from "@/components/ProjectNotes";

const lora = Lora({ subsets: ["latin"] });

interface Project {
  id: string;
  title: string;
  category: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Stats State (New)
  const [stats, setStats] = useState({ activeProjects: 0, hours: 0 });

  const userId = user?.uid;

  // Track Firebase user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all projects
  useEffect(() => {
    if (!userId) return;

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
  }, [userId]);

  // Fetch Stats (Active Projects & Hours Worked) - NEW LOGIC
  useEffect(() => {
    if (!userId) return;

    fetch(`/api/profile/stats?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        // We pull the numbers calculated in your stats API
        if (data && data.thisWeek) {
          setStats({
            activeProjects: data.thisWeek.activeProjects, // Logic: clocked in this week
            hours: data.thisWeek.hours,                   // Logic: hours logged this week
          });
        }
      })
      .catch(console.error);
  }, [userId]);

  // Fetch selected project details
  useEffect(() => {
    if (!selectedProjectId) return;

    fetch(`/api/projects/${selectedProjectId}`)
      .then(res => res.json())
      .then((data: Project) => setSelectedProject(data))
      .catch(console.error);
  }, [selectedProjectId]);

  // Persist project change
  const handleProjectChange = (projectId: string) => {
    localStorage.setItem("activeProjectId", projectId);
    setSelectedProjectId(projectId);
  };

  if (loadingUser) return <p>Loading user...</p>;
  if (!userId) return <p>Please log in to see your dashboard.</p>;
  if (!selectedProject) return <p>Loading project...</p>;

  return (
    <div className={`min-h-screen bg-[#F9F9F9] p-6 pt-6 ${lora.className}`}>
      <main className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-24px)]">
        {/* Left column */}
        <div className="flex flex-col gap-6 flex-[1]">
          <div className="flex justify-between items-center">
            <DateTime />
          </div>
          
          {/* UPDATED: Now passing the calculated stats instead of hardcoded/length values */}
          <RecentActivity projectCount={stats.activeProjects} />
          <HoursWorkedCard hoursWorked={stats.hours} />
        </div>

        {/* Middle + Right columns */}
        <div className="flex-[8] flex flex-col gap-4 flex-1 h-full">
          <div className="flex">
            <div className="flex-1">
              <ProjectInformation
                project={selectedProject}
                projects={projects}
                onProjectChange={handleProjectChange}
              />
            </div>
            <div className="flex-1">
              <ClockIn userId={userId} projectId={selectedProject.id} />
            </div>
          </div>

          <div className="w-full pl-6 flex-1 flex flex-col">
            <ProjectNotes
              projectId={selectedProject.id}
              currentUserId={userId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}