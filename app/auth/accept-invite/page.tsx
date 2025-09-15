"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface InviteInfo {
  email: string;
  role: string;
  tenantName: string;
  tenantId: string;
  invitedBy: string;
}

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing invitation token");
      setLoading(false);
      return;
    }
    const run = async () => {
      try {
        const res = await fetch(
          `/api/auth/accept-invite?token=${encodeURIComponent(token)}`
        );
        if (res.ok) {
          const data = await res.json();
          setInviteInfo(data);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Invalid or expired invitation");
        }
      } catch (err) {
        setError(`Failed to validate invitation: ${err}`);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 1200);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to accept invitation");
      }
    } catch (err) {
      setError(`Failed to accept invitation: ${err}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Validating invitation...</div>
      </div>
    );
  }

  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white shadow rounded p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Invitation Error
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white shadow rounded p-6">
        {success ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-green-600 mb-2">
              Success!
            </h1>
            <p className="text-gray-600">Redirecting to dashboard...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              Accept Invitation
            </h1>
            {inviteInfo && (
              <p className="text-sm text-gray-600 mb-4">
                You were invited to{" "}
                <span className="font-medium">{inviteInfo.tenantName}</span> as
                a <span className="font-medium">{inviteInfo.role}</span> by{" "}
                {inviteInfo.invitedBy}
              </p>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  required
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2 rounded font-medium"
              >
                {submitting ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
