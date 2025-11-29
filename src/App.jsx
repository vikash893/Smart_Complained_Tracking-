// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom";

import HomePage from "./HomePage";
import LoginPage from "./LoginPage";
import ComplaintRegister from "./components/students/complaintRegister";

import AdminLogin from "./components/admin/AdminLogin";

import CollegeAdminDashboard from "./components/admin/CollegeAdminDashboard";
import SuperAdminDashboard from "./components/admin/SuperAdminDashboard";
import HostelAdminDashboard from "./components/admin/HostelAdminDashboard";
import FoodAdminDashboard from "./components/admin/FoodAdminDashboard";
import OtherAdminDashboard from "./components/admin/OtherAdminDashboard";

import { Client, Account } from "appwrite";

/* ------------------------------------------------------
   APPWRITE CLIENT
------------------------------------------------------ */
const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT);

const account = new Account(client);

/* ------------------------------------------------------
   ADMIN EMAIL/ROLE MAP (optional)
------------------------------------------------------ */
const ADMIN_EMAILS = (import.meta.env.VITE_APPWRITE_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ADMIN_MAP = (import.meta.env.VITE_APPWRITE_ADMIN_MAP || "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean)
  .reduce((acc, pair) => {
    const [email, role] = pair.split(":").map((x) => x.trim());
    if (email && role) acc[email.toLowerCase()] = role;
    return acc;
  }, {});

/* ------------------------------------------------------
   ROLE DETECTOR
------------------------------------------------------ */
function detectRoleFromUser(user) {
  if (!user) return null;

  // 1) prefs.role OR prefs.roles
  try {
    const prefs = user.prefs;
    if (prefs) {
      let obj = prefs;
      if (typeof prefs === "string") {
        try {
          obj = JSON.parse(prefs);
        } catch {
          obj = prefs;
        }
      }

      if (obj?.role) return obj.role;

      if (Array.isArray(obj?.roles) && obj.roles.length) {
        const known = [
          "super-admin",
          "college-admin",
          "hostel-admin",
          "food-admin",
          "other-admin"
        ];
        for (const r of obj.roles) if (known.includes(r)) return r;
        return obj.roles[0];
      }
    }
  } catch {}

  // 2) direct user.role
  if (typeof user.role === "string") return user.role;

  // 3) email-based fallbacks
  if (user.email) {
    const lower = user.email.toLowerCase();
    if (ADMIN_MAP[lower]) return ADMIN_MAP[lower];
    if (ADMIN_EMAILS.includes(user.email)) return "college-admin";
  }

  return null;
}

/* ------------------------------------------------------
   Login Wrapper (to use navigate inside login)
------------------------------------------------------ */
function LoginWrapper({ setUser }) {
  const navigate = useNavigate();
  return (
    <LoginPage
      onLogin={(u) => {
        setUser(u);
        navigate("/complaints");
      }}
      onCancel={() => navigate("/")}
    />
  );
}

/* ------------------------------------------------------
   ADMIN ROUTE AUTO SELECTOR
------------------------------------------------------ */
function AdminRoute({ user, role: roleProp }) {
  const location = useLocation();

  if (!user) return <Navigate to="/admin/login" replace />;

  // Optional: override role using ?role=
  const params = new URLSearchParams(location.search);
  const overrideRole = params.get("role");

  const detected = roleProp || detectRoleFromUser(user);
  const finalRole = overrideRole || detected;

  if (!finalRole) return <Navigate to="/admin/login" replace />;

  switch (finalRole) {
    case "super-admin":
      return <SuperAdminDashboard user={user} role={finalRole} />;

    case "college-admin":
      return <CollegeAdminDashboard user={user} role={finalRole} />;

    case "hostel-admin":
      return (
        <HostelAdminDashboard user={user} role={finalRole} />
      );

    case "food-admin":
      return (
        <FoodAdminDashboard user={user} role={finalRole} />
      );

    case "other-admin":
      return (
        <OtherAdminDashboard user={user} role={finalRole} />
      );

    default:
      return <Navigate to="/admin/login" replace />;
  }
}

/* ------------------------------------------------------
   MAIN APP COMPONENT
------------------------------------------------------ */
export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const u = await account.get();
        if (!mounted) return;

        setUser(u);
        setRole(detectRoleFromUser(u));
      } catch {
        setUser(null);
        setRole(null);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    }

    restoreSession();
    return () => (mounted = false);
  }, []);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Checking session...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<HomePage onShowLogin={() => (window.location.href = "/login")} />} />
        <Route path="/login" element={<LoginWrapper setUser={setUser} />} />
        <Route path="/complaints" element={<ComplaintRegister user={user} isAdmin={role === "super-admin"} />} />

        {/* Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Auto-admin route */}
        <Route path="/admin" element={<AdminRoute user={user} role={role} />} />

        {/* --------------------- DIRECT ADMIN ROUTES --------------------- */}
        <Route path="/admin/college" element={user ? <CollegeAdminDashboard user={user} role="college-admin" /> : <Navigate to="/admin/login" />} />
        <Route path="/admin/hostel" element={user ? <HostelAdminDashboard user={user} role="hostel-admin" /> : <Navigate to="/admin/login" />} />
        <Route path="/admin/food" element={user ? <FoodAdminDashboard user={user} role="food-admin" /> : <Navigate to="/admin/login" />} />
        <Route path="/admin/super" element={user ? <SuperAdminDashboard user={user} role="super-admin" /> : <Navigate to="/admin/login" />} />

        {/* ⭐ OTHER ADMIN — Added */}
        <Route path="/admin/other" element={user ? <OtherAdminDashboard user={user} role="other-admin" /> : <Navigate to="/admin/login" />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
