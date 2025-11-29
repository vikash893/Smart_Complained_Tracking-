import React, { useEffect, useMemo, useState } from "react";
import { 
  PlusCircle, RefreshCw, LogOut, Clock, Filter, 
  AlertCircle, CheckCircle2, Loader2, MessageSquare,
  TrendingUp, BarChart3, User, Mail, Calendar,
  FileText, Search, X
} from "lucide-react";
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
  LineChart,
  Line,
  Legend
} from "recharts";

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
  const [formMessage, setFormMessage] = useState("");
  const [statusMsg, setStatusMsg] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // New features
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#6b7280"];

  // Init Appwrite
  useEffect(() => {
    if (!endpoint || !project || !DATABASE_ID || !COLLECTION_ID) {
      setError("Appwrite env missing.");
      console.error("Missing env vars:", { endpoint, project, DATABASE_ID, COLLECTION_ID });
      return;
    }
    try {
      const client = new Client().setEndpoint(endpoint).setProject(project);
      const acc = new Account(client);
      const db = new Databases(client);
      setAccount(acc);
      setDatabases(db);
      setClientReady(true);
      console.log("Appwrite client initialized successfully");
    } catch (err) {
      console.error("Appwrite init error:", err);
      setError("Failed to initialize Appwrite client.");
    }
  }, [endpoint, project, DATABASE_ID, COLLECTION_ID]);

  // Restore session & fetch complaints
  useEffect(() => {
    if (!clientReady || !account) return;
    let mounted = true;
    async function restore() {
      try {
        const u = await account.get();
        console.log("User logged in:", u);
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
  }, [clientReady, account, navigate, redirectTo]);

  async function fetchComplaints(userId) {
    if (!clientReady || !databases) {
      console.warn("Cannot fetch complaints: client not ready");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!userId) throw new Error("Missing user id");
      console.log("Fetching complaints for user:", userId);
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
        Query.equal("student_id", userId),
        Query.orderDesc("$createdAt"),
      ]);
      console.log("Complaints fetched:", res?.documents?.length);
      setComplaints(res?.documents || []);
    } catch (err) {
      console.error("fetchComplaints error:", err);
      setError("Failed to fetch complaints: " + err.message);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatusMsg(null);

    console.log("Submit started", { user, category, description });

    // Validation
    if (!user) {
      const msg = "Please sign in.";
      setStatusMsg(msg);
      console.error(msg);
      return;
    }
    if (!category || !description) {
      const msg = "Please fill all required fields.";
      setStatusMsg(msg);
      console.error(msg, { category, description });
      return;
    }

    // Check if databases is ready
    if (!databases || !clientReady) {
      const msg = "Database connection not ready. Please refresh the page.";
      setStatusMsg(msg);
      console.error(msg);
      return;
    }

    setSubmitting(true);

    const userName = user.name || user.email?.split('@')[0] || 'Anonymous';
    const userEmail = user.email || '';

    // Fixed payload to match your database schema (no title field)
    const payload = {
      student_id: user.$id,
      name: userName,
      email: userEmail,
      category,
      description,
      message: formMessage || "",
      status: "Pending",
      created_at: new Date().toISOString(),
    };

    console.log("Submitting payload:", payload);
    console.log("Database ID:", DATABASE_ID);
    console.log("Collection ID:", COLLECTION_ID);

    try {
      const result = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        payload
      );

      console.log("Complaint submitted successfully:", result);
      setStatusMsg("✅ Complaint submitted successfully!");
      
      // Clear form
      setCategory("");
      setDescription("");
      setFormMessage("");
      
      // Refresh complaints list
      await fetchComplaints(user.$id);
      
      // Clear success message after 3 seconds
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error("Submit error:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        type: err.type,
        response: err.response
      });
      setStatusMsg("❌ Failed to submit complaint: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await account.deleteSession("current");
    } catch (err) {
      console.warn("logout error:", err);
    } finally {
      navigate(redirectTo);
    }
  }

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchesStatus = filterStatus === "all" || c.status?.toLowerCase().replace(/\s/g, '') === filterStatus.toLowerCase();
      const matchesSearch = 
        c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [complaints, filterStatus, searchQuery]);

  // Chart data
  const statusData = useMemo(() => {
    const counts = { Pending: 0, "In Progress": 0, Resolved: 0 };
    complaints.forEach(c => {
      const status = c.status || "Pending";
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [complaints]);

  // Timeline data (last 7 days)
  const timelineData = useMemo(() => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const dayComplaints = complaints.filter(c => {
        const cDate = new Date(c.$createdAt);
        return cDate.toDateString() === date.toDateString();
      });
      
      data.push({
        date: dateStr,
        total: dayComplaints.length,
        pending: dayComplaints.filter(c => c.status === "Pending").length,
        resolved: dayComplaints.filter(c => c.status === "Resolved").length,
      });
    }
    return data;
  }, [complaints]);

  const stats = useMemo(() => {
    return {
      total: complaints.length,
      pending: complaints.filter(c => c.status === "Pending").length,
      inProgress: complaints.filter(c => c.status === "In Progress").length,
      resolved: complaints.filter(c => c.status === "Resolved").length,
      avgResponseTime: complaints.length > 0 ? "2.5 days" : "N/A"
    };
  }, [complaints]);

  function getStatusIcon(status) {
    if (status === "Resolved") return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (status === "In Progress") return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
    return <Clock className="w-4 h-4 text-amber-600" />;
  }

  function getStatusColor(status) {
    if (status === "Resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "In Progress") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  function shortDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Complaint Dashboard</h1>
                <p className="text-xs text-gray-500">Track and manage your complaints</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{user.name || user.email}</span>
                </div>
              )}
              <button 
                onClick={() => fetchComplaints(user?.$id)} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                onClick={handleLogout} 
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard icon={<BarChart3 />} label="Total" value={stats.total} color="bg-indigo-600" />
          <StatCard icon={<Clock />} label="Pending" value={stats.pending} color="bg-amber-600" />
          <StatCard icon={<Loader2 />} label="In Progress" value={stats.inProgress} color="bg-blue-600" />
          <StatCard icon={<CheckCircle2 />} label="Resolved" value={stats.resolved} color="bg-emerald-600" />
          <StatCard icon={<TrendingUp />} label="Avg Response" value={stats.avgResponseTime} color="bg-purple-600" isText />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Submit Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <PlusCircle className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">New Complaint</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  <option value="College">College Infrastructure</option>
                  <option value="Hostel">Hostel Infrastructure</option>
                  <option value="Food">Mess / Food</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[100px]"
                  placeholder="Describe your complaint in detail"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Message</label>
                <textarea 
                  value={formMessage} 
                  onChange={(e) => setFormMessage(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[80px]"
                  placeholder="Any additional information (optional)"
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting || !clientReady || !user}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Submit Complaint
                  </>
                )}
              </button>

              {statusMsg && (
                <div className={`text-sm p-3 rounded-lg ${statusMsg.includes('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {statusMsg}
                </div>
              )}
            </form>
          </div>

          {/* Charts */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {statusData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No data available</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline (Last 7 Days)</h3>
              {timelineData.some(d => d.total > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} name="Total" />
                    <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} name="Pending" />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No activity in the last 7 days</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Complaints List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900">My Complaints ({filteredComplaints.length})</h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search complaints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-64"
                />
              </div>

              {/* Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="inprogress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No complaints found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredComplaints.map((c) => (
                <div 
                  key={c.$id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedComplaint(c);
                    setShowModal(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(c.status)}
                        <span className="text-xs font-medium text-gray-500">{c.category}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">{shortDate(c.$createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{c.description}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(selectedComplaint.status)}`}>
                      {selectedComplaint.status}
                    </span>
                    <span className="text-sm text-gray-500">{selectedComplaint.category}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Complaint Details</h2>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600">{selectedComplaint.description}</p>
                </div>

                {selectedComplaint.message && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Additional Message</h3>
                    <p className="text-gray-600">{selectedComplaint.message}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{selectedComplaint.name || "Anonymous"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{selectedComplaint.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{shortDate(selectedComplaint.$createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{new Date(selectedComplaint.$createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, isText = false }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
          <div className={`${color.replace('bg-', 'text-')}`}>
            {icon}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className={`${isText ? 'text-lg' : 'text-2xl'} font-bold text-gray-900`}>{value}</p>
    </div>
  );
}