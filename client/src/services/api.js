
/**
 * Axios API client.
 * - Sends HTTP-only cookies with requests.
 * - Refreshes expired access tokens once.
 * - Prevents duplicate refresh requests.
 * - Prevents infinite 401 retry loops.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Separate client for refreshing tokens.
// This prevents refresh requests from triggering the same interceptor.
const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';

    const isAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    // Only refresh on 401.
    // Never retry the same request more than once.
    if (
      error.response.status !== 401 ||
      originalRequest._retry ||
      isAuthRequest
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Reuse the same refresh request for concurrent 401 responses.
      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post('/auth/refresh')
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;

      // The backend sets new HTTP-only cookies.
      // Retry the original request using those cookies.
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed. The session is no longer valid.
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.includes('/login')
      ) {
        window.location.replace('/login');
      }

      return Promise.reject(refreshError);
    }
  }
);

export default api;
