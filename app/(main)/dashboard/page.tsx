'use client';
import React, { useEffect, useState } from "react";
import { Lora } from "next/font/google";
import { auth } from "@/lib/firebase"; // use client-side Firebase
import { onAuthStateChanged, User } from "firebase/auth";
import DateTime from "@/components/dateTime";
import RecentActivity from "@/components/RecentActivity";
import HoursWorkedCard from "@/components/HoursWorked";
import ProjectInformation from "@/components/ProjectInformation";
import ClockIn from "@/components/ClockIn";
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Track Firebase user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  const userId = user?.uid;

  // Fetch all projects and restore saved project (only after user is loaded)
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
  
  //temporary
  useEffect(() => {
  if (user?.uid) {
    console.log("My Firebase UID:", user.uid);
  }
}, [user]);

  // Fetch selected project details - FIXED: Changed backticks to parentheses
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
      <main className="flex flex-col lg:flex-row gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-6 flex-[1]">
          <div className="flex justify-between items-center">
            <DateTime />
          </div>
          <RecentActivity projectCount={projects.length} />
          <HoursWorkedCard hoursWorked={42} />
        </div>

        {/* Middle + Right columns */}
        <div className="flex-[8] flex flex-col gap-4">
          <div className="flex gap-4">
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

          <div className="w-full pl-6">
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