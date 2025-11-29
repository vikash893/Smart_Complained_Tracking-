import { useState, useEffect } from "react";
import { Search, Bell, LogIn, TrendingUp, Clock, CheckCircle, AlertCircle, Activity, ArrowRight } from "lucide-react";
import { Client, Databases, Query } from "appwrite";

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || import.meta.env.VITE_APPWRITE_PROJECT);

const databases = new Databases(client);

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || import.meta.env.VITE_APPWRITE_DATABASE;
const COMPLAINT_COLLECTION = import.meta.env.VITE_APPWRITE_COMPLAINT_COLLECTION || import.meta.env.VITE_APPWRITE_COMPLAINTS_COLLECTION;

export default function HomePage({ onShowLogin }) {
  const [query, setQuery] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    pending: 0,
    inprogress: 0,
    avgResolution: 0,
  });

  useEffect(() => {
    loadComplaints();
  }, []);

  async function loadComplaints() {
    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        COMPLAINT_COLLECTION,
        [Query.orderDesc("$createdAt")]
      );

      const data = res.documents;
      setComplaints(data);

      const total = data.length;
      const resolved = data.filter((c) => c.status?.toLowerCase().trim() === "resolved").length;
      const pending = data.filter((c) => c.status?.toLowerCase().trim() === "pending").length;
      const inprogress = data.filter((c) =>
        c.status?.toLowerCase().trim() === "in progress" ||
        c.status?.toLowerCase().trim() === "in-progress"
      ).length;

      const resolvedItems = data.filter((c) => c.status?.toLowerCase().trim() === "resolved");
      let avgResolution = 0;

      if (resolvedItems.length > 0) {
        const times = resolvedItems.map((c) => {
          const created = new Date(c.$createdAt);
          const resolvedAt = new Date(c.updated_at || c.$updatedAt);
          return (resolvedAt - created) / (1000 * 60 * 60 * 24);
        });
        avgResolution = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
      }

      setStats({ total, resolved, pending, inprogress, avgResolution });
    } catch (err) {
      console.error("Error loading complaints:", err);
    }
    setLoading(false);
  }

  const filtered = complaints.filter((c) => {
    const text = query.toLowerCase();
    return (
      c.title?.toLowerCase().includes(text) ||
      c.$id?.toLowerCase().includes(text) ||
      c.category?.toLowerCase().includes(text)
    );
  });

  function statusColor(s) {
    const st = s?.toLowerCase().trim();
    if (st === "resolved") return "bg-emerald-100 text-emerald-700";
    if (st === "in progress" || st === "in-progress") return "bg-blue-100 text-blue-700";
    if (st === "pending") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-700";
  }

  function handleShowLogin() {
    if (typeof onShowLogin === "function") {
      onShowLogin();
    } else {
      alert("Please configure login handler");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAVBAR */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
                SC
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Smart Complaint Register
                </h1>
                <p className="text-xs text-gray-500">Fast • Transparent • Accountable</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-indigo-600 transition-colors">
                Home
              </button>
              <a href="#features" className="hover:text-indigo-600 transition-colors">
                Features
              </a>
              <a href="#recent" className="hover:text-indigo-600 transition-colors">
                Recent
              </a>
              <a href="#contact" className="hover:text-indigo-600 transition-colors">
                Contact
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={handleShowLogin}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </button>

              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* HERO SECTION */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Report issues <span className="text-indigo-600">quickly</span>
          </h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto mb-6">
            Create complaints, track progress in real-time, and receive instant updates.
          </p>
          
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleShowLogin}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all"
            >
              Learn more
            </a>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Total Complaints"
            value={stats.total}
            color="bg-blue-600"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Resolved"
            value={stats.resolved}
            color="bg-emerald-600"
            subtitle={`${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% success rate`}
          />
          <StatCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Pending"
            value={stats.pending}
            color="bg-amber-600"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Avg Resolution"
            value={`${stats.avgResolution}`}
            color="bg-purple-600"
            subtitle="days"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN - COMPLAINTS */}
          <div className="lg:col-span-2 space-y-6">
            {/* SEARCH */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by ID, title, or category..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-700 placeholder-gray-400"
                />
              </div>
            </div>

            {/* RECENT COMPLAINTS */}
            <div id="recent" className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Recent Complaints</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Latest submissions</p>
                </div>
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-indigo-600"></div>
                  <p className="text-gray-500 text-sm mt-3">Loading...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">No complaints found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.slice(0, 5).map((c) => (
                    <div
                      key={c.$id}
                      className="p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              #{c.$id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                              {c.category}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {c.title}
                          </h4>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(c.$createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColor(c.status)}`}>
                            {c.status}
                          </span>
                          <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                            View →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - SIDEBAR */}
          <aside className="space-y-6">
            {/* SUBMIT CTA */}
            <div className="bg-indigo-600 rounded-lg p-6 text-white">
              <h4 className="text-lg font-bold mb-2">Submit a Complaint</h4>
              <p className="text-sm text-indigo-100 mb-4">
                Sign in to submit and track your complaints.
              </p>
              <button
                onClick={handleShowLogin}
                className="w-full px-4 py-2.5 bg-white text-indigo-600 rounded-lg font-medium hover:bg-gray-50 transition-all"
              >
                Sign in to continue
              </button>
            </div>

            {/* KEY FEATURES */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h5 className="text-base font-bold text-gray-900 mb-4">Key Features</h5>
              <ul className="space-y-3">
                <FeatureItem text="Smart complaint routing" />
                <FeatureItem text="Email & SMS updates" />
                <FeatureItem text="Admin analytics" />
                <FeatureItem text="Public timeline" />
              </ul>
            </div>

            {/* SUPPORT */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h5 className="text-sm font-bold text-gray-900 mb-2">Need Help?</h5>
              <p className="text-sm text-gray-600 mb-3">
                Our support team is here 24/7
              </p>
              <a 
                href="mailto:support@college.edu"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                support@college.edu →
              </a>
            </div>
          </aside>
        </div>

        {/* FEATURE CARDS */}
        <section id="features" className="mt-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Why Choose Us
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Built for efficiency and transparency
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard 
              icon={<Activity className="w-6 h-6" />}
              title="Minimal UX" 
              desc="Clean interface designed for speed" 
              color="bg-blue-600"
            />
            <FeatureCard 
              icon={<CheckCircle className="w-6 h-6" />}
              title="Transparent" 
              desc="Track every step in real-time" 
              color="bg-emerald-600"
            />
            <FeatureCard 
              icon={<TrendingUp className="w-6 h-6" />}
              title="Fast" 
              desc="Quick reporting and resolution" 
              color="bg-amber-600"
            />
            <FeatureCard 
              icon={<Bell className="w-6 h-6" />}
              title="Secure" 
              desc="Enterprise-grade security" 
              color="bg-purple-600"
            />
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="mt-12">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Get in Touch</h3>
              <p className="text-gray-600">
                Have questions? We're here to help
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg mb-3">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Email</h4>
                <a href="mailto:support@college.edu" className="text-sm text-indigo-600 hover:underline">
                  support@college.edu
                </a>
              </div>

              <div className="text-center p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg mb-3">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Phone</h4>
                <a href="tel:+1234567890" className="text-sm text-indigo-600 hover:underline">
                  +1 (234) 567-890
                </a>
              </div>

              <div className="text-center p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg mb-3">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Address</h4>
                <p className="text-sm text-gray-600">
                  123 College St, City 12345
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Smart Complaint Register. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color, subtitle }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${color} text-white`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      {subtitle && <p className="text-xs text-gray-500 ml-11">{subtitle}</p>}
    </div>
  );
}

function FeatureItem({ text }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      <span className="text-sm text-gray-700">{text}</span>
    </li>
  );
}

function FeatureCard({ icon, title, desc, color }) {
  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200 hover:shadow-md transition-all">
      <div className={`inline-flex p-2.5 rounded-lg ${color} text-white mb-3`}>
        {icon}
      </div>
      <h4 className="font-bold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-600">{desc}</p>
    </div>
  );
}