'use client';
import React, { useEffect, useState } from 'react';
import { Plus, FolderOpen, StickyNote, Check, Edit2, Trash2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Lora } from 'next/font/google';

const lora = Lora({ subsets: ['latin'] });

interface Category {
  id: string;
  name: string;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  category: string;
}

interface Note {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  completed: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
}

const ProjectsPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');

  const userId = user?.uid;

  // --- Auth ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      console.log('🔐 Auth state changed:', currentUser?.email, currentUser?.uid);
    });
    return () => unsubscribe();
  }, []);

  // --- Restore selection from localStorage ---
  useEffect(() => {
    const savedCategory = localStorage.getItem('selectedCategory');
    const savedProject = localStorage.getItem('selectedProject');

    if (savedCategory) setSelectedCategory(savedCategory);
    if (savedProject) setSelectedProject(JSON.parse(savedProject));
  }, []);

  // --- Persist selection to localStorage ---
  useEffect(() => {
    if (selectedCategory) localStorage.setItem('selectedCategory', selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedProject) localStorage.setItem('selectedProject', JSON.stringify(selectedProject));
  }, [selectedProject]);

  // --- Fetch categories ---
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then((data: Category[]) => setCategories(data))
      .catch(err => console.error('❌ Failed to fetch categories:', err));
  }, []);

  // --- Fetch projects ---
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then((data: Project[]) => setProjects(data))
      .catch(err => console.error('❌ Failed to fetch projects:', err));
  }, []);

  // --- Fetch notes ---
  useEffect(() => {
    if (!selectedProject) return;

    fetch(`/api/notes/${selectedProject.id}`)
      .then(res => res.json())
      .then((data: Note[]) => {
        const notesWithBoolean = data.map(n => ({
          ...n,
          completed: Boolean(n.completed),
        }));
        setNotes(notesWithBoolean.sort((a, b) => Number(a.completed) - Number(b.completed)));
      })
      .catch(err => console.error('❌ Failed to fetch notes:', err));
  }, [selectedProject]);

  // --- Add category ---
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (res.ok) {
        const newCategory = await res.json();
        setCategories(prev => [...prev, newCategory]);
        setNewCategoryName('');
        setShowAddCategory(false);
      } else {
        const error = await res.json();
        alert(`Failed to add category: ${error.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add category');
    }
  };

  // --- Add project ---
  const handleAddProject = async () => {
    if (!newProjectTitle.trim() || !newProjectCategory) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newProjectTitle, 
          category: newProjectCategory,
          created_by: userId 
        }),
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
    } catch (err) {
      console.error(err);
      alert('Failed to add project');
    }
  };

  // --- Add note ---
  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !selectedProject || !userId) return;
    try {
      const res = await fetch(`/api/notes/${selectedProject.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: newNoteContent }),
      });
      if (res.ok) {
        setNewNoteContent('');
        setShowAddNote(false);
        // refresh notes
        const notesRes = await fetch(`/api/notes/${selectedProject.id}`);
        const data = await notesRes.json();
        setNotes(
            data
                .map((n: Note) => ({ ...n, completed: Boolean(n.completed) }))
                .sort((a: Note, b: Note) => Number(a.completed) - Number(b.completed))
        );
      } else {
        console.error('Failed to add note:', await res.text());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Toggle completed ---
  const toggleCompleted = async (note: Note) => {
    const newCompleted = !note.completed;
    try {
      const res = await fetch(`/api/notes/note/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      });
      if (res.ok) {
        setNotes(prev =>
          prev.map(n => n.id === note.id ? { ...n, completed: newCompleted } : n)
              .sort((a, b) => Number(a.completed) - Number(b.completed))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Delete note ---
  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      const res = await fetch(`/api/notes/note/${noteId}`, { method: 'DELETE' });
      if (res.ok) setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error(err);
    }
  };

  // --- Edit note ---
  const handleEditNote = async (noteId: string) => {
    if (!editNoteContent.trim()) return;
    try {
      const res = await fetch(`/api/notes/note/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editNoteContent }),
      });
      if (res.ok) {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: editNoteContent } : n));
        setEditingNoteId(null);
        setEditNoteContent('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProjects = selectedCategory 
    ? projects.filter(p => p.category === selectedCategory) 
    : [];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600 text-lg">Please log in to view projects.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 ${lora.className}`}>
      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-4xl font-bold text-slate-800 mb-8 tracking-tight">
          Project Management
        </h1>

        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-280px)]">
          {/* Column 1: Categories */}
          <div className="bg-white rounded-2xl shadow-lg p-6 overflow-hidden flex flex-col border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-[#1c3260]" />
                Categories
              </h2>
              <button
                onClick={() => setShowAddCategory(true)}
                className="p-2 bg-[#1c3260] text-white rounded-lg hover:bg-[#4062ad] transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {categories.length === 0 ? (
                <div className="text-slate-400 text-center py-8">
                  <p className="mb-2">No categories yet</p>
                  <p className="text-sm">Click + to create one</p>
                </div>
              ) : (
                categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.name);
                      setSelectedProject(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                      selectedCategory === category.name
                        ? 'bg-[#1c3260] text-white shadow-md scale-[1.02]'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:scale-[1.01]'
                    }`}
                  >
                    <span className="font-medium">{category.name}</span>
                    <span className="ml-2 text-sm opacity-70">
                      ({projects.filter(p => p.category === category.name).length})
                    </span>
                  </button>
                ))
              )}
            </div>

            {showAddCategory && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory();
                    if (e.key === 'Escape') {
                      setShowAddCategory(false);
                      setNewCategoryName('');
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCategory}
                    className="flex-1 px-3 py-2 bg-[#1c3260] text-white rounded-lg hover:bg-[#4062ad] transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCategory(false);
                      setNewCategoryName('');
                    }}
                    className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Projects */}
          <div className="bg-white rounded-2xl shadow-lg p-6 overflow-hidden flex flex-col border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">
                {selectedCategory ? `${selectedCategory} Projects` : 'Select a Category'}
              </h2>
              {selectedCategory && (
                <button
                  onClick={() => {
                    setNewProjectCategory(selectedCategory);
                    setShowAddProject(true);
                  }}
                  className="p-2 bg-[#1c3260] text-white rounded-lg hover:bg-[#4062ad] transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>

            {selectedCategory ? (
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredProjects.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No projects in this category</p>
                ) : (
                  filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        selectedProject?.id === project.id
                          ? 'bg-[#1c3260] text-white shadow-md scale-[1.02]'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:scale-[1.01]'
                      }`}
                    >
                      <span className="font-medium">{project.title}</span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <p>← Select a category to view projects</p>
              </div>
            )}

            {/* ADD PROJECT FORM - THIS WAS MISSING! */}
            {showAddProject && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Project name..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-[#1c3260]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddProject();
                    if (e.key === 'Escape') {
                      setShowAddProject(false);
                      setNewProjectTitle('');
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddProject}
                    className="flex-1 px-3 py-2 bg-[#1c3260] text-white rounded-lg hover:bg-[#4062ad] transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddProject(false);
                      setNewProjectTitle('');
                    }}
                    className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Notes */}
          <div className="bg-white rounded-2xl shadow-lg p-6 overflow-hidden flex flex-col border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-[#1c3260]" />
                {selectedProject ? `${selectedProject.title} Notes` : 'Select a Project'}
              </h2>
              {selectedProject && (
                <button
                  onClick={() => setShowAddNote(true)}
                  className="p-2 bg-[#1c3260] text-white rounded-lg hover:bg-[#4062ad] transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>

            {selectedProject ? (
              <div className="flex-1 overflow-y-auto space-y-3">
                {notes.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <p>No notes yet. Click + to add one!</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-4 rounded-xl border transition-all ${
                        note.completed
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <button
                          onClick={() => toggleCompleted(note)}
                          className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            note.completed
                              ? 'bg-[#1c3260] border-[#1c3260]'
                              : 'border-slate-300 hover:border-[#4062ad]'
                          }`}
                        >
                          {note.completed && <Check className="w-3 h-3 text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <span className="font-medium text-slate-700">
                              {note.first_name && note.last_name
                                ? `${note.first_name} ${note.last_name}`
                                : note.email || 'Unknown User'}
                            </span>
                            <span>•</span>
                            <span>{new Date(note.created_at).toLocaleDateString()}</span>
                          </div>

                          {editingNoteId === note.id ? (
                            <div>
                              <textarea
                                value={editNoteContent}
                                onChange={(e) => setEditNoteContent(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1c3260]"
                                rows={3}
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleEditNote(note.id)}
                                  className="px-3 py-1 text-sm bg-[#1c3260] text-white rounded-lg hover:bg-[#4062ad]"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setEditNoteContent('');
                                  }}
                                  className="px-3 py-1 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className={`text-slate-700 whitespace-pre-wrap ${note.completed ? 'line-through' : ''}`}>
                              {note.content}
                            </p>
                          )}
                        </div>

                        {note.user_id === userId && editingNoteId !== note.id && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditNoteContent(note.content);
                              }}
                              className="p-1.5 text-slate-400 hover:text-yellow-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <p>← Select a project to view notes</p>
              </div>
            )}

            {showAddNote && selectedProject && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Write your note..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1c3260]"
                  rows={4}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleAddNote}
                    className="flex-1 px-3 py-2 bg-[#1c3260] text-white rounded-lg hover:bg-[#4062ad] transition-colors"
                  >
                    Add Note
                  </button>
                  <button
                    onClick={() => {
                      setShowAddNote(false);
                      setNewNoteContent('');
                    }}
                    className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;