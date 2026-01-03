'use client';

import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  title: string;
  category: string;
}

interface ProjectInformationProps {
  project: Project;
  projects: Project[];
  onProjectChange: (projectId: string) => void;
}

export default function ProjectInformation({ project, projects, onProjectChange }: ProjectInformationProps) {
  const infoRef = useRef<HTMLDivElement>(null);
  const [infoWidth, setInfoWidth] = useState<number | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const updateWidth = () => {
      if (infoRef.current) setInfoWidth(infoRef.current.offsetWidth);
    };
    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (infoRef.current) resizeObserver.observe(infoRef.current);
    return () => resizeObserver.disconnect();
  }, [project]);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 transition-shadow max-w-lg ml-6 relative">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Current Project Information
      </h2>

      <div className="space-x-6 mb-4" ref={infoRef}>
        <p className="text-lg text-gray-600 font-extrabold">
          Category: <span className="text-gray-900 font-normal">{project.category}</span>
        </p>
        <p className="text-lg text-gray-600 font-extrabold">
          Title: <span className="text-gray-900 font-normal">{project.title}</span>
        </p>
      </div>

      <Button
        variant="outline"
        style={{ width: infoWidth ? `${infoWidth}px` : "100px" }}
        onClick={() => setShowModal(true)}
      >
        Change Project
      </Button>

      {/* Full-screen modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-30 backdrop-blur-md flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full mx-4 shadow-2xl relative">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">Select Project</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    if (p.id !== project.id) {
                      onProjectChange(p.id);
                    }
                    setShowModal(false);
                  }}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                >
                  <p className="font-semibold text-gray-900">{p.title}</p>
                  <p className="text-sm text-gray-500">{p.category}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
