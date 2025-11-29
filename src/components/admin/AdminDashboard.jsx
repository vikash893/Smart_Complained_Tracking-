import React, { useEffect, useMemo, useState } from "react";
import { PlusCircle, RefreshCw, CheckCircle, Search, ArrowLeft, LogOut } from "lucide-react";
import { Client, Account, Databases, ID, Query } from "appwrite";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/**
 * ComplaintRegister (Vite + React) — now with charts
 *
 * Requirements:
 * - TailwindCSS and lucide-react installed.
 * - appwrite package installed.
 * - recharts installed: npm i recharts
 * - .env.local keys: VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT, VITE_APPWRITE_DATABASE, VITE_APPWRITE_COMPLAINTS_COLLECTION
 */

export default function ComplaintRegister({ redirectTo = "/login" }) {
  const navigate = useNavigate();

  // Vite envs
  const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
  const project = import.meta.env.VITE_APPWRITE_PROJECT;
  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE;
  const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COMPLAINTS_COLLECTION;

  // App state
  const [clientReady, setClientReady] = useState(false);
  const [account, setAccount] = useState(null);
  const [databases, setDatabases] = useState(null);

  const [user, setUser] = useState(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Chart colors (kept minimal)
  const PIE_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#6b7280"]; // red, amber, green, gray
  const BAR_COLOR = "#2563eb"; // indigo

  // Init Appwrite
  useEffect(() => {
    if (!endpoint || !project || !DATABASE_ID || !COLLECTION_ID) {
      setError(
        "Appwrite env missing. Ensure VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT, VITE_APPWRITE_DATABASE and VITE_APPWRITE_COMPLAINTS_COLLECTION are set."
      );
      return;
    }
    try {
      const client = new Client().setEndpoint(endpoint).setProject(project);
      const acc = new Account(client);
      const db = new Databases(client);
      setAccount(acc);
      setDatabases(db);
      setClientReady(true);
      console.log("Appwrite initialized");
    } catch (err) {
      console.error("Appwrite init error:", err);
      setError("Failed to initialize Appwrite client. See console.");
    }
  }, [endpoint, project, DATABASE_ID, COLLECTION_ID]);

  // Restore session & fetch complaints
  useEffect(() => {
    if (!clientReady || !account) return;
    let mounted = true;
    async function restore() {
      try {
        const u = await account.get();
        if (!mounted) return;
        setUser(u);
        await fetchComplaints(u.$id);
      } catch (err) {
        console.warn("Not logged in:", err);
        navigate(redirectTo);
      }
    }
    restore();
    return () => (mounted = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientReady, account]);

  // Fetch only current user's complaints (server-side query)
  async function fetchComplaints(userId) {
    if (!clientReady || !databases) return;
    setLoading(true);
    setError(null);
    try {
      if (!userId) throw new Error("Missing user id");
      if (typeof Query === "undefined" || typeof Query.equal !== "function") {
        throw new Error("Query.equal not available — use server endpoint or update SDK.");
      }
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
        Query.equal("student_id", userId),
        Query.orderDesc("$createdAt"),
      ]);
      const docs = res?.documents || [];
      setComplaints(docs);
    } catch (err) {
      console.error("fetchComplaints error:", err);
      if (err?.response || err?.code) {
        setError("Permission or network error. Check Appwrite Console (CORS & permissions).");
      } else {
        setError(err?.message || String(err));
      }
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }

  // Submit complaint (owner-only read/write permissions)
  // Clean production handleSubmit
// Replace your current handleSubmit with this function
async function handleSubmit(e) {
  e.preventDefault();
  setMessage(null);

  if (!user) {
    setMessage("Please sign in.");
    return;
  }
  if (!category || !description) {
    setMessage("Please select a category and describe the issue.");
    return;
  }
  if (!clientReady || !databases) {
    setMessage("Appwrite not configured.");
    return;
  }

  setSubmitting(true);

  const payload = {
    student_id: user.$id,
    category,
    description,
    status: "Pending",
    created_at: new Date().toISOString(),
  };

  // Preferred: create with per-document owner-only permissions
  const readPerm = user?.$id ? [`user:${user.$id}`] : [];
  const writePerm = user?.$id ? [`user:${user.$id}`] : [];

  try {
    // 1) Primary attempt: create with read/write perms (safe, expected)
    const created = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      payload,
      readPerm.length ? readPerm : undefined,
      writePerm.length ? writePerm : undefined
    );

    console.log("handleSubmit - created (with perms):", created);
    setMessage("✅ Complaint submitted.");
    setCategory("");
    setDescription("");
    await fetchComplaints(user.$id);
    return;
  } catch (errPrimary) {
    // Detailed logging for debugging
    console.error("handleSubmit - FULL ERROR (primary attempt):", errPrimary);
    try {
      console.log("errPrimary.message:", errPrimary?.message);
      console.log("errPrimary.code:", errPrimary?.code);
      console.log("errPrimary.type:", errPrimary?.type);
      console.log("errPrimary.response:", errPrimary?.response || errPrimary);
    } catch (x) {
      console.error(x);
    }

    // If primary fails, try a diagnostic fallback (no perms).
    // NOTE: This is only to help you identify whether the issue is
    // permission-related. Don't keep this in production if it works.
    try {
      console.warn(
        "handleSubmit - attempting diagnostic fallback: createDocument WITHOUT per-document permissions. " +
          "If this succeeds, your Appwrite collection permissions/CORS are likely the cause. Do NOT keep this fallback in production."
      );

      const createdFallback = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        payload // no read/write arrays passed
      );

      console.log("handleSubmit - created (fallback, no perms):", createdFallback);
      setMessage(
        "✅ Complaint submitted (diagnostic fallback). **Important:** This bypass used no per-document permissions — check Appwrite collection permissions & CORS and revert fallback after testing."
      );
      setCategory("");
      setDescription("");
      await fetchComplaints(user.$id);
      return;
    } catch (errFallback) {
      console.error("handleSubmit - FULL ERROR (fallback attempt):", errFallback);
      try {
        console.log("errFallback.message:", errFallback?.message);
        console.log("errFallback.code:", errFallback?.code);
        console.log("errFallback.type:", errFallback?.type);
        console.log("errFallback.response:", errFallback?.response || errFallback);
      } catch (x) {
        console.error(x);
      }

      // Final user-facing message with guidance
      setMessage(
        "Failed to submit. See console for full API error. Common causes: CORS origin missing in Appwrite Project Platforms, wrong VITE env values, or collection permissions blocking writes."
      );
    }
  } finally {
    setSubmitting(false);
  }
}




  // Logout
  async function handleLogout() {
    try {
      await account.deleteSession("current");
    } catch (err) {
      console.warn("logout error:", err);
    } finally {
      navigate(redirectTo);
    }
  }

  // Compute chart data (memoized)
  const statusData = useMemo(() => {
    const counts = complaints.reduce(
      (acc, c) => {
        const s = (c.status || "Pending").toString();
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {}
    );
    // ensure order: Open / Pending / In Progress / Resolved
    const ordered = ["Open", "Pending", "In Progress", "Resolved"];
    return ordered.map((k) => ({ name: k, value: counts[k] || 0 })).filter((d) => d.value > 0);
  }, [complaints]);

  const categoryData = useMemo(() => {
    const map = {};
    complaints.forEach((c) => {
      const cat = c.category || "Other";
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [complaints]);

  // Helper: short date
  function shortDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Complaint Register</h1>
            <p className="text-sm text-gray-500">Report issues and track status — only your complaints are shown.</p>
          </div>

          <div className="flex items-center gap-3">
            {user && <div className="text-sm text-gray-600">Signed in as <strong>{user.email}</strong></div>}
            <button onClick={() => fetchComplaints(user?.$id)} className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-100">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <section className="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm">
            <h2 className="text-lg font-medium mb-3">Submit a complaint</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm">
                <span className="text-xs text-gray-600">Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-200 px-3 py-2">
                  <option value="">Select category</option>
                  <option value="College">College Infrastructure</option>
                  <option value="Hostel">Hostel Infrastructure</option>
                  <option value="Food">Mess / Food</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-xs text-gray-600">Description</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-200 px-3 py-2 min-h-[120px]" placeholder="Describe your issue..." />
              </label>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={submitting} className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm ${submitting ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                  <PlusCircle className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit"}
                </button>
                <div className="text-sm text-gray-600">{message}</div>
              </div>

              {error && <div className="mt-3 text-sm text-yellow-800 bg-yellow-50 p-3 rounded-md">{error}</div>}
            </form>
          </section>

          {/* Complaints list */}
          <section className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">My Complaints</h2>
              <div className="text-sm text-gray-500">{loading ? "Loading..." : `${complaints.length} found`}</div>
            </div>

            {loading ? (
              <div className="text-sm text-gray-500">Loading complaints...</div>
            ) : complaints.length === 0 ? (
              <div className="text-sm text-gray-500">No complaints yet.</div>
            ) : (
              <ul className="space-y-3">
                {complaints.map((c) => (
                  <li key={c.$id} className="border border-gray-100 rounded-lg p-4 flex justify-between">
                    <div>
                      <div className="text-sm text-gray-500">{c.category} • <span className="text-xs text-gray-400">{shortDate(c.created_at || c.createdAt || c.$createdAt)}</span></div>
                      <div className="font-medium text-gray-900 mt-1">{c.description}</div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 text-xs rounded-full ${c.status === "Pending" ? "bg-yellow-100 text-yellow-800" : c.status === "Resolved" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                        {c.status}
                      </span>
                      <div className="text-xs text-gray-500">{c.student_id || (c.createdBy && (c.createdBy.email || c.createdBy.name))}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Sidebar with charts + stats */}
          <aside className="lg:col-span-3 mt-4 lg:mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2 bg-white p-4 rounded-2xl shadow-sm">
                <h4 className="text-sm font-medium mb-2">Status breakdown</h4>
                {statusData.length === 0 ? (
                  <div className="text-sm text-gray-500">No data</div>
                ) : (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius="70%"
                          innerRadius="45%"
                          paddingAngle={4}
                          label={(entry) => `${entry.name} (${entry.value})`}
                        >
                          {statusData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ReTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <h4 className="text-sm font-medium mb-2">By category</h4>
                {categoryData.length === 0 ? (
                  <div className="text-sm text-gray-500">No data</div>
                ) : (
                  <div style={{ width: "100%", height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} margin={{ top: 10, right: 8, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill={BAR_COLOR} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <h4 className="text-sm font-medium mb-2">Quick stats</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-gray-50 text-center">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="font-bold text-lg">{complaints.length}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 text-center">
                    <div className="text-xs text-gray-500">Pending</div>
                    <div className="font-bold text-lg">{complaints.filter((c) => c.status === "Pending").length}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 text-center">
                    <div className="text-xs text-gray-500">In Progress</div>
                    <div className="font-bold text-lg">{complaints.filter((c) => c.status === "In Progress").length}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 text-center">
                    <div className="text-xs text-gray-500">Resolved</div>
                    <div className="font-bold text-lg">{complaints.filter((c) => c.status === "Resolved").length}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">Charts update automatically from fetched complaints.</div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
