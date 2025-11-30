// src/components/admin/AdminLogin.jsx
import React, { useState } from "react";
import { LogIn, Shield, Eye, EyeOff, ArrowRight } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
      {/* Main Card */}
      <div className="w-full max-w-md">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold shadow-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-bold text-gray-900">Smart Complaint Register</h1>
              <p className="text-xs text-gray-500">Admin Portal • Secure Access</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Admin Sign In</h2>
                <p className="text-indigo-100 text-sm">Restricted access - authorized personnel only</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LogIn className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  placeholder="admin@college.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-lg text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                loading 
                  ? "bg-indigo-400 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Verifying Access...
                </>
              ) : (
                <>
                  Sign in to Admin Portal
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Note/Error Message */}
          {note && (
            <div className="px-6 pb-6">
              <div className={`p-4 rounded-lg border ${
                note.includes("Access denied") || note.includes("failed")
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">{note}</span>
                </div>
              </div>
            </div>
          )}

          {/* Security Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Enterprise-grade security for admin operations</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Smart Complaint Register. Admin Portal
          </p>
        </div>
      </div>
    </div>
  );
}