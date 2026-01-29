'use client';
import React, { useRef, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowLeft } from "lucide-react";

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

export default function ProjectInformation({ 
  project, 
  projects, 
  onProjectChange 
}: ProjectInformationProps) {
  const infoRef = useRef<HTMLDivElement>(null);
  const [infoWidth, setInfoWidth] = useState<number | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group projects by category
  const categorizedProjects = useMemo(() => {
    const categories: { [key: string]: Project[] } = {};
    
    projects.forEach((p) => {
      if (!categories[p.category]) {
        categories[p.category] = [];
      }
      categories[p.category].push(p);
    });
    
    return categories;
  }, [projects]);

  const categories = Object.keys(categorizedProjects);

  useEffect(() => {
    const updateWidth = () => {
      if (infoRef.current) setInfoWidth(infoRef.current.offsetWidth);
    };
    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (infoRef.current) resizeObserver.observe(infoRef.current);
    return () => resizeObserver.disconnect();
  }, [project]);

  // Handle opening modal
  const handleOpenModal = () => {
    setShowModal(true);
    setSelectedCategory(null);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCategory(null);
  };

  // Handle selecting a category
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  // Handle going back to categories
  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  // Handle selecting a project
  const handleProjectSelect = (projectId: string) => {
    if (projectId !== project.id) {
      onProjectChange(projectId);
    }
    handleCloseModal();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedCategory) {
          setSelectedCategory(null);
        } else {
          handleCloseModal();
        }
      }
    };

    if (showModal) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [showModal, selectedCategory]);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 transition-shadow max-w-lg ml-6 relative">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Current Project Information
      </h2>
      
      <div className="space-y-2 mb-4" ref={infoRef}>
        <p className="text-lg text-gray-600 font-extrabold">
          Category: <span className="text-gray-900 font-normal">{project.category}</span>
        </p>
        <p className="text-lg text-gray-600 font-extrabold">
          Title: <span className="text-gray-900 font-normal">{project.title}</span>
        </p>
      </div>

      <Button
        variant="outline"
        style={{ width: infoWidth ? `${infoWidth}px` : "100%" }}
        onClick={handleOpenModal}
        className="w-full"
      >
        Change Project
      </Button>

      {/* Full-screen modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-30 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center mb-4">
              {selectedCategory ? (
                <button
                  onClick={handleBackToCategories}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors mr-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div className="mr-auto"></div>
              )}
              
              <h3 className="text-xl font-semibold text-gray-900 absolute left-1/2 -translate-x-1/2">
                {selectedCategory ? selectedCategory : 'Select Category'}
              </h3>

              <button
                onClick={handleCloseModal}
                className="ml-auto text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto">
              {!selectedCategory ? (
                // Show Categories
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories.map((category) => {
                    const projectCount = categorizedProjects[category].length;
                    const isCurrentCategory = category === project.category;

                    return (
                      <div
                        key={category}
                        onClick={() => handleCategoryClick(category)}
                        className={`group relative p-4 border rounded-lg cursor-pointer transition-all hover:scale-[1.02] ${
                          isCurrentCategory
                            ? 'border-[#1c3260] bg-blue-50'
                            : 'border-gray-200 hover:border-[#4062ad] hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-0.5 text-sm">
                              {category}
                            </h4>
                            
                            <p className="text-xs text-gray-500">
                              {projectCount} {projectCount === 1 ? 'project' : 'projects'}
                            </p>
                          </div>

                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1c3260] transition-colors flex-shrink-0" />
                        </div>

                        {isCurrentCategory && (
                          <div className="absolute top-3 right-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#1c3260]"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Show Projects in Selected Category
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categorizedProjects[selectedCategory].map((p) => {
                    const isCurrentProject = p.id === project.id;

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleProjectSelect(p.id)}
                        className={`relative p-3 border rounded-lg cursor-pointer transition-all hover:scale-[1.01] ${
                          isCurrentProject
                            ? 'border-[#1c3260] bg-blue-50'
                            : 'border-gray-200 hover:border-[#4062ad] hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {p.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {p.category}
                            </p>
                          </div>

                          {isCurrentProject && (
                            <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-[#1c3260] text-white text-xs font-medium">
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                {selectedCategory 
                  ? `${categorizedProjects[selectedCategory].length} projects in ${selectedCategory}`
                  : `${categories.length} categories • ${projects.length} total projects`
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}