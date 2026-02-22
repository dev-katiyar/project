import axios from "axios";

// --------------- Configuration ---------------
// In dev mode, Vite proxies /api → http://localhost:5000
// In production, nginx proxies /api → backend

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// --------------- Request Interceptor: JWT ---------------
api.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem("currentUser");
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.auth_token) {
          config.headers.Authorization = `Bearer ${user.auth_token}`;
        }
      }
    } catch {
      // ignore parse errors
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// --------------- Response Interceptor: 401 Handler ---------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Fire custom event so AuthContext can react
      window.dispatchEvent(new CustomEvent("sv-auth-expired"));
    }
    return Promise.reject(error);
  },
);

export default api;
