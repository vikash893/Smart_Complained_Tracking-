import React, { useEffect, useMemo, useState } from "react";
import { 
  PlusCircle, RefreshCw, LogOut, Clock, Filter, 
  AlertCircle, CheckCircle2, Loader2, MessageSquare,
  TrendingUp, BarChart3, User, Mail, Calendar,
  FileText, Search, X, Eye, Download
} from "lucide-react";
import { Client, Account, Databases, ID, Query } from "appwrite";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 rounded-br-full"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-emerald-500/10 to-cyan-600/10 rounded-tl-full"></div>
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold shadow-lg shadow-indigo-500/25">
                SC
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Complaint Dashboard
                </h1>
                <p className="text-xs text-gray-500">Track and manage your complaints</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-xl">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{user.name || user.email}</span>
                </div>
              )}
              <button 
                onClick={() => fetchComplaints(user?.$id)} 
                className="p-2 hover:bg-gray-100/80 rounded-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                onClick={handleLogout} 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 hover:scale-105"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard 
            icon={<BarChart3 className="w-5 h-5" />} 
            label="Total Complaints" 
            value={stats.total} 
            color="from-indigo-500 to-blue-500"
          />
          <StatCard 
            icon={<Clock className="w-5 h-5" />} 
            label="Pending" 
            value={stats.pending} 
            color="from-amber-500 to-orange-500"
          />
          <StatCard 
            icon={<Loader2 className="w-5 h-5" />} 
            label="In Progress" 
            value={stats.inProgress} 
            color="from-blue-500 to-cyan-500"
          />
          <StatCard 
            icon={<CheckCircle2 className="w-5 h-5" />} 
            label="Resolved" 
            value={stats.resolved} 
            color="from-emerald-500 to-green-500"
          />
          <StatCard 
            icon={<TrendingUp className="w-5 h-5" />} 
            label="Avg Response" 
            value={stats.avgResponseTime} 
            color="from-purple-500 to-pink-500"
            isText 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Submit Form */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                <PlusCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">New Complaint</h2>
                <p className="text-sm text-gray-500">Submit a new complaint ticket</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  required 
                  className="w-full px-4 py-3 bg-white/50 border border-gray-200/50 rounded-xl focus:ring-3 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 backdrop-blur-sm group-hover:border-gray-300"
                >
                  <option value="">Select category</option>
                  <option value="College">College Infrastructure</option>
                  <option value="Hostel">Hostel Infrastructure</option>
                  <option value="Food">Mess / Food</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  required 
                  className="w-full px-4 py-3 bg-white/50 border border-gray-200/50 rounded-xl focus:ring-3 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 backdrop-blur-sm min-h-[120px] group-hover:border-gray-300"
                  placeholder="Describe your complaint in detail..."
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Message</label>
                <textarea 
                  value={formMessage} 
                  onChange={(e) => setFormMessage(e.target.value)} 
                  className="w-full px-4 py-3 bg-white/50 border border-gray-200/50 rounded-xl focus:ring-3 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 backdrop-blur-sm min-h-[80px] group-hover:border-gray-300"
                  placeholder="Any additional information (optional)"
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting || !clientReady || !user}
                className={`w-full py-3.5 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
                  submitting || !clientReady || !user
                    ? "bg-indigo-400 cursor-not-allowed shadow-indigo-400/25" 
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5" />
                    Submit Complaint
                  </>
                )}
              </button>

              {statusMsg && (
                <div className={`p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 ${
                  statusMsg.includes('✅') 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {statusMsg.includes('✅') ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">{statusMsg}</span>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Distribution */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Status Distribution</h3>
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-lg">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
              </div>
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
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Activity Timeline</h3>
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              {timelineData.some(d => d.total > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(229, 231, 235, 0.5)',
                        borderRadius: '12px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#6366f1" 
                      strokeWidth={3} 
                      name="Total" 
                      dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pending" 
                      stroke="#f59e0b" 
                      strokeWidth={2} 
                      name="Pending" 
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="resolved" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      name="Resolved" 
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No activity in the last 7 days</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Complaints List */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">My Complaints</h2>
              <p className="text-sm text-gray-500">{filteredComplaints.length} complaint(s) found</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Search complaints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-white/50 border border-gray-200/50 rounded-xl focus:ring-3 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 backdrop-blur-sm w-full sm:w-64 group-hover:border-gray-300"
                />
              </div>

              {/* Filter */}
              <div className="relative group">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-10 pr-8 py-2.5 bg-white/50 border border-gray-200/50 rounded-xl focus:ring-3 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 backdrop-blur-sm appearance-none group-hover:border-gray-300"
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
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-gray-500">Loading complaints...</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-4">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No complaints found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComplaints.map((c) => (
                <div 
                  key={c.$id} 
                  className="bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-xl p-5 hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-indigo-300 group"
                  onClick={() => {
                    setSelectedComplaint(c);
                    setShowModal(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusIcon(c.status)}
                        <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                          {c.category}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">{shortDate(c.$createdAt)}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed line-clamp-2 group-hover:text-gray-900 transition-colors">
                        {c.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className={`px-4 py-2 text-xs font-semibold rounded-full border ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                      <button className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                        View
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Complaint Detail Modal */}
      {showModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-4 py-2 text-sm font-semibold rounded-full border ${getStatusColor(selectedComplaint.status)}`}>
                      {selectedComplaint.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                      {selectedComplaint.category}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Complaint Details</h2>
                </div>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{selectedComplaint.description}</p>
                </div>

                {selectedComplaint.message && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Additional Message
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{selectedComplaint.message}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Submitted By</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedComplaint.name || "Anonymous"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Mail className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedComplaint.email || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Date Submitted</p>
                      <p className="text-sm font-semibold text-gray-900">{shortDate(selectedComplaint.$createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Clock className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Time Submitted</p>
                      <p className="text-sm font-semibold text-gray-900">{new Date(selectedComplaint.$createdAt).toLocaleTimeString()}</p>
                    </div>
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
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-600 mb-1">{label}</p>
      <p className={`${isText ? 'text-lg' : 'text-2xl'} font-bold text-gray-900`}>{value}</p>
    </div>
  );
}