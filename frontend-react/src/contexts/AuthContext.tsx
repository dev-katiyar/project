import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import api from "@/services/api";

// --------------- Types ---------------
export interface User {
  userId: string;
  username: string;
  auth_token: string;
  hasActiveSubscription: boolean;
  subscriptionStatus: string;
  plan?: string;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const USER_KEY = "currentUser";

// --------------- Context ---------------
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// --------------- Provider ---------------
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!user?.auth_token;

  const login = useCallback(async (username: string, password: string) => {
    try {
      const { data } = await api.post("/login", { username, password });
      if (data && (data.status === "success" || data.status === "pass")) {
        const userData: User = {
          ...data,
          hasActiveSubscription: data.status === "success",
          subscriptionStatus: data.sub_status,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: data?.message || "Login failed" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Listen for 401s from the API layer
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("sv-auth-expired", handler);
    return () => window.removeEventListener("sv-auth-expired", handler);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --------------- Hook ---------------
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
