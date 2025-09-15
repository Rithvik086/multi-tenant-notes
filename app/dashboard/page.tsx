"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tenantInfo, setTenantInfo] = useState<{
    name: string;
    plan: string;
  } | null>(null);
  const [noteForm, setNoteForm] = useState({ title: "", content: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      // Check if user is authenticated by fetching notes
      const response = await fetch("/api/notes");
      if (response.ok) {
        const notesData = await response.json();
        setNotes(notesData);
        setTenantInfo({ name: "Current Tenant", plan: "FREE" });
      } else {
        // Not authenticated, redirect to login
        router.push("/login");
        return;
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      router.push("/login");
      return;
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await fetch("/api/notes");
      if (response.ok) {
        const notesData = await response.json();
        setNotes(notesData);
      } else if (response.status === 401) {
        router.push("/login");
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      // Force redirect even if logout API fails
      router.push("/login");
    }
  };

  const createNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.title.trim() || !noteForm.content.trim()) return;

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteForm),
      });

      if (response.ok) {
        setNoteForm({ title: "", content: "" });
        fetchNotes();
        setError("");
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create note");
      }
    } catch (err) {
      setError("Failed to create note");
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchNotes();
      } else if (response.status === 401) {
        router.push("/login");
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const upgradeTenant = async () => {
    try {
      // We need to determine the tenant slug - for now using 'acme' as default
      // In a real app, this would come from the user context
      const response = await fetch("/api/tenants/acme/upgrade", {
        method: "POST",
      });
      if (response.ok) {
        setTenantInfo({ name: "Current Tenant", plan: "PRO" });
        setError("");
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        const data = await response.json();
        setError(data.error || "Upgrade failed");
      }
    } catch (err) {
      setError("Upgrade failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Notes</h1>
          <div className="flex items-center space-x-4">
            {tenantInfo && (
              <span className="text-sm text-gray-600">
                Plan: <span className="font-semibold">{tenantInfo.plan}</span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Upgrade Banner */}
        {tenantInfo?.plan === "FREE" && notes.length >= 3 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Free Plan Limit Reached
                </h3>
                <p className="text-sm text-yellow-700">
                  You&apos;ve reached the 3 note limit for the free plan.
                </p>
              </div>
              <button
                onClick={upgradeTenant}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Note Form */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Create New Note
              </h2>
              <form onSubmit={createNote} className="space-y-4">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={noteForm.title}
                    onChange={(e) =>
                      setNoteForm({ ...noteForm, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="content"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Content
                  </label>
                  <textarea
                    id="content"
                    rows={4}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={noteForm.content}
                    onChange={(e) =>
                      setNoteForm({ ...noteForm, content: e.target.value })
                    }
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={tenantInfo?.plan === "FREE" && notes.length >= 3}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Create Note
                </button>
              </form>
            </div>
          </div>

          {/* Notes List */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Your Notes ({notes.length})
              </h2>
              {notes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No notes yet. Create your first note!
                </p>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {note.title}
                          </h3>
                          <p className="text-gray-600 mt-1">{note.content}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
