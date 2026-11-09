/**
 * AuthContext
 * Provides authentication state and actions to the entire app.
 * - On mount, fetches the current user from /api/auth/me (uses cookie).
 * - Exposes: user, isLoading, isAuthenticated, login, logout, register, updateUser.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/auth.service.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true until first /me check completes

  // ─── Check existing session on mount ──────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await authService.getMe();
        setUser(data.data.user);
      } catch {
        // No valid session — that's fine, user is a guest
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const login = useCallback(async (credentials) => {
    const { data } = await authService.login(credentials);
    // Fetch full user profile after login
    const meRes = await authService.getMe();
    setUser(meRes.data.data.user);
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const { data } = await authService.register(userData);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  /** Used after profile updates so the header/nav reflects changes immediately */
  const updateUser = useCallback((updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** Hook to consume auth context in any component */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
};

export default AuthContext;
