"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export default function Dashboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [userProfile, setUserProfile] = useState<{
    email: string;
    role: string;
    tenant: { name: string; slug: string; plan: string };
  } | null>(null);
  const [tenantInfo, setTenantInfo] = useState<{
    name: string;
    plan: string;
  } | null>(null);
  const [noteForm, setNoteForm] = useState({ title: "", content: "" });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "USER" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuthAndFetchData = useCallback(async () => {
    try {
      // Fetch user profile first
      const profileResponse = await fetch("/api/auth/profile");
      if (!profileResponse.ok) {
        router.push("/login");
        return;
      }

      const profileData = await profileResponse.json();
      setUserProfile(profileData);
      setTenantInfo({
        name: profileData.tenant.name,
        plan: profileData.tenant.plan,
      });

      // Then fetch notes
      const notesResponse = await fetch("/api/notes");
      if (notesResponse.ok) {
        const notesData = await notesResponse.json();
        setNotes(notesData);
      } else {
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
  }, [router]);

  useEffect(() => {
    // Run once on mount; dependencies handled via useCallback
    void checkAuthAndFetchData();
  }, [checkAuthAndFetchData]);

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
      router.push("/login");
    }
  };

  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) return;

    setInviteLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteForm.email,
          role: inviteForm.role,
        }),
      });

      if (response.ok) {
        setInviteForm({ email: "", role: "USER" });
        alert("User invited successfully!");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to invite user");
      }
    } catch (err) {
      setError(`Failed to invite user${err ? ": " + String(err) : ""}`);
    } finally {
      setInviteLoading(false);
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
      setError("Failed to create note" + (err ? ": " + String(err) : ""));
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
    if (!userProfile) return;

    try {
      const response = await fetch(
        `/api/tenants/${userProfile.tenant.slug}/upgrade`,
        {
          method: "POST",
        }
      );
      if (response.ok) {
        setTenantInfo({
          name: userProfile.tenant.name,
          plan: "PRO",
        });
        setUserProfile({
          ...userProfile,
          tenant: { ...userProfile.tenant, plan: "PRO" },
        });
        setError("");
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        const data = await response.json();
        setError(data.error || "Upgrade failed");
      }
    } catch (err) {
      setError("Upgrade failed" + (err ? ": " + String(err) : ""));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Notes</h1>
            {userProfile && (
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-medium text-sm">
                      {userProfile.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">{userProfile.email}</span>
                    <span className="mx-2">•</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        userProfile.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {userProfile.role}
                    </span>
                    <span className="mx-2">•</span>
                    <span className="text-gray-500">
                      {userProfile.tenant.name}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {tenantInfo && (
              <span className="text-sm text-gray-600">
                Plan:{" "}
                <span
                  className={`font-semibold ${
                    tenantInfo.plan === "PRO"
                      ? "text-green-600"
                      : "text-orange-600"
                  }`}
                >
                  {tenantInfo.plan}
                </span>
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

        {/* Admin Invitation Section */}
        {userProfile?.role === "ADMIN" && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-6 mb-6">
            <h3 className="text-lg font-medium text-blue-900 mb-4">
              Invite New Users
            </h3>
            <form onSubmit={inviteUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label
                    htmlFor="inviteEmail"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="inviteEmail"
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="inviteRole"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Role
                  </label>
                  <select
                    id="inviteRole"
                    value={inviteForm.role}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={inviteLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md text-sm font-medium"
              >
                {inviteLoading ? "Inviting..." : "Send Invitation"}
              </button>
            </form>
            <div className="mt-4 text-sm text-blue-800">
              <p>
                <strong>How invitations work:</strong>
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  An email invitation will be sent to the specified address
                </li>
                <li>The recipient clicks the invitation link in their email</li>
                <li>They complete the signup process with their password</li>
                <li>
                  They are automatically added to your tenant with the selected
                  role
                </li>
              </ul>
            </div>
          </div>
        )}

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
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
