// src/components/admin/CollegeAdminDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw,
  LogOut,
  Search,
  Trash2,
  Edit3,
  Download,
  CheckCircle,
  User,
} from "lucide-react";
import { Client, Account, Databases, Query } from "appwrite";
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

const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const PROJECT = import.meta.env.VITE_APPWRITE_PROJECT;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COMPLAINTS_COLLECTION;

// 🔥 n8n webhook added
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

const client = new Client();
if (ENDPOINT && PROJECT) client.setEndpoint(ENDPOINT).setProject(PROJECT);
const account = new Account(client);
const databases = new Databases(client);

const PIE_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#6b7280"];
const BAR_COLOR = "#2563eb";

export default function FoodAdminDashboard({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  /* ----------------------- DETECT CATEGORY ----------------------- */
  function detectCollegeCategory(u) {
    if (!u) return null;
    try {
      const prefs = typeof u.prefs === "string" ? JSON.parse(u.prefs) : u.prefs;
      if (prefs?.college) return prefs.college;
      if (prefs?.college_id) return prefs.college_id;
    } catch {}
    return null;
  }

  const collegeCategory = (detectCollegeCategory(user) || "Food").trim();
  const collegeCategoryLower = collegeCategory.toLowerCase();

  /* ----------------------- FETCH COMPLAINTS ----------------------- */
  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeCategoryLower]);

  async function fetchComplaints() {
    setLoading(true);
    setError(null);

    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.orderDesc("$createdAt")]
      );

      const docs = res.documents || [];
      const filtered = docs.filter(
        (d) => (d.category || "").toLowerCase() === collegeCategoryLower
      );

      setComplaints(attachStudentNames(filtered));
    } catch (err) {
      console.error(err);
      setError("Failed to fetch complaints.");
    }

    setLoading(false);
  }

  function attachStudentNames(docs) {
    return docs.map((d) => {
      const by = d.createdBy || {};

      const name =
        by.name ||
        d.student_name ||
        by.email ||
        "Unknown";

      const email =
        d.email ||
        d.student_email ||
        by.email ||
        by.$email ||
        "";

      return { ...d, studentName: name, email };
    });
  }

  /* ----------------------- FILTER VISIBLE ----------------------- */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return complaints.filter((c) => {
      if (filterStatus !== "All" && c.status !== filterStatus) return false;
      if (!q) return true;
      return (
        (c.description || c.message || "")
          .toLowerCase()
          .includes(q) ||
        (c.category || "").toLowerCase().includes(q) ||
        (c.studentName || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (String(c.$id || c.id) || "").toLowerCase().includes(q)
      );
    });
  }, [complaints, query, filterStatus]);

  /* ----------------------- KPI STATS ----------------------- */
  const stats = useMemo(() => {
    return {
      total: complaints.length,
      open: complaints.filter((c) => ["Open", "Pending"].includes(c.status)).length,
      inProgress: complaints.filter((c) => c.status === "In Progress").length,
      resolved: complaints.filter((c) => c.status === "Resolved").length,
    };
  }, [complaints]);

  const statusData = useMemo(() => {
    const map = {};
    complaints.forEach((c) => {
      const s = c.status || "Open";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [complaints]);

  const categoryData = useMemo(() => {
    const map = {};
    complaints.forEach((c) => {
      const cat = c.category || "Other";
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [complaints]);

  function getId(c) {
    return c.$id || c.id;
  }

  function shortDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function statusToBadge(status) {
    switch (status) {
      case "Resolved":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-yellow-100 text-yellow-800";
      case "Open":
      case "Pending":
      default:
        return "bg-red-50 text-red-700";
    }
  }

  /* ----------------------- n8n EMAIL SENDER ----------------------- */
  async function sendToN8N(complaint, adminRemarks) {
    if (!N8N_WEBHOOK_URL) {
      console.warn("N8N_WEBHOOK_URL missing");
      return;
    }

    const email =
      complaint.email ||
      complaint.student_email ||
      complaint.createdBy?.email ||
      complaint.createdBy?.$email ||
      "";

    if (!email) {
      console.warn("No email found for complaint:", complaint.$id);
      return;
    }

    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: complaint.$id,
          userName: complaint.studentName || complaint.name || "",
          userEmail: email,
          title: complaint.description || complaint.message || "",
          description: complaint.message || complaint.description || "",
          category: complaint.category || "",
          assignedTo: "Food Department",
          currentStatus: complaint.status || "",
          currentProgress: "Status updated by admin",
          lastUpdatedOn: new Date().toISOString(),
          adminRemarks: adminRemarks || "No remarks provided",
        }),
      });
    } catch (err) {
      console.error("n8n email error:", err);
    }
  }

  /* ----------------------- UPDATE STATUS (with optional remarks) ----------------------- */
  // 1) handleUpdateStatus -> prompts admin for remarks (optional). If admin CANCELS -> abort.
  // 2) updateStatusWithRemark -> performs DB update and triggers n8n with remarks.
  async function handleUpdateStatus(id, newStatus) {
    // prompt for admin remarks (optional). If admin clicks Cancel (null) -> abort update.
    const raw = prompt("Admin remarks (optional). Click OK to send. Leave empty for 'No remarks provided'.", "");
    if (raw === null) {
      // admin cancelled: abort update
      return;
    }
    const trimmed = String(raw).trim();
    const adminRemarks = trimmed === "" ? "No remarks provided" : trimmed;

    // proceed with update
    await updateStatusWithRemark(id, newStatus, adminRemarks);
  }

  async function updateStatusWithRemark(id, newStatus, adminRemarks) {
    setUpdatingId(id);

    try {
      const updated = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        id,
        { status: newStatus }
      );

      // keep studentName/email from previous item if present
      setComplaints((prev) =>
        prev.map((c) =>
          getId(c) === id ? { ...updated, studentName: c.studentName, email: c.email } : c
        )
      );

      // send webhook/email with remarks
      await sendToN8N(updated, adminRemarks);
    } catch (err) {
      console.error("updateStatus error:", err);
      alert("Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  }

  /* ----------------------- DELETE ----------------------- */
  async function deleteComplaint(id) {
    if (!confirm("Delete this complaint? This action cannot be undone.")) return;

    setUpdatingId(id);
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, id);
      setComplaints((s) => s.filter((c) => getId(c) !== id));
    } catch (err) {
      console.error("delete error:", err);
      alert("Failed to delete complaint.");
    } finally {
      setUpdatingId(null);
    }
  }

  /* ----------------------- CSV EXPORT ----------------------- */
  function exportCSV(items) {
    if (!items || !items.length) return alert("No data to export.");

    const rows = items.map((r) => ({
      id: getId(r),
      description: r.description || r.message || "",
      category: r.category || "",
      status: r.status || "",
      email: r.email || "",
      student: r.studentName || "",
      created_at: r.$createdAt || "",
    }));

    const header = Object.keys(rows[0]);
    const csv = [header.join(","), ...rows.map((r) =>
      header.map((h) => `"${String(r[h] || "").replace(/"/g, '""')}"`).join(",")
    )].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `college_complaints_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ----------------------- LOGOUT ----------------------- */
  async function signOut() {
    try {
      await account.deleteSession("current");
      window.location.href = "/";
    } catch (err) {
      console.error("signOut error:", err);
      // silent fail
    }
  }

  /* ----------------------- UI BELOW ----------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Top Navbar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Food Department Admin</h1>
            <p className="text-sm text-gray-500 mt-1">Managing complaints for <strong>{collegeCategory}</strong></p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm border border-gray-100">
              <button
                onClick={fetchComplaints}
                title="Refresh"
                className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>

              <button
                onClick={() => exportCSV(visible)}
                title="Export visible as CSV"
                className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>

            <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
              <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <User className="w-5 h-5" />
              </div>
              <div className="hidden sm:block text-sm">
                <div className="text-xs text-gray-500">Signed in as</div>
                <div className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{user?.email || "—"}</div>
              </div>

              <button
                onClick={signOut}
                title="Sign out"
                className="ml-2 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-red-50 text-red-700 text-sm"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: KPIs + Charts */}
          <div className="lg:col-span-8 space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500">Total</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">{stats.total}</div>
                <div className="mt-1 text-xs text-gray-400">All complaints</div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-25 p-4 rounded-2xl shadow-sm border border-red-100">
                <div className="text-xs text-red-600">Open</div>
                <div className="mt-2 text-2xl font-semibold text-red-700">{stats.open}</div>
                <div className="mt-1 text-xs text-red-400">Needs attention</div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-25 p-4 rounded-2xl shadow-sm border border-yellow-100">
                <div className="text-xs text-yellow-700">In Progress</div>
                <div className="mt-2 text-2xl font-semibold text-yellow-800">{stats.inProgress}</div>
                <div className="mt-1 text-xs text-yellow-500">Being handled</div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-25 p-4 rounded-2xl shadow-sm border border-green-100">
                <div className="text-xs text-green-700">Resolved</div>
                <div className="mt-2 text-2xl font-semibold text-green-800">{stats.resolved}</div>
                <div className="mt-1 text-xs text-green-500">Closed issues</div>
              </div>
            </div>

            {/* Charts card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Analytics</h3>
                <div className="text-xs text-gray-500">Status & category breakdown</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-2 rounded-lg bg-gray-50">
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius="70%"
                          innerRadius="46%"
                          paddingAngle={4}
                          label={(entry) => `${entry.name} (${entry.value})`}
                        >
                          {statusData.map((entry, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ReTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-gray-50">
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill={BAR_COLOR} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Complaints list */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-800">Recent complaints</h3>
                <div className="text-sm text-gray-500">{loading ? "Loading..." : `${visible.length} shown`}</div>
              </div>

              {loading ? (
                <div className="text-sm text-gray-500 py-6">Loading complaints...</div>
              ) : visible.length === 0 ? (
                <div className="text-sm text-gray-500 py-6">No complaints found.</div>
              ) : (
                <div className="space-y-3">
                  {visible.map((c) => {
                    const id = getId(c);
                    const created = c.createdAt || c.created_at || c.$createdAt;
                    return (
                      <article key={id} className="flex flex-col md:flex-row md:items-start justify-between gap-3 p-3 border border-gray-100 rounded-xl">
                        <div className="md:w-3/4">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <div className="font-mono text-[12px] text-gray-400">{id}</div>
                            <div>•</div>
                            <div className="uppercase text-[11px] tracking-wide text-gray-500">{c.category || "Other"}</div>
                          </div>

                          <h4 className="mt-2 text-md font-semibold text-gray-900">{c.description || c.message}</h4>
                          <p className="mt-1 text-sm text-gray-600">{String(c.message || c.description || "").slice(0, 240)}</p>

                          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                            <div>{shortDate(created)}</div>
                            <div className="flex items-center gap-2">
                              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-[12px] ${statusToBadge(c.status || "Open")}`}>
                                <span className="font-medium">{c.status || "Open"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                                <User className="w-4 h-4" />
                              </div>
                              <div className="text-sm">
                                <div className="font-medium text-gray-800">{c.email || "—"}</div>
                                <div className="text-xs text-gray-500">{c.name || c.studentName || "—"}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="md:w-1/4 flex flex-col items-end gap-3">
                          <select
                            value={c.status}
                            onChange={(e) => handleUpdateStatus(id, e.target.value)}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-sm bg-white"
                            disabled={Boolean(updatingId)}
                          >
                            <option>Open</option>
                            <option>Pending</option>
                            <option>In Progress</option>
                            <option>Resolved</option>
                          </select>

                          <div className="flex flex-col w-full items-end gap-2">
                            <button
                              onClick={() => handleUpdateStatus(id, "Resolved")}
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-1 rounded-md bg-green-50 text-green-700 text-sm"
                              title="Mark resolved"
                              disabled={Boolean(updatingId)}
                            >
                              <CheckCircle className="w-4 h-4" /> Resolve
                            </button>

                            <button
                              onClick={() => {
                                const full = prompt("Full updated message / note (optional):", "");
                                if (full !== null) {
                                  // demo: currently only updates client UI; to persist note you need to update the document server-side.
                                  alert("Note saved (demo). Implement adminNote update server-side if needed.");
                                }
                              }}
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 text-sm"
                            >
                              <Edit3 className="w-4 h-4" /> Note
                            </button>

                            <button
                              onClick={() => deleteComplaint(id)}
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-1 rounded-md bg-red-50 text-red-700 text-sm"
                              disabled={Boolean(updatingId)}
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls panel */}
          <aside className="lg:col-span-4">
            <div className="sticky top-6 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">Quick Actions</h4>
                    <div className="text-xs text-gray-500 mt-1">Filters & exports</div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Search</label>
                    <div className="relative mt-2">
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search complaints, id, student..."
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-10 text-sm"
                      />
                      <div className="absolute left-3 top-2.5 pointer-events-none text-gray-400">
                        <Search className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="mt-2 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option>All</option>
                      <option>Open</option>
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Resolved</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex gap-2">
                      <button
                        onClick={() => exportCSV(visible)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm"
                      >
                        <Download className="w-4 h-4" /> Export visible
                      </button>

                      <button
                        onClick={fetchComplaints}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm"
                      >
                        <RefreshCw className="w-4 h-4" /> Refresh
                      </button>
                    </div>

                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
                <h5 className="text-sm font-medium text-gray-800">Export / Reporting</h5>
                <div className="mt-2 text-xs text-gray-500">
                  Export visible complaints to CSV. Use the filters above to refine your export.
                </div>

                <div className="mt-3">
                  <button
                    onClick={() => exportCSV(complaints)}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-white text-sm"
                  >
                    <Download className="w-4 h-4" /> Export all complaints
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Smart Complaint Register — Food Admin
        </footer>
      </div>
    </div>
  );
}
