// src/components/admin/AdminLogin.jsx
import React, { useState } from "react";
import { LogIn } from "lucide-react";
import { Client, Account } from "appwrite";
import { useNavigate } from "react-router-dom";

const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const PROJECT = import.meta.env.VITE_APPWRITE_PROJECT;

const ADMIN_EMAILS = (import.meta.env.VITE_APPWRITE_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ADMIN_MAP = (import.meta.env.VITE_APPWRITE_ADMIN_MAP || "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean)
  .reduce((acc, pair) => {
    const [email, role] = pair.split(":").map((x) => x && x.trim());
    if (email && role) acc[email.toLowerCase()] = role;
    return acc;
  }, {});

const client = new Client();
client.setEndpoint(ENDPOINT).setProject(PROJECT);
const account = new Account(client);

/* Supports multiple SDK methods */
async function createSession(email, password) {
  if (typeof account.createEmailSession === "function")
    return account.createEmailSession(email, password);

  if (typeof account.createEmailPasswordSession === "function")
    return account.createEmailPasswordSession({ email, password });

  if (typeof account.createSession === "function")
    return account.createSession(email, password);

  throw new Error("Appwrite: no session method available.");
}

/* ROLE DETECTOR – fixed and contains other-admin */
function detectRoleFromUser(user) {
  if (!user) return null;

  // 1) user.prefs.role OR user.prefs.roles
  try {
    const prefsRaw = user.prefs;

    if (prefsRaw) {
      let prefs = prefsRaw;

      if (typeof prefsRaw === "string") {
        try {
          prefs = JSON.parse(prefsRaw);
        } catch {
          prefs = prefsRaw;
        }
      }

      if (prefs?.role) return prefs.role;

      if (Array.isArray(prefs?.roles) && prefs.roles.length) {
        const known = [
          "super-admin",
          "college-admin",
          "hostel-admin",
          "food-admin",
          "other-admin"
        ];

        for (const r of prefs.roles)
          if (known.includes(r)) return r;

        return prefs.roles[0];
      }
    }
  } catch {}

  // 2) direct fallback
  if (typeof user.role === "string") return user.role;

  // 3) email → role map
  if (user.email) {
    const lower = user.email.toLowerCase();
    if (ADMIN_MAP[lower]) return ADMIN_MAP[lower];
    if (ADMIN_EMAILS.includes(user.email)) return "college-admin";
  }

  return null;
}

export default function AdminLogin({ redirect = "/admin" }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setNote(null);

    if (!form.email || !form.password) {
      setNote("Please enter email & password.");
      return;
    }

    setLoading(true);

    try {
      let activeUser = null;

      try {
        activeUser = await account.get();
      } catch {}

      const requestedEmail = form.email.toLowerCase();

      if (activeUser) {
        const activeEmail = activeUser.email?.toLowerCase();

        if (activeEmail === requestedEmail) {
          const role = detectRoleFromUser(activeUser);
          if (!role) {
            await account.deleteSession("current");
            setNote("Access denied — not an admin.");
            setLoading(false);
            return;
          }
          navigate(`${redirect}?role=${role}`);
          setLoading(false);
          return;
        } else {
          try {
            await account.deleteSession("current");
          } catch {}
        }
      }

      await createSession(form.email, form.password);

      const user = await account.get();
      const role = detectRoleFromUser(user);

      if (!role) {
        await account.deleteSession("current");
        setNote("Access denied — not an admin.");
        setLoading(false);
        return;
      }

      navigate(`${redirect}?role=${role}`);
    } catch (err) {
      setNote(err?.message || "Login failed.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 p-6">
      <div className="w-full max-w-md bg-white shadow rounded-2xl p-8 border border-gray-100">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center text-white mb-3">
            <LogIn className="w-5 h-5" />
          </div>

          <h2 className="text-xl font-semibold">Admin sign in</h2>
          <p className="text-sm text-gray-500 mt-1">Sign in with admin account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="text-xs text-gray-600">Email</span>
            <input
              type="email"
              className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2"
              placeholder="admin@example.com"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              required
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs text-gray-600">Password</span>
            <input
              type="password"
              className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white text-sm w-full ${
              loading ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {note && (
          <div className="mt-4 text-sm text-red-600">{note}</div>
        )}
      </div>
    </div>
  );
}
