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
    if (st === "resolved") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (st === "in progress" || st === "in-progress") return "bg-blue-100 text-blue-700 border border-blue-200";
    if (st === "pending") return "bg-amber-100 text-amber-700 border border-amber-200";
    return "bg-gray-100 text-gray-700 border border-gray-200";
  }

  function handleShowLogin() {
    if (typeof onShowLogin === "function") {
      onShowLogin();
    } else {
      alert("Please configure login handler");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 rounded-br-full"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-emerald-500/10 to-cyan-600/10 rounded-tl-full"></div>
      
      {/* NAVBAR */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold shadow-lg shadow-indigo-500/25">
                SC
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Smart Complaint Register
                </h1>
                <p className="text-xs text-gray-500">Fast • Transparent • Accountable</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-indigo-600 transition-all duration-300 hover:scale-105">
                Home
              </button>
              <a href="#features" className="hover:text-indigo-600 transition-all duration-300 hover:scale-105">
                Features
              </a>
              <a href="#recent" className="hover:text-indigo-600 transition-all duration-300 hover:scale-105">
                Recent
              </a>
              <a href="#contact" className="hover:text-indigo-600 transition-all duration-300 hover:scale-105">
                Contact
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={handleShowLogin}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </button>

              <button className="p-2 rounded-xl hover:bg-gray-100/80 transition-all duration-300 hover:scale-105 relative backdrop-blur-sm">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* HERO SECTION */}
        <div className="text-center mb-12 relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-3xl blur-xl"></div>
          <div className="relative">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 via-indigo-900 to-gray-900 bg-clip-text text-transparent">
              Report issues <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">quickly</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              Create complaints, track progress in real-time, and receive instant updates with our streamlined platform.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={handleShowLogin}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-2xl shadow-indigo-500/30 hover:shadow-3xl hover:shadow-indigo-500/50 hover:scale-105"
              >
                Get started
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white/80 backdrop-blur-sm border border-gray-300/50 rounded-2xl font-semibold text-gray-700 hover:bg-white hover:border-gray-400 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Learn more
              </a>
            </div>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Total Complaints"
            value={stats.total}
            color="from-blue-500 to-cyan-500"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Resolved"
            value={stats.resolved}
            color="from-emerald-500 to-green-500"
            subtitle={`${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% success rate`}
          />
          <StatCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Pending"
            value={stats.pending}
            color="from-amber-500 to-orange-500"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Avg Resolution"
            value={`${stats.avgResolution}`}
            color="from-purple-500 to-pink-500"
            subtitle="days"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN - COMPLAINTS */}
          <div className="lg:col-span-2 space-y-8">
            {/* SEARCH */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by ID, title, or category..."
                  className="w-full pl-12 pr-4 py-3.5 bg-white/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-3 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 text-gray-700 placeholder-gray-400 backdrop-blur-sm"
                />
              </div>
            </div>

            {/* RECENT COMPLAINTS */}
            <div id="recent" className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Recent Complaints</h3>
                  <p className="text-sm text-gray-500 mt-1">Latest submissions and their status</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-indigo-600"></div>
                  <p className="text-gray-500 text-sm mt-4 font-medium">Loading complaints...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-4">
                    <AlertCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium text-lg">No complaints found</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your search terms</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.slice(0, 5).map((c) => (
                    <div
                      key={c.$id}
                      className="p-6 rounded-xl border border-gray-200/60 hover:border-indigo-300 hover:shadow-md transition-all duration-300 bg-white/50 backdrop-blur-sm group hover:scale-[1.02]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-semibold text-gray-600 bg-gray-100/80 px-3 py-1.5 rounded-lg border border-gray-200">
                              #{c.$id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
                              {c.category}
                            </span>
                          </div>
                          <h4 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-indigo-700 transition-colors">
                            {c.title}
                          </h4>
                          <p className="text-sm text-gray-500 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {new Date(c.$createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <span className={`px-4 py-2 text-sm font-semibold rounded-full ${statusColor(c.status)}`}>
                            {c.status}
                          </span>
                          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                            View 
                            <ArrowRight className="w-4 h-4" />
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
          <aside className="space-y-8">
            {/* SUBMIT CTA */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl shadow-indigo-500/25 hover:shadow-3xl hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-[1.02]">
              <div className="text-center mb-2">
                <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-4">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-xl font-bold mb-3">Submit a Complaint</h4>
                <p className="text-indigo-100 mb-6 leading-relaxed">
                  Sign in to submit and track your complaints with real-time updates.
                </p>
              </div>
              <button
                onClick={handleShowLogin}
                className="w-full px-6 py-3.5 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Sign in to continue
              </button>
            </div>

            {/* KEY FEATURES */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <h5 className="text-lg font-bold text-gray-900 mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Key Features</h5>
              <ul className="space-y-4">
                <FeatureItem text="Smart complaint routing" />
                <FeatureItem text="Email & SMS updates" />
                <FeatureItem text="Admin analytics" />
                <FeatureItem text="Public timeline" />
                <FeatureItem text="Real-time tracking" />
                <FeatureItem text="Priority management" />
              </ul>
            </div>

            {/* SUPPORT */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200/60 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <h5 className="text-lg font-bold text-gray-900 mb-3">Need Help?</h5>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Our dedicated support team is available 24/7 to assist you with any issues or questions.
              </p>
              <a 
                href="mailto:support@college.edu"
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold transition-all duration-300 hover:gap-3 group"
              >
                support@college.edu
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </aside>
        </div>

        {/* FEATURE CARDS */}
        <section id="features" className="mt-20 relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-3xl blur-3xl"></div>
          <div className="relative">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 via-indigo-900 to-gray-900 bg-clip-text text-transparent">
                Why Choose Us
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                Built for efficiency, transparency, and exceptional user experience
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard 
                icon={<Activity className="w-6 h-6" />}
                title="Minimal UX" 
                desc="Clean, intuitive interface designed for maximum speed and efficiency" 
                color="from-blue-500 to-cyan-500"
              />
              <FeatureCard 
                icon={<CheckCircle className="w-6 h-6" />}
                title="Transparent" 
                desc="Track every step of your complaint in real-time with full visibility" 
                color="from-emerald-500 to-green-500"
              />
              <FeatureCard 
                icon={<TrendingUp className="w-6 h-6" />}
                title="Fast" 
                desc="Quick reporting and rapid resolution with automated workflows" 
                color="from-amber-500 to-orange-500"
              />
              <FeatureCard 
                icon={<Bell className="w-6 h-6" />}
                title="Secure" 
                desc="Enterprise-grade security protecting your data and privacy" 
                color="from-purple-500 to-pink-500"
              />
            </div>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="mt-20 relative">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200/60 p-12 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 via-indigo-900 to-gray-900 bg-clip-text text-transparent">Get in Touch</h3>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Have questions or need assistance? We're here to help you succeed.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <ContactItem
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                title="Email"
                content="support@college.edu"
                href="mailto:support@college.edu"
              />
              <ContactItem
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
                title="Phone"
                content="+1 (234) 567-890"
                href="tel:+1234567890"
              />
              <ContactItem
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                title="Address"
                content="123 College St, City 12345"
              />
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-20 pt-12 border-t border-gray-200/60 text-center relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-3xl blur-xl"></div>
          <div className="relative">
            <p className="text-sm text-gray-500 font-medium">
              © {new Date().getFullYear()} Smart Complaint Register. All rights reserved.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Built with ❤️ for better complaint management
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color, subtitle }) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
      <div className="flex items-center gap-4 mb-3">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-600">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
      </div>
      {subtitle && <p className="text-xs text-gray-500 ml-16 font-medium">{subtitle}</p>}
    </div>
  );
}

function FeatureItem({ text }) {
  return (
    <li className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 transition-all duration-300 group">
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/25">
        <CheckCircle className="w-4 h-4 text-white" />
      </div>
      <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">{text}</span>
    </li>
  );
}

function FeatureCard({ icon, title, desc, color }) {
  return (
    <div className="bg-white/80 backdrop-blur-md p-7 rounded-2xl border border-gray-200/60 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group">
      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h4 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-indigo-700 transition-colors">{title}</h4>
      <p className="text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function ContactItem({ icon, title, content, href }) {
  const contentElement = href ? (
    <a href={href} className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
      {content}
    </a>
  ) : (
    <p className="text-gray-600 font-medium">{content}
    </p>
  );

  return (
    <div className="text-center p-6 rounded-2xl hover:bg-white/50 transition-all duration-300 group hover:scale-105">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-4 group-hover:from-indigo-200 group-hover:to-purple-200 transition-all">
        <div className="text-indigo-600">
          {icon}
        </div>
      </div>
      <h4 className="font-bold text-gray-900 text-lg mb-3">{title}</h4>
      <div className="text-sm">
        {contentElement}
      </div>
    </div>
  );
}