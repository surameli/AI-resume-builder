/**
 * App.jsx — root component.
 * Defines all client-side routes using React Router DOM.
 * Protected routes are wrapped in <ProtectedRoute>.
 * Auth-only pages (login, register) are wrapped in <GuestOnlyRoute>.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute, GuestOnlyRoute } from './routes/ProtectedRoute.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';

// Auth pages
import Login          from './pages/auth/Login.jsx';
import Register       from './pages/auth/Register.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword  from './pages/auth/ResetPassword.jsx';

// Public pages
import Landing from './pages/landing/Landing.jsx';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard.jsx';

// Placeholder pages for phases 2-12
import ComingSoon from './pages/ComingSoon.jsx';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ── */}
          <Route path="/" element={<Landing />} />

          {/* ── Guest-only auth pages ── */}
          <Route path="/login"           element={<GuestOnlyRoute><Login /></GuestOnlyRoute>} />
          <Route path="/register"        element={<GuestOnlyRoute><Register /></GuestOnlyRoute>} />
          <Route path="/forgot-password" element={<GuestOnlyRoute><ForgotPassword /></GuestOnlyRoute>} />
          <Route path="/reset-password"  element={<GuestOnlyRoute><ResetPassword /></GuestOnlyRoute>} />

          {/* ── Protected dashboard routes ── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Profile — Phase 2 */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ComingSoon feature="Profile Management" phase="Phase 2" />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Resumes — Phase 4/5 */}
          <Route path="/resumes" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ComingSoon feature="Resume Builder" phase="Phase 4" />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/resume/create" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ComingSoon feature="AI Resume Generator" phase="Phase 4" />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/resume/:id/edit" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ComingSoon feature="Resume Editor" phase="Phase 5" />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Job analyzer — Phase 3 */}
          <Route path="/job-analyzer" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ComingSoon feature="Job Description Analyzer" phase="Phase 3" />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Templates — Phase 5 */}
          <Route path="/templates" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ComingSoon feature="Resume Templates" phase="Phase 5" />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Cover letters — Phase 6 */}
          <Route path="/cover-letters" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ComingSoon feature="Cover Letter Generator" phase="Phase 6" />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/cover-letters/create" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ComingSoon feature="Cover Letter Generator" phase="Phase 6" />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* ATS checker — Phase 8 */}
          <Route path="/ats-checker" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ComingSoon feature="ATS Resume Checker" phase="Phase 8" />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Applications — Phase 9 */}
          <Route path="/applications" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ComingSoon feature="Job Application Tracker" phase="Phase 9" />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Career assistant — Phase 10 */}
          <Route path="/career-assistant" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ComingSoon feature="AI Career Assistant" phase="Phase 10" />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Settings — Phase 11 */}
          <Route path="/settings" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ComingSoon feature="Account Settings" phase="Phase 11" />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Admin — Phase 11 */}
          <Route path="/admin/*" element={
            <ProtectedRoute adminOnly>
              <DashboardLayout>
                <ComingSoon feature="Admin Dashboard" phase="Phase 11" />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
