import React, { useState } from "react";
import { LogIn, ArrowRight, Mail, Lock, Eye, EyeOff, Shield } from "lucide-react";
import { Client, Account } from "appwrite";

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || process.env.REACT_APP_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT || process.env.REACT_APP_APPWRITE_PROJECT);

const account = new Account(client);

export default function LoginPage({ onLogin, onCancel }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function createSession(email, password) {
    if (typeof account.createEmailSession === "function") {
      return account.createEmailSession(email, password);
    }
    if (typeof account.createEmailPasswordSession === "function") {
      return account.createEmailPasswordSession({ email, password });
    }
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
      await createSession(form.email, form.password);
      const user = await account.get();
      onLogin?.(user);
    } catch (err) {
      console.error("Login error:", err);

      const errType = err?.type || err?.response?.type || null;
      const errCode = err?.code || err?.response?.code || null;
      const errMessage = String(err?.message || err?.response || "");

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

      const msg = err?.message || err?.response || "Login failed. Check credentials or Appwrite configuration.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
      {/* Main Card */}
      <div className="w-full max-w-md">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold shadow-lg">
              SC
            </div>
            <div className="text-left">
              <h1 className="text-lg font-bold text-gray-900">Smart Complaint Register</h1>
              <p className="text-xs text-gray-500">Fast • Transparent • Accountable</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <LogIn className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Welcome Back</h2>
                <p className="text-indigo-100 text-sm">Sign in to your account</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
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
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
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

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a 
                href="#" 
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                onClick={(ev) => ev.preventDefault()}
              >
                Forgot password?
              </a>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
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
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full py-3.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200 transform hover:scale-[1.02]"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Security Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Your login is secured with enterprise-grade encryption</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Smart Complaint Register. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}