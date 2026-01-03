'use client';
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Note {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  completed: boolean | number | string; // Database can return boolean, 0/1, or '0'/'1'/'true'/'false'
  first_name?: string;
  last_name?: string;
  email?: string;
}

// Normalized note with guaranteed boolean completed field
interface NormalizedNote extends Omit<Note, 'completed'> {
  completed: boolean;
}

interface ProjectNotesProps {
  projectId: string;
  currentUserId: string;
}

export default function ProjectNotes({ projectId, currentUserId }: ProjectNotesProps) {
  const [notes, setNotes] = useState<NormalizedNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Convert any value to a proper boolean
  const toBoolean = (value: any): boolean => {
    // Handle explicit false values
    if (value === false || value === 0 || value === '0' || value === 'false' || value === null || value === undefined) {
      return false;
    }
    // Handle explicit true values
    if (value === true || value === 1 || value === '1' || value === 'true') {
      return true;
    }
    // Default to false for anything else
    return false;
  };

  // Fetch notes for the current project
  const fetchNotes = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/notes/${projectId}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Note[];
      
      // DEBUG: Let's see what the API is actually returning
      console.log("Raw data from API:", data);
      console.log("First note completed value:", data[0]?.completed, "Type:", typeof data[0]?.completed);
      
      // Convert completed to true/false - handle various database return types
      const notesWithBoolean = data.map(n => ({
        ...n,
        completed: toBoolean(n.completed),
      }));
      
      console.log("After conversion:", notesWithBoolean);
      
      // Sort so incomplete notes are on top
      setNotes(notesWithBoolean.sort((a, b) => Number(a.completed) - Number(b.completed)));
    } catch (err) {
      console.error("Failed to fetch notes:", err);
      setNotes([]);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [projectId]);

  // Add new note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notes/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, content: newNote }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewNote("");
      setShowModal(false);
      fetchNotes();
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setLoading(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this note?");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/notes/note/${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  // Edit note
  const handleEditNote = async (noteId: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/notes/note/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditingId(null);
      setEditContent("");
      fetchNotes();
    } catch (err) {
      console.error("Failed to edit note:", err);
    }
  };

  // Toggle completed - FIXED: This is the single source of truth for toggling
  const toggleCompleted = async (note: NormalizedNote) => {
    const newCompleted = !note.completed;
    try {
      const res = await fetch(`/api/notes/note/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newCompleted }),
      });
      if (!res.ok) throw new Error(await res.text());

      setNotes(prev =>
        prev
          .map(n => n.id === note.id ? { ...n, completed: newCompleted } : n)
          .sort((a, b) => Number(a.completed) - Number(b.completed))
      );
    } catch (err) {
      console.error("Failed to toggle completed:", err);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-8 transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Project Notes</h2>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-[#1c3260] text-white hover:bg-[#16264c] px-6 py-2"
        >
          + Add Note
        </Button>
      </div>

      {/* Notes List */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No notes yet. Click "Add Note" to create one!
          </p>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={note.completed}
                    onChange={() => toggleCompleted(note)}
                    className="cursor-pointer"
                  />
                  <span className="font-medium text-gray-900">
                    {note.first_name} {note.last_name}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-xs">{new Date(note.created_at).toLocaleString()}</span>
                </div>

                {note.user_id === currentUserId && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(note.id);
                        setEditContent(note.content);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {editingId === note.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-[#1c3260]"
                    rows={3}
                  />
                  <div className="mt-2 flex gap-2 justify-end">
                    <Button
                      onClick={() => {
                        setEditingId(null);
                        setEditContent("");
                      }}
                      variant="outline"
                      className="text-sm px-3 py-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleEditNote(note.id)}
                      className="bg-[#1c3260] text-white hover:bg-[#16264c] text-sm px-3 py-1"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className={`text-gray-700 whitespace-pre-wrap ${note.completed ? 'line-through opacity-70' : ''}`}>
                  {note.content}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-300 bg-opacity-30 backdrop-blur-lg flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">Add New Note</h3>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Write your note here..."
              className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1c3260] focus:border-transparent"
              rows={6}
              autoFocus
            />
            <div className="mt-6 flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowModal(false);
                  setNewNote("");
                }}
                variant="outline"
                className="px-6 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNote}
                disabled={loading || !newNote.trim()}
                className="bg-[#1c3260] text-white hover:bg-[#16264c] px-6 py-2"
              >
                {loading ? "Adding..." : "Add Note"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}