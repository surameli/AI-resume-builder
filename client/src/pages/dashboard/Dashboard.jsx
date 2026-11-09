/**
 * Dashboard page — shows real stats from the backend.
 * All numbers are fetched from /api/dashboard/stats.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Mail, Send, Sparkles, Plus, BarChart2,
  MessageSquare, TrendingUp, Clock, ChevronRight, Briefcase,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { getDashboardStats } from '../../services/dashboard.service.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import Alert from '../../components/common/Alert.jsx';

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, color, to }) => (
  <Link to={to} className="card-hover group flex items-center gap-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold text-brand-text">{value}</p>
      <p className="text-sm text-brand-muted truncate">{label}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-brand-border ml-auto group-hover:text-brand-orange transition-colors" />
  </Link>
);

const QuickAction = ({ icon: Icon, label, description, to, color }) => (
  <Link to={to} className="card-hover group p-5 flex flex-col gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="font-semibold text-brand-text text-sm">{label}</p>
      <p className="text-xs text-brand-muted mt-0.5">{description}</p>
    </div>
    <span className="text-xs text-brand-orange font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
      Get started <ChevronRight className="w-3 h-3" />
    </span>
  </Link>
);

const statusColors = {
  INTERESTED: 'badge-blue',
  PREPARING:  'badge-yellow',
  APPLIED:    'badge-orange',
  INTERVIEW:  'badge-green',
  REJECTED:   'badge-red',
  ACCEPTED:   'badge-green',
};

// ─── Completion bar ────────────────────────────────────────────────────────────

const ProfileCompletionBar = ({ percent }) => (
  <div className="card p-5">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-semibold text-brand-text">Profile completion</p>
      <span className="text-sm font-bold text-brand-orange">{percent}%</span>
    </div>
    <div className="w-full bg-brand-border rounded-full h-2">
      <motion.div
        className="bg-brand-orange h-2 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
    {percent < 100 && (
      <p className="text-xs text-brand-muted mt-2">
        Complete your profile to get better AI resume results.{' '}
        <Link to="/profile" className="text-brand-orange hover:underline font-medium">
          Add details →
        </Link>
      </p>
    )}
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const firstName = user?.profile?.firstName || user?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getDashboardStats();
        setStats(data.data);
      } catch {
        setError('Failed to load dashboard data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-brand-muted text-sm mt-1">
          Here's what's happening with your job search.
        </p>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Profile completion */}
      {stats && <ProfileCompletionBar percent={stats.profileCompletion} />}

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={FileText}
            label="Resumes"
            value={stats.stats.totalResumes}
            color="bg-blue-50 text-blue-600"
            to="/resumes"
          />
          <StatCard
            icon={Mail}
            label="Cover Letters"
            value={stats.stats.totalCoverLetters}
            color="bg-purple-50 text-purple-600"
            to="/cover-letters"
          />
          <StatCard
            icon={Send}
            label="Applications"
            value={stats.stats.totalApplications}
            color="bg-green-50 text-green-600"
            to="/applications"
          />
          <StatCard
            icon={Sparkles}
            label="AI Generations"
            value={stats.stats.totalAiUsage}
            color="bg-orange-50 text-brand-orange"
            to="/settings"
          />
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="section-title mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction
            icon={Plus}
            label="Build a resume"
            description="AI-powered resume tailored to a job"
            to="/resume/create"
            color="bg-brand-orange/10 text-brand-orange"
          />
          <QuickAction
            icon={Briefcase}
            label="Analyze a job"
            description="Paste a job description and extract requirements"
            to="/job-analyzer"
            color="bg-blue-50 text-blue-600"
          />
          <QuickAction
            icon={MessageSquare}
            label="Career assistant"
            description="Ask the AI about your career questions"
            to="/career-assistant"
            color="bg-purple-50 text-purple-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent resumes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-orange" />
              Recent resumes
            </h2>
            <Link to="/resumes" className="text-xs text-brand-orange hover:underline font-medium">
              View all
            </Link>
          </div>

          {stats?.recentResumes?.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="w-10 h-10 text-brand-border mx-auto mb-3" />
              <p className="text-sm text-brand-muted">No resumes yet.</p>
              <Link to="/resume/create" className="btn-primary btn-sm mt-3 inline-flex">
                Create your first resume
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {stats?.recentResumes?.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/resume/${r.id}/edit`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-brand-bg transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-text truncate">{r.title}</p>
                      <p className="text-xs text-brand-muted">
                        {r.template?.name ?? 'Default'} ·{' '}
                        {new Date(r.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-brand-border group-hover:text-brand-orange transition-colors shrink-0 ml-2" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent applications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-orange" />
              Recent applications
            </h2>
            <Link to="/applications" className="text-xs text-brand-orange hover:underline font-medium">
              View all
            </Link>
          </div>

          {stats?.recentApplications?.length === 0 ? (
            <div className="py-8 text-center">
              <Send className="w-10 h-10 text-brand-border mx-auto mb-3" />
              <p className="text-sm text-brand-muted">No applications tracked yet.</p>
              <Link to="/applications" className="btn-primary btn-sm mt-3 inline-flex">
                Track an application
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {stats?.recentApplications?.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/applications`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-brand-bg transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-text truncate">
                        {a.jobTitle} @ {a.company}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={statusColors[a.status] ?? 'badge-gray'}>
                          {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                        </span>
                        <span className="text-xs text-brand-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(a.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-brand-border group-hover:text-brand-orange transition-colors shrink-0 ml-2" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
