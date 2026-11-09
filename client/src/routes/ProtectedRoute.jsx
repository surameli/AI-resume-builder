/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Preserves the attempted URL in location state so login can redirect back.
 * Also handles admin-only routes.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';

export const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // While the initial /me check is in-flight, show a loader
  if (isLoading) return <PageLoader />;

  // Not authenticated — send to login, preserving intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin-only guard — extra safety: backend also enforces this
  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

/** Inverse: redirect authenticated users away from guest-only pages */
export const GuestOnlyRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return children;
};

export default ProtectedRoute;
