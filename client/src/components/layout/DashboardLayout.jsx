/**
 * DashboardLayout — persistent shell for all authenticated pages.
 * Contains: collapsible sidebar, top navbar, main content area.
 * Responsive: sidebar collapses to overlay on mobile.
 */
import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, User, FileText, Briefcase, Layout,
  Mail, BarChart2, Send, MessageSquare, Settings,
  Sparkles, LogOut, Menu, X, ChevronRight, Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const navItems = [
  { to: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile',           icon: User,            label: 'My Profile' },
  { to: '/resumes',           icon: FileText,        label: 'Resumes' },
  { to: '/job-analyzer',      icon: Briefcase,       label: 'Job Analyzer' },
  { to: '/templates',         icon: Layout,          label: 'Templates' },
  { to: '/cover-letters',     icon: Mail,            label: 'Cover Letters' },
  { to: '/ats-checker',       icon: BarChart2,       label: 'ATS Checker' },
  { to: '/applications',      icon: Send,            label: 'Applications' },
  { to: '/career-assistant',  icon: MessageSquare,   label: 'AI Assistant' },
  { to: '/settings',          icon: Settings,        label: 'Settings' },
];

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-5 border-b border-brand-border ${sidebarCollapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-brand-orange rounded-xl flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-bold text-brand-text text-base tracking-tight">CareerCraft AI</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              isActive ? 'nav-item-active' : 'nav-item-inactive'
            }
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: '18px', height: '18px' }} />
            {!sidebarCollapsed && <span className="truncate">{label}</span>}
            {!sidebarCollapsed && (
              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
            )}
          </NavLink>
        ))}

        {/* Admin link — only visible to admins */}
        {user?.role === 'ADMIN' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item-inactive'}
            title={sidebarCollapsed ? 'Admin' : undefined}
          >
            <Shield className="shrink-0" style={{ width: '18px', height: '18px' }} />
            {!sidebarCollapsed && <span>Admin</span>}
          </NavLink>
        )}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-brand-border p-2">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-brand-orange/15 flex items-center justify-center shrink-0">
              {user?.profile?.photoUrl ? (
                <img
                  src={user.profile.photoUrl}
                  alt={user?.profile?.firstName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-brand-orange text-sm font-semibold">
                  {user?.profile?.firstName?.[0] ?? user?.email?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand-text truncate">
                {user?.profile?.firstName} {user?.profile?.lastName}
              </p>
              <p className="text-xs text-brand-muted truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="nav-item-inactive w-full"
          title={sidebarCollapsed ? 'Sign out' : undefined}
        >
          <LogOut style={{ width: '18px', height: '18px' }} className="shrink-0" />
          {!sidebarCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-brand-border
          transition-all duration-200 shrink-0
          ${sidebarCollapsed ? 'w-16' : 'w-60'}`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="absolute left-0 top-20 z-20 hidden lg:flex w-5 h-5 bg-brand-border rounded-full items-center justify-center
            hover:bg-brand-orange hover:border-brand-orange transition-colors cursor-pointer"
          style={{ marginLeft: sidebarCollapsed ? '52px' : '228px', transition: 'margin 0.2s' }}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight
            className={`w-3 h-3 text-brand-muted transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`}
          />
        </button>
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 h-full w-60 bg-white z-40 flex flex-col shadow-modal lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top nav bar */}
        <header className="bg-white border-b border-brand-border px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden btn-ghost p-2 -ml-2"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb / page title area — children can set this via a context in later phases */}
          <div className="flex-1 lg:pl-0 pl-2" />

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-brand-bg rounded-xl px-3 py-1.5">
              <div className="w-5 h-5 rounded-full bg-brand-orange/15 flex items-center justify-center">
                <span className="text-brand-orange text-[10px] font-bold">
                  {user?.subscription?.plan?.[0] ?? 'F'}
                </span>
              </div>
              <span className="text-xs font-medium text-brand-muted capitalize">
                {user?.subscription?.plan?.toLowerCase() ?? 'free'} plan
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
