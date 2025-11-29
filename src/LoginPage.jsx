import React, { useState } from "react";
import { LogIn } from "lucide-react";
import { Client, Account } from "appwrite";

/**
 * LoginPage using Appwrite email/password authentication.
 *
 * Props:
 * - onLogin(user)   -> called with Appwrite user object after successful login
 * - onCancel()      -> called when user cancels
 *
 * Notes:
 * - Ensure environment variables VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT are set.
 * - Install `appwrite` package: npm install appwrite
 */

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || process.env.REACT_APP_APPWRITE_ENDPOINT) // endpoint
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT || process.env.REACT_APP_APPWRITE_PROJECT);   // project id

const account = new Account(client);

export default function LoginPage({ onLogin, onCancel }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function createSession(email, password) {
    /**
     * Appwrite SDK has changed method names across versions.
     * Try a few common method names so this code works across minor SDK versions:
     *  - account.createEmailSession(email, password)
     *  - account.createEmailPasswordSession({ email, password })
     *  - account.createSession(email, password)
     *
     * If your project uses a specific Appwrite version, you can remove the other branches.
     */
    // 1) createEmailSession(email, password)
    if (typeof account.createEmailSession === "function") {
      return account.createEmailSession(email, password);
    }

    // 2) createEmailPasswordSession({ email, password })
    if (typeof account.createEmailPasswordSession === "function") {
      return account.createEmailPasswordSession({ email, password });
    }

    // 3) createSession(email, password)
    if (typeof account.createSession === "function") {
      return account.createSession(email, password);
    }

    throw new Error("No supported Appwrite session creation method found in SDK.");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      alert("Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      // Attempt to create session
      await createSession(form.email, form.password);

      // On success, fetch user/account details
      const user = await account.get();

      // Call parent callback with user object
      onLogin?.(user);
    } catch (err) {
      console.error("Login error:", err);

      // Attempt to detect 'session already exists' case
      const errType = err?.type || err?.response?.type || null;
      const errCode = err?.code || err?.response?.code || null;
      const errMessage = String(err?.message || err?.response || "");

      // If Appwrite tells us a session is already active, fetch the current user and continue
      if (
        errType === "user_session_already_exists" ||
        errMessage.toLowerCase().includes("session is active") ||
        errMessage.toLowerCase().includes("session already exists") ||
        (errCode === 401 && errMessage.toLowerCase().includes("session"))
      ) {
        try {
          console.info("Existing session detected — fetching current user.");
          const user = await account.get();
          onLogin?.(user);
          return;
        } catch (fetchErr) {
          console.error("Failed to fetch user from existing session:", fetchErr);
          alert("A session already exists but we couldn't fetch user info. Try signing out in other tabs and retry.");
          return;
        }
      }

      // Otherwise show friendly error message
      const msg = err?.message || err?.response || "Login failed. Check credentials or Appwrite configuration.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 text-gray-800">
      <div className="w-full max-w-md bg-white shadow-md rounded-2xl p-8 border border-gray-100">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-lg mb-3">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-semibold">Welcome Back</h2>
          <p className="text-sm text-gray-500 mt-1">
            Sign in to continue to Smart Complaint Register
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm mt-2">
            <a href="#" className="text-indigo-600 hover:underline" onClick={(ev) => ev.preventDefault()}>
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 mt-4 rounded-lg text-white text-sm font-medium transition ${
              loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 mt-3 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-6">
          © {new Date().getFullYear()} Smart Complaint Register. All rights reserved.
        </div>
      </div>
    </div>
  );
}
